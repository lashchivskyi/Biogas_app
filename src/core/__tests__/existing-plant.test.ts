import { describe, expect, it } from "vitest";
import { assess } from "../assess";
import { EXAMPLES } from "../examples";
import type { ProjectInput } from "../types";
import { getCountry } from "@/countries";

const base = EXAMPLES.find((e) => e.id === "de_existing_biogas")!.input;
const withEngine = (overhaul: number | undefined): ProjectInput => ({ ...base, process: { ...base.process!, kind: "gas", existingChpKwEl: 500, ...(overhaul === undefined ? {} : { chpOverhaulLocal: overhaul }) } as ProjectInput["process"] });
const DE = getCountry("DE");

describe("existing biogas plant", () => {
  it("keeps the engine on site: its rating in every scenario and only the overhaul as new CHP money", () => {
    const a = assess(withEngine(300000), DE);
    for (const s of ["conservative", "base", "optimistic"] as const) expect(a.routeMatrix.chp[s].energy.chpKwEl, s).toBe(500);
    const lines = a.routeMatrix.chp.base.capex.lines.map((l) => l.id);
    expect(lines).toEqual(["process", "chp_overhaul"]);
    expect(a.routeMatrix.chp.base.capex.lines[1].eur).toBeCloseTo(300000 / a.fx, 6);
    // The client's uncertainty band, not the country factor, moves the budget between scenarios.
    expect(a.routeMatrix.chp.conservative.capex.lines[1].eur).toBeCloseTo(300000 * 1.25 / a.fx, 6);
    expect(a.warnings.some((w) => w.includes("existing engine"))).toBe(true);
  });

  it("reuses the gas system and grid connection in the other options", () => {
    const a = assess(withEngine(300000), DE);
    const plain = assess(base, DE);
    for (const r of ["boiler", "biomethane"] as const) {
      const ids = a.routesBase[r].capex.lines.map((l) => l.id);
      expect(ids, r).not.toContain("gas_system");
      expect(ids, r).not.toContain("grid");
      expect(a.routesBase[r].capex.totalEur, r).toBeLessThan(plain.routesBase[r].capex.totalEur);
    }
  });

  it("asks for the overhaul budget instead of assuming one", () => {
    const a = assess(withEngine(undefined), DE);
    expect(a.financialsAvailable).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { assess } from "../assess";
import { EXAMPLES } from "../examples";
import type { ProjectInput } from "../types";
import { getCountry, UA } from "@/countries";

/** Client values take priority over catalogue and national defaults, and the evidence register says so. */
const example = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;
const run = (input: ProjectInput) => assess(input, getCountry(input.countryCode), { uncertainty: false });
const base = example("dairy_400");

describe("client overrides of catalogue and national values", () => {
  it("methane content changes the biogas volume, not the methane", () => {
    const line = { id: "fw", type: "food_waste" as const, quantity: 5000 };
    const a = assess({ ...base, feedstocks: [line] }, UA).scenarios.base.feed;
    const b = assess({ ...base, feedstocks: [{ ...line, methanePct: 50 }] }, UA).scenarios.base.feed;
    expect(b.ch4M3Year).toBeCloseTo(a.ch4M3Year, 6);
    expect(b.biogasM3Year).toBeCloseTo(b.ch4M3Year / 0.5, 6);
    expect(b.lines[0].ch4Fraction).toBe(0.5);
  });

  it("laboratory nitrogen replaces the catalogue nutrient value", () => {
    const f = assess({ ...base, feedstocks: [{ id: "fw", type: "food_waste", quantity: 1000, nKgT: 3 }] }, UA).scenarios.base.feed;
    expect(f.lines[0].nKgYear / (1000 * 1)).toBeLessThanOrEqual(3 + 1e-9);
  });

  it("measured nitrogen below the ammonium threshold removes the poultry-share proxy cut; without it the cut stays", () => {
    const poultry = { id: "p", animal: "layer_hen" as const, quantity: 150000 };
    const proxy = assess({ ...base, feedstocks: [poultry] }, UA).scenarios.base.feed;
    expect(proxy.inhibitionFactor).toBeLessThan(1);
    const measured = assess({ ...base, feedstocks: [{ ...poultry, nKgT: 2 }] }, UA).scenarios.base.feed;
    expect(measured.inhibitionFactor).toBe(1);
    const high = assess({ ...base, feedstocks: [{ ...poultry, nKgT: 15 }] }, UA).scenarios.base.feed;
    expect(high.inhibitionFactor).toBeLessThan(1);
  });

  it("warns about nitrogen from protein-rich wastes, not about slurry-only digesters", () => {
    const fish = assess({ ...base, feedstocks: [{ id: "f", type: "fish_waste", quantity: 3000 }] }, UA);
    expect(fish.scenarios.base.feed.warnings.some((w) => w.includes("Total nitrogen in the digester"))).toBe(true);
    const dairy = assess(base, UA);
    expect(dairy.scenarios.base.feed.warnings.some((w) => w.includes("Total nitrogen in the digester"))).toBe(false);
  });

  it("an entered reject share replaces the default for packaged waste", () => {
    const line = { id: "fw", type: "food_waste" as const, quantity: 10000 };
    const rejects = (input: ProjectInput) => assess(input, UA).scenarios.base.opexRev.opex.find((l) => l.id === "rejects")?.eur ?? 0;
    const typical = rejects({ ...base, feedstocks: [line] });
    expect(rejects({ ...base, feedstocks: [{ ...line, rejectSharePct: 20 }] })).toBeCloseTo(typical * 2, 6);
    expect(rejects({ ...base, feedstocks: [{ ...line, rejectSharePct: 0 }] })).toBe(0);
  });

  it("a contractor's digestate price replaces the national surplus estimate and is listed as client input", () => {
    const input = { ...base, feedstocks: [{ id: "fw", type: "food_waste" as const, quantity: 20000 }], site: { ...base.site, landHa: 0 } };
    const handling = (i: ProjectInput) => assess(i, UA).scenarios.base.opexRev.opex.find((l) => l.id === "digestate_handling")?.eur ?? 0;
    const zero = { ...input, site: { ...input.site, digestateExportCostLocalPerTonne: 0 } };
    expect(handling(zero)).toBe(0);
    expect(handling(input)).toBeGreaterThan(0);
    const a = assess(zero, UA);
    expect(a.marketEvidence?.find((p) => p.id === "econ.digestate_excess_eur_t")?.origin).toBe("USER_INPUT");
  });

  it("an O&M contract replaces the three maintenance lines of the quoted route only", () => {
    const quoted = assess(base, UA).bestRoute;
    const fin = { capexQuoteLocal: 50_000_000, capexQuoteRoute: quoted, omQuoteLocalYear: 1_000_000 };
    const a = assess({ ...base, finance: fin }, UA);
    const ids = a.routesBase[quoted].opexRev.opex.map((l) => l.id);
    expect(ids).toContain("om_contract");
    expect(ids).not.toContain("maintenance");
    expect(ids).not.toContain("chp_service");
    const other = (["chp", "boiler", "biomethane"] as const).find((r) => r !== quoted)!;
    expect(a.routesBase[other].opexRev.opex.map((l) => l.id)).not.toContain("om_contract");
  });

  it("lists every customer measurement as MEASURED evidence", () => {
    const a = assess({ ...base, feedstocks: [{ id: "lab", type: "food_waste", quantity: 1000, dryMatterPct: 20, vsPctOfDm: 90, methaneYieldLPerKgVs: 450, methanePct: 62, nKgT: 6 }] }, UA);
    const measured = (a.marketEvidence ?? []).filter((p) => p.origin === "MEASURED").map((p) => p.id);
    expect(measured).toEqual(["feed.lab.dm", "feed.lab.vs", "feed.lab.bmp", "feed.lab.ch4", "feed.lab.n"]);
    expect(a.dataAudit?.checks.find((c) => c.parameterId === "feed.lab.bmp")?.status).toBe("REVIEW_REQUIRED");
  });

  it("a characterised residue or wastewater gets a financial result from modelled costs; landfill gas still needs budgets", () => {
    const residue = example("se_ras_sludge");
    const p = residue.process!;
    const blank = { ...residue, process: { ...p, processCapexLocal: undefined, processOpexLocalYear: undefined, residualCostLocalT: undefined, auxiliaryKwhYear: undefined, auxiliaryHeatKwhYear: undefined } } as ProjectInput;
    const a = run(blank);
    expect(a.financialsAvailable).toBe(true);
    expect(a.scenarios.base.process?.modelledCosts).toEqual(["processCapexLocal", "processOpexLocalYear", "residualCostLocalT", "auxiliaryKwhYear", "auxiliaryHeatKwhYear"]);
    expect(a.scenarios.base.process!.capexEur).toBeGreaterThan(0);
    expect(a.scenarios.base.energy.elParasiticKwh ?? 1).toBeGreaterThan(0);
    const ww = EXAMPLES.find((e) => e.input.process?.kind === "wastewater")!.input;
    const wwBlank = { ...ww, process: { ...ww.process!, processCapexLocal: undefined, auxiliaryKwhYear: undefined } } as ProjectInput;
    const w = run(wwBlank);
    expect(w.financialsAvailable).toBe(true);
    expect(w.scenarios.base.process?.modelledCosts).toEqual(["processCapexLocal", "auxiliaryKwhYear"]);
    // Judgement reactor cost: own power is the gas-energy share only, and the verdict can never be STRONG.
    expect(w.scenarios.base.energy.elParasiticKwh ?? 1).toBeGreaterThan(0);
    expect(w.confidence.level).toBe("LOW");
    expect(w.verdict.id).not.toBe("STRONG");
    expect(w.confidence.factors?.some((f) => f.id === "process_costs_modelled" && f.owner === "client")).toBe(true);
    const lf = EXAMPLES.find((e) => e.input.process?.kind === "landfill")!.input;
    expect(run({ ...lf, process: { ...lf.process!, processCapexLocal: undefined } } as ProjectInput).financialsAvailable).toBe(false);
  });
});

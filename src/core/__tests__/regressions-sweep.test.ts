import { describe, expect, it } from "vitest";
import { assess } from "../assess";
import { EXAMPLES } from "../examples";
import { getCountry } from "@/countries";
import { buildInput, nonFinitePaths, run } from "./scenario-matrix";

/** One test per defect class found by the scenario sweep and the property tests. */
describe("defects found by the sweep", () => {
  it("methane-loss ratio is null, never Infinity, when losses have nothing to offset", () => {
    const r = run(buildInput("farm", "tiny", "dairy", "minimal", "UA", "kyiv"));
    if (!r.ok) throw new Error(r.error);
    expect(r.a.methane.co2eTonnesYear).toBeGreaterThan(0);
    expect(r.a.methane.displacedCo2eTonnesYear).toBe(0);
    expect(r.a.methane.ratio).toBeNull();
    expect(nonFinitePaths(r.a)).toEqual([]);
    expect(JSON.parse(JSON.stringify(r.a)).methane.ratio).toBeNull(); // survives storage unchanged
    expect(r.a.methane.advice[0]).toMatch(/cancel the climate benefit/i); // the warning still fires
  });

  it("CHP sizing terminates for absurdly large gas flows (the engine round-up loop used to spin forever above 1e16 kW)", () => {
    const base = EXAMPLES.find((e) => e.id === "dairy_400")!.input;
    const t = Date.now();
    const a = assess({ ...base, feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 1e18 }] }, getCountry("UA"), { uncertainty: false });
    expect(Date.now() - t).toBeLessThan(5000);
    expect(nonFinitePaths(a)).toEqual([]);
  });

  it("assess refuses non-finite numbers instead of returning NaN results", () => {
    const base = EXAMPLES.find((e) => e.id === "dairy_400")!.input;
    for (const quantity of [NaN, Infinity, -Infinity]) expect(() => assess({ ...base, feedstocks: [{ id: "a", animal: "dairy_cow", quantity }] }, getCountry("UA"))).toThrow(/non-finite/);
    expect(() => assess({ ...base, energy: { ...base.energy, electricityPriceLocalPerKwh: NaN } }, getCountry("UA"))).toThrow(/non-finite/);
  });
});

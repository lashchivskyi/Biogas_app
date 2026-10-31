import { describe, expect, it } from "vitest";
import { assess, buildParams } from "../assess";
import { EXAMPLES } from "../examples";
import { redShares } from "../ghg";
import { getCountry } from "@/countries";

const p = buildParams(getCountry("DE"));
const mix = (manure: number) => redShares([{ substrate: "manure", tonnes: manure, dryMatterPct: 10 }, { substrate: "maize", tonnes: 100 - manure, dryMatterPct: 35 }], p);
const value = (option: string, manure: number) => mix(manure).reduce((a, s) => a + s.share * p.get(`eng.ghg.bm.${s.substrate}.${option}`), 0);

describe("RED climate case", () => {
  it("reproduces the Directive's own manure–maize mixture defaults from the single-substrate values", () => {
    // Annex VI part D, biomethane, manure–maize mixtures on a fresh-mass basis, default values (g CO2e/MJ). The published
    // single-substrate values are rounded to whole grams, so the weighted result may differ by about 1 g.
    expect(Math.abs(value("closed_offgas", 80) - (-12))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(value("closed_offgas", 70) - (1))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(value("closed_offgas", 60) - (10))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(value("open", 80) - (57))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(value("closed", 70) - (22))).toBeLessThanOrEqual(1.5);
  });

  it("gives a manure-only CHP plant with closed storage a saving above 100 % and treats it as a separate case", () => {
    const input = EXAMPLES.find((e) => e.id === "dairy_400")!.input;
    const a = assess(input, getCountry(input.countryCode));
    const g = a.ghg!;
    expect(g.product).toBe("electricity");
    expect(g.shares).toEqual([{ substrate: "manure", share: 1 }]);
    expect(g.feedGMJ).toBe(g.digestate === "closed" ? -84 : 3);
    expect(g.saving).toBeGreaterThan(1);
    expect(g.meetsMinimum).toBe(true);
    expect(g.avoidedTco2eYear).toBeGreaterThan(0);
  });

  it("flags food-waste biomethane with open digestate storage as below the RED minimum", () => {
    const input = EXAMPLES.find((e) => e.id === "se_biowaste_fuel")!.input;
    const g = assess(input, getCountry(input.countryCode)).ghg!;
    expect(g.product).toBe("biomethane");
    expect(g.digestate).toBe("open");
    expect(g.meetsMinimum).toBe(false);
  });
});

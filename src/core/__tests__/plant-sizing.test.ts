import { describe, expect, it } from "vitest";
import { assess, ROUTES } from "../assess";
import { EXAMPLES } from "../examples";
import { SCENARIOS } from "../scenarios";
import { getCountry } from "@/countries";

/**
 * The plant is built once, for the base case. Conservative and optimistic scenarios change what the built plant
 * earns and what it costs to buy, never its size (docs/ai/DECISIONS.md, 2026-10-31).
 */
describe("one plant, three scenarios", () => {
  for (const e of EXAMPLES) {
    it(`${e.id}: digester, engine and storage are the same in every scenario of every route`, () => {
      const a = assess(e.input, getCountry(e.input.countryCode), { asOfDate: "2026-10-31", uncertainty: false });
      for (const route of ROUTES) {
        const { conservative: c, base: b, optimistic: o } = a.routeMatrix[route];
        for (const s of [c, o]) {
          expect(s.design.workingVolumeM3).toBe(b.design.workingVolumeM3);
          expect(s.design.storageVolumeM3).toBe(b.design.storageVolumeM3);
          expect(s.energy.chpKwEl).toBe(b.energy.chpKwEl);
          expect(s.kwElEquivalent).toBe(b.kwElEquivalent);
          expect(s.plantClass).toBe(b.plantClass);
        }
      }
    });
  }

  it("CAPEX differs between scenarios only by the price multiplier", () => {
    for (const e of EXAMPLES.filter((x) => !x.input.process && !x.input.finance?.capexQuoteLocal)) {
      const a = assess(e.input, getCountry(e.input.countryCode), { asOfDate: "2026-10-31", uncertainty: false });
      for (const route of ROUTES) {
        const { conservative: c, base: b, optimistic: o } = a.routeMatrix[route];
        expect(Math.abs(c.capex.totalEur / b.capex.totalEur / SCENARIOS.conservative.capexMult - 1), `${e.id} ${route}`).toBeLessThan(0.01);
        expect(Math.abs(o.capex.totalEur / b.capex.totalEur / SCENARIOS.optimistic.capexMult - 1), `${e.id} ${route}`).toBeLessThan(0.01);
      }
    }
  });

  it("a built upgrader treats no more than its design flow: extra gas is flared, not sold", () => {
    const e = EXAMPLES.find((x) => x.id === "es_olive")!;
    const a = assess(e.input, getCountry(e.input.countryCode), { asOfDate: "2026-10-31", uncertainty: false });
    const { base, optimistic } = a.routeMatrix.biomethane;
    const designFlow = base.energy.rawBiogasDesignNm3PerHour;
    const rawPerHour = optimistic.energy.ch4ToUpgraderM3 / optimistic.energy.rawBiogasCh4Share / 8760;
    expect(rawPerHour).toBeLessThanOrEqual(designFlow + 1e-6);
    expect(optimistic.energy.biomethaneNm3).toBeGreaterThanOrEqual(base.energy.biomethaneNm3 * 0.9);
  });
});

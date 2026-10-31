import { describe, expect, it } from "vitest";
import { assess, buildParams } from "../assess";
import { NO_MODS, type Modifiers } from "../context";
import { runScenarioRoute } from "../economics";
import { EXAMPLES } from "../examples";
import { tr } from "../i18n";
import { projectRegion } from "../location";
import { SCENARIOS } from "../scenarios";
import type { ProjectInput, RouteId } from "../types";
import { getCountry } from "@/countries";

const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;

function npvWith(input: ProjectInput, route: RouteId, mods: Partial<Modifiers>): number {
  const country = getCountry(input.countryCode);
  const params = buildParams(country, input.regionId, input.energy, input.city);
  const ctx = { input, country, params, scenario: SCENARIOS.base, mods: { ...NO_MODS, ...mods }, region: projectRegion(input, country), fx: params.get("econ.fx_local_per_eur"), lang: "en" as const, t: tr("en") };
  return runScenarioRoute(ctx, route).fin.npvEur;
}

describe("absolute break-even values", () => {
  it("each reported break-even value returns NPV to zero for every reference project", () => {
    for (const { id, input } of EXAMPLES) {
      const a = assess(input, getCountry(input.countryCode));
      const base = a.scenarios.base;
      const tolerance = Math.max(1, base.capex.totalEur * 1e-9);
      const be = a.breakEven;
      if (be.maxCapexEur != null) expect(npvWith(input, a.bestRoute, { capex: be.maxCapexEur / base.capex.totalEur }), `${id}: CAPEX`).toBeCloseTo(0, -Math.log10(tolerance));
      if (be.product) {
        expect(be.product.currentEur, `${id}: product value`).toBeGreaterThan(0);
        expect(npvWith(input, a.bestRoute, { productPrice: be.product.breakEvenEur / be.product.currentEur }), `${id}: product`).toBeCloseTo(0, -Math.log10(tolerance));
      }
      if (be.feedstockEurT != null) expect(npvWith(input, a.bestRoute, { feedstockEurT: be.feedstockEurT }), `${id}: feedstock`).toBeCloseTo(0, -Math.log10(tolerance));
      // Signs agree with the base NPV: a positive project has headroom, a negative one needs a better price.
      if (be.product && base.fin.npvEur > 0) expect(be.product.breakEvenEur, id).toBeLessThan(be.product.currentEur);
      if (be.product && base.fin.npvEur < 0) expect(be.product.breakEvenEur, id).toBeGreaterThan(be.product.currentEur);
      if (be.feedstockEurT != null) expect(Math.sign(be.feedstockEurT), id).toBe(Math.sign(base.fin.npvEur));
      if (be.maxCapexEur != null) expect(be.maxCapexEur > base.capex.totalEur, id).toBe(base.fin.npvEur > 0);
    }
  });

  it("states biomethane per Nm³ and per MWh LHV consistently", () => {
    const a = assess(ex("es_olive"), getCountry("ES"));
    const p = a.routesBase.biomethane;
    expect(a.bestRoute).toBe("biomethane");
    const product = a.breakEven.product!;
    expect(product.unit).toBe("EUR/Nm3");
    const lhv = buildParams(getCountry("ES")).get("eng.ch4_lhv_kwh_m3") * (p.energy.biomethaneCh4Share ?? 0.97);
    expect(product.currentEurMwh! * lhv / 1000).toBeCloseTo(product.currentEur, 9);
    expect(product.breakEvenEurMwh! / product.currentEurMwh!).toBeCloseTo(product.breakEvenEur / product.currentEur, 9);
  });

  it("leaves the base results unchanged (the new levers default to neutral)", () => {
    const input = ex("dairy_400");
    const a = assess(input, getCountry(input.countryCode));
    expect(npvWith(input, a.bestRoute, {})).toBeCloseTo(a.scenarios.base.fin.npvEur, 6);
  });
});

describe("supplier quote check", () => {
  // A CHP project whose break-even CAPEX is reachable, so the installed-price ceiling exists.
  const input = EXAMPLES.map((e) => e.input).find((i) => {
    const a = assess(i, getCountry(i.countryCode));
    return a.bestRoute === "chp" && !i.process && (a.breakEven.maxCapexEur ?? 0) > 0;
  })!;
  const country = getCountry(input.countryCode);
  const withQuote = (factor: number) => {
    const plain = assess(input, country);
    const modelled = plain.routesBase.chp.capex.totalEur;
    return { modelled, a: assess({ ...input, finance: { ...input.finance, capexQuoteLocal: modelled * plain.fx * factor, capexQuoteRoute: "chp" } }, country) };
  };

  it("places the quote against the model's own optimistic–conservative range", () => {
    for (const [factor, position] of [[0.5, "below"], [1, "within"], [1.6, "above"]] as const) {
      const { modelled, a } = withQuote(factor);
      const q = a.quoteCheck!;
      expect(q.route).toBe("chp");
      expect(q.position, `factor ${factor}`).toBe(position);
      expect(q.modelledEur).toBeCloseTo(modelled, 3);
      expect(q.quoteEur).toBeCloseTo(modelled * factor, 3);
      expect(q.modelRangeEur[0]).toBeLessThan(q.modelledEur);
      expect(q.modelRangeEur[1]).toBeGreaterThan(q.modelledEur);
      expect(q.scope.reduce((s, l) => s + l.eur, 0)).toBeCloseTo(q.modelledEur, 3);
      expect(q.capacity?.unit).toBe("kWe");
    }
  });

  it("reports the installed price at which the quoted route breaks even", () => {
    const { a } = withQuote(1);
    const max = a.quoteCheck!.maxCapexEur!;
    const again = assess({ ...input, finance: { ...input.finance, capexQuoteLocal: max * a.fx, capexQuoteRoute: "chp" } }, country);
    expect(Math.abs(again.routesBase.chp.fin.npvEur)).toBeLessThan(1);
  });

  it("is absent without a quote", () => {
    expect(assess(input, country).quoteCheck).toBeUndefined();
  });
});

describe("plant size comparison", () => {
  it("reproduces the entered size and re-sizes every route with the feedstock", () => {
    const input = ex("dairy_400");
    const a = assess(input, getCountry(input.countryCode));
    const now = a.scale!.find((p) => p.multiplier === 1)!;
    for (const r of ["chp", "boiler", "biomethane"] as const) {
      expect(now.routes[r].npvEur, r).toBeCloseTo(a.routesBase[r].fin.npvEur, 3);
      expect(now.routes[r].capexEur, r).toBeCloseTo(a.routesBase[r].capex.totalEur, 3);
    }
    const sizes = a.scale!.map((p) => p.routes.chp.kwEl);
    expect([...sizes].sort((x, y) => x - y)).toEqual(sizes);
    expect(a.scale!.at(-1)!.tonnesYear).toBeCloseTo(a.scenarios.base.feed.tonnesYear * 3, 6);
  });

  it("is absent for process inputs", () => {
    const input = ex("ca_brewery_cod");
    expect(assess(input, getCountry(input.countryCode)).scale).toBeUndefined();
  });
});

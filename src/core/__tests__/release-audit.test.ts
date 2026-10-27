import { describe, expect, it } from "vitest";
import { assess, buildParams, ROUTES } from "../assess";
import { EXAMPLES } from "../examples";
import { CHP_REFERENCE, ENGINEERING_MAP } from "../engineeringParams";
import { chpEtaEl, chpEtaTh } from "../energy";
import { checkEvidence, fingerprint, periodEnd } from "../modelAudit";
import { prov } from "../params";
import { npv } from "../finance";
import type { CountryAdapter } from "../country";
import { COUNTRIES, getCountry } from "@/countries";
import { discountFor, electricityFor, fertiliserFor, fxFor, gasFor, spotFor } from "@/countries/sources";
import statistics from "@/countries/data/statistics.json";
import risk from "@/countries/data/country-risk.json";
import { inputSchema } from "@/server/validate";

const template = EXAMPLES.find((e) => e.id === "slaughter_5000")!.input;
const asOfDate = "2026-10-27";
const priceId = "econ.electricity_retail_eur_kwh";

describe("release gate: country, scale and regional reconciliation", () => {
  for (const country of Object.values(COUNTRIES)) {
    it(`${country.code}: three sizes × three routes × three scenarios reconcile`, () => {
      for (const tonnes of [500, 10000, 100000]) {
        const input = { ...template, countryCode: country.code, regionId: country.regions[0].id,
          feedstocks: [{ id: "matrix", type: "food_waste" as const, quantity: tonnes }],
          energy: { ...template.energy, electricityKwhYear: tonnes * 100, electricityPriceLocalPerKwh: undefined, gasM3Year: tonnes * 10, gasPriceLocalPerM3: undefined },
        };
        expect(inputSchema.safeParse(input).success).toBe(true);
        const a = assess(input, country, { asOfDate });
        const p = buildParams(country, input.regionId, input.energy);
        expect(a.dataAudit!.asOfDate).toBe(asOfDate);
        expect(a.confidence.level).not.toBe("HIGH");
        for (const route of ROUTES) for (const r of Object.values(a.routeMatrix[route])) {
          const e = r.energy, f = r.fin;
          expect(Number.isFinite(f.npvEur)).toBe(true);
          expect(r.capex.totalEur).toBeGreaterThan(0);
          expect(e.ch4LeakedM3 + e.ch4ToChpM3 + e.ch4ToBoilerM3 + e.ch4ToUpgraderM3 + e.ch4FlaredM3).toBeCloseTo(e.ch4ProducedM3, 4);
          expect(e.elGrossKwh - e.elParasiticKwh).toBeCloseTo(e.elNetKwh - e.elPurchasedKwh, 4);
          expect(e.heatProducedKwh + e.heatExternalPurchasedKwh).toBeCloseTo(e.heatDigesterKwh + e.heatNetAvailableKwh, 4);
          expect(e.elGrossKwh + e.heatProducedKwh).toBeLessThanOrEqual(e.gasEnergyKwh + 1e-4);
          if (route === "biomethane") expect(e.biomethaneNm3 * p.get("eng.biomethane_ch4_purity") + e.upgradingSlipM3).toBeCloseTo(e.ch4ToUpgraderM3, 4);
          expect(r.opexRev.revenueEur - r.opexRev.opexEur).toBeCloseTo(f.ebitdaEurYear, 4);
          expect(npv(p.get("econ.discount_rate"), f.cashFlows)).toBeCloseTo(f.npvEur, 4);
        }
      }
    });
  }

  it("every supported region is accepted with its own country and rejected with a foreign one", () => {
    for (const country of Object.values(COUNTRIES)) for (const region of country.regions) {
      const input = { ...template, countryCode: country.code, regionId: region.id };
      expect(inputSchema.safeParse(input).success, `${country.code}/${region.id}`).toBe(true);
      const a = assess(input, country, { asOfDate });
      expect(a.input.regionId).toBe(region.id);
      expect(a.climate).toBeDefined();
      for (const route of ROUTES) expect(Number.isFinite(a.routesBase[route].fin.npvEur)).toBe(true);
      const foreign = Object.values(COUNTRIES).find((c) => !c.regions.some((r) => r.id === region.id))!;
      expect(inputSchema.safeParse({ ...input, countryCode: foreign.code }).success).toBe(false);
      expect(() => assess({ ...input, countryCode: foreign.code }, foreign)).toThrow(/Region/);
      expect(() => assess(input, foreign)).toThrow(/country/);
    }
  });
});

describe("release gate: temporal evidence, units and actual calculation inputs", () => {
  it("does not invent dates or confuse publication/download with observation", () => {
    const p = prov("econ.test", "Reference", 1, "EUR", "FACT", "Official source", "HIGH");
    expect(p.date).toBe("undated");
    expect(checkEvidence(p, asOfDate).status).toBe("UNDATED");
    expect(checkEvidence({ ...p, date: asOfDate, evidence: { checkedOn: asOfDate, period: "2008", urls: [], scope: "historic", method: "historic" } }, asOfDate).status).toBe("REVIEW_REQUIRED");
    expect(periodEnd("2025-S2 & 2026-S1")).toBe("2026-06-30");
    expect(periodEnd("2026-Q2")).toBe("2026-06-30");
    expect(periodEnd("2026-02-31")).toBeUndefined();
    expect(checkEvidence(ENGINEERING_MAP["eng.ch4_lhv_kwh_m3"], asOfDate).status).toBe("CONSTANT");
    expect(checkEvidence(ENGINEERING_MAP["eng.capex.chp_eur_kw_100"], asOfDate).status).toBe("ASSUMPTION");
    expect(ENGINEERING_MAP["eng.capex.chp_eur_kw_100"].date).toBe("2008-12-31");
  });

  it("expired applicable tariffs prevent a confident recommendation, including derived heat values", () => {
    const country = getCountry("TH");
    const input = { ...template, countryCode: "TH", regionId: country.regions[0].id, energy: { ...template.energy, electricityKwhYear: 1000000, electricityPriceLocalPerKwh: undefined, gasPriceLocalPerM3: undefined, heatNeed: "none" as const } };
    const current = assess(input, country, { asOfDate });
    expect(current.bestRoute).toBe("chp");
    expect(current.dataAudit!.checks.find((c) => c.parameterId === priceId)!.status).toBe("WITHIN_REVIEW_WINDOW");
    const expired = assess(input, country, { asOfDate: "2027-01-01" });
    expect(expired.dataAudit!.checks.find((c) => c.parameterId === priceId)!.status).toBe("EXPIRED");
    expect(expired.verdict.id).toBe("INSUFFICIENT_DATA");
    expect(expired.confidence.level).toBe("LOW");
    expect(checkEvidence({ ...buildParams(country).prov("econ.heat_value_eur_kwh_th"), evidence: { checkedOn: asOfDate, period: "2026-09", validUntil: "2026-10-01", urls: [], scope: "gas", method: "gas / efficiency" } }, asOfDate).status).toBe("EXPIRED");
  });

  it("uses selected annual consumption bands, correct kWh/MWh/GJ units and latest semester in the engine", () => {
    const country = getCountry("DE");
    for (const [kwh, band] of [[19999, "MWH_LT20"], [20000, "MWH20-499"], [500000, "MWH500-1999"], [2000000, "MWH2000-19999"], [20000000, "MWH20000-69999"], [70000000, "MWH70000-149999"], [150000000, "MWH_GE150000"]] as const) {
      const sourced = electricityFor("DE", undefined, kwh)!;
      const row = statistics.electricity.DE.bands[band];
      expect(sourced.value).toBe(row.eurKwh);
      expect(sourced.evidence!.observedThrough).toBe(periodEnd(row.periods.join(" ")));
      expect(buildParams(country, country.regions[0].id, { ...template.energy, electricityKwhYear: kwh }).get(priceId)).toBe(sourced.value);
    }
    expect(gasFor("DE", 10000)!.value).toBeCloseTo(statistics.gas.DE.bands["GJ_LT1000"].eurMwh * 1.11, 8);
    expect(gasFor("BR")!.value).toBeCloseTo(283 / fxFor("BRL")!.value * 1.11, 8);
    expect(spotFor("DE")!.date).toBe(statistics.dayAhead.DE.to);
    expect(fxFor("VND")!.confidence).toBe("LOW");
    expect(checkEvidence(buildParams(getCountry("VN")).prov("econ.fx_local_per_eur"), asOfDate).status).toBe("REVIEW_REQUIRED");
    expect(gasFor("GB")!.value).toBeCloseTo(40.3 / fxFor("GBP")!.value * 1.11, 8);
    expect(gasFor("GB")!.date).toBe("2026-06-30");
  });

  it("uses paired biogas electrical/thermal ratings, not natural-gas efficiency or total-minus-electric", () => {
    const get = (id: string) => ENGINEERING_MAP[id].value;
    for (const [kw, el, th] of CHP_REFERENCE) {
      expect(chpEtaEl(kw, get)).toBe(el);
      expect(chpEtaTh(kw, get)).toBe(th);
      expect(el + th).toBeLessThan(1);
    }
    expect(chpEtaEl(800, get)).toBe(.431);
    expect(chpEtaTh(800, get)).toBe(.433);
  });

  it("uses the corrected July risk edition and preserves latest-month versus trailing-year fertiliser evidence", () => {
    expect(risk.publishedOn).toBe("2026-07-09");
    expect(risk.countries.MD.crp).toBeCloseTo(.06807729550154264, 12);
    expect(discountFor("MD")!.value).toBeCloseTo(Math.round((.06 + .6 * risk.countries.MD.crp) * 1000) / 1000, 12);
    const nitrogen = fertiliserFor("N");
    expect(nitrogen.value).toBeCloseTo(507.3 / 1000 / .46 / fxFor("USD")!.value * 1.35, 10);
    expect(nitrogen.evidence!.observedThrough).toBe("2026-09-30");
    expect(nitrogen.evidence!.components!.find((c) => c.name.startsWith("Latest-month"))!.value).toBe(407.5);
    expect(nitrogen.range!.low).toBeLessThan(nitrogen.value);
    expect(nitrogen.range!.high).toBeGreaterThan(nitrogen.value);
    expect(fertiliserFor("N", .45).value).toBeCloseTo(nitrogen.value * .45, 10);
  });

  it("proves changed tariffs propagate to cash flows and data fingerprints, and repeated inputs reproduce", () => {
    const country = getCountry("DE");
    const input = { ...template, countryCode: "DE", regionId: country.regions[0].id, energy: { ...template.energy, electricityPriceLocalPerKwh: undefined } };
    const a = assess(input, country, { asOfDate });
    const changed: CountryAdapter = { ...country, paramsForProject: undefined, paramsForRegion: undefined, params: country.params.map((p) => p.id === priceId ? { ...p, value: p.value * 2 } : p) };
    const b = assess(input, changed, { asOfDate });
    expect(b.routesBase.chp.fin.npvEur).toBeGreaterThan(a.routesBase.chp.fin.npvEur);
    expect(b.dataAudit!.dataVersion).not.toBe(a.dataAudit!.dataVersion);
    expect(b.dataAudit!.inputVersion).toBe(a.dataAudit!.inputVersion);
    expect(assess(input, country, { asOfDate })).toEqual(a);
    expect(fingerprint({ x: 1, y: 2 })).toBe(fingerprint({ y: 2, x: 1 }));
    expect(() => assess(input, country, { asOfDate: "2026-02-30" })).toThrow(/date/);
  });
});

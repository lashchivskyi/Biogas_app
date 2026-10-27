import { describe, expect, it } from "vitest";
import { assess, buildParams } from "../assess";
import { HOURS_IN_MONTH } from "../climate";
import { EXAMPLES } from "../examples";
import { dryBiogasMassKg } from "../massBalance";
import { SCENARIOS } from "../scenarios";
import { getCountry, UA } from "@/countries";

const example = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("engineering and financial reconciliation", () => {
  it("reconciles monthly feed, methane, electricity and year-one cash for every reference project", () => {
    for (const { id, input } of EXAMPLES) {
      const result = assess(input, getCountry(input.countryCode));
      for (const route of ["chp", "boiler", "biomethane"] as const) {
        const r = result.routesBase[route];
        const { feed, energy, opexRev, fin } = r;
        expect(sum(feed.monthlyTonnes), `${id}: fresh mass`).toBeCloseTo(feed.tonnesYear, 6);
        expect(sum(feed.monthlyVsTonnes), `${id}: VS`).toBeCloseTo(feed.vsTonnesYear, 6);
        expect(sum(feed.monthlyCh4M3), `${id}: methane`).toBeCloseTo(feed.ch4M3Year, 6);
        const params = buildParams(getCountry(input.countryCode));
        const storageMonths = params.get("eng.storage_months");
        const months = r.design.tech.digestion === "high_rate" || r.design.tech.digestion === "covered_lagoon" ? Math.min(storageMonths, 1) : storageMonths;
        expect(feed.tonnesYear - dryBiogasMassKg(feed, params) / 1000, `${id}: dry-gas mass balance`)
          .toBeCloseTo(r.design.storageVolumeM3 * 12 / months, 4);
        expect(sum(energy.monthly.gasKwh), `${id}: methane LHV`).toBeCloseTo(energy.gasEnergyKwh, 6);
        expect(energy.ch4LeakedM3 + energy.ch4ToChpM3 + energy.ch4ToBoilerM3 + energy.ch4ToUpgraderM3 + energy.ch4FlaredM3, `${id}: CH4 allocation`)
          .toBeCloseTo(energy.ch4ProducedM3, 4);
        if (route === "biomethane") expect(energy.ch4ToUpgraderM3 - energy.upgradingSlipM3, `${id}: biomethane CH4`)
          .toBeCloseTo(energy.biomethaneNm3 * buildParams(getCountry(input.countryCode)).get("eng.biomethane_ch4_purity"), 4);
        expect(sum(energy.monthly.elNetKwh), `${id}: monthly net power`).toBeCloseTo(energy.elNetKwh, 6);
        expect(energy.elGrossKwh - energy.elParasiticKwh, `${id}: electricity balance`).toBeCloseTo(energy.elNetKwh - energy.elPurchasedKwh, 6);
        expect(energy.elSelfConsumedKwh + energy.elExportedKwh, `${id}: power allocation`).toBeLessThanOrEqual(energy.elNetKwh + 1e-6);
        expect(sum(opexRev.revenue.map((l) => l.eur)), `${id}: revenue`).toBeCloseTo(opexRev.revenueEur, 6);
        expect(sum(opexRev.opex.map((l) => l.eur)), `${id}: OPEX`).toBeCloseTo(opexRev.opexEur, 6);
        expect(opexRev.revenueEur - opexRev.opexEur, `${id}: EBITDA`).toBeCloseTo(fin.ebitdaEurYear, 6);
        expect(fin.cashFlows[0], `${id}: initial investment`).toBeCloseTo(-fin.capexEur, 6);
        expect(fin.cashFlows[1], `${id}: year-one cash`).toBeCloseTo(fin.revenueEurYear * buildParams(getCountry(input.countryCode)).get("eng.rampup_year1") - fin.opexEurYear, 6);
      }
    }
  });

  it("sizes a seasonal upgrading train for peak monthly flow", () => {
    const r = assess(example("pl_frozen_veg"), getCountry("PL")).routeMatrix.biomethane.base;
    expect(r.energy.rawBiogasDesignNm3PerHour).toBeGreaterThan(r.energy.rawBiogasNm3PerHour);
    const upgrading = r.capex.lines.find((l) => l.id === "upgrading")!.eur;
    expect(upgrading).toBeGreaterThan(0);
    expect(sum(HOURS_IN_MONTH)).toBe(8766); // calendar-year monthly convention used in the model
  });

  it("uses explicit DM, VS and BMP instead of catalogue figures when supplied", () => {
    const input = {
      ...example("dairy_400"),
      feedstocks: [{ id: "lab", type: "food_waste" as const, quantity: 1000, dryMatterPct: 20, vsPctOfDm: 90, methaneYieldLPerKgVs: 450 }],
    };
    const a = assess(input, UA);
    const line = a.scenarios.base.feed.lines[0];
    expect(line.vsTonnesYear).toBeCloseTo(180, 6);
    expect(line.ch4M3Year / line.vsTonnesYear).toBeCloseTo(450, 6);
    expect(a.scenarios.conservative.feed.lines[0].methaneYieldLPerKgVs).toBe(450);
    expect(a.scenarios.optimistic.feed.lines[0].methaneYieldLPerKgVs).toBe(450);
    expect(a.confidence.level).not.toBe("HIGH"); // a typed number alone is not a verified lab result
  });

  it("does not monetise unquantified heat or build a customer heat main without demand", () => {
    const base = example("dairy_400");
    const noQuantity = assess({ ...base, energy: { ...base.energy, heatKwhYear: undefined, gasM3Year: undefined } }, UA);
    expect(noQuantity.routesBase.chp.energy.heatUsefulKwh).toBe(0);
    expect(noQuantity.routesBase.chp.opexRev.revenue.some((l) => l.id === "heat")).toBe(false);
    const noDemand = assess({ ...base, energy: { ...base.energy, heatNeed: "none" } }, UA);
    expect(noDemand.routesBase.chp.capex.lines.some((l) => l.id === "heat_network")).toBe(false);
  });

  it("applies nitrogen retention before valuing digestate fertiliser", () => {
    const a = assess(example("dairy_400"), UA);
    const p = buildParams(UA);
    const expected = a.scenarios.base.feed.nKgYear
      * p.get("eng.digestate_n_retention")
      * p.get("eng.digestate_n_gain_own_manure")
      * p.get("econ.fert_n_eur_kg")
      * SCENARIOS.base.digestateValueFactor;
    expect(a.digestate.fertiliserValueEurYear).toBeCloseTo(expected, 6);
  });

  it("does not claim an external supplier's disposal saving or opportunity value", () => {
    const base = example("dairy_400");
    const input = { ...base, feedstocks: [{
      id: "external", type: "food_waste" as const, quantity: 1000, delivered: true, distanceKm: 10,
      purchasePricePerTonneLocal: -100, currentDisposalCostPerTonneLocal: 200,
      opportunityValuePerTonneLocal: 300, handling: "paid_disposal" as const,
    }] };
    const line = assess(input, UA).scenarios.base.feed.lines[0];
    expect(line.purchaseCostEurYear).toBeLessThan(0);
    expect(line.disposalSavingEurYear).toBe(0);
    expect(line.opportunityCostEurYear).toBe(0);
  });

  it("counts the larger of own-stream purchase cost and alternative sale value", () => {
    const base = example("dairy_400");
    const input = { ...base, feedstocks: [{
      id: "own", type: "brewery_spent_grain" as const, quantity: 1000,
      purchasePricePerTonneLocal: 100, opportunityValuePerTonneLocal: 300,
    }] };
    const line = assess(input, UA).scenarios.base.feed.lines[0];
    expect(line.purchaseCostEurYear + line.opportunityCostEurYear).toBeCloseTo(300 * line.tonnesYear / buildParams(UA).get("econ.fx_local_per_eur"), 6);
  });

  it("adds sanitisation heat and sizes ABP equipment for seasonal peak throughput", () => {
    const base = example("dairy_400");
    const yearRound = assess({ ...base, feedstocks: [{ id: "abp", type: "food_waste", quantity: 12000, monthsActive: 12 }] }, UA).routesBase.chp;
    const seasonal = assess({ ...base, feedstocks: [{ id: "abp", type: "food_waste", quantity: 12000, monthsActive: 4 }] }, UA).routesBase.chp;
    expect(yearRound.design.pasteurisationHeatKwhYear).toBeGreaterThan(0);
    expect(seasonal.capex.lines.find((l) => l.id === "pasteurisation")!.eur)
      .toBeGreaterThan(yearRound.capex.lines.find((l) => l.id === "pasteurisation")!.eur);
    const withoutAbp = assess({ ...base, feedstocks: [{ id: "veg", type: "fruit_veg_residues", quantity: 12000 }] }, UA).routesBase.chp;
    expect(withoutAbp.design.pasteurisationHeatKwhYear).toBe(0);
  });

  it("charges road bio-CNG for high-pressure compression beyond membrane upgrading", () => {
    const input = example("br_vinasse");
    const r = assess(input, getCountry("BR")).routeMatrix.biomethane.base;
    expect(r.capex.lines.some((l) => l.id === "cng")).toBe(true);
    expect(r.energy.cngCompressionKwh).toBeCloseTo(r.energy.biomethaneNm3 * buildParams(getCountry("BR")).get("eng.cng_compression_kwh_nm3"), 6);
  });
});

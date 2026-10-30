import { describe, expect, it } from "vitest";
import { assess, allProvenance, buildParams } from "../assess";
import { HOURS_IN_MONTH, HOURS_PER_YEAR } from "../climate";
import { EXAMPLES } from "../examples";
import { ENGINEERING_MAP } from "../engineeringParams";
import { irr, npv } from "../finance";
import { SCENARIOS } from "../scenarios";
import type { CountryAdapter } from "../country";
import { COUNTRIES, getCountry } from "@/countries";
import { capexFactorFor, electricityFor, electricityVariableShareFor, fxFor, gasFor, indiaCbgProcurementPrice, labourOfficialFor } from "@/countries/sources";
import statistics from "@/countries/data/statistics.json";
import calibration from "@/countries/data/capex-calibration.json";

const retail = "econ.electricity_retail_eur_kwh";
const input = EXAMPLES.find((e) => e.id === "slaughter_5000")!.input;
const withValues = (country: CountryAdapter, values: Record<string, number>): CountryAdapter => ({
  ...country, paramsForRegion: undefined, paramsForProject: undefined,
  params: country.params.map((p) => p.id in values ? { ...p, value: values[p.id] } : p),
});

describe("primary-source market calibration", () => {
  it("uses MME May 2026 industrial tariffs and actual macro-regional references, not wholesale PLD", () => {
    const fx = fxFor("BRL")!.value;
    expect(electricityFor("BR")!.value * fx * 1000).toBeCloseTo(840.76, 6);
    expect(electricityFor("BR", "parana")!.value * fx * 1000).toBeCloseTo(720.19, 6);
    expect(electricityFor("BR", "sao-paulo")!.value * fx * 1000).toBeCloseTo(951.49, 6);
    expect(electricityFor("BR")!.evidence!.period).toBe("2026-05");
  });

  it("uses EVN manufacturing voltage-band TOU rather than the all-customer average", () => {
    expect(electricityFor("VN")!.value * fxFor("VND")!.value).toBeCloseTo(1951.714285714, 6);
    expect(electricityVariableShareFor("VN")).toBe(1);
    expect(electricityFor("VN")!.confidence).toBe("MEDIUM");
  });

  it("retains PEA demand/service charges when crediting generation", () => {
    const localPrice = electricityFor("TH")!.value * fxFor("THB")!.value;
    const avoided = localPrice * electricityVariableShareFor("TH");
    const energyOnly = (4.1839 * 65 + 2.6037 * 103) / 168 + 0.1623;
    expect(avoided).toBeCloseTo(energyOnly, 8);
    expect(localPrice - avoided).toBeCloseTo((132.93 * 500 + 312.24) / 200000, 8);
  });

  it("derives Thai labour from BOT/NSO Q2 2026, retaining assumed employer costs/hours", () => {
    const wage = labourOfficialFor("TH")!;
    expect(wage.value * fxFor("THB")!.value).toBeCloseTo(15853.1 * 12 * 1.05 / 2200, 8);
    expect(wage.confidence).toBe("MEDIUM");
    expect(wage.evidence!.assumptions!.length).toBeGreaterThan(0);
    expect(wage.evidence!.components!.find((c) => c.name === "Monthly employee wage")!.origin).toBe("MARKET_DATA");
    expect(wage.evidence!.components!.find((c) => c.name === "Annual working hours")!.origin).toBe("ENGINEERING_ASSUMPTION");
  });

  it("never presents Almaty's tariff as a verified national Kazakhstan tariff", () => {
    expect(electricityFor("KZ", "south")!.value * fxFor("KZT")!.value).toBeCloseTo(43.13, 8);
    expect(electricityFor("KZ", "south")!.confidence).toBe("MEDIUM");
    expect(electricityFor("KZ", "north")!.confidence).toBe("LOW");
    expect(electricityFor("KZ")!.confidence).toBe("LOW");
  });

  it("uses identical regional prices in calculation and exported evidence", () => {
    const country = getCountry("BR");
    const a = assess({ ...input, countryCode: "BR", regionId: "parana", energy: { ...input.energy, electricityPriceLocalPerKwh: undefined } }, country);
    const expected = 720.19 / 1000 / fxFor("BRL")!.value;
    expect(buildParams(country, "parana").get(retail)).toBeCloseTo(expected, 10);
    expect(allProvenance(country, "parana").find((p) => p.id === retail)!.value).toBeCloseTo(expected, 10);
    expect(a.marketEvidence!.find((p) => p.id === retail)!.value).toBeCloseTo(expected, 10);
  });

  it("keeps observed ranges valid and does not promote converted/assumed observations to HIGH", () => {
    for (const code of ["BR", "VN", "TH", "KZ"]) {
      const p = electricityFor(code)!;
      expect(p.range!.low).toBeLessThanOrEqual(p.value);
      expect(p.range!.high).toBeGreaterThanOrEqual(p.value);
      expect(p.evidence!.urls.every((url) => url.startsWith("https://"))).toBe(true);
      expect(p.confidence).not.toBe("HIGH");
    }
  });
});

describe("calorific basis, capacity and finance", () => {
  it("reconciles a Eurostat HHV gas invoice with LHV useful heat", () => {
    const raw = statistics.gas.DE.eurMwh;
    const gas = gasFor("DE")!;
    expect(gas.value).toBeCloseTo(raw * 1.11, 10);
    const heatValue = buildParams(getCountry("DE")).get("econ.heat_value_eur_kwh_th");
    expect(heatValue * ENGINEERING_MAP["eng.boiler_efficiency"].value * 1000 / 1.11).toBeCloseTo(raw, 8);
  });

  it("does not leak a CHP location factor into upgrading or a CBG factor into CHP", () => {
    expect(capexFactorFor("US", "chp")!.value).toBe(1.12);
    expect(capexFactorFor("US", "biomethane")!.value).not.toBe(1.12);
    expect(capexFactorFor("IN", "biomethane")!.value).toBe(0.55);
    expect(capexFactorFor("IN", "chp")!.value).not.toBe(0.55);
    const c = getCountry("US");
    const a = assess({ ...input, countryCode: c.code, regionId: c.regions[0].id }, c);
    const b = assess(a.input, withValues(c, { "econ.capex_factor_chp": capexFactorFor("US", "chp")!.value * 2 }));
    expect(b.routesBase.chp.capex.totalEur).toBeCloseTo(a.routesBase.chp.capex.totalEur * 2, 6);
    expect(b.routesBase.biomethane.capex.totalEur).toBe(a.routesBase.biomethane.capex.totalEur);
  });

  it("sizes installed CHP upward to absorb design gas and normalises loads to the same calendar", () => {
    expect(HOURS_PER_YEAR).toBe(8766);
    const c = getCountry("DE");
    const p = buildParams(c);
    const a = assess({ ...input, countryCode: c.code, regionId: c.regions[0].id }, c);
    const e = a.routesBase.chp.energy;
    const requiredFuelKw = Math.max(...e.monthly.gasKwh.map((g, i) => g / HOURS_IN_MONTH[i])) * HOURS_PER_YEAR / p.get("eng.chp_design_hours");
    expect(e.chpKwEl / e.chpEtaEl + 1e-8).toBeGreaterThanOrEqual(requiredFuelKw);
    expect(e.elSelfConsumedKwh).toBeLessThanOrEqual(input.energy.electricityKwhYear! * p.get("eng.self_consumption_coincidence") + 1e-6);
  });

  it("uses one boiler efficiency to infer gas demand and value its heat", () => {
    const c = getCountry("DE");
    const p = buildParams(c);
    const a = assess({ ...input, countryCode: c.code, regionId: c.regions[0].id, energy: { ...input.energy, heatKwhYear: undefined, gasM3Year: 10000, gasPriceLocalPerM3: 1 } }, c);
    const heat = 10000 * p.get("eng.natgas_lhv_kwh_m3") * p.get("eng.boiler_efficiency");
    expect(a.routesBase.boiler.energy.heatUsefulKwh).toBeLessThanOrEqual(heat);
    const heatRevenue = a.routesBase.boiler.opexRev.revenue.find((r) => r.id === "heat")!.eur;
    expect(heatRevenue).toBeCloseTo(10000 / a.fx * SCENARIOS.base.heatUtilisation, 6);
  });

  it("does not pretend a budget comparison is independent as-built validation", () => {
    const comparison = calibration.comparisons[0];
    expect(comparison.independent).toBe(false);
    expect(comparison.fitId).not.toBe(comparison.id);
    expect(comparison.errorPct).toBeLessThan(0);
    expect(Object.values(calibration.countries).every((c) => !c.applied)).toBe(true);
    const frBudgetRatios = calibration.benchmarks.filter((b) => b.country === "FR" && b.route === "biomethane").map((b) => b.factor);
    expect(buildParams(getCountry("FR")).prov("econ.capex_factor_biomethane").range!.high).toBeGreaterThan(Math.max(...frBudgetRatios));
  });

  it("models the administered Indian CBG price as a separate case without the unmodelled capital aid", () => {
    const c = getCountry("IN");
    const scheme = c.support.schemes.find((s) => s.id === "in.cbg")!;
    expect(scheme.status).toBe("open");
    expect(scheme.capexGrantShare).toBeUndefined();
    expect(indiaCbgProcurementPrice()).toBeCloseTo(2110 * 9.97 * 0.97 * 1.11 / 293.0710701722222 / fxFor("INR")!.value, 10);
    expect(buildParams(c).get("econ.biomethane_price_base_eur_nm3")).toBeLessThan(scheme.biomethaneEurNm3!);
  });

  it("tests country-specific CAPEX bounds against NPV, rather than only attaching metadata", () => {
    const c = getCountry("FR");
    const a = assess({ ...input, countryCode: c.code, regionId: c.regions[0].id }, c);
    const s = a.parameterSensitivity!.find((r) => r.parameterId === `econ.capex_factor_${a.bestRoute}`)!;
    expect(s.lowNpvEur).toBeGreaterThan(a.scenarios.base.fin.npvEur);
    expect(s.highNpvEur).toBeLessThan(a.scenarios.base.fin.npvEur);
  });

  it("does not override a customer's invoice with tariff-reference sensitivity", () => {
    const c = getCountry("TH");
    const a = assess({ ...input, countryCode: c.code, regionId: c.regions[0].id, energy: { ...input.energy, heatNeed: "none", electricityKwhYear: 1000000, electricityPriceLocalPerKwh: 5 } }, c);
    expect(a.bestRoute).toBe("chp");
    expect(a.parameterSensitivity!.some((p) => p.parameterId === retail)).toBe(false);
    expect(a.parameterSensitivity!.some((p) => p.parameterId === "eng.invoice_variable_share")).toBe(true);
    const price = a.marketEvidence!.find((p) => p.id === retail)!;
    expect(price.origin).toBe("USER_INPUT");
    expect(price.value).toBeCloseTo(5 / a.fx, 10);
    expect(price.date).toBe("undated");
  });

  it("does not ask a road-CNG project to meet grid-injection rules", () => {
    const c = getCountry("BR");
    let gridInjection: boolean | undefined;
    const country: CountryAdapter = { ...c, regulatory: (ctx) => { gridInjection = ctx.gasGridInjection; return []; } };
    const a = assess(EXAMPLES.find((e) => e.id === "br_vinasse")!.input, country);
    expect(a.bestRoute).toBe("biomethane");
    expect(a.scenarios.base.capex.lines.some((l) => l.id === "cng")).toBe(true);
    expect(gridInjection).toBe(false);
  });

  it("has consistent route parameter coverage across all supported markets", () => {
    const reference = getCountry("UA").params.filter((p) => p.id.startsWith("econ.")).map((p) => p.id).sort();
    for (const c of Object.values(COUNTRIES)) expect(c.params.filter((p) => p.id.startsWith("econ.")).map((p) => p.id).sort(), c.code).toEqual(reference);
  });

  it("handles IRR boundaries and rejects ambiguous non-conventional cash flows", () => {
    expect(irr([-100, 600])).toBe(5);
    expect(irr([-100, 10])).toBeCloseTo(-0.9, 8);
    expect(irr([-100, 230, -132])).toBeNull();
    expect(irr([0, 0, 0])).toBeNull();
    const flows = [-100, 60, 60, 60];
    expect(npv(irr(flows)!, flows)).toBeCloseTo(0, 5);
  });
});

import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountry } from "@/countries";
import { discountFor, debtRateFor } from "@/countries/sources";
import { assess, buildParams } from "../assess";
import { NO_MODS } from "../context";
import { runScenarioRoute } from "../economics";
import { EXAMPLES } from "../examples";
import { buildFinancials, npv } from "../finance";
import { tr } from "../i18n";
import { projectRegion } from "../location";
import { SCENARIOS } from "../scenarios";

/**
 * Lender-style audit of the money layer: every formula against numbers worked by hand (see the comments), and every
 * reference project's revenue, OPEX and CAPEX lines against quantity × price or the stated share.
 */
describe("cash-flow formulas, worked by hand", () => {
  // CAPEX 1 000 000; energy revenue 300 000 (+2 %/a), other revenue 50 000 and OPEX 200 000 (+2.5 %/a), fixed tariff
  // 100 000 (flat); year-1 start-up 75 % of revenue; 8 %; debt 50 % at 6 % over 2 years.
  const fin = buildFinancials({ capexEur: 1e6, energyRevenue: 300_000, otherRevenue: 50_000, fixedRevenue: 100_000, opexEur: 200_000, horizon: 3, discount: 0.08, energyEsc: 0.02, opexEsc: 0.025, rampYear1: 0.75, debtShare: 0.5, debtRate: 0.06, debtTenor: 2 });

  it("escalates each revenue stream on its own basis and applies the start-up year to revenue only", () => {
    // y1 = 450 000 × 0.75 − 200 000; y2 = 306 000 + 51 250 + 100 000 − 205 000; y3 = 312 120 + 52 531.25 + 100 000 − 210 125
    expect(fin.cashFlows.map((v) => +v.toFixed(2))).toEqual([-1_000_000, 137_500, 252_250, 254_526.25]);
  });
  it("discounts at the stated rate from year 0 (CAPEX undiscounted)", () => {
    // −1e6 + 137 500/1.08 + 252 250/1.08² + 254 526.25/1.08³
    expect(fin.npvEur).toBeCloseTo(-454_370.32, 2);
  });
  it("prices the loan as an annuity and divides each year's EBITDA by it", () => {
    // 500 000 × 0.06 / (1 − 1.06⁻²) = 272 718.45; DSCR 137 500 / 272 718.45 and 252 250 / 272 718.45
    expect(fin.annualDebtServiceEur).toBeCloseTo(272_718.45, 2);
    expect(fin.dscrMin).toBeCloseTo(0.50418, 5);
    expect(fin.dscrAvg).toBeCloseTo(0.71456, 5);
  });
  it("reports simple payback on the steady year (no start-up, no escalation) and no discounted payback when NPV < 0", () => {
    expect(fin.simplePaybackYears).toBe(4); // 1e6 / (450 000 − 200 000)
    expect(fin.ebitdaEurYear).toBe(250_000);
    expect(fin.discountedPaybackYears).toBeNull();
  });
  it("finds the discounted payback inside the year it turns positive", () => {
    // −100 + 60/1.1 + 60/1.21 > 0 in year 2: 1 + (100 − 54.545) / 49.587 = 1.9167
    const f = buildFinancials({ capexEur: 100, energyRevenue: 60, otherRevenue: 0, opexEur: 0, horizon: 3, discount: 0.1, energyEsc: 0, opexEsc: 0, rampYear1: 1, debtShare: 0, debtRate: 0, debtTenor: 0 });
    expect(f.discountedPaybackYears).toBeCloseTo(1.91667, 4);
    expect(f.simplePaybackYears).toBeCloseTo(100 / 60, 10);
    expect(f.dscrMin).toBeNull();
  });
  it("discounted payback is never shorter than simple payback for a project that pays back", () => {
    const f = buildFinancials({ capexEur: 1e6, energyRevenue: 400_000, otherRevenue: 0, opexEur: 100_000, horizon: 15, discount: 0.09, energyEsc: 0.02, opexEsc: 0.025, rampYear1: 0.75, debtShare: 0, debtRate: 0, debtTenor: 0 });
    expect(f.discountedPaybackYears!).toBeGreaterThan(f.simplePaybackYears!);
    expect(npv(0.09, f.cashFlows)).toBeCloseTo(f.npvEur, 6);
  });
});

describe("discount and debt rates (Damodaran CRP)", () => {
  it("every country: nominal pre-tax rate = min(16 %, 6 % + 0.6 × CRP), debt = max(4.5 %, rate − 1.5 pp), with a −1/+2 pp range", () => {
    for (const code of Object.keys(COUNTRIES)) {
      const d = discountFor(code);
      const p = buildParams(getCountry(code));
      if (!d) continue;
      expect(p.get("econ.discount_rate"), code).toBe(d.value);
      expect(d.value, code).toBeLessThanOrEqual(0.16);
      expect(d.value, code).toBeGreaterThanOrEqual(0.06);
      expect(p.prov("econ.discount_rate").range, code).toEqual({ low: +(d.value - 0.01).toFixed(3), high: +(d.value + 0.02).toFixed(3), basis: "engineering" });
      if (code !== "UA") expect(p.get("econ.debt_interest"), code).toBe(debtRateFor(code)!.value);
      expect(debtRateFor(code)!.value, code).toBe(+Math.max(0.045, d.value - 0.015).toFixed(3));
      // Nominal basis: escalation is at least the inflation target, so a flat tariff loses real value.
      expect(p.get("econ.energy_escalation"), code).toBeGreaterThanOrEqual(0.02);
    }
  });
  it("is tested as a parameter sensitivity: a higher rate lowers NPV", () => {
    const ex = EXAMPLES.find((e) => e.id === "dk_cluster")!;
    const s = assess(ex.input, getCountry(ex.input.countryCode), { uncertainty: false }).parameterSensitivity!.find((x) => x.parameterId === "econ.discount_rate")!;
    expect(s.highInput).toBeGreaterThan(s.lowInput);
    expect(s.highNpvEur).toBeLessThan(s.lowNpvEur);
  });
});

describe("money lines of every reference project = quantity × price or the stated share", () => {
  for (const ex of EXAMPLES) {
    it(ex.id, () => {
      const country = getCountry(ex.input.countryCode);
      const a = assess(ex.input, country, { uncertainty: false });
      const p = buildParams(country, ex.input.regionId, ex.input.energy, ex.input.city);
      for (const r of [a.scenarios.conservative, a.scenarios.base, a.scenarios.optimistic]) {
        const rev = (id: string) => r.opexRev.revenue.find((l) => l.id === id)?.eur ?? 0;
        const opx = (id: string) => r.opexRev.opex.find((l) => l.id === id)?.eur ?? 0;
        const cap = (id: string) => r.capex.lines.find((l) => l.id === id)?.eur ?? 0;
        const e = r.energy;
        const tag = `${ex.id}/${r.scenario}/${r.route}`;
        // CAPEX: installation shares on equipment, engineering on the subtotal, contingency on everything before it.
        if (!r.process && r.capex.modelledEur === undefined && cap("electrical") > 0) {
          const late = ["electrical", "piping", "civil", "grid", "engineering", "contingency", "grant"];
          const equipment = r.capex.lines.filter((l) => !late.includes(l.id)).reduce((s, l) => s + l.eur, 0);
          expect(cap("electrical") / equipment, tag).toBeCloseTo(p.get("eng.capex.electrical_share"), 9);
          expect(cap("piping") / equipment, tag).toBeCloseTo(p.get("eng.capex.piping_share"), 9);
          expect(cap("civil") / equipment, tag).toBeCloseTo(p.get("eng.capex.civil_share"), 9);
          const sub = equipment + cap("electrical") + cap("piping") + cap("civil") + cap("grid");
          expect(cap("engineering") / sub, tag).toBeCloseTo(p.get("eng.capex.engineering_share"), 9);
          expect(cap("contingency") / (sub + cap("engineering")), tag).toBeCloseTo(p.get("eng.capex.contingency_share"), 9);
        }
        // Revenue: no subsidy in any base-verdict scenario.
        expect(rev("el_tariff") + rev("support"), tag).toBe(0);
        // Customer prices: the client's own figure if entered, else the national value; both move with the scenario.
        const fx = p.get("econ.fx_local_per_eur");
        const mult = { conservative: 0.85, base: 1, optimistic: 1.1 }[r.scenario];
        const en = ex.input.energy;
        const elPrice = ((en.electricityPriceLocalPerKwh ?? 0) > 0 ? en.electricityPriceLocalPerKwh! / fx : p.get("econ.electricity_retail_eur_kwh")) * mult;
        const heatValue = ((en.heatPriceLocalPerKwh ?? 0) > 0 ? en.heatPriceLocalPerKwh! / fx : (en.gasPriceLocalPerM3 ?? 0) > 0 ? en.gasPriceLocalPerM3! / fx / (p.get("eng.natgas_lhv_kwh_m3") * p.get("eng.boiler_efficiency")) : p.get("econ.heat_value_eur_kwh_th")) * mult;
        const selfShare = (en.electricityPriceLocalPerKwh ?? 0) > 0 ? p.get("eng.invoice_variable_share") : p.get("econ.self_consumption_variable_share");
        if (!r.process) {
          expect(rev("heat"), tag).toBeCloseTo(e.heatUsefulKwh > 0 && e.heatUsefulKwh * heatValue > 0.5 ? e.heatUsefulKwh * heatValue : 0, 4);
          expect(rev("el_self"), tag).toBeCloseTo(e.elSelfConsumedKwh * elPrice * selfShare > 0.5 ? e.elSelfConsumedKwh * elPrice * selfShare : 0, 4);
          expect(opx("el_purchased"), tag).toBeCloseTo(e.elPurchasedKwh * elPrice > 0.5 ? e.elPurchasedKwh * elPrice : 0, 4);
        }
        if (!((ex.input.energy.exportPriceLocalPerKwh ?? 0) > 0)) {
          expect(rev("el_export"), tag).toBeCloseTo(e.elExportedKwh * p.get("econ.electricity_spot_eur_kwh") * p.get("econ.export_haircut") * mult, 4);
        }
        if (r.route === "biomethane" && !ex.input.energy.biomethanePriceLocalPerMwhHhv) {
          const key = { conservative: "cons", base: "base", optimistic: "opt" }[r.scenario];
          const purity = p.get("eng.biomethane_ch4_purity");
          expect(rev("biomethane"), tag).toBeCloseTo(e.biomethaneNm3 * p.get(`econ.biomethane_price_${key}_eur_nm3`) * (e.biomethaneCh4Share ?? purity) / purity, 4);
          expect(opx("certification"), tag).toBeCloseTo(e.biomethaneNm3 * p.get("eng.opex.certification_eur_nm3") * { conservative: 1.15, base: 1, optimistic: 0.95 }[r.scenario], 4);
        }
        // OPEX: insurance on the gross (pre-grant) CAPEX; feedstock cost and disposal saving from the feed lines.
        expect(opx("insurance"), tag).toBeCloseTo(r.capex.totalEur * p.get("eng.opex.insurance_share"), 4);
        expect(opx("transport"), tag).toBeCloseTo(r.feed.lines.reduce((s, l) => s + l.transportCostEurYear, 0), 4);
        expect(rev("disposal"), tag).toBeCloseTo(r.feed.lines.reduce((s, l) => s + l.disposalSavingEurYear, 0), 4);
        // Cash flow: simple payback on the steady year; NPV is the discounted sum of the cash flows.
        const f = r.fin;
        if (f.ebitdaEurYear > 0) expect(f.simplePaybackYears!, tag).toBeCloseTo(f.capexEur / f.ebitdaEurYear, 9);
        expect(npv(p.get("econ.discount_rate"), f.cashFlows), tag).toBeCloseTo(f.npvEur, 4);
        if (f.discountedPaybackYears != null) expect(f.npvEur, tag).toBeGreaterThan(0);
      }
    });
  }
});

describe("support schemes stay a separate case", () => {
  const ex = EXAMPLES.find((e) => e.id === "de_nawaro")!;
  const country = getCountry("DE");
  const params = buildParams(country, ex.input.regionId, ex.input.energy, ex.input.city);
  const run = (support?: Parameters<typeof runScenarioRoute>[0]["support"]) => runScenarioRoute({ input: ex.input, country, params: params.fork(), scenario: SCENARIOS.base, mods: NO_MODS, region: projectRegion(ex.input, country), fx: params.get("econ.fx_local_per_eur"), lang: "en", t: tr("en"), support }, "chp");
  const base = run();
  const scheme = { id: "test", name: "Test tariff", status: "open" as const, electricityTariffEurKwh: 0.2, capexGrantShare: 0.3, routes: ["chp" as const], note: { en: "", uk: "" }, source: "test", confidence: "LOW" as const, checkedOn: "2026-10-31" };
  const sup = run(scheme);

  it("a grant is a negative CAPEX line on the gross plant; insurance and maintenance stay on the gross plant; debt shrinks with it", () => {
    const grant = sup.capex.lines.find((l) => l.id === "grant")!.eur;
    expect(grant).toBeCloseTo(-0.3 * base.capex.totalEur, 6);
    expect(sup.capex.totalEur).toBeCloseTo(0.7 * base.capex.totalEur, 6);
    expect(sup.opexRev.opex.find((l) => l.id === "insurance")!.eur).toBeCloseTo(base.opexRev.opex.find((l) => l.id === "insurance")!.eur, 6);
    expect(sup.fin.debtEur).toBeCloseTo(0.7 * base.fin.debtEur, 6);
  });
  it("a tariff above the avoided bill buys all net electricity once (no self-use or export counted twice) and stays flat in nominal terms", () => {
    const line = (id: string) => sup.opexRev.revenue.find((l) => l.id === id)?.eur ?? 0;
    expect(line("el_tariff")).toBeCloseTo(sup.energy.elNetKwh * 0.2, 4);
    expect(line("el_self") + line("el_export")).toBe(0);
    // Year 2 → 3: only heat and digestate escalate; the tariff does not.
    const heatDig = line("heat") * (1.02 ** 2 - 1.02) + line("digestate") * (1.025 ** 2 - 1.025);
    const opex = sup.opexRev.opexEur * (1.025 ** 2 - 1.025);
    expect(sup.fin.cashFlows[3] - sup.fin.cashFlows[2]).toBeCloseTo(heatDig - opex, 4);
  });
  it("the base verdict does not see the scheme", () => {
    const a = assess(ex.input, country, { uncertainty: false });
    const without = assess(ex.input, { ...country, support: { ...country.support, schemes: [] } }, { uncertainty: false });
    expect(a.verdict).toEqual(without.verdict);
    expect(a.scenarios.base.fin.npvEur).toBe(without.scenarios.base.fin.npvEur);
  });
});

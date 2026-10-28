import { describe, expect, it } from "vitest";
import { assess, buildParams } from "../assess";
import { landfillMethane, prepareProcess, processSchema, type ProcessInput } from "../processes";
import { NO_MODS } from "../context";
import { SCENARIOS } from "../scenarios";
import { tr } from "../i18n";
import { COUNTRIES } from "@/countries";
import type { ProjectInput } from "../types";
import { inputSchema } from "@/server/validate";
import { formToInput, initialForm, inputToForm, processIssues, recontextualizeForm } from "@/lib/form";
import { LOCALES } from "@/i18n/config";
import { processCopy, processFieldLabels } from "@/i18n/processes";
import { npv } from "../finance";
import { BUSINESS_TYPES, SECTOR_IDS, defaultProcess } from "../businesses";
import { getDictionary } from "@/i18n";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProcessReport } from "@/components/ProcessReport";

const common = { operatingDays: 330, monthsActive: 12, startMonth: 1, processCapexLocal: 1800000, processOpexLocalYear: 70000, residualCostLocalT: 15, auxiliaryKwhYear: 100000, auxiliaryHeatKwhYear: 0, uncertaintyPct: 30 };
const gasTreatment = { nitrogenPct: 4, oxygenPct: 1, h2sPpm: 500, upgradingCapexLocal: 2500000, upgradingRecoveryPct: 96, upgradingKwhNm3: 0.4, productMethanePct: 97 };
const cases: ProcessInput[] = [
  { ...common, kind: "residue", densityKgM3: 1000, tonnesYear: 20000, dmPct: 10, vsPct: 80, bmp: 300, methanePct: 60, nKgT: 4, hrtDays: 35, olr: 3 },
  // Veolia Sleeman (Canada): 1800 m³/d, 4600 mg COD/L, >82% TCOD removal.
  // Only these technical inputs are a published reference; budgets and biomass split are illustrative.
  { ...common, kind: "wastewater", flowM3Day: 1800, codMgL: 4600, removalPct: 82, methanePct: 65, methaneRecoveryPct: 95, biomassCodPct: 8, sludgeTsPct: 5, sludgeVsPct: 80, hrtDays: 0.25, olr: 19.8, inletTempC: 25, heatRecoveryPct: 60, avoidedTreatmentLocalM3: 0.3 },
  { ...common, ...gasTreatment, kind: "landfill", operatingDays: 365, annualWasteTonnes: 100000, depositionYears: 20, yearsSinceClosure: 3, decayPerYear: 0.05, potentialNm3T: 100, collectionPct: 75, methanePct: 50 },
  { ...common, ...gasTreatment, kind: "gas", rawGasNm3Hour: 500, methanePct: 60, availabilityPct: 95, declinePctYear: 5, gasPriceLocalNm3: 0.03 },
];
function input(process: ProcessInput, country = "DE"): ProjectInput {
  return { countryCode: country, regionId: COUNTRIES[country].regions[0].id, businessType: process.kind === "landfill" ? "landfill_operator" : "other_industry", feedstocks: [], process,
    energy: { hasGridConnection: true, heatNeed: "year_round_process", heatKwhYear: 3000000, electricityKwhYear: 1000000 }, site: { gasGridKm: 1 } };
}
function prepared(process: ProcessInput) {
  const i = input(process), country = COUNTRIES.DE;
  return prepareProcess({ input: i, country, params: buildParams(country,i.regionId), region: country.regions[0], fx: 1, scenario: SCENARIOS.base, mods: NO_MODS, lang: "en", t: tr("en") });
}

describe("independent process balance checks", () => {
  it("closes the COD balance and derives methane from COD, without a disguised feedstock", () => {
    const p = cases[1], r = prepared(p), m = r.process.metrics;
    expect(m.codIn.value).toBeCloseTo(1800 * 330 * 4.6);
    expect(m.codOut.value + m.sludgeCod.value + m.methaneCod.value).toBeCloseTo(m.codIn.value);
    const density = buildParams(COUNTRIES.DE).get("eng.ch4_density_kg_m3");
    expect((m.capturedCh4.value + m.uncapturedCh4.value) * density * 4).toBeCloseTo(m.methaneCod.value);
    expect(r.feed.lines).toEqual([]);
    expect(r.design.workingVolumeM3).toBeCloseTo(Math.max(1800 * 0.25, 1800 * 4.6 / 19.8));
  });
  it("closes annual FOD inventory; gas declines with age and capture cannot exceed generation", () => {
    const p = cases[2]; if (p.kind !== "landfill") throw Error();
    const r = landfillMethane(p);
    const expectedStock = 100000 * 100 * Math.exp(-0.05 * 3.5) * (1 - Math.exp(-0.05 * 20)) / (1 - Math.exp(-0.05));
    expect(r.remaining).toBeCloseTo(expectedStock);
    expect(r.generated + r.closing).toBeCloseTo(r.remaining);
    expect(landfillMethane(p,1).generated / r.generated).toBeCloseTo(Math.exp(-0.05));
    expect(r.captured).toBeLessThan(r.generated);
  });
  it("closes the characterised residue mass balance", () => {
    const r = prepared(cases[0]);
    expect(r.process.metrics.massIn.value).toBeCloseTo(r.process.metrics.gasMass.value + r.process.residualTonnesYear);
    expect(r.design.workingVolumeM3).toBeGreaterThan(0);
    expect(r.design.tech.digestion).not.toBe("high_rate");
  });
  it("rejects overbooked calendars, impossible gas fractions and mixed physical bases", () => {
    expect(processSchema.safeParse({ ...cases[3], monthsActive: 2 }).success).toBe(false);
    expect(processSchema.safeParse({ ...cases[3], methanePct: 95, nitrogenPct: 20 }).success).toBe(false);
    expect(inputSchema.safeParse({ ...input(cases[3]), feedstocks: [{ id:"x", type:"food_waste", quantity: 5000 }] }).success).toBe(false);
  });
  it("sizes residue hydraulics from measured density rather than assuming water", () => {
    const p = cases[0]; if (p.kind !== "residue") throw Error();
    const dense = prepared({ ...p, densityKgM3: 1000, olr: 15 });
    const light = prepared({ ...p, densityKgM3: 500, olr: 15 });
    expect(light.design.workingVolumeM3).toBeCloseTo(2 * dense.design.workingVolumeM3);
    expect(light.design.hrtDays).toBeGreaterThanOrEqual(p.hrtDays);
    expect(light.feed.ch4M3Year).toBeCloseTo(dense.feed.ch4M3Year);
  });
  it("accounts for additional thermal processing without overwriting reactor heating", () => {
    for (const p of cases) {
      const base = prepared(p), heated = prepared({ ...p, auxiliaryHeatKwhYear: 120000 });
      expect(heated.design.heatDemandKwhYear - base.design.heatDemandKwhYear).toBeCloseTo(120000);
      expect(heated.design.monthlyHeatDemandKwh.reduce((s,v) => s+v,0)).toBeCloseTo(heated.design.heatDemandKwhYear);
      expect(heated.feed.ch4M3Year).toBeCloseTo(base.feed.ch4M3Year);
    }
  });
  it("does not accept invalid dates or promote future-dated assumptions to verified inputs", () => {
    expect(processSchema.safeParse({ ...cases[0], basisDate: "2026-02-30" }).success).toBe(false);
    const a = assess(input({ ...cases[0], basisDate: "2099-01-01", basisOrigin: "ENGINEERING_ASSUMPTION" }),COUNTRIES.DE);
    expect(a.confidence.level).toBe("LOW");
    expect(a.scenarios.base.process!.provenance.find(p => p.id === "process.bmp")?.origin).toBe("ENGINEERING_ASSUMPTION");
    expect(a.verdict.id).toBe("INSUFFICIENT_DATA");
  });
});

describe("process economics and cross-country execution", () => {
  it.each(Object.keys(COUNTRIES))("%s: all four input models close energy and financial balances", country => {
    for (const p of cases) {
      const a = assess(input(p,country),COUNTRIES[country]);
      expect(inputSchema.safeParse(a.input).success).toBe(true);
      for (const route of Object.values(a.routeMatrix)) for (const r of Object.values(route)) {
        const e = r.energy;
        expect(e.ch4LeakedM3 + e.ch4ToChpM3 + e.ch4ToBoilerM3 + e.ch4ToUpgraderM3 + e.ch4FlaredM3).toBeCloseTo(e.ch4ProducedM3,4);
        expect(r.capex.lines.reduce((s,l) => s+l.eur,0)).toBeCloseTo(r.capex.totalEur);
        expect(r.opexRev.revenueEur-r.opexRev.opexEur).toBeCloseTo(r.fin.ebitdaEurYear);
        expect(Number.isFinite(r.fin.npvEur)).toBe(true);
        expect(r.capex.lines.some(l => l.id === "digester")).toBe(false);
      }
      expect(a.confidence.level).not.toBe("HIGH");
    }
  });
  it("does not country-scale a local upstream quote twice and includes all disposal costs", () => {
    const i = input(cases[1],"PL"), a = assess(i,COUNTRIES.PL), b = a.scenarios.base;
    expect(b.capex.lines.find(l => l.id === "process")!.eur).toBeCloseTo(cases[1].processCapexLocal / a.fx);
    expect(b.opexRev.opex.some(l => l.id === "residual_disposal" && l.eur > 0)).toBe(true);
    expect(b.opexRev.revenue.some(l => l.id === "treatment" && l.eur > 0)).toBe(true);
  });
  it("uses declining gas in project cash flow and reconciles NPV against the cash-flow array", () => {
    const a = assess(input(cases[2]),COUNTRIES.DE), r = a.routesBase.biomethane;
    expect(r.process!.annualGasFactors[14]).toBeCloseTo(Math.exp(-0.05*14));
    expect(r.fin.npvEur).toBeCloseTo(npv(buildParams(COUNTRIES.DE).get("econ.discount_rate"),r.fin.cashFlows));
    const steady = assess(input({ ...cases[3], kind: "gas", declinePctYear: 0 } as ProcessInput),COUNTRIES.DE);
    const falling = assess(input(cases[3]),COUNTRIES.DE);
    expect(falling.routesBase.biomethane.fin.npvEur).toBeLessThan(steady.routesBase.biomethane.fin.npvEur);
  });
  it("allows a negative result instead of tuning costs to force success", () => {
    const a = assess(input({ ...cases[1], processCapexLocal: 1e9, processOpexLocalYear: 1e8 }),COUNTRIES.DE);
    expect(a.scenarios.optimistic.fin.npvEur).toBeLessThan(0);
    expect(a.verdict.id).not.toBe("STRONG_CANDIDATE");
  });
});

describe("process localisation and draft compatibility", () => {
  it.each(SECTOR_IDS)("%s has a usable physical model, not a placeholder", business => {
    const model = defaultProcess(business);
    const f = initialForm(business,"DE",COUNTRIES.DE.regions[0].id);
    // The UI intentionally starts with blank quantities; use the sector's explicit screening example.
    f.lines = f.lines.map((line,index) => ({ ...line, quantity: String(BUSINESS_TYPES[business].suggested[index].quantity) }));
    const i = model === "ad" ? formToInput(f,COUNTRIES.DE,"en") : { ...input(cases.find(p => p.kind === model)!), businessType: business };
    expect(inputSchema.safeParse(i).success).toBe(true);
    expect(Number.isFinite(assess(i,COUNTRIES.DE).scenarios.base.fin.npvEur)).toBe(true);
  });
  it.each(LOCALES)("%s renders all process reports and preserves small coefficients", async locale => {
    const d = await getDictionary(locale);
    for (const p of cases) {
      const a = assess(input({ ...p, basisReference: "https://[invalid-quotation-url" }),COUNTRIES.DE);
      const html = renderToStaticMarkup(createElement(ProcessReport,{ a,d,locale,currency:"EUR",access:"full",methodologyHref:`/${locale}/methodology` }));
      expect(html).not.toMatch(/undefined|NaN|\uFFFD|\?{3}/);
      expect(html).toContain(processCopy(locale).models[p.kind]);
      if (p.kind === "landfill") expect(html).toContain(new Intl.NumberFormat(locale).format(0.05));
    }
  });
  it.each(LOCALES)("%s: numeric inputs round-trip and every offered field has a label", locale => {
    for (const p of cases) {
      const i = input(p), f = inputToForm(i,locale);
      expect(processIssues(f)).toEqual([]);
      expect(formToInput(f,COUNTRIES.DE,"en").process).toEqual(p);
      const c = processCopy(locale), labels = processFieldLabels(locale);
      expect(c.models[p.kind]).toBeTruthy();
      for (const key of Object.keys(p).filter(k => k !== "kind")) expect(labels[key],key).toBeTruthy();
    }
  });
  it("clears local money on market changes but preserves physical inputs", () => {
    const f = recontextualizeForm(inputToForm(input(cases[3]),"de"),COUNTRIES.US,COUNTRIES.US.regions[0].id,"en");
    expect(f.processFields?.rawGasNm3Hour).toBe("500");
    expect(f.processFields?.gasPriceLocalNm3).toBe("");
    expect(processIssues(f)).toContain("gasPriceLocalNm3");
  });
});

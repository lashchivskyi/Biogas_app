import { z } from "zod";
import type { RunContext } from "./context";
import type { DigesterDesign, FeedstockSummary, Provenance } from "./types";
import { DAYS_IN_MONTH, HOURS_IN_MONTH } from "./climate";
import { designDigester } from "./digester";
import { prov } from "./params";
import { ENGINEERING_MAP } from "./engineeringParams";
import { isoDate } from "./modelAudit";

const positive = (max: number) => z.number().finite().gt(0).max(max);
const fraction = z.number().finite().min(0).max(100);
const common = {
  basisDate: z.string().refine(isoDate, "Use a valid ISO calendar date").optional(),
  basisReference: z.string().trim().max(500).optional(),
  basisOrigin: z.enum(["USER_INPUT", "ENGINEERING_ASSUMPTION"]).optional(),
  operatingDays: positive(365),
  monthsActive: z.number().int().min(1).max(12),
  startMonth: z.number().int().min(1).max(12),
  processCapexLocal: z.number().finite().min(0).max(1e12).optional(),
  processOpexLocalYear: z.number().finite().min(0).max(1e12).optional(),
  residualCostLocalT: z.number().finite().min(0).max(1e6).optional(),
  auxiliaryKwhYear: z.number().finite().min(0).max(1e12).optional(),
  auxiliaryHeatKwhYear: z.number().finite().min(0).max(1e12).optional(),
  uncertaintyPct: z.number().finite().min(10).max(70),
};
// LFG / purchased gas cannot inherit agricultural membrane performance or cost.
const gasTreatment = {
  nitrogenPct: z.number().min(0).max(40), oxygenPct: z.number().min(0).max(10), h2sPpm: z.number().min(0).max(50000),
  upgradingCapexLocal: positive(1e12).optional(), upgradingRecoveryPct: z.number().min(50).max(100),
  upgradingKwhNm3: positive(5), productMethanePct: z.number().min(95).max(99.99),
};
/** Costs are explicit project budgets/quotes, never historical vendor prices labelled as current. */
export const processSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("residue"), tonnesYear: positive(1e8), densityKgM3: z.number().min(50).max(1500), dmPct: positive(95), vsPct: positive(100), bmp: positive(1200), methanePct: z.number().min(40).max(80), nKgT: z.number().min(0).max(200), hrtDays: positive(200), olr: positive(15) }),
  z.object({ ...common, kind: z.literal("wastewater"), reactorTechnology: z.enum(["high_rate", "covered_lagoon"]).optional(), flowM3Day: positive(1e6), codMgL: positive(200000), removalPct: z.number().min(1).max(99), methanePct: z.number().min(40).max(85), methaneRecoveryPct: z.number().min(1).max(100), biomassCodPct: z.number().min(0).max(40), sludgeTsPct: positive(30), sludgeVsPct: positive(100), hrtDays: positive(60), olr: positive(40), inletTempC: z.number().min(0).max(60), heatRecoveryPct: fraction, avoidedTreatmentLocalM3: z.number().min(0).max(1e5) }),
  z.object({ ...common, ...gasTreatment, kind: z.literal("landfill"), annualWasteTonnes: positive(1e8), depositionYears: z.number().int().min(1).max(100), yearsSinceClosure: z.number().min(0).max(100), decayPerYear: z.number().min(0.005).max(0.5), potentialNm3T: positive(300), collectionPct: z.number().min(1).max(95), methanePct: z.number().min(30).max(65) }),
  z.object({ ...common, ...gasTreatment, kind: z.literal("gas"), rawGasNm3Hour: positive(1e6), methanePct: z.number().min(30).max(95), availabilityPct: z.number().min(1).max(100), declinePctYear: z.number().min(0).max(40), gasPriceLocalNm3: z.number().min(0).max(1000) }),
]).superRefine((p, ctx) => {
  const days = Array.from({ length: p.monthsActive }, (_, n) => DAYS_IN_MONTH[(p.startMonth - 1 + n) % 12]).reduce((a,b) => a+b, 0);
  if (p.operatingDays > days) ctx.addIssue({ code: "custom", path: ["operatingDays"], message: "Operating days exceed the selected calendar period" });
  if ((p.kind === "gas" || p.kind === "landfill") && p.methanePct + p.nitrogenPct + p.oxygenPct + p.h2sPpm / 10000 > 100) ctx.addIssue({ code: "custom", path: ["methanePct"], message: "Dry gas fractions exceed 100%" });
  const methaneDensity = ENGINEERING_MAP["eng.ch4_density_kg_m3"].value;
  const gasMassPerCh4 = methaneDensity + (100 / p.methanePct - 1) * ENGINEERING_MAP["eng.co2_density_kg_m3"].value;
  if (p.kind === "residue" && p.dmPct * p.vsPct / 10000 * p.bmp * gasMassPerCh4 / 1000 > 1) ctx.addIssue({ code: "custom", path: ["bmp"], message: "Potential gas mass exceeds wet feed mass" });
  if (p.kind === "wastewater") {
    const removedPerT = p.codMgL / 1000 * 0.99;
    const sludgeT = removedPerT * p.biomassCodPct / 100 / 1.42 / (p.sludgeVsPct / 100) / (p.sludgeTsPct / 100) / 1000;
    const gasT = removedPerT * (1 - p.biomassCodPct / 100) / 4 / methaneDensity * gasMassPerCh4 / 1000;
    if (sludgeT + gasT >= 1) ctx.addIssue({ code: "custom", path: ["sludgeTsPct"], message: "Sludge and gas mass exceed influent mass" });
  }
});
export type ProcessInput = z.infer<typeof processSchema>;
export type ProcessKind = ProcessInput["kind"];
export const PROCESS_COST_FIELDS = ["processCapexLocal", "processOpexLocalYear", "residualCostLocalT", "auxiliaryKwhYear", "auxiliaryHeatKwhYear"] as const;
export const missingProcessInputs = (p: ProcessInput): string[] => [...PROCESS_COST_FIELDS.filter(key => p[key] === undefined), ...((p.kind === "gas" || p.kind === "landfill") && p.upgradingCapexLocal === undefined ? ["upgradingCapexLocal"] : [])];
export function processBounds(kind: ProcessKind, key: string) {
  const shape = processSchema.options.find(s => s.shape.kind.value === kind)!.shape;
  const raw = (shape as unknown as Record<string,z.ZodType>)[key];
  const field = raw instanceof z.ZodOptional ? raw.unwrap() : raw;
  return field instanceof z.ZodNumber ? { low: field.minValue ?? 0, high: field.maxValue ?? Infinity } : { low: 0, high: Infinity };
}
export const PROCESS_KINDS: ProcessKind[] = ["residue", "wastewater", "landfill", "gas"];
export interface ProcessResult {
  kind: ProcessKind;
  /** Missing costs/loads invalidate economic conclusions; zero is an explicit known zero. */
  missingInputs: string[];
  /** Values use the units in metrics, never fake a feedstock type for a gas inlet. */
  metrics: Record<string, { value: number; unit: string; origin: "CALCULATED_VALUE" }>;
  provenance: Provenance[];
  capexEur: number;
  opexEurYear: number;
  residualTonnesYear: number;
  avoidedTreatmentEurYear: number;
  gasPurchaseEurYear: number;
  annualGasFactors: number[];
}
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const yearDays = sum(DAYS_IN_MONTH);
const distribute = (n: number) => DAYS_IN_MONTH.map(d => n * d / yearDays);
export function processCalendar(p: ProcessInput) {
  const weights = DAYS_IN_MONTH.map((days, m) => (m - p.startMonth + 13) % 12 < p.monthsActive ? days : 0);
  const days = sum(weights);
  return { days, distribute: (n: number) => weights.map(w => n * w / days) };
}
const EPA = "https://www.epa.gov/system/files/documents/2021-07/pdh_chapter2.pdf";
const IPCC = "https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/5_Volume5/19R_V5_6_Ch06_Wastewater.pdf";

/** Exact annual integral of first-order decay for annual waste cohorts placed at mid-year.
 * Closed landfill only: k and L0 must be site-specific. Not a regulatory LandGEM submission. */
export function landfillMethane(p: Extract<ProcessInput, { kind: "landfill" }>, year = 0) {
  let remaining = 0;
  for (let j = 0; j < p.depositionYears; j++) remaining += p.annualWasteTonnes * p.potentialNm3T * Math.exp(-p.decayPerYear * (p.yearsSinceClosure + j + 0.5 + year));
  const generated = remaining * (1 - Math.exp(-p.decayPerYear));
  return { remaining, generated, captured: generated * p.collectionPct / 100, closing: remaining - generated };
}
export function processProvenance(input: ProcessInput, country: string): Provenance[] {
  const fields = Object.entries(input).filter(([, v]) => typeof v === "number");
  return fields.map(([key, value]) => {
    const bounds = processBounds(input.kind,key);
    return prov("process." + key, key, value as number, PROCESS_UNITS[key] ?? "—", input.basisOrigin === "ENGINEERING_ASSUMPTION" ? "ASSUMPTION" : "ESTIMATE", input.basisReference || "Customer design basis / budget; measurement and quotation documents not independently verified", "LOW", { country, date: input.basisDate ?? "undated", origin: input.basisOrigin ?? "USER_INPUT", range: { low: Math.max(bounds.low, (value as number) * (1 - input.uncertaintyPct / 100)), high: Math.min(bounds.high, (value as number) * (1 + input.uncertaintyPct / 100)), basis: "engineering" } });
  });
}
export const PROCESS_UNITS: Record<string, string> = {
  monthsActive: "1–12", startMonth: "1–12", nitrogenPct: "% vol", oxygenPct: "% vol", h2sPpm: "ppmv", upgradingCapexLocal: "local", upgradingRecoveryPct: "% CH₄", upgradingKwhNm3: "kWh/Nm³ raw", productMethanePct: "% CH₄",
  operatingDays: "d/a", processCapexLocal: "local", processOpexLocalYear: "local/a", residualCostLocalT: "local/t", auxiliaryKwhYear: "kWh/a", auxiliaryHeatKwhYear: "kWh_th/a", uncertaintyPct: "%",
  tonnesYear: "t/a", densityKgM3: "kg/m³", dmPct: "% FM", vsPct: "% DM", bmp: "L CH₄/kg VS", methanePct: "% vol", nKgT: "kg N/t FM", hrtDays: "d", olr: "kg/(m³·d)", sludgeVsPct: "% VS/TS",
  flowM3Day: "m³/d", codMgL: "mg COD/L", removalPct: "% COD", methaneRecoveryPct: "% CH₄", biomassCodPct: "% COD", sludgeTsPct: "% TS", inletTempC: "°C", heatRecoveryPct: "%", avoidedTreatmentLocalM3: "local/m³",
  annualWasteTonnes: "t/a", depositionYears: "a", yearsSinceClosure: "a", decayPerYear: "1/a", potentialNm3T: "Nm³ CH₄/t", collectionPct: "%", rawGasNm3Hour: "Nm³/h", availabilityPct: "%", declinePctYear: "%/a", gasPriceLocalNm3: "local/Nm³",
};

export function prepareProcess(ctx: RunContext, year = 0): { feed: FeedstockSummary; design: DigesterDesign; process: ProcessResult } {
  const p = processSchema.parse(ctx.input.process);
  const allocate = processCalendar(p).distribute;
  const s = ctx.scenario.id === "conservative" ? -1 : ctx.scenario.id === "optimistic" ? 1 : 0;
  const spread = p.uncertaintyPct / 100;
  const quantityFactor = ctx.mods.feedstock * ctx.scenario.feedstockAvailability;
  const yieldFactor = ctx.mods.methaneYield * (1 + s * spread);
  let tonnes = 0, vs = 0, ch4 = 0, residual = 0, codIn = 0, codOut = 0, sludgeCod = 0;
  let uncaptured = 0, upstreamCh4 = 0, reactor = 0, heat = distribute(0), avoided = 0, purchase = 0;
  let gasFactors = Array.from({ length: Math.round(ctx.params.get("econ.horizon_years")) }, () => 1);
  const metrics: ProcessResult["metrics"] = {};
  const metric = (key: string, value: number, unit: string) => { metrics[key] = { value, unit, origin: "CALCULATED_VALUE" }; };
  if (p.kind === "residue") {
    tonnes = p.tonnesYear * quantityFactor;
    vs = tonnes * p.dmPct * p.vsPct / 10000;
    // BMP is a potential; scenario realization applied once and never exceeds 100%.
    ch4 = vs * p.bmp * Math.min(1, ctx.scenario.processRealisation * yieldFactor);
  } else if (p.kind === "wastewater") {
    tonnes = p.flowM3Day * p.operatingDays * quantityFactor; // density ~1 t/m³
    codIn = tonnes * p.codMgL / 1000;
    const removed = codIn * Math.min(0.99, p.removalPct / 100 * yieldFactor);
    sludgeCod = removed * p.biomassCodPct / 100;
    codOut = codIn - removed;
    // 1 kg CH4 is 4 kg COD; density at the same dry standard conditions as the energy model.
    upstreamCh4 = (removed - sludgeCod) / 4 / ctx.params.get("eng.ch4_density_kg_m3");
    ch4 = upstreamCh4 * p.methaneRecoveryPct / 100;
    uncaptured = upstreamCh4 - ch4;
    const sludgeDryKg = sludgeCod / 1.42 / (p.sludgeVsPct / 100); // COD/VSS, not COD/TS
    residual = sludgeDryKg / (p.sludgeTsPct / 100) / 1000;
    reactor = Math.max(p.flowM3Day * p.hrtDays, p.flowM3Day * p.codMgL / 1000 / p.olr);
    heat = allocate((p.reactorTechnology === "covered_lagoon" ? 0 : 1) * tonnes * 1000 * 4.18 * Math.max(0, 35 - p.inletTempC) / 3600 * (1 - p.heatRecoveryPct / 100));
    // Tank losses are additional, not cancelled by the feed/effluent heat exchanger.
    const area = 6 * Math.pow(reactor, 2/3);
    heat = heat.map((v, m) => v + (p.reactorTechnology === "covered_lagoon" ? 0 : 1) * area * ctx.params.get("eng.digester_u_value_w_m2k") * Math.max(0, 35 - ctx.region.monthlyTempC[m]) * HOURS_IN_MONTH[m] / 1000);
    avoided = tonnes * p.avoidedTreatmentLocalM3 / ctx.fx;
    metric("codIn", codIn, "kg COD/a"); metric("codOut", codOut, "kg COD/a"); metric("sludgeCod", sludgeCod, "kg COD/a");
    metric("methaneCod", removed - sludgeCod, "kg COD/a"); metric("sludge", residual, "t/a");
    const gasMassT = upstreamCh4 * (ctx.params.get("eng.ch4_density_kg_m3") + (100 / p.methanePct - 1) * ctx.params.get("eng.co2_density_kg_m3")) / 1000;
    const effluent = tonnes - residual - gasMassT;
    if (effluent < 0) throw new Error("Sludge and gas exceed influent mass; check COD and sludge solids");
    metric("massIn", tonnes, "t/a"); metric("gasMass", gasMassT, "t/a"); metric("effluent", effluent, "t/a");
    metric("reactor", reactor, "m³"); metric("hrtDays", reactor / p.flowM3Day, "d"); metric("olr", p.flowM3Day * p.codMgL / 1000 / reactor, "kg COD/m³/d"); metric("effluentCod", effluent > 0 ? codOut / effluent * 1000 : 0, "mg COD/L");
  } else if (p.kind === "landfill") {
    const g = landfillMethane(p, year);
    upstreamCh4 = g.generated * quantityFactor;
    // k/L0 remain the explicit physical basis; uncertainty acts on collection, bounded by generation.
    ch4 = upstreamCh4 * Math.min(1, p.collectionPct / 100 * yieldFactor) * p.operatingDays / 365;
    uncaptured = upstreamCh4 - ch4;
    gasFactors = gasFactors.map((_, y) => Math.exp(-p.decayPerYear * y));
    metric("remainingPotential", g.remaining * quantityFactor, "Nm³ CH₄"); metric("closingPotential", g.closing * quantityFactor, "Nm³ CH₄");
    metric("wasteStock", p.annualWasteTonnes * p.depositionYears, "t");
  } else {
    const raw = p.rawGasNm3Hour * 24 * p.operatingDays * p.availabilityPct / 100 * quantityFactor * Math.pow(1 - p.declinePctYear / 100, year);
    ch4 = raw * p.methanePct / 100 * yieldFactor;
    purchase = ch4 / (p.methanePct / 100) * p.gasPriceLocalNm3 / ctx.fx;
    gasFactors = gasFactors.map((_, y) => Math.pow(1 - p.declinePctYear / 100, y));
  }
  const biogas = ch4 / (p.methanePct / 100);
  const feed: FeedstockSummary = { lines: [], tonnesYear: tonnes, vsTonnesYear: vs, dryMatterPct: p.kind === "residue" ? p.dmPct : 0,
    ch4M3Year: ch4, biogasM3Year: biogas, monthlyCh4M3: allocate(ch4), monthlyTonnes: allocate(tonnes), monthlyVsTonnes: allocate(vs),
    energyDensityKwhPerTonne: tonnes ? ch4 * ctx.params.get("eng.ch4_lhv_kwh_m3") / tonnes : 0,
    nKgYear: p.kind === "residue" ? tonnes * p.nKgT : 0, p2o5KgYear: 0, k2oKgYear: 0, manureShareVs: 0, poultryShareVs: 0, fatShareVs: 0, abpTonnesYear: 0, inhibitionFactor: 1, warnings: [] };
  const empty: DigesterDesign = { workingVolumeM3: reactor, totalVolumeM3: reactor, hrtDays: p.kind === "wastewater" ? reactor / p.flowM3Day : 0, olrKgVsM3Day: 0,
    monthlyHeatDemandKwh: heat, heatDemandKwhYear: sum(heat), pasteurisationHeatKwhYear: 0, storageVolumeM3: 0, storageCovered: 0, storageNew: 0, surfaceAreaM2: 0,
    tech: { primary: p.kind === "wastewater" ? p.reactorTechnology === "covered_lagoon" ? "COD / Covered lagoon" : "COD / UASB–EGSB" : p.kind === "landfill" ? "LFG / FOD" : "Biogas / CHP / boiler", digestion: p.kind === "wastewater" ? p.reactorTechnology ?? "high_rate" : "none", temperature: "mesophilic", stages: "single", mode: "continuous", reactor: "", hrtDays: 0, reasons: [], warnings: [], alternatives: [] } };
  const design = p.kind === "residue" ? designDigester(feed, { ...ctx, params: ctx.params.with({ "eng.hrt_manure_days": p.hrtDays, "eng.hrt_mixed_days": p.hrtDays, "eng.hrt_waste_days": p.hrtDays, "eng.olr_max_kgvs_m3d": p.olr }) }) : empty;
  // Extra thermal loads (e.g. hygienisation or drying) are supplied by the process design.
  // They exclude the reactor/feed heating already calculated above.
  const extraHeat = allocate(p.auxiliaryHeatKwhYear ?? 0);
  design.monthlyHeatDemandKwh = design.monthlyHeatDemandKwh.map((v,m) => v + extraHeat[m]);
  design.heatDemandKwhYear = sum(design.monthlyHeatDemandKwh);
  if (p.kind === "residue") {
    const gasMassT = (ch4 * ctx.params.get("eng.ch4_density_kg_m3") + (biogas - ch4) * ctx.params.get("eng.co2_density_kg_m3")) / 1000;
    residual = tonnes - gasMassT;
    if (residual < 0) throw new Error("Gas mass exceeds the available feedstock mass");
    metric("vs", vs, "t VS/a"); metric("massIn", tonnes, "t/a"); metric("gasMass", gasMassT, "t/a");
    metric("reactor", design.workingVolumeM3, "m³"); metric("hrtDays", design.hrtDays, "d"); metric("olr", design.olrKgVsM3Day, "kg VS/m³/d"); metric("nitrogen", feed.nKgYear, "kg N/a");
  }
  metric("capturedCh4", ch4, "Nm³ CH₄/a"); metric("uncapturedCh4", uncaptured, "Nm³ CH₄/a");
  if (upstreamCh4) metric("generatedCh4", upstreamCh4, "Nm³ CH₄/a");
  metric("residual", residual, "t/a");
  const provenance = processProvenance(p, ctx.country.code);
  if (p.kind === "wastewater") {
    provenance.push(prov("process.cod_ch4", "Methane COD equivalent", 4, "kg COD/kg CH₄", "FACT", IPCC, "HIGH", { date: "2019-01-01", country: "GLOBAL", origin: "ENGINEERING_ASSUMPTION" }));
    provenance.push(prov("process.biomass_cod_vss", "Biomass COD/VSS", 1.42, "kg COD/kg VSS", "ASSUMPTION", "Biomass stoichiometry C5H7NO2 approximation; validate sludge composition", "LOW", { date: "2026-10-28", country: "GLOBAL", range: { low: 1.2, high: 1.6, basis: "engineering" } }));
  }
  if (p.kind === "landfill") provenance.push(prov("process.fod", "Annual integral of first-order decay", p.decayPerYear, "1/a", "ASSUMPTION", EPA, "LOW", { date: "2021-07-01", country: ctx.country.code }));
  for (const row of provenance.filter(r => r.source === IPCC || r.source === EPA)) row.evidence = {
    checkedOn: "2026-10-28", period: row.date.slice(0,4), urls: [row.source], scope: "Physical method; not a country price, emission permit or supplier guarantee",
    method: row.source === IPCC ? "COD stoichiometry; inventory MCF is not used as reactor performance" : "Annual integral of first-order decay; historical cohorts, no future deposition",
  };
  const missingInputs = missingProcessInputs(p);
  return { feed, design, process: { kind: p.kind, missingInputs, metrics, provenance, capexEur: (p.processCapexLocal ?? 0) / ctx.fx * (1 - s * spread) * ctx.mods.capex,
    opexEurYear: (p.processOpexLocalYear ?? 0) / ctx.fx * (1 - s * spread) * ctx.mods.opex,
    residualTonnesYear: residual, avoidedTreatmentEurYear: avoided, gasPurchaseEurYear: purchase,
    annualGasFactors: gasFactors } };
}

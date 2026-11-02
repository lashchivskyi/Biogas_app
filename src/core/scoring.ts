import type { CustomerDemand } from "./demand";
import { FEEDSTOCKS } from "./feedstockData";
import { unpricedCompetingUse } from "./feedstock";
import { fmtDec, fmtUnit, type Tr } from "./i18n";
import type { DigestateAssessment, LogisticsAssessment, ProjectInput, ScenarioResult, Score } from "./types";

/** Piecewise-linear interpolation through (x,y) points; clamped at both ends. */
export function interp(x: number, pts: Array<[number, number]>): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export interface ScoreInputs {
  input: ProjectInput;
  base: ScenarioResult;
  cons: ScenarioResult;
  opt: ScenarioResult;
  demand: CustomerDemand;
  logistics: LogisticsAssessment;
  digestate: DigestateAssessment;
  regulatoryPoints: number;
  methaneLossShare: number;
  methaneLossGood: number;
  minChpKw: number;
  T: Tr;
}

export function computeScores(s: ScoreInputs): { scores: Score[]; overall: { value: number; explanation: string[] } } {
  const { base, cons, input, demand, logistics, digestate, T } = s;
  const feed = base.feed;
  const e = base.energy;
  const r0 = (n: number) => Math.round(n);
  const D = fmtDec(T.lang);
  const U = fmtUnit(T.lang);

  // ---------------- Feedstock fit ----------------
  const scale = interp(base.kwElEquivalent, [[0, 0], [25, 20], [50, 45], [100, 65], [200, 80], [400, 92], [800, 100]]);
  const density = interp(feed.energyDensityKwhPerTonne, [[0, 0], [100, 20], [200, 45], [400, 65], [800, 85], [1500, 100]]);
  const monthsWithFeed = (input.process ? feed.monthlyCh4M3 : feed.monthlyTonnes).filter((t) => t > 0).length;
  const consistency = (monthsWithFeed / 12) * 100;
  const worstLogistics = Math.max(0, ...logistics.perLine.map((l) => l.transportShareOfEnergyValue));
  const logisticsScore = worstLogistics >= 0.5 ? 20 : worstLogistics >= 0.25 ? 55 : 100;
  let feedPenalty = 0;
  const feedNotes: string[] = [];
  // Fit scores rate the project, not the data: missing or catalogue data is deducted once, in the data-quality score
  // (quality.ts). The note stays as information. Lab-measured streams no longer count as low-confidence.
  const labStream = (id: string) => { const f = input.feedstocks.find((x) => x.id === id); return Boolean(input.labAnalysisAvailable && f?.dryMatterPct && f.vsPctOfDm && f.methaneYieldLPerKgVs); };
  const lowShare = feed.tonnesYear > 0 ? feed.lines.filter((l) => !labStream(l.id) && FEEDSTOCKS[l.typeId].confidence === "LOW").reduce((a, l) => a + l.tonnesYear, 0) / feed.tonnesYear : 0;
  if (lowShare > 0.5) feedNotes.push(T("Most feedstock has low-confidence parameters"));
  if (feed.inhibitionFactor < 1) { feedPenalty += 10; feedNotes.push(T("Ammonia / fat inhibition risk lowers the yield")); }
  const lineInput = (id: string) => input.feedstocks.find((x) => x.id === id);
  if (feed.lines.some((l) => { const f = lineInput(l.id); const t = FEEDSTOCKS[l.typeId]; return l.opportunityCostEurYear === 0 && unpricedCompetingUse(t.flags, l.delivered, f?.purchasePricePerTonneLocal ?? 0, f?.handling ?? t.defaultHandling); })) {
    feedPenalty += 5;
    feedNotes.push(T("Feedstock has an alternative use; its price is not given"));
  }
  const feedValue = input.process ? clamp(0.6 * scale + 0.4 * consistency) : clamp(0.4 * scale + 0.2 * density + 0.2 * consistency + 0.2 * logisticsScore - feedPenalty);
  const feedExpl = [
    T("Energy equivalent ≈ {kwElEquivalent} kWe (scale score {scale}/100)", { kwElEquivalent: r0(base.kwElEquivalent), scale: r0(scale) }),
    T("Feedstock energy ≈ {energyDensityKwhPerTonne} kWh of methane per tonne (score {density}/100)", { energyDensityKwhPerTonne: r0(feed.energyDensityKwhPerTonne), density: r0(density) }),
    T("Feedstock available {monthsWithFeed} of 12 months", { monthsWithFeed }),
    ...(worstLogistics >= 0.25 ? [T("Logistics take up to {worstLogistics} % of the feedstock's energy value", { worstLogistics: r0(worstLogistics * 100) })] : []),
    ...feedNotes,
  ];

  if (input.process) feedExpl.splice(1, 1, T("Process-specific inlet basis; no generic feedstock energy-density score."));

  // ---------------- Energy fit ----------------
  let energyValue: number;
  const energyExpl: string[] = [];
  if (base.route === "biomethane") {
    const km = input.site.gasGridKm;
    const distScore = km === undefined ? 40 : interp(km, [[0, 95], [2, 80], [5, 60], [10, 35], [20, 10]]);
    const scaleScore = interp(e.rawBiogasNm3PerHour, [[0, 5], [60, 15], [150, 45], [400, 80], [800, 100]]);
    energyValue = clamp(0.5 * distScore + 0.5 * scaleScore);
    energyExpl.push(T("Biomethane: raw biogas ≈ {rawBiogasNm3PerHour} Nm³/h (EU average plant ≈ 483 m³/h)", { rawBiogasNm3PerHour: r0(e.rawBiogasNm3PerHour) }));
    energyExpl.push(km === undefined ? T("Distance to the gas grid not given") : T("≈ {km} km to the gas grid", { km }));
  } else {
    const avail = e.elNetKwh + e.heatNetAvailableKwh;
    const used = e.elSelfConsumedKwh + 0.6 * e.elExportedKwh + e.heatUsefulKwh;
    energyValue = avail > 0 ? clamp((used / avail) * 100) : 0;
    const elShareSelf = e.elNetKwh > 0 ? e.elSelfConsumedKwh / e.elNetKwh : 0;
    energyExpl.push(T("Own consumption absorbs {elShareSelf} % of the electricity produced", { elShareSelf: r0(elShareSelf * 100) }));
    energyExpl.push(T("Useful heat {heatUsefulKwh} MWh of {heatNetAvailableKwh} MWh available after digester needs", { heatUsefulKwh: r0(e.heatUsefulKwh / 1000), heatNetAvailableKwh: r0(e.heatNetAvailableKwh / 1000) }));
    // Unknown consumption already earns nothing in the energy balance and is a data-quality gap; no third deduction here.
    if (!demand.electricityKnown) energyExpl.push(T("Electricity consumption not given"));
    if (demand.heatWanted && !demand.heatKnown) energyExpl.push(T("Heat consumption not given"));
    if (!input.energy.hasGridConnection) energyExpl.push(T("No grid connection: surplus cannot be sold"));
  }

  // ---------------- Location fit ----------------
  let loc = 100;
  const locExpl: string[] = [];
  if (input.site.neighboursWithin300m) { loc -= 25; locExpl.push(T("Neighbours within 300 m: odour, traffic, safety distances")); }
  if (input.site.nearProtectedOrWaterArea) { loc -= 30; locExpl.push(T("Water bodies or protected areas nearby")); }
  if (digestate.adequacy === "SHORT") { loc -= 25; locExpl.push(T("Not enough land for the digestate")); }
  // Unknown land is already priced (half the imported nutrients assumed unplaceable) and is a data-quality gap.
  else if (digestate.adequacy === "UNKNOWN") locExpl.push(T("Land for digestate unknown"));
  if (logistics.perLine.some((l) => l.distanceKm > 30)) { loc -= 20; locExpl.push(T("Some feedstock comes from more than 30 km")); }
  if (!input.energy.hasGridConnection) { loc -= 10; locExpl.push(T("No electricity grid connection")); }
  // An empty distance is unknown (the energy-fit note says so), not "more than 10 km".
  if (base.route === "biomethane" && (input.site.gasGridKm ?? 0) > 10) { loc -= 25; locExpl.push(T("Gas grid more than 10 km away")); }
  if (locExpl.length === 0) locExpl.push(T("No critical site constraints found from your answers"));
  const locValue = clamp(loc);

  // ---------------- Technical feasibility ----------------
  let tech = 100;
  const techExpl: string[] = [];
  if (base.kwElEquivalent < s.minChpKw) { tech -= 45; techExpl.push(T("Energy equivalent below {minChpKw} kWe: hardly sensible technically", { minChpKw: s.minChpKw })); }
  else if (base.kwElEquivalent < 50) { tech -= 25; techExpl.push(T("Micro scale (< 50 kWe): high specific cost and complexity")); }
  if (feed.inhibitionFactor < 1) { tech -= 15; techExpl.push(T("Ammonia / fat inhibition needs active process control")); }
  if (feed.abpTonnesYear > 0) { tech -= 10; techExpl.push(T("ABP pasteurisation adds complexity")); }
  if (monthsWithFeed < 9) { tech -= 15; techExpl.push(T("Seasonal feedstock: equipment under-used")); }
  if (e.heatExternalPurchasedKwh > 0) { tech -= 15; techExpl.push(T("Own biogas does not cover digester heating in winter")); }
  if (base.design.tech.digestion === "high_solids") { tech -= 5; techExpl.push(T("Dry digestion — fewer suppliers")); }
  if (techExpl.length === 0) techExpl.push(T("Standard layout for this scale, no critical obstacles"));
  const techValue = clamp(tech);

  // ---------------- Economics ----------------
  const pb = base.fin.simplePaybackYears;
  let eco = pb === null ? 5 : interp(pb, [[0, 100], [3, 100], [5, 88], [7, 72], [9, 58], [11, 45], [13, 32], [15, 20], [20, 10]]);
  const ecoExpl: string[] = [];
  if (base.fin.npvEur < 0) { eco = Math.min(eco, 35); ecoExpl.push(T("Base-case NPV is negative")); }
  if (cons.fin.npvEur >= 0) { eco = Math.min(100, eco + 5); ecoExpl.push(T("NPV positive even in the conservative case")); }
  if (base.fin.dscrMin !== null && base.fin.dscrMin < 1.2) { eco = Math.max(0, eco - 10); ecoExpl.push(T("Minimum DSCR {dscrMin} — below the usual bank threshold of 1.2–1.3", { dscrMin: D(base.fin.dscrMin, 2) })); }
  ecoExpl.unshift(pb === null ? T("Operating margin ≤ 0 — no payback") : T("Base-case simple payback ≈ {year}", { year: U(pb, "year", 1) }));
  const ecoValue = clamp(eco);

  // ---------------- Risks ----------------
  const regRisk = clamp((s.regulatoryPoints - 5) * 4.5);
  const regExpl = [T("Number and weight of permitting / regulatory steps: {regulatoryPoints} points (more = harder)", { regulatoryPoints: s.regulatoryPoints })];
  let env = 20;
  const envExpl: string[] = [];
  const lossPct = D(s.methaneLossShare * 100, 1);
  if (s.methaneLossShare > s.methaneLossGood) {
    env += Math.min(40, (s.methaneLossShare - s.methaneLossGood) * 800);
    envExpl.push(T("Expected methane loss {lossPct} % (good practice ≤ {methaneLossGood} %)", { lossPct, methaneLossGood: D(s.methaneLossGood * 100) }));
  } else envExpl.push(T("Expected methane loss {lossPct} % — within good practice if gas-tight and monitored", { lossPct }));
  if (input.site.neighboursWithin300m) { env += 20; envExpl.push(T("Neighbours within 300 m: odour and incident exposure")); }
  if (input.site.nearProtectedOrWaterArea) { env += 20; envExpl.push(T("Water bodies / protected areas nearby")); }
  if (digestate.adequacy === "SHORT") { env += 15; envExpl.push(T("Surplus digestate: risk of nitrogen over-application")); }
  else if (digestate.adequacy === "UNKNOWN") envExpl.push(T("Unknown where the digestate will go"));
  const envRisk = clamp(env);

  const scores: Score[] = [
    { id: "feedstock", label: T("Feedstock fit"), value: r0(feedValue), isRisk: false, explanation: feedExpl },
    { id: "energy", label: T("Energy fit"), value: r0(energyValue), isRisk: false, explanation: energyExpl },
    { id: "location", label: T("Location & logistics"), value: r0(locValue), isRisk: false, explanation: locExpl },
    { id: "technical", label: T("Technical feasibility"), value: r0(techValue), isRisk: false, explanation: techExpl },
    { id: "economics", label: T("Economics"), value: r0(ecoValue), isRisk: false, explanation: ecoExpl },
    { id: "regulatory", label: T("Regulatory complexity"), value: r0(regRisk), isRisk: true, explanation: regExpl },
    { id: "environmental", label: T("Environmental risk"), value: r0(envRisk), isRisk: true, explanation: envExpl },
  ];

  const w = { economics: 0.3, feedstock: 0.2, energy: 0.15, technical: 0.1, location: 0.1, regulatory: 0.075, environmental: 0.075 };
  let overall =
    w.economics * ecoValue + w.feedstock * feedValue + w.energy * energyValue + w.technical * techValue + w.location * locValue +
    w.regulatory * (100 - regRisk) + w.environmental * (100 - envRisk);
  const overallExpl: string[] = [T("Weighted: economics 30 %, feedstock 20 %, energy 15 %, technical 10 %, location 10 %, regulatory 7.5 %, environment 7.5 %.")];
  if (ecoValue < 30) { if (overall > 40) overallExpl.push(T("Capped at 40: weak economics is not offset by other factors.")); overall = Math.min(overall, 40); }
  if (techValue < 30) { if (overall > 45) overallExpl.push(T("Capped at 45: technical feasibility in doubt.")); overall = Math.min(overall, 45); }
  const sorted = [...scores].map((sc) => ({ sc, good: sc.isRisk ? 100 - sc.value : sc.value })).sort((a, b) => b.good - a.good);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  overallExpl.push(T("Strongest: {label} ({good}); weakest: {label2} ({good2}).", { label: top.sc.label, good: r0(top.good), label2: bottom.sc.label, good2: r0(bottom.good) }));
  return { scores, overall: { value: r0(overall), explanation: overallExpl } };
}

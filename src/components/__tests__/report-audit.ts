import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assess, buildParams, SAFETY_DISCLAIMER } from "@/core";
import type { Assessment, RouteId, ScenarioId, ScenarioResult } from "@/core";
import { QUALITY_START } from "@/core";
import { npv as npvOf } from "@/core/finance";
import { fmtInt, locText } from "@/core/i18n";
import { getCountry } from "@/countries";
import { fmt as f, type Dict, type Locale } from "@/i18n";
import { decisionCopy } from "@/i18n/decision";
import { offerCopy } from "@/i18n/offer";
import { climateCopy } from "@/i18n/climate";
import { financialLabels, sensitivityLabels } from "@/i18n/financial-labels";
import { processCopy, processFieldLabels } from "@/i18n/processes";
import { makeFormat, sig2 } from "@/lib/format";
import { reportSheets } from "@/lib/report-export";
import { ResultView, type ResultViewProps } from "../ResultView";

/**
 * Report consistency audit. One source of truth: the `Assessment`. Every number a client can read — in the free
 * result, the standard and the full report, the spreadsheet export and the text of the verdict — is recomputed
 * from the model and compared. A finding is a contradiction between two places, or between a place and the model.
 */
export interface Finding { where: string; message: string; kind?: "order" | "order-other" }
export type Access = ResultViewProps["access"];

const SCN: ScenarioId[] = ["conservative", "base", "optimistic"];
const ROUTE_IDS: RouteId[] = ["chp", "boiler", "biomethane"];
export const near = (x: number, y: number, tol = 1e-6) => x === y || Math.abs(x - y) <= tol * Math.max(1, Math.abs(x), Math.abs(y));
const never = (v: number | null | undefined) => (v === null || v === undefined ? Infinity : v);

// --------------------------------------------------------------------------------------------------------------
// 1. Model: arithmetic, ordering, verdict, uncertainty. Independent of language and layout.
// --------------------------------------------------------------------------------------------------------------
export function auditModel(a: Assessment): Finding[] {
  const out: Finding[] = [];
  const check = (ok: boolean, where: string, message: string, kind?: "order" | "order-other") => { if (!ok) out.push({ where, message, kind }); };
  const country = getCountry(a.countryCode);
  const params = buildParams(country, a.input.regionId, a.input.energy, a.input.city);
  const rate = params.get("econ.discount_rate");
  const process = !!a.input.process;
  const best = a.bestRoute;
  const cons = a.routeMatrix[best].conservative, base = a.routeMatrix[best].base, opt = a.routeMatrix[best].optimistic;
  const npv = { cons: cons.fin.npvEur, base: base.fin.npvEur, opt: opt.fin.npvEur };

  // Single source: the headline scenarios are the chosen route's matrix row.
  for (const s of SCN) {
    check(a.scenarios[s] === a.routeMatrix[best][s] || near(a.scenarios[s].fin.npvEur, a.routeMatrix[best][s].fin.npvEur), `scenarios.${s}`, "headline scenario is not the chosen route's scenario");
  }
  for (const r of ROUTE_IDS) check(near(a.routesBase[r].fin.npvEur, a.routeMatrix[r].base.fin.npvEur), `routesBase.${r}`, "routesBase differs from routeMatrix base");

  // Route choice: highest base NPV among technically sensible routes.
  const eligible = ROUTE_IDS.filter((r) => {
    const b = a.routeMatrix[r].base;
    if (r === "chp") return b.energy.chpKwEl >= params.get("eng.chp_min_kw");
    if (r === "biomethane") return b.energy.rawBiogasNm3PerHour >= params.get("eng.upgrade_min_nm3h");
    return true;
  });
  const pool = eligible.length ? eligible : ROUTE_IDS;
  const top = Math.max(...pool.map((r) => a.routeMatrix[r].base.fin.npvEur));
  check(pool.includes(best) && near(a.routeMatrix[best].base.fin.npvEur, top), "bestRoute", `chosen ${best} is not the highest-NPV eligible route`);

  // Every route × scenario: money closes, cash flow integrates, payback and IRR agree with NPV.
  for (const r of ROUTE_IDS) {
    for (const s of SCN) {
      const x = a.routeMatrix[r][s], w = `${r}/${s}`;
      const sum = (rows: { eur: number }[]) => rows.reduce((t, l) => t + l.eur, 0);
      // Lines under 0.5 EUR are not listed but are in the total.
      const closes = (rows: { eur: number }[], total: number) => Math.abs(sum(rows) - total) <= 2 + 1e-9 * Math.abs(total);
      check(closes(x.capex.lines, x.capex.totalEur), `${w} capex`, "CAPEX lines do not sum to the total");
      check(closes(x.opexRev.opex, x.opexRev.opexEur), `${w} opex`, "OPEX lines do not sum to the total");
      check(closes(x.opexRev.revenue, x.opexRev.revenueEur), `${w} revenue`, "revenue lines do not sum to the total");
      check(near(x.opexRev.revenueEur - x.opexRev.opexEur, x.fin.ebitdaEurYear), `${w} ebitda`, "revenue − OPEX ≠ EBITDA");
      check(near(x.fin.capexEur, x.capex.totalEur) && near(x.fin.opexEurYear, x.opexRev.opexEur) && near(x.fin.revenueEurYear, x.opexRev.revenueEur), `${w} fin`, "financial result uses other CAPEX/OPEX/revenue than the breakdown");
      check(near(npvOf(rate, x.fin.cashFlows), x.fin.npvEur, 1e-6), `${w} npv`, "NPV ≠ discounted cash flow");
      let run = 0;
      check(x.fin.cumulative.every((c, t) => near(c, (run += x.fin.cashFlows[t]))), `${w} cumulative`, "cumulative ≠ running sum of cash flow");
      // Simple payback is CAPEX ÷ steady-state EBITDA (no ramp-up, no escalation): it must never say "never" while the
      // cash flow does pay back, and never promise a payback while the cash flow shows a loss over the horizon.
      const pb = x.fin.simplePaybackYears;
      const last = x.fin.cumulative[x.fin.cumulative.length - 1];
      check(pb !== null || last < 0, `${w} payback`, "simple payback is “never” although the cumulative cash flow ends positive");
      check(!(x.fin.npvEur > 0) || pb !== null, `${w} payback`, "positive NPV with no payback");
      check(!(x.fin.npvEur > 0) || last > 0, `${w} cumulative`, "positive NPV but the cumulative cash flow ends negative");
      if (pb !== null) check(pb > 0 && Number.isFinite(pb), `${w} payback`, "payback not a positive number");
      const dp = x.fin.discountedPaybackYears;
      if (dp !== undefined) {
        check(dp === null || (pb !== null && dp >= pb - 1e-9) || x.fin.npvEur > 0, `${w} discounted payback`, "discounted payback shorter than simple payback");
        check(dp === null || dp <= x.fin.cashFlows.length - 1, `${w} discounted payback`, "discounted payback beyond the horizon");
        check(!(x.fin.npvEur > 0) || dp !== null, `${w} discounted payback`, "NPV > 0 at the project rate but the discounted payback is “never”");
        check(!(x.fin.npvEur < 0) || dp === null, `${w} discounted payback`, "NPV < 0 at the project rate but a discounted payback is shown");
      }
      if (x.fin.irr !== null && Number.isFinite(x.fin.irr)) {
        check(near(npvOf(x.fin.irr, x.fin.cashFlows), 0, 1e-4) || Math.abs(npvOf(x.fin.irr, x.fin.cashFlows)) < 1, `${w} irr`, "NPV at the IRR is not zero");
        check((x.fin.irr > rate) === (x.fin.npvEur > 0) || Math.abs(x.fin.npvEur) < 1, `${w} irr/npv`, "IRR above the discount rate but NPV not positive (or the reverse)");
      }
      if (x.fin.dscrMin !== null && x.fin.dscrAvg !== null) check(x.fin.dscrMin <= x.fin.dscrAvg + 1e-9, `${w} dscr`, "minimum DSCR above the average");
      const e = x.energy;
      check(near(e.ch4LeakedM3 + e.ch4ToChpM3 + e.ch4ToBoilerM3 + e.ch4ToUpgraderM3 + e.ch4FlaredM3, e.ch4ProducedM3, 1e-6), `${w} methane`, "methane balance does not close");
      check(e.heatUsefulKwh <= e.heatNetAvailableKwh + 1e-6, `${w} heat`, "useful heat exceeds available heat");
      check(near(e.elSelfConsumedKwh + e.elExportedKwh, e.elNetKwh - Math.max(0, e.elNetKwh - e.elSelfConsumedKwh - e.elExportedKwh)) || e.elSelfConsumedKwh + e.elExportedKwh <= e.elNetKwh + 1e-6, `${w} electricity`, "self-use + export exceed net electricity");
      if (r !== "biomethane") check(e.biomethaneNm3 === 0, `${w} biomethane`, "biomethane volume on a non-biomethane route");
    }
    // Scenario order: a better scenario never earns less or costs more.
    const c = a.routeMatrix[r].conservative, b = a.routeMatrix[r].base, o = a.routeMatrix[r].optimistic;
    const orderKind = r === best ? "order" : "order-other";
    check(c.fin.npvEur <= b.fin.npvEur + 1e-6 && b.fin.npvEur <= o.fin.npvEur + 1e-6, `${r} scenarios`, `NPV not ordered conservative ≤ base ≤ optimistic (${c.fin.npvEur} / ${b.fin.npvEur} / ${o.fin.npvEur})`, orderKind);
    check(c.fin.ebitdaEurYear <= b.fin.ebitdaEurYear + 1e-6 && b.fin.ebitdaEurYear <= o.fin.ebitdaEurYear + 1e-6, `${r} scenarios`, "EBITDA not ordered", orderKind);
    const perKw = (x: ScenarioResult) => x.capex.totalEur / Math.max(1, x.kwElEquivalent);
    check(perKw(c) >= perKw(b) - 1e-6 && perKw(b) >= perKw(o) - 1e-6, `${r} scenarios`, "specific CAPEX (per kW) not ordered conservative ≥ base ≥ optimistic");
    if (r === best) check(c.capex.totalEur >= b.capex.totalEur - 1e-6 && b.capex.totalEur >= o.capex.totalEur - 1e-6, `${r} scenarios`, "CAPEX not ordered conservative ≥ base ≥ optimistic", orderKind);
    check(never(c.fin.simplePaybackYears) >= never(b.fin.simplePaybackYears) - 1e-9 && never(b.fin.simplePaybackYears) >= never(o.fin.simplePaybackYears) - 1e-9, `${r} scenarios`, "payback not ordered conservative ≥ base ≥ optimistic", orderKind);
    check(c.feed.biogasM3Year <= b.feed.biogasM3Year + 1e-6 && b.feed.biogasM3Year <= o.feed.biogasM3Year + 1e-6, `${r} scenarios`, "biogas not ordered");
  }

  // Ranges block = the three scenarios.
  const R = a.ranges;
  const tri = (v: [number, number, number], g: (s: ScenarioResult) => number, w: string) => check(near(v[0], g(cons)) && near(v[1], g(base)) && near(v[2], g(opt)), `ranges.${w}`, "range block differs from the scenarios");
  tri(R.biogasM3, (s) => s.feed.biogasM3Year, "biogas"); tri(R.kwEl, (s) => s.kwElEquivalent, "kwEl"); tri(R.capexEur, (s) => s.capex.totalEur, "capex");
  tri(R.npvEur, (s) => s.fin.npvEur, "npv"); tri(R.electricityMwh, (s) => s.energy.elNetKwh / 1000, "electricity"); tri(R.heatUsefulMwh, (s) => s.energy.heatUsefulKwh / 1000, "heat"); tri(R.biomethaneNm3, (s) => s.energy.biomethaneNm3, "biomethane");
  check(R.paybackYears.every((v, i) => v === [cons, base, opt][i].fin.simplePaybackYears), "ranges.payback", "range block differs from the scenarios");
  check(near(R.feedstockTonnes, base.feed.tonnesYear), "ranges.feedstock", "feedstock tonnes differ from the base feed");
  if (!process) check(near(base.feed.lines.reduce((t, l) => t + l.tonnesYear, 0), base.feed.tonnesYear, 1e-6), "feed", "stream tonnes do not sum to the total");

  // Verdict against the numbers it is based on.
  const v = a.verdict.id;
  const pbBase = base.fin.simplePaybackYears;
  if (v === "STRONG_CANDIDATE") {
    check(npv.base > 0 && npv.cons > 0, "verdict", "STRONG_CANDIDATE with a non-positive base or conservative NPV");
    check(pbBase !== null && pbBase <= 6.5 + 1e-9, "verdict", "STRONG_CANDIDATE with base payback above 6.5 years");
    check(a.robustness === "clear_go", "verdict", "STRONG_CANDIDATE but robustness is not clear_go");
    check(a.confidence.level !== "LOW", "verdict", "STRONG_CANDIDATE on LOW data confidence");
  }
  if (v === "NOT_RECOMMENDED_AT_SCALE") check(npv.base < 0, "verdict", "NOT_RECOMMENDED_AT_SCALE with a non-negative base NPV");
  if (v === "WEAK_ECONOMICS") check(!(npv.base >= 0 && pbBase !== null && pbBase <= 10), "verdict", "WEAK_ECONOMICS although NPV ≥ 0 and payback ≤ 10 years");
  if (v === "POSSIBLE_WITH_CONDITIONS") check(npv.base >= 0 || npv.opt >= 0, "verdict", "POSSIBLE_WITH_CONDITIONS with a negative NPV even in the optimistic case");
  if (npv.base < 0 && npv.opt < 0) check(v !== "STRONG_CANDIDATE" && v !== "POSSIBLE_WITH_CONDITIONS", "verdict", "positive verdict while even the optimistic NPV is negative");
  const expectedRobust = v === "INSUFFICIENT_DATA" ? "insufficient" : npv.cons > 0 ? "clear_go" : npv.opt <= 0 ? "clear_no" : "grey";
  check(a.robustness === expectedRobust, "robustness", `robustness ${a.robustness} but the scenario NPVs (${npv.cons}/${npv.base}/${npv.opt}) say ${expectedRobust}`);
  if (a.robustness === "clear_no") check(v === "WEAK_ECONOMICS" || v === "NOT_RECOMMENDED_AT_SCALE", "robustness", `robustness says a clear no but the verdict is ${v}`);
  if (a.robustness === "clear_go") check(v === "STRONG_CANDIDATE" || v === "POSSIBLE_WITH_CONDITIONS", "robustness", `robustness says robust but the verdict is ${v}`);
  if (a.robustness === "clear_go" && v !== "INSUFFICIENT_DATA") check(npv.base > 0 && npv.opt > 0, "robustness", "clear_go with a non-positive base/optimistic NPV");
  if (a.robustness === "clear_no") check(npv.base <= 0 && npv.cons <= 0, "robustness", "clear_no with a positive base/conservative NPV");

  // Verdict text: every figure quoted in the reasons is one of the model's numbers.
  out.push(...auditVerdictText(a));

  // Confidence: level follows the score; the score follows the listed deductions.
  const cf = a.confidence;
  check(cf.level === (cf.score >= 85 ? "HIGH" : cf.score >= 50 ? "MEDIUM" : "LOW"), "confidence", `level ${cf.level} does not match score ${cf.score}`);
  if (cf.factors) check(cf.score === Math.max(0, QUALITY_START - cf.factors.reduce((t, x) => t + x.points, 0)), "confidence", "score ≠ start − Σ deductions");
  if (!cf.factors) check(a.missingData.length === a.missingDataCodes.length, "confidence", "missing-data texts and codes differ in length");

  // Sensitivity.
  check(a.sensitivity.every((s, i, arr) => i === 0 || arr[i - 1].deltaNpvEur <= s.deltaNpvEur + 1e-9), "sensitivity", "stress tests not sorted by effect");
  for (const s of a.sensitivity) {
    check(near(s.deltaNpvEur, s.npvEur - npv.base), `sensitivity.${s.id}`, "Δ NPV ≠ stressed NPV − base NPV");
    check(s.breaks === (npv.base >= 0 && s.npvEur < 0), `sensitivity.${s.id}`, "'flips the sign' flag disagrees with the NPVs");
  }
  check(a.drivers.length <= 3 && a.drivers.every((id) => a.sensitivity.find((s) => s.id === id && s.deltaNpvEur < 0)), "drivers", "driver is not a stress test that lowers NPV");
  const worst = a.sensitivity.filter((s) => s.deltaNpvEur < 0).slice(0, 3).map((s) => s.id);
  check(JSON.stringify(a.drivers) === JSON.stringify(worst), "drivers", "drivers are not the three largest negative effects");
  for (const p of a.parameterSensitivity ?? []) check(Number.isFinite(p.lowNpvEur) && Number.isFinite(p.highNpvEur) && p.lowInput <= p.highInput, `parameterSensitivity.${p.parameterId}`, "invalid parameter range");

  // Break-even against base NPV.
  const be = a.breakEven;
  if (npv.base >= 0) {
    check(be.capexReductionPct === 0 && be.energyPriceIncreasePct === 0, "breakEven", "NPV ≥ 0 but break-even says a change is needed");
    if (be.maxCapexEur != null) check(be.maxCapexEur >= base.capex.totalEur - 1, "breakEven", "NPV ≥ 0 but the highest affordable CAPEX is below the CAPEX");
    if (be.product) check(be.product.breakEvenEur <= be.product.currentEur + 1e-9, "breakEven", "NPV ≥ 0 but the break-even product value is above the current one");
  } else {
    check((be.capexReductionPct ?? 1) > 0 && (be.energyPriceIncreasePct ?? 1) > 0, "breakEven", "NPV < 0 but break-even says nothing is needed");
    if (be.maxCapexEur != null) {
      check(be.maxCapexEur < base.capex.totalEur, "breakEven", "NPV < 0 but the highest affordable CAPEX is above the CAPEX");
      if (be.capexReductionPct !== null && be.capexReductionPct !== undefined) check(be.capexReductionPct > 0 && be.capexReductionPct <= 100, "breakEven", "CAPEX reduction outside 0–100 %");
    }
    if (be.product) check(be.product.breakEvenEur > be.product.currentEur - 1e-9, "breakEven", "NPV < 0 but the break-even product value is below the current one");
    if (be.feedstockEurT != null) check(be.feedstockEurT < 0, "breakEven", "NPV < 0 but the feedstock price headroom is positive");
  }
  if (be.feedstockEurT != null && npv.base >= 0) check(be.feedstockEurT >= 0, "breakEven", "NPV ≥ 0 but the feedstock headroom is negative");

  // Support cases never change the base verdict and are consistent with the base NPV.
  check(a.supportIncluded === false, "support", "support is included in the base case");
  for (const s of a.supportCases) {
    check(near(s.deltaNpvEur, s.npvEur - npv.base), `support.${s.schemeId}`, "Δ NPV ≠ support NPV − base NPV");
  }

  // Uncertainty: percentiles, probability and EVPI against the scenario NPVs.
  const mc = a.monteCarlo;
  if (mc) {
    check(mc.p10NpvEur <= mc.p50NpvEur && mc.p50NpvEur <= mc.p90NpvEur, "monteCarlo", "P10 ≤ P50 ≤ P90 violated");
    check(mc.probPositive >= 0 && mc.probPositive <= 1, "monteCarlo", "probability outside 0–1");
    // Independent draws between the scenario values stay inside them only when the scenarios are ordered.
    if (npv.cons <= npv.base && npv.base <= npv.opt) check(mc.p10NpvEur >= npv.cons - Math.abs(npv.cons) * 1e-6 - 1 && mc.p90NpvEur <= npv.opt + Math.abs(npv.opt) * 1e-6 + 1, "monteCarlo", "P10/P90 outside the conservative–optimistic NPV range", "order");
    if (a.robustness === "clear_go") check(mc.probPositive >= 0.99, "monteCarlo", "clear_go but the Monte Carlo probability of NPV > 0 is below 99 %");
    if (a.robustness === "clear_no") check(mc.probPositive <= 0.01, "monteCarlo", "clear_no but the Monte Carlo probability of NPV > 0 is above 1 %");
    check((mc.p50NpvEur > 0) === (mc.probPositive > 0.5) || Math.abs(mc.probPositive - 0.5) < 0.02, "monteCarlo", "median NPV sign disagrees with the probability of NPV > 0");
  }
  const mf = a.measureFirst;
  if (mf) {
    check(mf.every((m, i) => i === 0 || mf[i - 1].evpiEur >= m.evpiEur - 1e-9), "measureFirst", "EVPI list not sorted by value");
    check(new Set(mf.map((m) => m.kind)).size === mf.length, "measureFirst", "one action appears twice");
    for (const m of mf) {
      const lo = Math.min(m.lowNpvEur, m.highNpvEur), hi = Math.max(m.lowNpvEur, m.highNpvEur);
      check(m.evpiEur >= 0 && Number.isFinite(m.evpiEur), `measureFirst.${m.kind}`, "EVPI negative or not finite");
      check(m.flips === (Math.min(lo, npv.base) < 0 && Math.max(hi, npv.base) > 0), `measureFirst.${m.kind}`, "'can flip the answer' disagrees with the NPV range");
      if (!m.flips) check(m.evpiEur === 0, `measureFirst.${m.kind}`, "EVPI > 0 although the range cannot change the decision");
      check(m.evpiEur <= Math.max(0, hi, npv.base) + Math.max(0, -lo, -npv.base) + 1, `measureFirst.${m.kind}`, "EVPI larger than the NPV range allows");
    }
  }

  // Plant size table: the ×1 row is the base case of every route.
  if (a.scale) {
    const one = a.scale.find((p) => p.multiplier === 1);
    check(!!one, "scale", "no ×1 row");
    if (one) {
      check(near(one.tonnesYear, base.feed.tonnesYear), "scale", "×1 row tonnes ≠ feedstock");
      if (!a.quoteCheck && !(a.input.finance?.capexQuoteLocal)) for (const r of ROUTE_IDS) check(near(one.routes[r].npvEur, a.routeMatrix[r].base.fin.npvEur, 1e-6) && near(one.routes[r].capexEur, a.routeMatrix[r].base.capex.totalEur, 1e-6), `scale.${r}`, "×1 row differs from the base case");
    }
    check(a.scale.every((p, i, arr) => i === 0 || (arr[i - 1].multiplier < p.multiplier && arr[i - 1].tonnesYear < p.tonnesYear)), "scale", "sizes not increasing");
  }

  // Climate case.
  if (a.ghg) {
    const g = a.ghg;
    check(near(g.saving, 1 - g.productGMJ / g.comparatorGMJ, 1e-6), "ghg", "saving ≠ 1 − product / comparator");
    check(g.meetsMinimum === (g.saving >= g.minSaving), "ghg", "'meets the RED minimum' disagrees with saving vs minimum");
  }
  const dg = a.digestate;
  check(near(dg.netValueEurYear, dg.fertiliserValueEurYear - dg.handlingCostEurYear, 1e-6), "digestate", "net digestate value ≠ fertiliser value − handling");
  check(near(a.methane.lossShare, base.energy.methaneLossShare, 1e-6) || process, "methane", "methane loss share differs from the energy balance");
  check(a.methane.lossShareRange[0] <= a.methane.lossShare + 1e-9 && a.methane.lossShare <= a.methane.lossShareRange[1] + 1e-9, "methane", "loss share outside its own range");

  // Static statements: horizon and currency of the model.
  check(base.fin.cashFlows.length - 1 === 15, "horizon", `cash flows cover ${base.fin.cashFlows.length - 1} years, not the 15 stated in the report`);
  check(a.fx > 0 && a.fx === params.get("econ.fx_local_per_eur"), "fx", "exchange rate ≠ parameter registry");
  for (const p of a.marketEvidence ?? []) {
    if (p.origin === "USER_INPUT") continue;
    const reg = params.has(p.id) ? params.get(p.id) : undefined;
    if (reg !== undefined) check(near(p.value, reg, 1e-9), `evidence.${p.id}`, `report assumption ${p.value} ≠ model parameter ${reg}`);
  }
  return out;
}

/** Numbers quoted in verdict sentences must be the model's numbers. */
export function auditVerdictText(a: Assessment): Finding[] {
  const out: Finding[] = [];
  const best = a.bestRoute;
  const [cons, base, opt] = SCN.map((s) => a.routeMatrix[best][s]);
  const lang = a.lang;
  const npvs = [cons, base, opt].map((s) => Math.round(s.fin.npvEur));
  const texts = [...a.verdict.reasons, ...a.verdict.whatWouldChange];
  for (const t of texts) {
    for (const m of t.matchAll(/(?<![\d.,])(-?\d{1,3}(?:[,\s  .]\d{3})+)(?![\d])/g)) {
      const n = Number(m[1].replace(/[,\s  .]/g, "").replace(/^(-?)/, "$1"));
      if (!npvs.includes(n)) out.push({ where: "verdict text", message: `“${t}” quotes ${m[1]}, which is none of the scenario NPVs ${npvs.join(" / ")}` });
    }
    const sign = (re: RegExp, v: number, name: string, positive: boolean) => {
      if (re.test(t) && (v > 0) !== positive && !(v === 0)) out.push({ where: "verdict text", message: `“${t}” calls the ${name} NPV ${positive ? "positive" : "negative"} but it is ${Math.round(v)}` });
    };
    sign(/^Base NPV positive|^Base NPV is only marginally positive|^Базовий NPV додатний|^NPV базового сценарію лише ледь додатний/, base.fin.npvEur, "base", true);
    sign(/^Conservative-case NPV is negative|^У консервативному сценарії NPV від'ємний/, cons.fin.npvEur, "conservative", false);
    sign(/^Even the optimistic case has a negative NPV|^Навіть оптимістичний сценарій має від'ємний NPV/, opt.fin.npvEur, "optimistic", false);
    for (const m of t.matchAll(/(\d+[.,]\d)\s*(?:yr|р\.)/g)) {
      const shown = m[1].replace(",", ".");
      const options = [base, cons].map((s) => s.fin.simplePaybackYears).filter((x): x is number => x !== null).map((x) => x.toFixed(1));
      if (!options.includes(shown)) out.push({ where: "verdict text", message: `“${t}” quotes a payback of ${shown} years; the model has ${options.join(" / ")}` });
    }
    for (const m of t.matchAll(/(?:DSCR[^\d]*|мін\.\s*)(\d+[.,]\d{2})/g)) {
      if (base.fin.dscrMin === null || m[1].replace(",", ".") !== base.fin.dscrMin.toFixed(2)) out.push({ where: "verdict text", message: `“${t}” quotes DSCR ${m[1]}; the model has ${base.fin.dscrMin}` });
    }
    for (const m of t.matchAll(/≈\s*(\d+)\s*%\s*(?:lower CAPEX|higher energy prices|—|ниж|вищ)|на\s*≈\s*(\d+)\s*%/g)) {
      const n = Number(m[1] ?? m[2]);
      const allowed = [a.breakEven.capexReductionPct, a.breakEven.energyPriceIncreasePct].filter((x): x is number => x != null).map(Math.round);
      if (!allowed.includes(n)) out.push({ where: "verdict text", message: `“${t}” quotes ${n} %, break-even has ${allowed.join(" / ")}` });
    }
    for (const m of t.matchAll(/(?:data quality|якість даних)\s*(\d+)\/100/g)) if (Number(m[1]) !== a.confidence.score) out.push({ where: "verdict text", message: `“${t}” quotes data quality ${m[1]}, the model has ${a.confidence.score}` });
    for (const m of t.matchAll(/≈\s*(\d+)\s*kWe|≈\s*(\d+)\s*кВт\s*ел/g)) if (Number(m[1] ?? m[2]) !== Math.round(base.kwElEquivalent)) out.push({ where: "verdict text", message: `“${t}” quotes ${m[1] ?? m[2]} kWe, the model has ${Math.round(base.kwElEquivalent)}` });
  }
  void lang; void fmtInt;
  return out;
}

// --------------------------------------------------------------------------------------------------------------
// 2. Rendered report: parse the HTML a client receives and compare with the model.
// --------------------------------------------------------------------------------------------------------------
export const WS = /[    ]/g;
export const norm = (s: string) => s.replace(WS, " ").replace(/\s+/g, " ").trim();
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
export const txt = (html: string) => norm(decode(html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ")));

export function renderReport(a: Assessment, d: Dict, locale: Locale, access: Access, currency = getCountry(a.countryCode).currency): string {
  return renderToStaticMarkup(createElement(ResultView, { a, d, locale, currency, access, methodologyHref: `/${locale}/methodology`, countryNotes: [] }));
}

export const h2Chunks = (html: string) => {
  const parts = html.split(/(?=<h2[\s>])/);
  const map = new Map<string, string>();
  for (const p of parts) {
    const m = /^<h2[^>]*>([\s\S]*?)<\/h2>/.exec(p);
    if (m) map.set(txt(m[1]), p);
  }
  return { map, order: parts.flatMap((p) => { const m = /^<h2[^>]*>([\s\S]*?)<\/h2>/.exec(p); return m ? [txt(m[1])] : []; }) };
};
const tablesOf = (html: string) => [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((t) => [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => txt(c[1]))));
export const statsOf = (html: string) => {
  const out = new Map<string, { value: string; note: string }>();
  for (const m of html.matchAll(/<div class="text-xs font-semibold uppercase tracking-wide text-muted">([\s\S]*?)<\/div><div class="num[^"]*">([\s\S]*?)<\/div>(?:<div class="mt-1 text-xs text-muted">([\s\S]*?)<\/div>)?/g)) out.set(txt(m[1]), { value: txt(m[2]), note: m[3] ? txt(m[3]) : "" });
  return out;
};
const svgByLabel = (html: string, label: string) => {
  for (const m of html.matchAll(/<svg[\s\S]*?<\/svg>/g)) if (m[0].includes(`aria-label="${label.replace(/&/g, "&amp;")}"`)) return m[0];
  return undefined;
};
/** y-pixel of each plotted point of every cash-flow path, in series order. */
const pathPoints = (svg: string) => [...svg.matchAll(/<path d="(M[^"]+)" fill="none" stroke="(#[0-9a-f]+)"/gi)].map((m) => ({ color: m[2], pts: [...m[1].matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((p) => ({ x: Number(p[1]), y: Number(p[2]) })) }));

export function auditRendered(a: Assessment, html: string, ctx: { d: Dict; locale: Locale; access: Access; currency?: string }): Finding[] {
  const out: Finding[] = [];
  const { d, locale, access } = ctx;
  const currency = ctx.currency ?? getCountry(a.countryCode).currency;
  const where = `${a.input.countryCode}/${locale}/${access}`;
  const bad = (w: string, message: string) => out.push({ where: `${where} ${w}`, message });
  const process = !!a.input.process;
  const R = d.result, L = d.labels;
  const F = makeFormat(locale, L.units, { currency: "EUR", rate: 1 });
  const { n0, n1, eur, years, pct, range, compact } = F;
  const full = access !== "free";
  const route = a.bestRoute;
  const [cons, base, opt] = SCN.map((s) => a.routeMatrix[route][s]);
  const loHi = (xs: number[]) => [Math.min(...xs), Math.max(...xs)];
  const capexLH = loHi([cons, base, opt].map((s) => s.capex.totalEur)), npvLH = loHi([cons, base, opt].map((s) => s.fin.npvEur));
  const pbSorted = [cons, base, opt].map((s) => s.fin.simplePaybackYears).sort((x, y) => never(x) - never(y));
  const text = txt(html);
  const has = (hay: string, needle: string, w: string) => { if (!norm(hay).includes(norm(needle))) bad(w, `expected “${norm(needle)}” in the report`); };
  const absent = (hay: string, needle: string, w: string) => { if (needle && norm(hay).includes(norm(needle))) bad(w, `unexpected “${norm(needle)}” in the report`); };
  const { map: sections } = h2Chunks(html);
  const section = (title: string, w: string) => { const s = sections.get(norm(title)); if (s === undefined) bad(w, `section “${title}” is missing`); return s ?? ""; };

  if (process && a.financialsAvailable === false) return [...out, ...auditProcessRendered(a, html, ctx)];

  // --- Verdict block ---
  const first = [...sections.values()][0] ?? "";
  has(txt((/^<h2[^>]*>([\s\S]*?)<\/h2>/.exec(first) ?? [])[1] ?? ""), L.verdict[a.verdict.id], "verdict label");
  has(text, f(R.confidence, { level: L.confidence[a.confidence.level], score: a.confidence.score }), "confidence chip");
  for (const reason of a.verdict.reasons) has(text, reason, "verdict reason");
  for (const w of a.verdict.whatWouldChange) has(text, w, "what would change");
  for (const id of Object.keys(L.verdict) as (keyof typeof L.verdict)[]) if (id !== a.verdict.id) absent(txt((/^<h2[^>]*>([\s\S]*?)<\/h2>/.exec(first) ?? [])[1] ?? ""), L.verdict[id], "other verdict label");
  has(text, a.supportIncluded ? R.assumedSupport : R.noSubsidy, "subsidy statement");

  // --- Robustness: text follows the scenario NPVs; the three NPVs are the three scenarios ---
  if (a.robustness !== "insufficient") {
    const rb = section(R.robust.title, "robustness");
    const expected = a.robustness === "clear_go" ? R.robust.go : a.robustness === "clear_no" ? R.robust.no : R.robust.grey;
    has(txt(rb), expected, "robustness statement");
    for (const other of [R.robust.go, R.robust.no, R.robust.grey]) if (other !== expected) absent(txt(rb), other, "robustness statement (other)");
    has(txt(rb), f(R.robust.npv, { lo: eur(cons.fin.npvEur), base: eur(base.fin.npvEur), hi: eur(opt.fin.npvEur) }), "robustness NPVs");
    // Free tier: driver names stay, their NPV amounts and the Monte Carlo certainty are paid detail.
    if (!full && a.robustness !== "clear_no" && a.drivers.length) has(txt(rb), offerCopy[locale].driversLocked, "robustness: paid-detail note");
    if (a.monteCarlo && !full) absent(txt(rb), decisionCopy[locale].monteCarlo.stress.split("{n}")[0].trim(), "robustness Monte Carlo sentence in the free result");
    if (a.monteCarlo && full) has(txt(rb), f(decisionCopy[locale].monteCarlo.stress, { n: a.monteCarlo.n, p: a.monteCarlo.probPositive >= 1 ? `> ${pct(0.99)}` : a.monteCarlo.probPositive <= 0 ? `< ${pct(0.01)}` : pct(a.monteCarlo.probPositive) }), "robustness Monte Carlo sentence");
    if (a.robustness !== "clear_no") for (const id of a.drivers) {
      const s = a.sensitivity.find((x) => x.id === id)!;
      if (full) has(txt(rb), `(${eur(s.deltaNpvEur)})`, `robustness driver ${id}`);
      else absent(txt(rb), `(${eur(s.deltaNpvEur)})`, `robustness driver ${id} amount in the free result`);
    }
  } else absent(text, R.robust.title, "robustness hidden when data is insufficient");

  // --- Plain summary ---
  const summary = section(R.summaryTitle, "summary");
  const rg = (lo: number, hi: number) => range(lo, hi, (x) => compact(sig2(x)));
  const biogas = [cons, base, opt].map((s) => s.feed.biogasM3Year);
  // Process inlets share the report; only the feedstock-specific wording and blocks are swapped.
  const PC = processCopy(locale), fields = processFieldLabels(locale), proc = a.scenarios.base.process;
  const lead = proc ? `${PC.models[proc.kind]}: ${R.biogas} ${rg(biogas[0], biogas[2])} m³.` : f(R.summary, { tonnes: n0(sig2(base.feed.tonnesYear)), biogas: rg(biogas[0], biogas[2]) });
  has(txt(summary), lead, "summary: feedstock and biogas");
  if (route === "biomethane") has(txt(summary), f(R.summaryBm, { bm: compact(sig2(base.energy.biomethaneNm3)) }), "summary: biomethane");
  else {
    const own = a.input.energy.electricityKwhYear ?? 0;
    has(txt(summary), f(R.summaryEl, { el: n0(sig2(base.energy.elNetKwh / 1000)), heat: n0(sig2(base.energy.heatUsefulKwh / 1000)), share: own > 0 ? f(R.summaryShare, { pct: Math.round(Math.min(1, base.energy.elSelfConsumedKwh / own) * 100) }) : "" }), "summary: electricity, heat, self-use share");
  }
  has(txt(summary), f(R.summaryMoney, { capex: `${eur(capexLH[0])} – ${eur(capexLH[1])}`, payback: years(base.fin.simplePaybackYears) }), "summary: investment and payback");
  has(txt(summary), R.tone[a.verdict.id], "summary: tone follows the verdict");
  for (const id of Object.keys(R.tone) as (keyof typeof R.tone)[]) if (id !== a.verdict.id) absent(txt(summary), R.tone[id], "summary: tone of another verdict");

  // --- Key numbers ---
  const key = section(R.keyTitle, "key numbers");
  const stats = statsOf(key);
  const stat = (label: string, value: string, note?: string) => {
    const s = stats.get(norm(label));
    if (!s) return bad(`key “${label}”`, "tile missing");
    if (s.value !== norm(value)) bad(`key “${label}”`, `shows “${s.value}”, model says “${norm(value)}”`);
    if (note !== undefined && s.note !== norm(note)) bad(`key “${label}” note`, `shows “${s.note}”, model says “${norm(note)}”`);
  };
  if (proc) { if (!stats.has(norm(PC.models[proc.kind]))) bad(`key “${PC.models[proc.kind]}”`, "tile missing"); }
  else stat(R.feedstock, `${n0(sig2(base.feed.tonnesYear))} ${L.units.tYear}`, f(R.feedNote, { v: n0(base.feed.energyDensityKwhPerTonne) }));
  stat(R.biogas, `${rg(biogas[0], biogas[2])} m³`, f(R.biogasNote, { v: n0(base.feed.biogasM3Year / 8000) }));
  if (route === "biomethane") stat(R.energy, `${range(cons.energy.biomethaneNm3, opt.energy.biomethaneNm3, (x) => compact(sig2(x)))} Nm³`, R.energyBm);
  else stat(R.energy, `${range(cons.energy.elNetKwh / 1000, opt.energy.elNetKwh / 1000)} ${L.units.mwh}`, f(R.energyHeat, { v: range(cons.energy.heatUsefulKwh / 1000, opt.energy.heatUsefulKwh / 1000) }));
  stat(R.capacity, `${range(cons.kwElEquivalent, opt.kwElEquivalent)} ${L.units.kwe}`, L.plantClass[base.plantClass]);
  stat(R.capex, `${eur(capexLH[0])} – ${eur(capexLH[1])}`, currency !== "EUR" ? f(R.capexNote, { v: F.money(base.capex.totalEur * a.fx, currency) }) : undefined);
  stat(R.payback, `${years(pbSorted[0])} – ${years(pbSorted[2])}`, f(R.paybackNote, { v: years(base.fin.simplePaybackYears) }));
  stat(R.npv, eur(base.fin.npvEur), f(R.npvNote, { lo: eur(npvLH[0]), hi: eur(npvLH[1]) }));
  stat(R.route, L.route[route], f(R.routeNote, { v: L.confidence[a.confidence.level] }));
  const keyStatsCount = stats.size;
  if (keyStatsCount < 8) bad("key numbers", `only ${keyStatsCount} tiles found`);

  // Data-confidence panel repeats the same score and level.
  if (a.confidence.factors) has(txt(key), `${L.confidence[a.confidence.level]} · ${a.confidence.score}/100`, "data confidence panel");

  // --- Energy flow ---
  const flow = section(R.flowTitle, "flow");
  const e = base.energy;
  const esc = (x: string) => norm(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dd = (label: string, v: string) => { const m = new RegExp(`${esc(label)}\\s+${esc(v)}`); if (!m.test(txt(flow))) bad(`flow “${label}”`, `expected “${v}” after the label`); };
  dd(R.heatProduced, `${n0(e.heatProducedKwh / 1000)} ${L.units.mwh}`);
  dd(R.heatDigester, `${n0(e.heatDigesterKwh / 1000)} ${L.units.mwh}`);
  dd(R.heatUseful, `${n0(e.heatUsefulKwh / 1000)} ${L.units.mwh} ${R.of} ${n0(e.heatNetAvailableKwh / 1000)}`);
  dd(R.elSplit, `${n0(e.elSelfConsumedKwh / 1000)} / ${n0(e.elExportedKwh / 1000)} ${L.units.mwh}`);
  const flowSvg = (/<svg[\s\S]*?<\/svg>/.exec(flow) ?? [""])[0];
  const svgText = txt(flowSvg.replace(/<\/text>/g, " </text>").replace(/<[^>]+>/g, " ").replace(/^/, ""));
  const svgTextRaw = norm(decode([...flowSvg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<\/tspan>/g, " ").replace(/<[^>]+>/g, "")).join(" | ")));
  void svgText;
  if (proc) { if (flowSvg) bad("flow diagram", "a process inlet must not render the feedstock → digestate diagram"); }
  else {
  has(svgTextRaw, f(d.flow.tYr, { v: n0(sig2(base.feed.tonnesYear)) }), "flow diagram: tonnes");
  has(svgTextRaw, f(d.flow.m3Yr, { v: compact(sig2(base.feed.biogasM3Year)) }), "flow diagram: biogas");
  if (route === "biomethane") has(svgTextRaw, f(d.flow.nm3, { v: compact(sig2(e.biomethaneNm3)) }), "flow diagram: biomethane");
  else has(svgTextRaw, f(d.flow.mwh, { v: n0(sig2(e.elSelfConsumedKwh / 1000 + e.elExportedKwh / 1000)) }), "flow diagram: electricity");
  has(svgTextRaw, f(d.flow.mwh, { v: n0(sig2(e.heatUsefulKwh / 1000)) }), "flow diagram: useful heat");
  has(svgTextRaw, f(d.flow.mwh, { v: n0(sig2(Math.max(0, e.heatNetAvailableKwh - e.heatUsefulKwh) / 1000)) }), "flow diagram: heat without a buyer");
  has(svgTextRaw, f(d.flow.ownHeat, { v: n0(sig2(e.heatDigesterKwh / 1000)) }), "flow diagram: digester heat");
  }

  // --- Tier boundaries ---
  const hasSection = (title: string) => sections.has(norm(title));
  if (!full) {
    has(text, R.lockedTitle, "locked teaser");
    for (const t of [R.scenariosTitle, R.routesTitle, R.sensTitle, R.supportTitle, R.dMoney, R.detailsTitle]) if (hasSection(t)) bad("tier", `paid content “${t}” leaks into the free result`);
    return out;
  }
  absent(text, R.lockedTitle, "locked teaser shown in a paid report");

  // --- Base-case economics (standard) / scenario table (report) ---
  const irr = (s: ScenarioResult) => (s.fin.irr === null ? "—" : pct(s.fin.irr, 1));
  const dscr = (s: ScenarioResult) => (s.fin.dscrMin === null ? "—" : n1(s.fin.dscrMin));
  const finNote = f(R.finNote, { debt: pct(base.fin.debtEur / Math.max(1, base.fin.capexEur)) });
  has(text, finNote, "financial note (horizon, discount basis, debt share)");
  if (access === "standard") {
    const sec = section(L.scenario.base, "base case");
    const st = statsOf(sec);
    const need = (label: string, v: string) => { const s = st.get(norm(label)); if (!s || s.value !== norm(v)) bad(`base case “${label}”`, `shows “${s?.value}”, model says “${norm(v)}”`); };
    need(R.rowRevenue, eur(base.opexRev.revenueEur)); need(R.rowOpex, eur(base.opexRev.opexEur)); need(R.rowEbitda, eur(base.fin.ebitdaEurYear)); need(R.rowNpv, eur(base.fin.npvEur));
    need(R.rowCapex, eur(base.capex.totalEur)); need(R.rowPayback, years(base.fin.simplePaybackYears)); need(R.rowIrr, irr(base)); need(R.rowDscr, dscr(base));
    for (const t of [R.scenariosTitle, R.routesTitle, R.sensTitle, R.supportTitle]) if (hasSection(t)) bad("tier", `report-only section “${t}” in the standard report`);
    auditCashChart(a, svgByLabel(html, d.charts.cashAria), ["base"], bad);
  } else {
    const sec = section(R.scenariosTitle, "scenarios");
    const rows = tablesOf(sec)[0] ?? [];
    const row = (label: string) => rows.find((r) => r[0] === norm(label));
    const expectRow = (label: string, g: (s: ScenarioResult) => string) => {
      const r = row(label);
      if (!r) return bad(`scenarios “${label}”`, "row missing");
      SCN.forEach((s, i) => { const want = g(a.routeMatrix[route][s]); if (r[i + 1] !== norm(want)) bad(`scenarios “${label}” ${s}`, `shows “${r[i + 1]}”, model says “${norm(want)}”`); });
    };
    expectRow(R.rowBiogas, (s) => n1(s.feed.biogasM3Year / 1000)); expectRow(R.rowCapex, (s) => eur(s.capex.totalEur)); expectRow(R.rowOpex, (s) => eur(s.opexRev.opexEur));
    expectRow(R.rowRevenue, (s) => eur(s.opexRev.revenueEur)); expectRow(R.rowEbitda, (s) => eur(s.fin.ebitdaEurYear)); expectRow(R.rowPayback, (s) => years(s.fin.simplePaybackYears));
    expectRow(R.rowPaybackDisc, (s) => years(s.fin.discountedPaybackYears ?? null)); expectRow(R.rowNpv, (s) => eur(s.fin.npvEur)); expectRow(R.rowIrr, irr); expectRow(R.rowDscr, dscr);
    has(txt(sec), finNote, "scenarios: financial note");
    // Cross-section: the scenario table and the key numbers show the same money.
    const keyNpv = stats.get(norm(R.npv))?.value, tableNpv = row(R.rowNpv)?.[2];
    if (keyNpv !== tableNpv) bad("cross-section", `NPV in key numbers (“${keyNpv}”) ≠ NPV in the scenario table (“${tableNpv}”)`);
    const keyCapex = stats.get(norm(R.capex))?.value, tableCapex = row(R.rowCapex);
    if (tableCapex && !(keyCapex ?? "").split(" – ").every((part) => tableCapex.slice(1).includes(part))) bad("cross-section", `CAPEX range in key numbers (“${keyCapex}”) is not made of values in the scenario table (“${tableCapex.slice(1).join(" | ")}”)`);
    auditCashChart(a, svgByLabel(html, d.charts.cashAria), SCN, bad);

    // Routes table: all three routes, the chosen one marked, ranges ordered as the scenario table.
    const rsec = section(R.routesTitle, "routes");
    const rrows = (tablesOf(rsec)[0] ?? []).slice(1);
    if (rrows.length !== 3) bad("routes", `${rrows.length} routes shown, expected 3`);
    ROUTE_IDS.forEach((rt, i) => {
      const s = a.routeMatrix[rt], r = rrows[i] ?? [];
      const label = `${L.route[rt]}${rt === route ? ` ${R.chosen}` : ""}`;
      const want = [label, eur(s.base.capex.totalEur), eur(s.base.fin.ebitdaEurYear), years(s.base.fin.simplePaybackYears), eur(s.base.fin.npvEur), `${eur(Math.min(s.conservative.fin.npvEur, s.optimistic.fin.npvEur))} … ${eur(Math.max(s.conservative.fin.npvEur, s.optimistic.fin.npvEur))}`].map(norm);
      want.forEach((w, k) => { if (r[k] !== w) bad(`routes ${rt} col ${k}`, `shows “${r[k]}”, model says “${w}”`); });
    });
    const chosenRows = rrows.filter((r) => r[0].endsWith(norm(R.chosen)));
    if (chosenRows.length !== 1) bad("routes", `${chosenRows.length} routes marked as chosen`);
    else if (chosenRows[0][4] !== tableNpv) bad("cross-section", `chosen route NPV (“${chosenRows[0][4]}”) ≠ scenario table NPV (“${tableNpv}”)`);
    has(txt(rsec), f(R.routeNoteBm, { v: n0(a.routeMatrix.biomethane.base.energy.rawBiogasNm3PerHour) }), "routes: biomethane gas flow");

    // Support cases: never in the verdict; deltas against the base NPV.
    const ssec = section(R.supportTitle, "support");
    if (a.supportCases.length === 0) has(txt(ssec), R.supportNone, "support: none");
    else {
      const srows = (tablesOf(ssec)[0] ?? []).slice(1);
      if (srows.length !== a.supportCases.length) bad("support", `${srows.length} rows for ${a.supportCases.length} schemes`);
      a.supportCases.forEach((s, i) => {
        const r = srows[i] ?? [], shown = s.eligible || s.status === "closed" || !!s.unconfirmed;
        const cells = [shown ? eur(s.npvEur) : "—", shown ? years(s.paybackYears) : "—", shown ? eur(s.deltaNpvEur) : "—"].map(norm);
        cells.forEach((w, k) => { if (r[3 + k] !== w) bad(`support ${s.schemeId} col ${k}`, `shows “${r[3 + k]}”, model says “${w}”`); });
        has(r[0] ?? "", s.name, `support ${s.schemeId} name`);
      });
    }

    // Scores.
    const scs = section(R.scoresTitle, "scores");
    const scsText = txt(scs).replace(/\s+\/100/g, "/100");
    for (const s of a.scores) has(scsText, `${L.score[s.id]} ${s.value}/100${s.isRisk ? ` ${R.risk}` : ""}`, `score ${s.id}`);
    has(scsText, `${R.overall} ${a.overall.value}/100`, "overall score");

    // Sensitivity: tornado bars carry the model's Δ NPV; break-even tiles carry the break-even.
    const sens = section(R.sensTitle, "sensitivity");
    const tor = svgByLabel(html, d.charts.sensAria) ?? "";
    const torTexts = [...tor.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => norm(decode(m[1].replace(/<\/tspan>/g, " ").replace(/<[^>]+>/g, ""))));
    has(torTexts[0] ?? "", F.monetaryCompact(base.fin.npvEur), "tornado header: base NPV");
    for (const s of a.sensitivity) if (!torTexts.includes(norm(F.monetaryCompact(s.deltaNpvEur)))) bad(`tornado ${s.id}`, `bar value “${F.monetaryCompact(s.deltaNpvEur)}” missing`);
    const bst = statsOf(sens);
    const beText = (v: number | null) => (v === null ? R.unreachable : v === 0 ? R.alreadyPositive : F.pct(Math.round(v) / 100));
    if (bst.get(norm(R.beCapex))?.value !== norm(beText(a.breakEven.capexReductionPct))) bad("break-even CAPEX", `shows “${bst.get(norm(R.beCapex))?.value}”, model says “${beText(a.breakEven.capexReductionPct)}”`);
    if (bst.get(norm(R.bePrice))?.value !== norm(beText(a.breakEven.energyPriceIncreasePct))) bad("break-even price", `shows “${bst.get(norm(R.bePrice))?.value}”, model says “${beText(a.breakEven.energyPriceIncreasePct)}”`);
    if (base.fin.npvEur >= 0 && bst.get(norm(R.beCapex))?.value !== norm(R.alreadyPositive)) bad("break-even", "NPV is positive but the report asks for a CAPEX reduction");
    const flips = a.sensitivity.filter((s) => s.breaks).map((s) => sensitivityLabels(locale, d)[s.id] ?? s.label);
    for (const s of a.sensitivity) if (!torTexts.includes(norm(sensitivityLabels(locale, d)[s.id] ?? s.label))) bad(`tornado ${s.id}`, "bar label missing");
    if (flips.length) has(txt(sens), f(R.flips, { list: flips.join("; ") }), "flips sentence"); else absent(txt(sens), f(R.flips, { list: "" }).slice(0, 12), "flips sentence without flips");
  }

  // --- Panels shared by standard and report ---
  const D = decisionCopy[locale];
  if (a.measureFirst?.length) {
    const sec = section(D.measure.title, "EVPI");
    const rows = (tablesOf(sec)[0] ?? []).slice(1);
    const items = a.measureFirst.slice(0, 6);
    if (rows.length !== items.length) bad("EVPI", `${rows.length} rows for ${items.length} items`);
    items.forEach((m, i) => {
      const r = rows[i] ?? [];
      has(r[0] ?? "", D.measure.kinds[m.kind], `EVPI ${m.kind} label`);
      if (m.flips) has(r[0] ?? "", D.measure.flips, `EVPI ${m.kind} flip chip`); else absent(r[0] ?? "", D.measure.flips, `EVPI ${m.kind} flip chip`);
      const w = [`${eur(Math.min(m.lowNpvEur, m.highNpvEur))} … ${eur(Math.max(m.lowNpvEur, m.highNpvEur))}`, m.evpiEur > 0 ? eur(m.evpiEur) : "—"].map(norm);
      w.forEach((x, k) => { if (r[1 + k] !== x) bad(`EVPI ${m.kind} col ${k + 1}`, `shows “${r[1 + k]}”, model says “${x}”`); });
    });
  }
  const bep = a.breakEven;
  if (bep.maxCapexEur !== undefined || bep.product !== undefined || bep.feedstockEurT !== undefined) {
    const sec = section(D.title, "break-even prices");
    const st = statsOf(sec);
    if (bep.maxCapexEur !== undefined) {
      const s = st.get(norm(D.maxCapex));
      const want = bep.maxCapexEur === null ? R.unreachable : eur(bep.maxCapexEur);
      if (!s || s.value !== norm(want)) bad("break-even max CAPEX", `shows “${s?.value}”, model says “${norm(want)}”`);
      if (s && s.note !== norm(f(D.now, { v: eur(base.capex.totalEur) }))) bad("break-even max CAPEX note", `shows “${s.note}”, current CAPEX is ${eur(base.capex.totalEur)}`);
    }
    if (bep.feedstockEurT != null) {
      const s = st.get(norm(D.feed));
      const want = `${F.unitPrice(Math.abs(bep.feedstockEurT))}/${D.units.t}`;
      if (!s || s.value !== norm(want)) bad("break-even feedstock", `shows “${s?.value}”, model says “${norm(want)}”`);
      if (s) has(s.note, f(bep.feedstockEurT >= 0 ? D.feedPay : D.feedFee, { v: F.unitPrice(Math.abs(bep.feedstockEurT)) }), "break-even feedstock direction");
    }
    if (bep.product) {
      const p = bep.product, per = p.unit === "EUR/kWh" ? D.units.kwh : p.unit === "EUR/kWh th" ? D.units.kwhTh : D.units.nm3;
      const s = st.get(norm(D.product[p.product]));
      if (!s) bad("break-even product", "tile missing");
      else {
        if (p.breakEvenEur <= 0) has(s.value, D.free, "break-even product"); else has(s.value, `${F.unitPrice(p.breakEvenEur)}/${per}`, "break-even product value");
        has(s.note, `${F.unitPrice(p.currentEur)}/${per}`, "break-even product current value");
      }
    }
  }
  if (a.monteCarlo) {
    const mc = a.monteCarlo, C = D.monteCarlo, sec = section(C.title, "Monte Carlo");
    const st = statsOf(sec);
    const need = (label: string, v: string) => { const s = st.get(norm(label)); if (!s || s.value !== norm(v)) bad(`Monte Carlo “${label}”`, `shows “${s?.value}”, model says “${norm(v)}”`); };
    need(C.p10, eur(mc.p10NpvEur)); need(C.p50, eur(mc.p50NpvEur)); need(C.p90, eur(mc.p90NpvEur));
    need(C.prob, mc.probPositive >= 1 ? `> ${pct(0.99)}` : mc.probPositive <= 0 ? `< ${pct(0.01)}` : pct(mc.probPositive)); need(C.payback, years(mc.p50PaybackYears));
  }
  if (a.scale?.length) {
    const sec = section(D.scale.title, "plant size");
    const rows = (tablesOf(sec)[0] ?? []).slice(1);
    if (rows.length !== a.scale.length) bad("plant size", `${rows.length} rows for ${a.scale.length} sizes`);
    const topNpv = (p: (typeof a.scale)[number]) => ROUTE_IDS.reduce((x, y) => (p.routes[y].npvEur > p.routes[x].npvEur ? y : x));
    a.scale.forEach((p, i) => {
      const r = rows[i] ?? [], rt = topNpv(p), v = p.routes[rt];
      const w = [`× ${p.multiplier.toLocaleString(locale === "uk" ? "uk-UA" : undefined)}`, n0(sig2(p.tonnesYear)), L.route[rt], n0(v.kwEl), eur(v.capexEur), eur(v.npvEur)];
      if (p.multiplier === 1) { if (!r[0]?.includes(D.scale.current)) bad("plant size ×1", "current-size marker missing"); }
      w.slice(1).forEach((x, k) => { if (r[k + 1] !== norm(x)) bad(`plant size ×${p.multiplier} col ${k + 1}`, `shows “${r[k + 1]}”, model says “${norm(x)}”`); });
      if (p.multiplier === 1) {
        const rowNpv = r[5];
        const bestShown = norm(eur(a.routeMatrix[topNpv(p)].base.fin.npvEur));
        if (!a.quoteCheck && rowNpv !== bestShown) bad("cross-section", `plant-size ×1 NPV (“${rowNpv}”) ≠ base NPV of the best route (“${bestShown}”)`);
      }
    });
  }
  if (a.ghg) {
    const g = a.ghg, C = climateCopy[locale], sec = section(C.title, "climate");
    const st = statsOf(sec);
    const need = (label: string, v: string) => { const s = st.get(norm(label)); if (!s || !s.value.startsWith(norm(v))) bad(`climate “${label}”`, `shows “${s?.value}”, model says “${norm(v)}”`); };
    need(C.product, n0(g.productGMJ)); need(C.comparator, n0(g.comparatorGMJ)); need(C.saving, pct(g.saving)); need(C.avoided, n0(g.avoidedTco2eYear));
    has(txt(sec), `${C.minimum}: ${pct(g.minSaving)}`, "climate minimum");
    has(txt(sec), g.meetsMinimum ? C.meets : C.below, "climate statement");
    absent(txt(sec), g.meetsMinimum ? C.below : C.meets, "climate statement (opposite)");
  }

  // --- Details folds ---
  const details = section(R.detailsTitle, "details");
  const titles = [proc ? PC.models[proc.kind] : R.dFeed, R.dTech, R.dMoney, proc ? offerCopy[locale].residualsTitle : R.dDigestate, R.dMethane, R.dReg, R.dSafety, f(R.dAssumptions, { n: a.assumptionsUsed.length })];
  const at = titles.map((t) => details.indexOf(`>${t.replace(/&/g, "&amp;")}`));
  const fold = (i: number) => { if (at[i] < 0) { bad(`fold “${titles[i]}”`, "missing"); return ""; } const next = at.slice(i + 1).find((x) => x > at[i]); return details.slice(at[i], next ?? details.length); };
  const money = fold(2);
  const lines: Record<string, string> = { ...financialLabels(locale, d), ...(proc && { process: PC.models[proc.kind], process_operation: fields.processOpexLocalYear, residual_disposal: fields.residualCostLocalT, gas_supply: fields.gasPriceLocalNm3, treatment: fields.avoidedTreatmentLocalM3 }) };
  const mtables = (money.match(/<table[\s\S]*?<\/table>/g) ?? []).map((t) => tablesOf(t)[0]);
  const groups: [string, { id: string; label: string; eur: number }[], number][] = [[`CAPEX (${F.currency})`, base.capex.lines, base.capex.totalEur], [`${R.rowOpex} (${F.currency})`, base.opexRev.opex, base.opexRev.opexEur], [`${R.rowRevenue} (${F.currency})`, base.opexRev.revenue, base.opexRev.revenueEur]];
  if (mtables.length !== 3) bad("money tables", `${mtables.length} tables, expected 3`);
  groups.forEach(([title, rows, total], i) => {
    const t = mtables[i] ?? [];
    has(money, title, `money table ${i} title`);
    rows.forEach((l, k) => { const want = [lines[l.id] ?? l.label, F.monetaryCompact(l.eur)].map(norm); if (t[k]?.[0] !== want[0] || t[k]?.[1] !== want[1]) bad(`money table ${title} row ${l.id}`, `shows “${t[k]?.join(" | ")}”, model says “${want.join(" | ")}”`); });
    const last = t[t.length - 1] ?? [];
    if (last[0] !== norm(R.total) || last[1] !== norm(F.monetaryCompact(total))) bad(`money table ${title} total`, `shows “${last.join(" | ")}”, model says “${R.total} | ${F.monetaryCompact(total)}”`);
    if (t.length !== rows.length + 1) bad(`money table ${title}`, `${t.length - 1} lines for ${rows.length} model lines`);
  });
  const dig = a.digestate;
  if (!proc) {
  has(txt(fold(3)), f(R.dgValue, { v: eur(dig.fertiliserValueEurYear), h: eur(dig.handlingCostEurYear), n: eur(dig.netValueEurYear) }), "digestate values");
  has(txt(fold(3)), f(R.dgLine, { status: R.dgStatus[dig.status], t: n0(dig.tonnesYear), n: n0(dig.nKgYear), ha: n0(dig.landRequiredHa), avail: dig.landAvailableHa !== null ? f(R.dgAvail, { v: n0(dig.landAvailableHa) }) : R.dgUnknown }), "digestate line");
  const m = a.methane;
  has(txt(fold(4)), f(R.mLine, { v: pct(m.lossShare, 1), lo: pct(m.lossShareRange[0], 1), hi: pct(m.lossShareRange[1], 1), co2: n0(m.co2eTonnesYear), disp: n0(m.displacedCo2eTonnesYear) }), "methane line");
  }
  const feed = proc ? [] : tablesOf(fold(0))[0]?.slice(1) ?? [];
  if (feed.length !== base.feed.lines.length) bad("feedstock table", `${feed.length} rows for ${base.feed.lines.length} streams`);
  base.feed.lines.forEach((l, i) => {
    const r = feed[i] ?? [];
    const w = [n0(l.tonnesYear), n1(l.dryMatterPct), n1(l.tonnesYear > 0 ? l.ch4M3Year / l.tonnesYear : 0)].map(norm);
    w.forEach((x, k) => { if (r[k + 1] !== x) bad(`feedstock ${l.id} col ${k + 1}`, `shows “${r[k + 1]}”, model says “${x}”`); });
  });
  const feedTotal = feed.reduce((t, r) => t + Number(r[1].replace(/[^\d-]/g, "")), 0);
  if (Math.abs(feedTotal - base.feed.tonnesYear) > feed.length * 1) bad("feedstock table", `rows sum to ${feedTotal} t, the model has ${Math.round(base.feed.tonnesYear)} t`);
  const tech = txt(fold(1)), dz = base.design;
  const techCheck = (v: number, want: string, w: string) => { if (!proc || v > 0) has(tech, want, w); };
  techCheck(dz.workingVolumeM3, `≈ ${n0(sig2(dz.workingVolumeM3))} m³`, "digester volume"); techCheck(dz.hrtDays, `${n1(dz.hrtDays)} ${R.days}`, "retention time"); techCheck(dz.olrKgVsM3Day, `${n1(dz.olrKgVsM3Day)} kg VS/(m³·d)`, "loading rate"); techCheck(dz.storageVolumeM3, `≈ ${n0(sig2(dz.storageVolumeM3))} m³`, "storage volume");
  const safetyFold = txt(fold(6));
  for (const s of a.safety) has(safetyFold, s.hazard, `safety ${s.id}`);
  has(safetyFold, locText(SAFETY_DISCLAIMER, a.lang), "safety disclaimer");
  const assumptions = fold(7);
  const items = [...assumptions.matchAll(/<dt lang="en" class="font-semibold">([\s\S]*?)<\/dt>/g)].length;
  void items;
  for (const p of a.marketEvidence ?? []) has(txt(assumptions), `${p.label}:`, `assumption ${p.id}`);
  return out;
}

/** The cumulative cash-flow chart plots exactly the model's cumulative series: points are an affine map of the values. */
function auditCashChart(a: Assessment, svg: string | undefined, ids: ScenarioId[], bad: (w: string, m: string) => void) {
  if (!svg) return bad("cash-flow chart", "chart missing");
  const series = pathPoints(svg);
  if (series.length !== ids.length) return bad("cash-flow chart", `${series.length} series, expected ${ids.length}`);
  const colors: Record<ScenarioId, string> = { conservative: "#c0392b", base: "#0e7a55", optimistic: "#2f6fdb" };
  const all = ids.flatMap((id) => a.routeMatrix[a.bestRoute][id].fin.cumulative);
  const lo = Math.min(...all), hi = Math.max(...all);
  const ys = series.flatMap((s) => s.pts.map((p) => p.y));
  ids.forEach((id, k) => {
    const cum = a.routeMatrix[a.bestRoute][id].fin.cumulative, s = series.find((x) => x.color === colors[id]);
    if (!s) return bad(`cash-flow chart ${id}`, "series missing");
    if (s.pts.length !== cum.length) return bad(`cash-flow chart ${id}`, `${s.pts.length} points for ${cum.length} years`);
    // y = c − m·value, fitted on the extremes of the plotted data, checked on every point of every series.
    const vi = all.indexOf(hi), vj = all.indexOf(lo);
    if (k === 0 && hi !== lo) {
      const yHi = ys[vi], yLo = ys[vj];
      const m = (yLo - yHi) / (hi - lo);
      if (!(m > 0)) bad("cash-flow chart", "higher cumulative cash flow is not drawn higher");
      ids.forEach((id2, j) => {
        const c2 = a.routeMatrix[a.bestRoute][id2].fin.cumulative, s2 = series.find((x) => x.color === colors[id2]);
        c2.forEach((v, t) => { const y = s2?.pts[t]?.y; const want = yHi + (hi - v) * m; if (y === undefined || Math.abs(y - want) > 0.15) bad(`cash-flow chart ${id2} year ${t}`, `point drawn at y=${y}, the model value ${Math.round(v)} belongs at y=${want.toFixed(1)}`); });
        void j;
      });
    }
  });
}

function auditProcessRendered(a: Assessment, html: string, ctx: { d: Dict; locale: Locale; access: Access }): Finding[] {
  const out: Finding[] = [];
  const { d, locale, access } = ctx;
  const where = `${a.input.countryCode}/${locale}/${access}`;
  const bad = (w: string, message: string) => out.push({ where: `${where} ${w}`, message });
  const text = txt(html);
  const R = d.result, L = d.labels;
  const F = makeFormat(locale, L.units, { currency: "EUR", rate: 1 });
  const b = a.scenarios.base;
  const available = a.financialsAvailable ?? !b.process?.missingInputs?.length;
  const has = (needle: string, w: string) => { if (!text.includes(norm(needle))) bad(w, `expected “${norm(needle)}”`); };
  has(L.verdict[a.verdict.id], "verdict label");
  for (const r of a.verdict.reasons) has(r, "verdict reason");
  for (const r of a.verdict.whatWouldChange) has(r, "what would change");
  has(L.confidence[a.confidence.level], "confidence");
  if (!available) {
    for (const v of [b.fin.npvEur, b.capex.totalEur].map((x) => F.eur(x))) if (v.length > 2 && access !== "free" && text.includes(norm(v))) bad("insufficient data", `financial figure “${v}” shown although the economics are unavailable`);
    return out;
  }
  has(`${F.n0(b.energy.heatProducedKwh / 1000)} MWh/a`, "flow: heat produced"); has(`${F.n0(b.energy.heatUsefulKwh / 1000)} MWh/a`, "flow: useful heat"); has(`${F.n0(b.energy.ch4ProducedM3)} Nm³/a`, "flow: methane");
  if (access === "free") return out;
  const scn = access === "full" ? SCN : (["base"] as ScenarioId[]);
  const tables = tablesOf(html);
  const srows = (tables[0] ?? []).slice(1);
  scn.forEach((s, i) => {
    const r = a.scenarios[s], row = srows[i] ?? [];
    const want = [L.scenario[s], F.eur(r.capex.totalEur), F.eur(r.opexRev.opexEur), F.eur(r.opexRev.revenueEur), F.eur(r.fin.npvEur), r.fin.irr === null ? "—" : F.pct(r.fin.irr, 1), r.fin.dscrMin === null ? "—" : F.n1(r.fin.dscrMin), F.years(r.fin.simplePaybackYears), F.years(r.fin.discountedPaybackYears ?? null)].map(norm);
    want.forEach((w, k) => { if (row[k] !== w) bad(`scenario ${s} col ${k}`, `shows “${row[k]}”, model says “${w}”`); });
  });
  auditCashChart(a, svgByLabel(html, d.charts.cashAria), scn, bad);
  has(R.finNote.replace("{debt}", F.pct(b.fin.debtEur / Math.max(1, b.fin.capexEur))), "financial note");
  return out;
}

// --------------------------------------------------------------------------------------------------------------
// 3. Spreadsheet export: same numbers, exactly.
// --------------------------------------------------------------------------------------------------------------
export function auditExport(a: Assessment, access: "standard" | "full", currency: string, en: Assessment = a): Finding[] {
  const out: Finding[] = [];
  const where = `${a.input.countryCode}/export/${access}`;
  const bad = (w: string, message: string) => out.push({ where: `${where} ${w}`, message });
  const sheets = reportSheets(a, { currency, access });
  const labelSheets = reportSheets(en, { currency, access });
  if (labelSheets.length !== sheets.length || labelSheets.some((x, i) => x.rows.length !== sheets[i].rows.length)) bad("structure", "the export has a different structure in this language");
  const summary = sheets[0].rows;
  const get = (label: string) => { const i = labelSheets[0].rows.findIndex((r) => typeof r[0] === "string" && r[0].startsWith(label)); return i < 0 ? undefined : summary[i]?.[1]; };
  const eq = (label: string, want: unknown) => { const v = get(label); if (v === undefined) bad(label, "row missing"); else if (typeof want === "number" && typeof v === "number" ? !near(v, want, 1e-9) : v !== want) bad(label, `export has ${String(v)}, model has ${String(want)}`); };
  const base = a.scenarios.base, be = a.breakEven;
  eq("CAPEX", base.capex.totalEur); eq("Revenue and savings, year", base.opexRev.revenueEur); eq("OPEX, year", base.opexRev.opexEur); eq("EBITDA, year", base.fin.ebitdaEurYear);
  eq("NPV", base.fin.npvEur); eq("IRR", base.fin.irr as number); eq("Simple payback", base.fin.simplePaybackYears as number);
  eq("Minimum DSCR", base.fin.dscrMin as number); eq("Debt, EUR", base.fin.debtEur); eq("Biogas, m³/year", base.feed.biogasM3Year);
  eq("Net electricity", base.energy.elNetKwh / 1000); eq("Useful heat", base.energy.heatUsefulKwh / 1000); eq("Biomethane, Nm³/year", base.energy.biomethaneNm3);
  eq("Verdict", ({ STRONG_CANDIDATE: ["Strong candidate", "Сильний кандидат"], POSSIBLE_WITH_CONDITIONS: ["Possible with conditions", "Можливо за умов"], WEAK_ECONOMICS: ["Weak economics", "Слабка економіка"], INSUFFICIENT_DATA: ["Insufficient data", "Недостатньо даних"], NOT_RECOMMENDED_AT_SCALE: ["Not recommended at this scale", "Не рекомендовано за такого масштабу"] } as const)[a.verdict.id][a.lang === "uk" ? 1 : 0]); eq("Chosen route", (a.lang === "uk" ? { chp: "Когенерація", boiler: "Котел", biomethane: "Біометан" } : { chp: "CHP", boiler: "Boiler", biomethane: "Biomethane" })[a.bestRoute]); eq("Exchange rate", a.fx);
  if (be.capexReductionPct !== null) eq("CAPEX reduction needed", be.capexReductionPct);
  if (be.maxCapexEur != null) eq("Highest installed cost", be.maxCapexEur);
  if (a.monteCarlo) { eq("NPV P10", a.monteCarlo.p10NpvEur); eq("NPV median", a.monteCarlo.p50NpvEur); eq("NPV P90", a.monteCarlo.p90NpvEur); eq("Chance that NPV > 0", a.monteCarlo.probPositive); }
  const cash = sheets[1].rows;
  const ids: ScenarioId[] = access === "full" ? SCN : ["base"];
  base.fin.cashFlows.forEach((_, t) => ids.forEach((s, i) => {
    const row = cash[t + 1];
    if (row[0] !== t || !near(row[1 + i] as number, a.scenarios[s].fin.cashFlows[t], 1e-9) || !near(row[1 + ids.length + i] as number, a.scenarios[s].fin.cumulative[t], 1e-9)) bad(`cash flow ${s} year ${t}`, "export differs from the model");
  }));
  const money = sheets[2].rows;
  const totals = money.filter((_, i) => labelSheets[2].rows[i]?.[0] === "Total").map((r) => r[1]);
  [base.capex.totalEur, base.opexRev.revenueEur, base.opexRev.opexEur].forEach((v, i) => { if (!near(totals[i] as number, v, 1e-9)) bad(`money totals ${i}`, `export ${totals[i]}, model ${v}`); });
  if (access === "full") {
    const sheetNamed = (name: string) => sheets[labelSheets.findIndex((x) => x.name === name)];
    const routes = sheetNamed("Routes").rows.slice(1);
    ROUTE_IDS.forEach((r, i) => SCN.forEach((s, j) => { const row = routes[i * 3 + j], x = a.routeMatrix[r][s]; if (!near(row[2] as number, x.capex.totalEur, 1e-9) || !near(row[4] as number, x.fin.npvEur, 1e-9)) bad(`routes ${r}/${s}`, "export differs from the model"); }));
    const sens = sheetNamed("Sensitivity").rows.slice(1, 1 + a.sensitivity.length);
    a.sensitivity.forEach((s, i) => { if (!near(sens[i][1] as number, s.npvEur, 1e-9) || !near(sens[i][2] as number, s.deltaNpvEur, 1e-9)) bad(`sensitivity ${s.id}`, "export differs from the model"); });
  } else if (labelSheets.some((s) => ["Routes", "Sensitivity", "Support cases"].includes(s.name))) bad("tier", "report-only sheet in the standard export");
  return out;
}

/** Re-run the whole pipeline for one example/language/tier; used by the tests and the mutation checks. */
export function auditReport(input: Assessment["input"], d: Dict, locale: Locale, access: Access): { a: Assessment; findings: Finding[] } {
  const a = assess(input, getCountry(input.countryCode), { lang: locale === "uk" ? "uk" : "en", asOfDate: "2026-10-31" });
  const html = renderReport(a, d, locale, access);
  return { a, findings: [...auditModel(a), ...auditRendered(a, html, { d, locale, access })] };
}

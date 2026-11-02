import { assess, buildParams } from "./assess";
import { BUSINESS_TYPES } from "./businesses";
import type { CountryAdapter } from "./country";
import { FEEDSTOCKS } from "./feedstockData";
import { STRONG_RULE } from "./verdict";
import type { Assessment, Confidence, ProjectInput, Provenance, RouteId, VerdictGap, VerdictId } from "./types";

/**
 * Advisor: realistic changes a client can make to their own project, each re-run through the same model, ranked by
 * what they do to the verdict and the base NPV. It never changes prices, yields or CAPEX the client does not control —
 * those are market conditions (stress tests, break-even), not advice. Texts live in the UI (`src/i18n/advisor.ts`).
 */
export type LeverId = "heat" | "cosubstrate" | "cluster" | "equity";

/** One position of the scenario controls. Every field is a change against the client's own input; absent = unchanged. */
export interface LeverSettings {
  /** Extra heat sold to a year-round buyer, kWh/yr. */
  heatKwh?: number;
  /** Source-separated food waste taken from third parties, t/yr. */
  cosubTonnes?: number;
  /** Gate fee received for it, local currency per tonne. */
  gateFeeLocal?: number;
  /** Neighbours' feedstock pooled into the plant, as a share of the client's own quantity (1 = as much again). */
  clusterShare?: number;
  /** Debt share of CAPEX, 0–0.9. */
  debtShare?: number;
}

/** What one scenario achieves, in the figures the result shows. */
export interface ScenarioOutcome {
  verdict: VerdictId;
  robustness: Assessment["robustness"];
  route: RouteId;
  /** Conservative, base and optimistic NPV of the chosen route, EUR. */
  npvEur: [number, number, number];
  paybackYears: number | null;
  capexEur: number;
  irr: number | null;
  dscrMin: number | null;
  confidence: { level: Confidence; score: number };
  gaps: VerdictGap[];
}

export interface AdviceLever {
  id: LeverId;
  settings: LeverSettings;
  input: ProjectInput;
  outcome: ScenarioOutcome;
  /** Base-case NPV against the client's plan, EUR. */
  deltaNpvEur: number;
  /** Raises the verdict, or the base NPV by more than €1 000 and 1 % of the investment. */
  improves: boolean;
  /**
   * Paid detail (`advise(..., { thresholds: true })`), local currency: the heat price per kWh (heat) or gate fee per tonne
   * (co-substrate; negative = the plant could even pay that much) from which the change pays off — the scenario's base NPV
   * on its route reaches the plan's own NPV, or zero when the plan loses money. null = no root; absent for other levers.
   */
  breakEvenLocal?: number | null;
}

/** Up to two levers together (plus financing when only DSCR then separates them from "Strong"). */
export interface AdviceCombination {
  ids: LeverId[];
  settings: LeverSettings;
  input: ProjectInput;
  outcome: ScenarioOutcome;
  deltaNpvEur: number;
}

/** Bounds of the controls for this project; numbers only, so the browser can build any scenario without re-deriving them. */
export interface AdviceContext {
  /** Local currency per EUR. */
  fx: number;
  /** Heat the client already uses or sells, kWh/yr: the heat lever adds to it. */
  heatKnownKwh: number;
  /** Unused heat of the chosen route (CHP when the route is biomethane), kWh/yr: the most a new buyer could take; 0 = no heat lever. */
  heatMaxKwh: number;
  /** Value of a kWh of heat in the scenarios, local currency: the client's heat price, else gas parity, else the national value. */
  heatPriceLocal: number;
  /** Suggested food-waste quantity, t/yr; 0 = not applicable (process input or the mix already co-digests). */
  cosubTonnes: number;
  /** Default gate fee, local currency per tonne. */
  gateFeeLocal: number;
  /** Neighbours' manure can be pooled (manure is at least half of the organic matter). */
  cluster: boolean;
  /** Current debt share of CAPEX; null when the project has no debt (no financing lever). */
  debtShare: number | null;
}

export interface Advice {
  base: ScenarioOutcome;
  context: AdviceContext;
  /** Every change tried: those that improve the result first (higher verdict, then larger NPV gain), then the rest. */
  levers: AdviceLever[];
  combined?: AdviceCombination;
  /** Scenarios run through the model, combinations included. */
  tested: number;
  /** NPV change below which a lever counts as "no effect", EUR (€1 000 or 1 % of the investment). */
  minGainEur: number;
}

const REVIEWED = "2026-11-02";
const judgement = (id: string, label: string, value: number, unit: string, source: string): Provenance =>
  ({ id, label, value, unit, kind: "ASSUMPTION", source, country: "GLOBAL", date: REVIEWED, confidence: "LOW", origin: "ENGINEERING_ASSUMPTION" });

/** Judgement values behind the scenarios (LOW confidence); the client replaces each one with an offer. */
export const ADVICE_ASSUMPTIONS = {
  heatShare: judgement("advice.heat_buyer_share", "Share of the unused heat offered to a year-round heat buyer", 0.8, "—",
    "Judgement: a buyer with a flat demand cannot take the whole surplus (outages, more digester heat in winter); the model still matches heat month by month."),
  cosubVsShare: judgement("advice.cosubstrate_vs_share", "Co-substrate share of the organic matter (VS) after it is added", 0.3, "—",
    "Judgement: usual co-digestion share at manure plants; the model applies pasteurisation, rejects and inhibition checks to the new mix."),
  cosubKm: judgement("advice.cosubstrate_distance_km", "Haul distance of the co-substrate", 15, "km", "Judgement: food processors within a regional collection radius."),
  gateFeeEur: judgement("advice.cosubstrate_gate_fee_eur_t", "Gate fee received for source-separated food waste", 6, "EUR/t",
    "Judgement, deliberately low. WRAP UK Gate Fees Report 2025/26 (3 July 2026): AD gate fees fell from 2024/25 and several councils paid £0 or less. The paid report gives the gate fee at which the scenario breaks even."),
  clusterKm: judgement("advice.cluster_distance_km", "Haul distance of the neighbours' feedstock", 5, "km",
    "Judgement: neighbouring farms within a few kilometres; slurry hauled much further rarely pays (see the maximum distance per stream)."),
} as const;

/** The smallest NPV gain worth calling a lever: €1 000 or 1 % of the investment. */
const minGain = (o: ScenarioOutcome) => Math.max(1000, 0.01 * o.capexEur);
const RANK: Record<VerdictId, number> = { INSUFFICIENT_DATA: -1, NOT_RECOMMENDED_AT_SCALE: 0, WEAK_ECONOMICS: 1, POSSIBLE_WITH_CONDITIONS: 2, STRONG_CANDIDATE: 3 };
export const verdictRank = (v: VerdictId) => RANK[v];
/** Two significant digits: a suggestion reads "≈ 1 200 MWh", not "1 237 461 kWh". */
export const roundSuggestion = (x: number) => (x > 0 ? Math.round(x / 10 ** (Math.floor(Math.log10(x)) - 1)) * 10 ** (Math.floor(Math.log10(x)) - 1) : 0);
const floorTo5pp = (x: number) => Math.max(0, Math.floor(x * 20 + 1e-9) / 20);

export function outcomeOf(a: Assessment): ScenarioOutcome {
  const b = a.scenarios.base;
  return {
    verdict: a.verdict.id, robustness: a.robustness, route: a.bestRoute, npvEur: [...a.ranges.npvEur],
    paybackYears: b.fin.simplePaybackYears, capexEur: b.capex.totalEur, irr: b.fin.irr, dscrMin: b.fin.dscrMin,
    confidence: { level: a.confidence.level, score: a.confidence.score }, gaps: a.verdict.gaps ?? [],
  };
}

export function leverContext(a: Assessment, country: CountryAdapter): AdviceContext {
  const input = a.input;
  const params = buildParams(country, input.regionId, input.energy, input.city);
  const e = input.energy;
  const gasHeatKwhPerM3 = params.get("eng.natgas_lhv_kwh_m3") * params.get("eng.boiler_efficiency");
  const heatKnownKwh = e.heatNeed === "none" ? 0 : (e.heatKwhYear ?? 0) > 0 ? e.heatKwhYear! : (e.gasM3Year ?? 0) * gasHeatKwhPerM3;
  // Same order as the model's customer demand (demand.ts): agreed heat price, else the client's gas price, else national.
  const heatPriceLocal = (e.heatPriceLocalPerKwh ?? 0) > 0 ? e.heatPriceLocalPerKwh! : (e.gasPriceLocalPerM3 ?? 0) > 0 ? e.gasPriceLocalPerM3! / gasHeatKwhPerM3 : params.get("econ.heat_value_eur_kwh_th") * a.fx;
  const heatRoute: RouteId = a.bestRoute === "biomethane" ? "chp" : a.bestRoute;
  const h = a.routeMatrix[heatRoute].base.energy;
  const unused = Math.max(0, h.heatNetAvailableKwh - h.heatUsefulKwh);
  // Below ≈ 50 MWh or a tenth of the available heat a buyer is not worth a contract (judgement).
  const heatMaxKwh = unused >= Math.max(50_000, 0.1 * h.heatNetAvailableKwh) ? unused : 0;
  const feed = a.scenarios.base.feed;
  let cosubTonnes = 0;
  if (!input.process && feed.vsTonnesYear > 0) {
    const fw = FEEDSTOCKS.food_waste;
    const vsPerT = (fw.dryMatterPct / 100) * (fw.vsPctOfDm / 100);
    const share = ADVICE_ASSUMPTIONS.cosubVsShare.value;
    const processingVs = feed.lines.filter((l) => l.category === "processing").reduce((t, l) => t + l.vsTonnesYear, 0);
    // Raise the co-substrate share of VS to `share`; a mix that already co-digests that much has no such lever.
    if (processingVs < share * feed.vsTonnesYear) cosubTonnes = roundSuggestion(Math.min(20_000, Math.max(500, (share * feed.vsTonnesYear - processingVs) / ((1 - share) * vsPerT))));
  }
  const fin = a.scenarios.base.fin;
  return {
    fx: a.fx,
    heatKnownKwh,
    heatMaxKwh,
    heatPriceLocal,
    cosubTonnes,
    gateFeeLocal: roundSuggestion(ADVICE_ASSUMPTIONS.gateFeeEur.value * a.fx),
    // Pooling is a manure lever: neighbours' energy crops or wastes are bought feedstock, not a cluster.
    cluster: !input.process && feed.tonnesYear > 0 && feed.manureShareVs >= 0.5 && BUSINESS_TYPES[input.businessType]?.audience !== "municipal",
    debtShare: fin.debtEur > 0 && fin.capexEur > 0 ? fin.debtEur / fin.capexEur : null,
  };
}

/** The client's input with the levers applied. Pure: the same settings always give the same input. */
export function applyLevers(input: ProjectInput, s: LeverSettings, ctx: AdviceContext): ProjectInput {
  const n: ProjectInput = JSON.parse(JSON.stringify(input));
  const k = s.clusterShare ?? 0;
  if (k > 0 && !n.process) {
    for (const f of input.feedstocks) {
      if (!(f.quantity > 0)) continue;
      // Neighbours sell their stream, they do not pay to be rid of it: no disposal saving, at least the client's own
      // price or lost-sale value, no gate fee. Their feedstock is not analysed: catalogue values, not the client's lab data.
      const price = Math.max(0, f.purchasePricePerTonneLocal ?? 0, f.opportunityValuePerTonneLocal ?? 0);
      n.feedstocks.push({
        id: `${f.id}~nb`,
        ...(f.animal ? { animal: f.animal, ...(f.housing ? { housing: f.housing } : {}) } : { type: f.type }),
        quantity: f.quantity * k,
        ...(f.monthsActive ? { monthsActive: f.monthsActive } : {}),
        ...(f.startMonth ? { startMonth: f.startMonth } : {}),
        ...(f.handling ? { handling: f.handling } : {}),
        delivered: true,
        // A supply area that grows with the quantity: haul distance × √size, as in the plant-size table.
        distanceKm: f.delivered && f.distanceKm ? f.distanceKm * Math.sqrt(1 + k) : ADVICE_ASSUMPTIONS.clusterKm.value,
        ...(price > 0 ? { purchasePricePerTonneLocal: price } : {}),
      });
    }
  }
  if ((s.cosubTonnes ?? 0) > 0 && !n.process) {
    n.feedstocks.push({
      id: "advice-cosubstrate", type: "food_waste", quantity: s.cosubTonnes!, delivered: true, distanceKm: ADVICE_ASSUMPTIONS.cosubKm.value, handling: "paid_disposal",
      ...(s.gateFeeLocal ? { purchasePricePerTonneLocal: -s.gateFeeLocal } : {}),
    });
  }
  if ((s.heatKwh ?? 0) > 0) {
    // One heat need per project: the buyer's flat demand is added to what the client already uses.
    n.energy.heatNeed = "year_round_process";
    n.energy.heatKwhYear = ctx.heatKnownKwh + s.heatKwh!;
  }
  if (s.debtShare !== undefined) n.finance = { ...(n.finance ?? {}), debtShare: Math.min(0.9, Math.max(0, s.debtShare)) };
  return n;
}

/** Scenario preview: the same model as the result, fast path (`lite`), at the assessment's own date. */
export function runScenario(input: ProjectInput, country: CountryAdapter, asOfDate?: string): ScenarioOutcome {
  return outcomeOf(assess(input, country, { lang: "en", asOfDate, lite: true }));
}

/** Debt share at which DSCR reaches the lender threshold: DSCR is inversely proportional to the debt (same rate and tenor). */
const debtShareForDscr = (share: number, dscr: number) => floorTo5pp((share * dscr) / STRONG_RULE.dscrMin);

/**
 * Levers for this project, best first, and the strongest combination. `thresholds: true` (paid report) adds the
 * break-even heat price and gate fee: four more runs, linear roots (NPV is linear in a product price and a per-tonne price).
 */
export function advise(a: Assessment, country: CountryAdapter, opts: { thresholds?: boolean } = {}): Advice | undefined {
  if (a.verdict.id === "INSUFFICIENT_DATA" || a.financialsAvailable === false) return undefined;
  const ctx = leverContext(a, country);
  const asOfDate = a.dataAudit?.asOfDate;
  const base = outcomeOf(a);
  let tested = 0;
  const gain = minGain(base);
  const evaluate = (id: LeverId, settings: LeverSettings): AdviceLever => {
    tested++;
    const input = applyLevers(a.input, settings, ctx);
    const outcome = runScenario(input, country, asOfDate);
    const deltaNpvEur = outcome.npvEur[1] - base.npvEur[1];
    return { id, settings, input, outcome, deltaNpvEur, improves: RANK[outcome.verdict] > RANK[base.verdict] || deltaNpvEur > gain };
  };
  const tried: AdviceLever[] = [];
  if (ctx.heatMaxKwh > 0) tried.push(evaluate("heat", { heatKwh: roundSuggestion(ctx.heatMaxKwh * ADVICE_ASSUMPTIONS.heatShare.value) }));
  if (ctx.cosubTonnes > 0) tried.push(evaluate("cosubstrate", { cosubTonnes: ctx.cosubTonnes, gateFeeLocal: ctx.gateFeeLocal }));
  if (ctx.cluster) {
    const [double, triple] = [1, 2].map((share) => evaluate("cluster", { clusterShare: share }));
    tried.push(triple.outcome.npvEur[1] > double.outcome.npvEur[1] ? triple : double);
  }
  // Financing only matters where DSCR is one of the conditions "Strong" misses; it never moves the NPV.
  if (ctx.debtShare !== null && base.dscrMin !== null && base.verdict === "POSSIBLE_WITH_CONDITIONS" && base.gaps.includes("dscr")) {
    const share = debtShareForDscr(ctx.debtShare, base.dscrMin);
    if (share < ctx.debtShare) tried.push(evaluate("equity", { debtShare: share }));
  }
  const levers = tried.sort((x, y) => Number(y.improves) - Number(x.improves) || RANK[y.outcome.verdict] - RANK[x.outcome.verdict] || y.deltaNpvEur - x.deltaNpvEur);

  // Greedy: the best economic lever, then a second one only if it still adds; financing last.
  let combined: AdviceCombination | undefined;
  const economic = levers.filter((l) => l.improves && l.id !== "equity" && l.deltaNpvEur > gain).sort((x, y) => y.deltaNpvEur - x.deltaNpvEur);
  if (economic.length >= 2) {
    let best: AdviceCombination = { ids: [economic[0].id], settings: economic[0].settings, input: economic[0].input, outcome: economic[0].outcome, deltaNpvEur: economic[0].deltaNpvEur };
    for (const l of economic.slice(1)) {
      const settings = { ...best.settings, ...l.settings };
      const next = evaluate(l.id, settings);
      if (next.outcome.npvEur[1] > best.outcome.npvEur[1] + gain) best = { ids: [...best.ids, l.id], settings, input: next.input, outcome: next.outcome, deltaNpvEur: next.deltaNpvEur };
      if (best.ids.length === 2) break;
    }
    const o = best.outcome;
    if (best.ids.length === 2 && ctx.debtShare !== null && o.dscrMin !== null && o.gaps.length === 1 && o.gaps[0] === "dscr") {
      const settings = { ...best.settings, debtShare: debtShareForDscr(ctx.debtShare, o.dscrMin) };
      const next = evaluate("equity", settings);
      if (RANK[next.outcome.verdict] > RANK[o.verdict]) best = { ids: [...best.ids, "equity"], settings, input: next.input, outcome: next.outcome, deltaNpvEur: next.deltaNpvEur };
    }
    if (best.ids.length >= 2) combined = best;
  }

  if (opts.thresholds) {
    // On the lever's own route: the best-route NPV is a max over routes and bends where the route changes. The target is
    // the plan's own NPV (a change must not be credited with what the plan already earns), or zero when the plan loses money.
    const routeNpv = (input: ProjectInput, route: RouteId) => assess(input, country, { lang: "en", asOfDate, lite: true }).routeMatrix[route].base.fin.npvEur;
    const target = Math.max(0, base.npvEur[1]);
    const root = (x1: number, n1: number, x2: number, n2: number) => (Math.abs(n2 - n1) < 1e-6 ? null : x1 + ((target - n1) * (x2 - x1)) / (n2 - n1));
    for (const l of levers) {
      const route = l.outcome.route;
      if (l.id === "heat") {
        const p1 = ctx.heatPriceLocal;
        const at = (p: number) => routeNpv({ ...l.input, energy: { ...l.input.energy, heatPriceLocalPerKwh: p } }, route);
        l.breakEvenLocal = root(p1, at(p1), 2 * p1, at(2 * p1));
      }
      if (l.id === "cosubstrate") {
        const g1 = l.settings.gateFeeLocal ?? 0, g2 = g1 + 10 * ctx.fx;
        const at = (g: number) => routeNpv(applyLevers(a.input, { ...l.settings, gateFeeLocal: g }, ctx), route);
        l.breakEvenLocal = root(g1, at(g1), g2, at(g2));
      }
    }
  }
  return { base, context: ctx, levers, ...(combined ? { combined } : {}), tested, minGainEur: gain };
}

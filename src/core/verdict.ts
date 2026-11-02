import { fmtDec, fmtInt, fmtUnit, type CoreLang, tr } from "./i18n";
import type { Assessment, Confidence, ScenarioResult, VerdictGap, VerdictId } from "./types";

/** Below this client-side data score the verdict is INSUFFICIENT_DATA and no report is sold. */
export const VERDICT_MIN_SCORE = 35;

/** "Strong" thresholds: simple payback (base, conservative case) in years and the lowest DSCR a lender accepts. */
export const STRONG_RULE = { paybackYears: 6.5, conservativePaybackYears: 10.5, dscrMin: 1.3 } as const;
/** "Possible" needs a positive base NPV paid back within this many years (or the borderline case below). */
export const POSSIBLE_MAX_PAYBACK_YEARS = 10;

/**
 * The verdict is rule-based and every branch states the evidence that triggered it.
 * It never comes from the composite score alone, and it never counts subsidies.
 */
export function decideVerdict(args: {
  base: ScenarioResult;
  cons: ScenarioResult;
  opt: ScenarioResult;
  /** `clientScore` excludes advisory model-side deductions: a client cannot fill in the model's own data gaps. */
  confidence: { level: Confidence; score: number; clientScore?: number; /** Laboratory DM/VS/BMP already entered for every stream. */ labDone?: boolean };
  minKwEl: number;
  breakEven: Assessment["breakEven"];
  lang: CoreLang;
}): Assessment["verdict"] {
  const { base, cons, opt, confidence, minKwEl, breakEven, lang } = args;
  const T = tr(lang);
  const fmt = fmtInt(lang);
  const D = fmtDec(lang);
  const U = fmtUnit(lang);
  const y = (n: number) => U(n, "year", 1, "short");
  const reasons: string[] = [];
  const whatWouldChange: string[] = [];

  if (base.process?.missingInputs.length) return {
    id: "INSUFFICIENT_DATA",
    reasons: [T("The gas estimate is available, but project costs or auxiliary loads are unknown. An economic conclusion cannot be established.")],
    whatWouldChange: [T("Provide installed budgets, upstream OPEX, residuals disposal and auxiliary energy. Enter zero only when its absence is confirmed.")],
  };

  if (base.feed.tonnesYear <= 0 && !(base.process && base.energy.ch4ProducedM3 > 0)) {
    return { id: "INSUFFICIENT_DATA", reasons: [T("No feedstock stream entered.")], whatWouldChange: [T("Add herd size or waste quantity.")] };
  }
  if ((confidence.clientScore ?? confidence.score) < VERDICT_MIN_SCORE) {
    reasons.push(T("Not enough data for a conclusion (data quality {score}/100).", { score: confidence.score }));
    return { id: "INSUFFICIENT_DATA", reasons, whatWouldChange: [T("Add the items listed under “What you can add” below.")] };
  }

  const kw = base.kwElEquivalent;
  const pb = base.fin.simplePaybackYears;
  const npvBase = base.fin.npvEur;

  if (kw < minKwEl && npvBase < 0) {
    reasons.push(T("Energy equivalent ≈ {kw} kWe — below {minKwEl} kW — and the base-case NPV is negative (€{npvBase}).", { kw: Math.round(kw), minKwEl, npvBase: fmt(npvBase) }));
    whatWouldChange.push(T("Add energy-dense wastes (co-substrate) or pool feedstock with neighbours (cluster plant)."));
    whatWouldChange.push(T("Consider the simplest option — a biogas boiler for a constant heat need — or supplying feedstock to a larger plant."));
    return { id: "NOT_RECOMMENDED_AT_SCALE", reasons, whatWouldChange };
  }

  const pbCons = cons.fin.simplePaybackYears;
  // "Strong" must survive the conservative case at the country discount rate — otherwise it is a grey-zone project.
  // No debt (all-equity project) means no debt service to cover: DSCR is not applicable, not zero.
  // Stable fat co-digestion is documented only up to ~30 % of VS (Long et al. 2012, see eng.fat_share_warning): a feed made mostly of grease is untested territory.
  const fatDominated = base.feed.fatDominantShareVs > 0.5;
  // Each "Strong" condition that fails is a gap the advisor can name (ids only; the UI words them).
  const strongGaps: VerdictGap[] = [
    ...(fatDominated ? ["fat" as const] : []),
    ...(pb === null || pb > STRONG_RULE.paybackYears ? ["payback" as const] : []),
    ...(pbCons === null || pbCons > STRONG_RULE.conservativePaybackYears || cons.fin.npvEur <= 0 ? ["conservative" as const] : []),
    ...((base.fin.dscrMin ?? Infinity) < STRONG_RULE.dscrMin ? ["dscr" as const] : []),
    ...(confidence.level === "LOW" ? ["confidence" as const] : []),
  ];
  const strong = strongGaps.length === 0;
  const borderline = npvBase < 0 && npvBase >= -0.1 * base.fin.capexEur && pb !== null && pb <= 8.5 && opt.fin.npvEur >= 0;
  const possible = (npvBase >= 0 && pb !== null && pb <= POSSIBLE_MAX_PAYBACK_YEARS) || borderline;

  if (strong) {
    reasons.push(T("Simple payback ≈ {pb} (base) and ≈ {pbCons} in the conservative case; base NPV €{npvBase}; minimum DSCR {dscrMin}.", { pb: y(pb!), pbCons: y(pbCons!), npvBase: fmt(npvBase), dscrMin: base.fin.dscrMin === null ? "—" : D(base.fin.dscrMin, 2) }));
    whatWouldChange.push(T("Confirm with a laboratory feedstock analysis (BMP) and real energy invoices."));
    return { id: "STRONG_CANDIDATE", reasons, whatWouldChange };
  }
  if (possible) {
    reasons.push(
      borderline
        ? T("Base NPV close to zero (€{npvBase}) at the country discount rate, payback ≈ {pb}; optimistic case positive (€{npvEur}).", { npvBase: fmt(npvBase), pb: y(pb!), npvEur: fmt(opt.fin.npvEur) })
        : T("Base NPV positive (€{npvBase}), payback ≈ {pb}.", { npvBase: fmt(npvBase), pb: y(pb!) }),
    );
    if (cons.fin.npvEur < 0) {
      reasons.push(T("Conservative-case NPV is negative (€{npvEur}) — sensitive to key assumptions.", { npvEur: fmt(cons.fin.npvEur) }));
      whatWouldChange.push(T("Secure long-term heat and power offtake; benchmark CAPEX with 3–5 suppliers."));
    }
    if (fatDominated) {
      reasons.push(T("Grease and fat sludge are {fatDominantShareVs} % of the organic matter — far above the ≈ 30 % where stable co-digestion is documented; the economics cannot be called strong without a pilot.", { fatDominantShareVs: Math.round(base.feed.fatDominantShareVs * 100) }));
      whatWouldChange.push(T("Blend the fat with manure, sludge or food waste (fat ≤ 30 % of VS) or run a pilot digestion test."));
    }
    if (confidence.level === "LOW") {
      reasons.push(T("Data confidence is low — the verdict is preliminary."));
      // Never ask for a laboratory analysis the client has already entered.
      whatWouldChange.push(confidence.labDone ? T("Add the items listed under “What you can add” below.") : T("Fill in missing data and run a laboratory feedstock analysis."));
    }
    if ((base.fin.dscrMin ?? 99) < STRONG_RULE.dscrMin) whatWouldChange.push(T("Raise the equity share or obtain concessional finance: DSCR is below bank thresholds."));
    return { id: "POSSIBLE_WITH_CONDITIONS", reasons, whatWouldChange, gaps: strongGaps };
  }

  const deep = npvBase < -0.1 * base.fin.capexEur;
  reasons.push(
    pb === null
      ? T("Base-case operating margin does not cover costs.")
      : npvBase >= 0
        // Positive but thin: the return only just beats the discount rate and capital comes back after more than 10 years.
        ? T("Base NPV is only marginally positive (€{npvBase}) and simple payback ≈ {pb} exceeds 10 years — too thin a margin for a screening go.", { npvBase: fmt(npvBase), pb: y(pb) })
        : deep
          ? T("Simple payback ≈ {pb}; base NPV €{npvBase} (well below zero at the country discount rate).", { pb: y(pb), npvBase: fmt(npvBase) })
          : T("Simple payback ≈ {pb}; base NPV €{npvBase} (below zero at the country discount rate).", { pb: y(pb), npvBase: fmt(npvBase) }),
  );
  if (opt.fin.npvEur < 0) reasons.push(T("Even the optimistic case has a negative NPV (€{npvEur}).", { npvEur: fmt(opt.fin.npvEur) }));
  // Break-even values are the paid detail behind the answer (decision 2026-11-02): kept apart from the free advice.
  const thresholds: string[] = [];
  if (breakEven.capexReductionPct !== null) thresholds.push(T("NPV = 0 with ≈ {capexReductionPct} % lower CAPEX (or an equivalent grant).", { capexReductionPct: Math.round(breakEven.capexReductionPct) }));
  else whatWouldChange.push(T("Lower CAPEX alone does not fix it — additional revenue streams are needed."));
  if (breakEven.energyPriceIncreasePct !== null) thresholds.push(T("NPV = 0 with ≈ {energyPriceIncreasePct} % higher energy prices.", { energyPriceIncreasePct: Math.round(breakEven.energyPriceIncreasePct) }));
  whatWouldChange.push(T("A gate-fee co-substrate (food waste, fats), a real heat customer, or a cluster with neighbours."));
  const gaps: VerdictGap[] = [...(npvBase < 0 ? ["npv" as const] : []), ...(pb === null || pb > POSSIBLE_MAX_PAYBACK_YEARS ? ["payback" as const] : [])];
  return { id: "WEAK_ECONOMICS", reasons, whatWouldChange, thresholds, gaps };
}

export const VERDICT_LABELS: Record<VerdictId, { en: string }> = {
  STRONG_CANDIDATE: { en: "Strong candidate" },
  POSSIBLE_WITH_CONDITIONS: { en: "Possible with conditions" },
  WEAK_ECONOMICS: { en: "Weak economics" },
  INSUFFICIENT_DATA: { en: "Insufficient data" },
  NOT_RECOMMENDED_AT_SCALE: { en: "Not recommended at current scale" },
};

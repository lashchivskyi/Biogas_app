import type { Advice, AdviceContext, Assessment, LeverId, LeverSettings, ScenarioOutcome, VerdictGap, VerdictId } from "@/core";
import { ADVICE_ASSUMPTIONS, POSSIBLE_MAX_PAYBACK_YEARS, STRONG_RULE } from "@/core";
import { countryName, fmt as f, type Dict, type Locale } from "@/i18n";
import { advisorCopy } from "@/i18n/advisor";
import { INTL_TAG } from "@/i18n/config";
import { decisionCopy } from "@/i18n/decision";
import { qualityPanelCopy } from "@/i18n/quality";
import { makeFormat, sig2, tidy } from "@/lib/format";
import { Icon, type IconName } from "./brand/Icon";
import { DecisionRange, SignedBar } from "./Ranges";

/**
 * Advisor views shared by the free result (teaser, "what the report answers"), the scenario lab and the paid action
 * plan. Pure markup: server pages and client components render the same words and figures.
 */
type Format = ReturnType<typeof makeFormat>;
type Units = Dict["labels"]["units"];

export const LEVER_ICON: Record<LeverId, IconName> = { heat: "heat", cosubstrate: "leaf", cluster: "route", equity: "scale" };
export const VERDICT_PILL: Record<VerdictId, string> = {
  STRONG_CANDIDATE: "bg-brandsoft text-brandink ring-good/30", POSSIBLE_WITH_CONDITIONS: "bg-amber-50 text-amber-900 ring-amber-300", WEAK_ECONOMICS: "bg-red-50 text-red-900 ring-red-200",
  NOT_RECOMMENDED_AT_SCALE: "bg-red-100 text-red-950 ring-red-300", INSUFFICIENT_DATA: "bg-zinc-100 text-zinc-800 ring-zinc-300",
};

export function VerdictPill({ id, label, size = "sm" }: { id: VerdictId; label: string; size?: "sm" | "md" }) {
  return <span className={`inline-flex items-center rounded-full font-bold ring-1 ring-inset ${size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"} ${VERDICT_PILL[id]}`}>{label}</span>;
}

/** Local-currency price the client negotiates (gate fee, heat price): three significant digits, the locale's currency style. */
export const localPrice = (locale: Locale, currency: string) => (v: number) => new Intl.NumberFormat(INTL_TAG[locale], { style: "currency", currency, maximumSignificantDigits: 3 }).format(v);

/** A signed NPV change in the display currency: "+€210K", "−€45K". */
export const signedEur = (F: Format, v: number) => `${v > 0 ? "+" : ""}${F.eur(v)}`;

/** Title and one-line description of a lever with this project's figures. */
export function leverWords(id: LeverId, s: LeverSettings, ctx: AdviceContext, locale: Locale, F: Format, units: Units, currency: string) {
  const A = advisorCopy[locale];
  const price = localPrice(locale, currency);
  const km = (v: number) => `${F.n0(v)} ${units.km}`;
  const text = id === "heat" ? f(A.levers.heat.text, { mwh: `${F.n0(sig2((s.heatKwh ?? 0) / 1000))} ${units.mwh}`, price: price(ctx.heatPriceLocal) })
    : id === "cosubstrate" ? f(A.levers.cosubstrate.text, { t: `${F.n0(sig2(s.cosubTonnes ?? 0))} ${units.t}`, km: km(ADVICE_ASSUMPTIONS.cosubKm.value), fee: price(s.gateFeeLocal ?? 0) })
      : id === "cluster" ? f(A.levers.cluster.text, { pct: F.pct(s.clusterShare ?? 0), km: km(ADVICE_ASSUMPTIONS.clusterKm.value) })
        : f(A.levers.equity.text, { pct: F.pct(s.debtShare ?? 0), min: F.n1(STRONG_RULE.dscrMin) });
  return { title: A.levers[id].title, text: tidy(text) };
}

/** The verdict one step up from this one, whose missing conditions the gaps name. */
export const nextVerdict = (v: VerdictId): VerdictId | null => (v === "POSSIBLE_WITH_CONDITIONS" ? "STRONG_CANDIDATE" : v === "WEAK_ECONOMICS" ? "POSSIBLE_WITH_CONDITIONS" : null);

export function gapWords(g: VerdictGap, a: Assessment, o: ScenarioOutcome, locale: Locale, F: Format): string {
  return tidy(gapText(g, a, o, locale, F));
}

function gapText(g: VerdictGap, a: Assessment, o: ScenarioOutcome, locale: Locale, F: Format): string {
  const A = advisorCopy[locale];
  switch (g) {
    case "payback": return f(A.gaps.payback, { now: F.years(o.paybackYears), max: F.years(o.verdict === "POSSIBLE_WITH_CONDITIONS" ? STRONG_RULE.paybackYears : POSSIBLE_MAX_PAYBACK_YEARS) });
    case "conservative": return f(A.gaps.conservative, { npv: F.eur(o.npvEur[0]) });
    case "dscr": return f(A.gaps.dscr, { now: o.dscrMin === null ? "—" : F.n1(o.dscrMin), min: F.n1(STRONG_RULE.dscrMin) });
    case "confidence": return f(A.gaps.confidence, { score: o.confidence.score, where: qualityPanelCopy(locale).client });
    case "fat": return f(A.gaps.fat, { pct: F.pct(a.scenarios.base.feed.fatDominantShareVs) });
    case "npv": return f(A.gaps.npv, { npv: F.eur(o.npvEur[1]) });
  }
}

/** Levers worth showing: they improve the result, or they move the NPV enough to be worth knowing about. */
export const shownLevers = (advice: Advice) => advice.levers.filter((l) => l.improves || Math.abs(l.deltaNpvEur) > advice.minGainEur);

/** Free verdict box: what the advisor found, with a link to the lab. */
export function AdviceTeaser({ advice, d, locale, F }: { advice: Advice; d: Pick<Dict, "labels">; locale: Locale; F: Format }) {
  const A = advisorCopy[locale];
  const top = advice.levers.filter((l) => l.improves).slice(0, 2);
  if (!top.length && !advice.tested) return null;
  return (
    <div className="mt-3 rounded-xl bg-white/65 p-3.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="font-semibold">{A.testedTitle}</span>
        <a href="#lab" className="no-print inline-flex items-center gap-1 font-semibold underline decoration-dotted underline-offset-2">{A.openLab}<Icon name="down" size={14} /></a>
      </div>
      {top.length ? (
        <ul className="mt-2 space-y-1.5">
          {top.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Icon name={LEVER_ICON[l.id]} size={15} className="shrink-0 opacity-70" />
              <span>{A.levers[l.id].title}</span>
              <span aria-hidden className="opacity-60">→</span>
              <VerdictPill id={l.outcome.verdict} label={d.labels.verdict[l.outcome.verdict]} />
              {Math.abs(l.deltaNpvEur) > advice.minGainEur && <span className="num text-xs font-semibold">{A.colDelta} {signedEur(F, l.deltaNpvEur)}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-1.5">{A.noLever}</p>}
    </div>
  );
}

/** Free result, under "In short": the questions the paid report answers for THIS project, not a feature list. */
export function ReportAnswers({ a, locale, samplesHref, seeSample }: { a: Assessment; locale: Locale; samplesHref?: string; seeSample: string }) {
  if (a.robustness === "clear_no" || a.robustness === "insufficient") return null;
  const A = advisorCopy[locale];
  const process = !!a.input.process;
  const support = f(A.qSupport, { country: countryName(a.countryCode, locale) });
  const items: { icon: IconName; text: string }[] = a.robustness === "clear_go"
    ? [{ icon: "doc", text: A.qBank }, ...(process ? [] : [{ icon: "check" as IconName, text: A.qChecks }]), { icon: "shield", text: support }]
    : [{ icon: "route", text: A.qPlan }, ...(process ? [{ icon: "doc" as IconName, text: A.qBank }] : [{ icon: "check" as IconName, text: A.qChecks }, { icon: "chart" as IconName, text: A.qOdds }])];
  return (
    <section aria-labelledby="answers-h" className="no-print mt-3 rounded-2xl border border-brand/20 bg-[linear-gradient(135deg,var(--brand-soft),var(--surface)_60%)] p-5 md:p-6">
      <h3 id="answers-h" className="eyebrow text-brandink">{A.answersTitle}</h3>
      <ul className="mt-3 grid gap-2.5 md:grid-cols-3">
        {items.map((q) => (
          <li key={q.text} className="flex gap-2.5 rounded-xl bg-surface/80 p-3 text-sm text-ink2 ring-1 ring-line">
            <Icon name={q.icon} size={18} className="mt-0.5 shrink-0 text-brand" />
            <span>{q.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <a href="#offer" className="inline-flex items-center gap-1.5 text-brand hover:underline">{A.compare}<Icon name="down" size={15} /></a>
        {samplesHref && <a href={samplesHref} className="inline-flex items-center gap-1.5 text-ink2 hover:underline">{seeSample}<Icon name="arrow" size={15} /></a>}
      </div>
    </section>
  );
}

/** Paid report: the levers with their break-even values, the strongest combination and the order of action. */
export function AdvicePlan({ a, d, locale, F, currency, id = "advice" }: { a: Assessment; d: Pick<Dict, "labels" | "result">; locale: Locale; F: Format; currency: string; id?: string }) {
  const advice = a.advice;
  if (!advice) return null;
  const A = advisorCopy[locale];
  const L = d.labels;
  const levers = shownLevers(advice);
  const price = localPrice(locale, currency);
  const next = nextVerdict(advice.base.verdict);
  const gaps = advice.base.gaps;
  const breakEven = (l: (typeof levers)[number]) => {
    const v = l.breakEvenLocal;
    if (v === undefined || v === null) return null;
    if (l.id === "heat") return v <= 0 ? A.beHeatFree : f(A.beHeat, { price: price(v) });
    if (l.id === "cosubstrate") return v >= 0 ? f(A.beFee, { fee: price(v) }) : f(A.beFeePay, { fee: price(-v) });
    return null;
  };
  const top = a.measureFirst?.find((m) => m.evpiEur > 0);
  const M = decisionCopy[locale].measure;
  const steps: { text: string; href?: string }[] = [
    ...(top ? [{ text: f(A.stepVerify, { item: M.kinds[top.kind], value: F.eur(top.evpiEur) }), href: "#measure" }] : []),
    ...levers.filter((l) => l.improves).flatMap((l) => {
      const be = breakEven(l);
      if (l.id === "heat" && be) return [{ text: f(A.stepHeat, { mwh: `${F.n0(sig2((l.settings.heatKwh ?? 0) / 1000))} ${L.units.mwh}`, be }) }];
      if (l.id === "cosubstrate" && be) return [{ text: f(A.stepCosub, { t: `${F.n0(sig2(l.settings.cosubTonnes ?? 0))} ${L.units.t}`, be }) }];
      if (l.id === "cluster") return [{ text: f(A.stepCluster, { pct: F.pct(l.settings.clusterShare ?? 0), km: `${F.n0(ADVICE_ASSUMPTIONS.clusterKm.value)} ${L.units.km}` }) }];
      if (l.id === "equity") return [{ text: f(A.stepEquity, { pct: F.pct(l.settings.debtShare ?? 0) }) }];
      return [];
    }),
    ...(a.breakEven.maxCapexEur ? [{ text: f(A.stepQuotes, { capex: F.eur(a.breakEven.maxCapexEur) }), href: "#breakeven" }] : []),
  ];
  const max = Math.max(1, ...levers.map((l) => Math.abs(l.deltaNpvEur)));
  const used = new Set(levers.map((l) => l.id));
  const assumptions = [
    ...(used.has("heat") ? [ADVICE_ASSUMPTIONS.heatShare] : []),
    ...(used.has("cosubstrate") ? [ADVICE_ASSUMPTIONS.cosubVsShare, ADVICE_ASSUMPTIONS.cosubKm, ADVICE_ASSUMPTIONS.gateFeeEur] : []),
    ...(used.has("cluster") ? [ADVICE_ASSUMPTIONS.clusterKm] : []),
  ];
  if (!levers.length && !gaps.length && !steps.length) return null;
  return (
    <section id={id} className="mt-12 scroll-mt-32 break-inside-avoid-page">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-2 h-5 w-1 shrink-0 rounded-full bg-brand" />
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">{A.planTitle}</h2>
          <p className="mt-1 text-sm text-muted">{A.planSub}</p>
        </div>
      </div>
      {next && gaps.length > 0 && (
        <div className="card mt-4 p-4">
          <div className="text-sm font-semibold">{f(A.gapsTitle, { verdict: L.verdict[next] })}</div>
          <ul className="mt-2 space-y-1 text-sm text-ink2">{gaps.map((g) => <li key={g} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" /><span>{gapWords(g, a, advice.base, locale, F)}</span></li>)}</ul>
        </div>
      )}
      {levers.length > 0 && (
        <div className="card mt-3 overflow-x-auto p-1" tabIndex={0}>
          <table className="num w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="p-3">{A.colChange}</th><th className="p-3">{d.result.verdict}</th><th className="p-3 text-right">{d.result.colNpv}</th><th className="p-3 text-right">{A.colDelta}</th><th className="p-3">{A.colBreakEven}</th>
              </tr>
            </thead>
            <tbody>
              {levers.map((l) => {
                const w = leverWords(l.id, l.settings, advice.context, locale, F, L.units, currency);
                return (
                  <tr key={l.id} className="border-t border-line align-top">
                    <td className="p-3 font-sans"><div className="flex items-center gap-2 font-semibold"><Icon name={LEVER_ICON[l.id]} size={16} className="text-brand" />{w.title}</div><div className="mt-0.5 text-xs text-muted">{w.text}</div></td>
                    <td className="p-3 font-sans"><VerdictPill id={l.outcome.verdict} label={L.verdict[l.outcome.verdict]} />{l.outcome.route !== advice.base.route && <div className="mt-1 text-xs text-muted">{L.route[l.outcome.route]}</div>}</td>
                    <td className="p-3 text-right">{F.eur(l.outcome.npvEur[1])}</td>
                    <td className={`p-3 text-right font-semibold ${l.deltaNpvEur >= 0 ? "text-good" : "text-bad"}`}><span className="inline-flex items-center justify-end gap-2.5"><SignedBar value={l.deltaNpvEur} max={max} />{signedEur(F, l.deltaNpvEur)}</span></td>
                    <td className="p-3 font-sans text-ink2">{breakEven(l) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {advice.combined && (
        <div className="card mt-3 grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
          <div>
            <div className="eyebrow text-brand">{A.combined}</div>
            <div className="mt-1 font-semibold">{advice.combined.ids.map((x) => A.levers[x].title).join(" + ")}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><VerdictPill id={advice.base.verdict} label={L.verdict[advice.base.verdict]} /><span aria-hidden>→</span><VerdictPill id={advice.combined.outcome.verdict} label={L.verdict[advice.combined.outcome.verdict]} /><span className="num font-semibold text-good">{A.colDelta} {signedEur(F, advice.combined.deltaNpvEur)}</span></div>
          </div>
          <div className="rounded-xl bg-surface2 p-3">
            <DecisionRange values={advice.combined.outcome.npvEur} labels={[F.eur(advice.combined.outcome.npvEur[0]), F.eur(advice.combined.outcome.npvEur[1]), F.eur(advice.combined.outcome.npvEur[2])]} names={[L.scenario.conservative, L.scenario.base, L.scenario.optimistic]} />
          </div>
        </div>
      )}
      {steps.length > 0 && (
        <div className="card mt-3 p-4">
          <div className="font-semibold">{A.stepsTitle}</div>
          <ol className="mt-2 space-y-2 text-sm">
            {steps.map((s, i) => (
              <li key={s.text} className="flex gap-3">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                <span className="pt-0.5 text-ink2">{tidy(s.text)}{s.href && <> <a href={s.href} className="font-semibold text-brand">→</a></>}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {assumptions.length > 0 && (
        <details className="mt-3 text-xs text-muted">
          <summary className="cursor-pointer font-semibold">{A.assumptionsTitle}</summary>
          {/* Parameter register texts are English by design, as elsewhere in the report (lang="en"). */}
          <ul lang="en" className="mt-2 space-y-1.5">
            {assumptions.map((p) => <li key={p.id}><span className="font-semibold">{p.label}</span>{": "}<span className="num">{p.unit === "EUR/t" ? `${F.unitPrice(p.value)}/${L.units.t}` : p.unit === "—" ? F.pct(p.value) : `${F.n0(p.value)} ${p.unit}`}</span>{` · ${p.kind} · ${p.confidence} · ${p.date} · ${p.source}`}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}

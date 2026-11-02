import Link from "next/link";
import type { ReactNode } from "react";
import { marketBandsFor, minimumGapsForVerdict, SAFETY_DISCLAIMER, VERDICT_MIN_SCORE } from "@/core";
import { locText, registerMessages, type Messages } from "@/core/i18n";
import type { Assessment, RouteId, ScenarioId, VerdictId } from "@/core";
import { fmt as f, type Dict, type Locale } from "@/i18n";
import { INTL_TAG } from "@/i18n/config";
import { displayUnit, makeFormat, sig2, tidy } from "@/lib/format";
import { financialLabels, sensitivityLabels } from "@/i18n/financial-labels";
import { marketLabel, marketQuality } from "@/i18n/market";
import { decisionCopy } from "@/i18n/decision";
import { evidenceRequest } from "@/lib/evidence";
import { CopyButton } from "./CopyButton";
import fieldCheck from "@/countries/data/backtest-summary.json";
import { climateCopy } from "@/i18n/climate";
import { minimumForVerdict, qualityGapCopy } from "@/i18n/quality";
import { keyDriver } from "@/lib/whatif";
import { COUNTRIES } from "@/countries";
import { CashFlowChart, ScoreBar, Tornado } from "./Charts";
import { preferenceCopy } from "@/i18n/preferences";
import { locationCopy } from "@/i18n/location";
import { FlowDiagram } from "./FlowDiagram";
import { DataConfidence } from "./DataConfidence";
import { PaidTeaser } from "./PaidTeaser";
import { SupportTable } from "./SupportTable";
import { offerCopy } from "@/i18n/offer";
import { processCopy, processFieldLabels, processMetricLabels, processPrimary } from "@/i18n/processes";
import { workspaceCopy } from "@/i18n/workspace";
import { PROCESS_UNITS, type ProcessKind, type ProcessResult } from "@/core/processes";
import { Icon, type IconName } from "./brand/Icon";
import { DecisionRange, SignedBar } from "./Ranges";
import { ReportNav } from "./ReportNav";
import { AdvicePlan, AdviceTeaser, ReportAnswers } from "./Advice";
import { advisorCopy } from "@/i18n/advisor";

export type ResultDict = Pick<Dict, "result" | "labels" | "flow" | "charts" | "common" | "calc">;

const VERDICT_STYLE: Record<VerdictId, { box: string; badge: string; icon: IconName }> = {
  STRONG_CANDIDATE: { box: "border-good/50 bg-brandsoft text-brandink", badge: "bg-good text-white", icon: "check" },
  POSSIBLE_WITH_CONDITIONS: { box: "border-amber-300 bg-amber-50 text-amber-950", badge: "bg-amber-500 text-white", icon: "info" },
  WEAK_ECONOMICS: { box: "border-red-200 bg-red-50 text-red-950", badge: "bg-bad text-white", icon: "x" },
  INSUFFICIENT_DATA: { box: "border-zinc-300 bg-zinc-100 text-zinc-900", badge: "bg-zinc-500 text-white", icon: "doc" },
  NOT_RECOMMENDED_AT_SCALE: { box: "border-red-300 bg-red-100 text-red-950", badge: "bg-red-800 text-white", icon: "x" },
};
const CONF_STYLE = { LOW: "bg-red-100 text-red-900", MEDIUM: "bg-amber-100 text-amber-900", HIGH: "bg-brandsoft text-brandink" } as const;
const SCN: ScenarioId[] = ["conservative", "base", "optimistic"];
/** Process inlets (COD, landfill, gas, residue) share this report; only the AD-specific blocks are swapped. */
const PROCESS_INPUT: Record<ProcessKind, [string, string]> = { residue: ["tonnesYear", "bmp"], wastewater: ["flowM3Day", "codMgL"], landfill: ["annualWasteTonnes", "depositionYears"], gas: ["rawGasNm3Hour", "methanePct"] };
const PROCESS_METRIC_LABELS: Record<string, string> = { nitrogen: "N", effluent: "m out", codIn: "COD in", codOut: "COD out", sludgeCod: "COD → X", methaneCod: "COD → CH₄", sludge: "m sludge (wet)", reactor: "V", effluentCod: "COD out", remainingPotential: "L₀(t)", closingPotential: "L₀(t + 1)", wasteStock: "M", vs: "VS", massIn: "m in", gasMass: "m gas", capturedCh4: "CH₄ → CHP / Upgrading / Boiler", uncapturedCh4: "CH₄ loss", generatedCh4: "CH₄ total", residual: "m residual", hrtDays: "HRT", olr: "OLR" };

function Section({ title, children, id, sub }: { title: string; children: ReactNode; id?: string; sub?: string }) {
  return (
    <section id={id} className="mt-12 scroll-mt-32 break-inside-avoid-page">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-2 h-5 w-1 shrink-0 rounded-full bg-brand" />
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
          {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * One figure with its label and note. The data attributes are the contract of the report audit
 * (`__tests__/report-audit.ts` `statsOf`): label, value and note in this order, nothing between them.
 */
function Stat({ label, value, note, icon, size = "md" }: { label: string; value: ReactNode; note?: ReactNode; icon?: IconName; size?: "lg" | "md" | "sm" }) {
  const box = size === "lg" ? "card p-4 md:p-5" : size === "sm" ? "rounded-2xl bg-surface2 p-4" : "card p-4";
  const text = size === "lg" ? "mt-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl md:text-[28px]" : "num mt-1.5 text-xl font-bold leading-tight md:text-2xl";
  return (
    <div className={box}>
      <div data-stat-label="" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{icon && <Icon name={icon} size={15} className="shrink-0 text-brand" />}{label}</div>
      <div data-stat-value="" className={text}>{value}</div>
      {note && <div data-stat-note="" className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}

function Fold({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="card group">
      <summary className="flex items-center justify-between px-4 py-3 font-semibold">
        {title}
        <span aria-hidden className="text-muted transition group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}

const ROBUST_STYLE = {
  clear_go: { box: "border-good/40 bg-brandsoft/40", dot: "bg-good" },
  grey: { box: "border-amber-300 bg-amber-50/70", dot: "bg-amber-500" },
  clear_no: { box: "border-red-200 bg-red-50/60", dot: "bg-red-500" },
} as const;

/** How firm the answer is across the scenario range, what drives it, and what a bankable estimate still needs. */
/** A finite Monte Carlo cannot show certainty: 160 of 160 positive draws is "> 99 %", none is "< 1 %". */
const probText = (p: number, F: ReturnType<typeof makeFormat>) => p >= 1 ? `> ${F.pct(0.99)}` : p <= 0 ? `< ${F.pct(0.01)}` : F.pct(p);

/** `lockedNote`: free view — driver names stay (what to check), their NPV amounts and the Monte Carlo certainty are paid detail. */
function Robustness({ a, R, scn, eur, stressNote, lockedNote }: { a: Assessment; R: ResultDict["result"]; scn: ResultDict["labels"]["scenario"]; eur: (v: number) => string; stressNote?: string; lockedNote?: string }) {
  const status = a.robustness as keyof typeof ROBUST_STYLE;
  const S = ROBUST_STYLE[status];
  const drivers = a.drivers.map((id) => a.sensitivity.find((s) => s.id === id)).filter((s) => s !== undefined);
  const npv = a.ranges.npvEur;
  return (
    <section className={`flex flex-col rounded-2xl border p-5 md:p-6 ${S.box}`} aria-labelledby="robust-h">
      <h2 id="robust-h" className="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${S.dot}`} />
        {R.robust.title}
      </h2>
      <p className="mt-2 text-[15px] text-ink">{status === "clear_go" ? R.robust.go : status === "clear_no" ? R.robust.no : R.robust.grey}</p>
      {/* The sentence is what assistive technology reads; the range below draws the same three numbers against zero. */}
      <p className="num sr-only">{f(R.robust.npv, { lo: eur(npv[0]), base: eur(npv[1]), hi: eur(npv[2]) })}</p>
      <div className="mt-4 rounded-xl bg-surface/80 p-3">
        <div aria-hidden className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{"NPV"}</div>
        <DecisionRange values={[npv[0], npv[1], npv[2]]} labels={[eur(npv[0]), eur(npv[1]), eur(npv[2])]} names={[scn.conservative, scn.base, scn.optimistic]} />
      </div>
      {stressNote && <p className="mt-3 text-sm text-ink2">{stressNote}</p>}
      {status !== "clear_no" && drivers.length > 0 && (
        <div className="mt-3">
          {status === "clear_go" && <div className="text-sm font-semibold">{R.robust.drivers}</div>}
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">
            {drivers.map((s) => <li key={s.id}>{s.label}{!lockedNote && <> <span className="num text-muted">({eur(s.deltaNpvEur)})</span></>}</li>)}
          </ol>
          {lockedNote && <p className="mt-1 text-xs text-muted">{lockedNote}</p>}
        </div>
      )}
      <p className="mt-4 text-xs text-ink2">{R.robust.accuracy}</p>
      {status !== "clear_no" && (
        <details className="group mt-2 text-sm">
          <summary className="flex cursor-pointer items-center gap-1.5 font-semibold">
            <span aria-hidden className="inline-block text-muted transition group-open:rotate-90">›</span>
            {R.robust.stepsTitle}
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink2">{R.robust.steps.map((x) => <li key={x}>{x}</li>)}</ol>
        </details>
      )}
    </section>
  );
}

export interface ResultViewProps {
  /** Catalog of the model's sentences for `locale` (src/i18n/core): client components receive it as a prop, the server registry is not shared with them. */
  core?: Messages;
  display?: { currency: "EUR" | "USD"; rate: number; date: string };
  a: Assessment;
  d: ResultDict;
  locale: Locale;
  currency: string;
  countryNotes?: string[];
  /** "free": verdict + key numbers + energy flow; the rest is a locked teaser. */
  access: "free" | "standard" | "full";
  /** Rendered inside the locked teaser (client button opening checkout). */
  unlockSlot?: ReactNode;
  /** Free result: the advisor and scenario lab, between the answer and the offer (calculator only). */
  labSlot?: ReactNode;
  samplesHref?: string;
  methodologyHref: string;
}

export function ResultView({ core, a: raw, d, locale, currency, countryNotes = [], access, unlockSlot, labSlot, samplesHref, methodologyHref, display = { currency: "EUR", rate: 1, date: raw.dataAudit?.asOfDate ?? "—" } }: ResultViewProps) {
  registerMessages(locale, core);
  const stressLabels = sensitivityLabels(locale, d);
  const region = COUNTRIES[raw.countryCode]?.regions.find((r) => r.id === raw.input.regionId);
  const a = {
    ...raw,
    climate: { ...raw.climate, regionName: region?.names?.[locale] ?? region?.name ?? raw.climate.regionName },
    sensitivity: raw.sensitivity.map((s) => ({ ...s, label: stressLabels[s.id] ?? s.label })),
  };
  const R = d.result;
  const L = d.labels;
  const F = makeFormat(locale, L.units, display);
  const { n0, eur, money, years, range, compact } = F;
  /** Year part of "t/yr" in the language (rok, god., год.): a gas flow per year uses the same word. */
  const perYear = L.units.tYear.split("/")[1] ?? "yr";
  const best = a.scenarios.base;
  const route = a.bestRoute;
  const r = a.ranges;
  const e = best.energy;
  const heatLost = Math.max(0, e.heatNetAvailableKwh - e.heatUsefulKwh);
  // Scenario results are not guaranteed to be monotone (a bigger plant can lose more money): ranges always read low – high.
  const capexLoHi = [Math.min(...r.capexEur), Math.max(...r.capexEur)];
  const npvLoHi = [Math.min(...r.npvEur), Math.max(...r.npvEur)];
  const paybackSorted = [...r.paybackYears].sort((x, y) => (x ?? Infinity) - (y ?? Infinity));
  const driver = keyDriver(a);
  const qualityGaps = qualityGapCopy(locale, d, currency);
  const minimumGaps = a.verdict.id === "INSUFFICIENT_DATA" && a.confidence.factors ? minimumGapsForVerdict(a.confidence.factors, a.confidence.clientScore ?? a.confidence.score, VERDICT_MIN_SCORE) : [];
  const full = access !== "free";
  const process = raw.input.process ? best.process : undefined;
  const economics = a.financialsAvailable !== false;
  const PC = processCopy(locale);
  const fields = processFieldLabels(locale);
  const processValue = (key: string) => {
    const v = (raw.input.process as Record<string, unknown> | undefined)?.[key];
    return typeof v === "number" ? `${n0(v)} ${PROCESS_UNITS[key] ?? ""}`.trim() : "—";
  };

  const D = decisionCopy[locale];
  const W = workspaceCopy[locale];
  const VS = VERDICT_STYLE[a.verdict.id];
  const confidence = f(R.confidence, { level: L.confidence[a.confidence.level], score: a.confidence.score });
  const nav = full ? [
    { id: "decision", label: R.verdict },
    { id: "numbers", label: R.keyTitle },
    { id: "energy", label: R.flowTitle },
    ...(economics ? [{ id: "economics", label: access === "full" ? R.scenariosTitle : L.scenario.base }] : []),
    ...(economics && access === "full" ? [{ id: "routes", label: R.routesTitle }, { id: "sensitivity", label: R.sensTitle }] : []),
    ...(economics && a.advice ? [{ id: "advice", label: advisorCopy[locale].planTitle }] : []),
    ...(economics && a.measureFirst?.length ? [{ id: "measure", label: D.measure.title }] : []),
    { id: "details", label: R.detailsTitle },
  ] : [];

  return (
    <div>
      {locale !== a.lang && <p className="mb-4 rounded-xl bg-surface2 p-3 text-sm text-ink2">{d.common.reportLangNote}</p>}
      {a.input.city && <p className="num mb-3 break-words text-xs text-muted">{locationCopy(locale).title}: {a.climate.regionName} · {new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 4 }).format(a.input.city.latitude)}, {new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 4 }).format(a.input.city.longitude)} · <a href={a.input.city.dataset ? "https://registry.opendata.aws/planette_era5_reanalysis/" : "https://open-meteo.com/en/docs/historical-weather-api"} className="underline" target="_blank" rel="noreferrer">{a.input.city.dataset ? "Copernicus ERA5 / NSF NCAR / Planette · 0.25°" : "ERA5 / Open-Meteo"}</a> {a.input.city.startDate.slice(0, 4)}–{a.input.city.endDate.slice(0, 4)}</p>}
      {nav.length > 0 && <ReportNav items={nav} label={W.sections} />}

      {/* ---------- Decision: the verdict and how firm it is, side by side ---------- */}
      <div id="decision" className={`grid scroll-mt-32 gap-4 ${a.robustness !== "insufficient" ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : ""}`}>
        <div className={`rounded-2xl border p-5 md:p-7 ${VS.box}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest opacity-70">{R.verdict}</span>
            {a.confidence.factors
              ? <a href="#data-confidence" className={`chip underline decoration-dotted underline-offset-2 ${CONF_STYLE[a.confidence.level]}`}>{confidence}</a>
              : <span className={`chip ${CONF_STYLE[a.confidence.level]}`}>{confidence}</span>}
          </div>
          <div className="mt-3 flex items-start gap-3">
            <span aria-hidden className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full md:h-12 md:w-12 ${VS.badge}`}><Icon name={VS.icon} size={22} strokeWidth={2.4} /></span>
            <h2 className="font-display text-3xl font-semibold leading-tight md:text-[40px]">{L.verdict[a.verdict.id]}</h2>
          </div>
          <ul lang={a.lang} className="mt-5 space-y-2 text-[15px]">{a.verdict.reasons.map((x) => <li key={x} className="flex gap-2.5"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" /><span>{x}</span></li>)}</ul>
          {driver && <p lang={a.lang} className="mt-4 text-[15px] font-semibold">{driver}</p>}
          {(a.verdict.whatWouldChange.length > 0 || (full && !!a.verdict.thresholds?.length)) && (
            <div className="mt-4 rounded-xl bg-white/65 p-3.5 text-sm">
              <div className="font-semibold">{R.whatWouldChange}</div>
              {/* Break-even values are paid detail; the free view names what would help, and the advisor tests it below. */}
              <ul lang={a.lang} className="mt-1.5 space-y-1">{[...(full ? a.verdict.thresholds ?? [] : []), ...a.verdict.whatWouldChange].map((x) => <li key={x}>→ {x}</li>)}</ul>
            </div>
          )}
          {!full && a.advice && <AdviceTeaser advice={a.advice} d={d} locale={locale} F={F} />}
          {minimumGaps.length > 0 && (
            <div className="mt-4 rounded-xl bg-white/65 p-3.5 text-sm" role="note">
              <div className="font-semibold">{minimumForVerdict[locale]}</div>
              <ul className="mt-1 list-disc space-y-1 pl-5">{minimumGaps.map((id) => <li key={id}>{qualityGaps[id]}</li>)}</ul>
            </div>
          )}
          <p className="mt-5 text-xs opacity-75">{a.supportIncluded ? R.assumedSupport : R.noSubsidy} {R.prelim}</p>
        </div>

        {a.robustness !== "insufficient" && <Robustness a={a} R={R} scn={L.scenario} eur={eur} stressNote={access !== "free" && a.monteCarlo ? f(D.monteCarlo.stress, { n: a.monteCarlo.n, p: probText(a.monteCarlo.probPositive, F) }) : undefined} lockedNote={access === "free" ? offerCopy[locale].driversLocked : undefined} />}
      </div>

      {/* ---------- In short: the conclusion first, then resource → energy → money (same in every tier) ---------- */}
      <section id="summary" className="mt-4 rounded-2xl border border-line bg-surface p-5 md:p-6" aria-labelledby="plain-h">
        <h2 id="plain-h" className="eyebrow text-brand">{R.summaryTitle}</h2>
        <p className="mt-2 text-lg font-semibold leading-snug text-ink md:text-xl">{R.tone[a.verdict.id]}</p>
        <ul className={`mt-4 grid gap-3 text-[15px] leading-relaxed text-ink2 ${economics ? "md:grid-cols-3" : ""}`}>
          {([
            ["drop", process
              ? `${PC.models[process.kind]}: ${R.biogas} ${range(r.biogasM3[0], r.biogasM3[2], (x) => compact(sig2(x)))} m³.`
              : f(R.summary, { tonnes: n0(sig2(r.feedstockTonnes)), biogas: range(r.biogasM3[0], r.biogasM3[2], (x) => compact(sig2(x))) })],
            ...(economics ? [
              [route === "biomethane" ? "flame" : "bolt", route === "biomethane"
                ? f(R.summaryBm, { bm: compact(sig2(e.biomethaneNm3)) })
                : f(R.summaryEl, {
                    el: n0(sig2(e.elNetKwh / 1000)),
                    heat: n0(sig2(e.heatUsefulKwh / 1000)),
                    share: (a.input.energy.electricityKwhYear ?? 0) > 0 ? f(R.summaryShare, { pct: Math.round(Math.min(1, e.elSelfConsumedKwh / (a.input.energy.electricityKwhYear as number)) * 100) }) : "",
                  })],
              ["chart", f(R.summaryMoney, { capex: `${eur(capexLoHi[0])} – ${eur(capexLoHi[1])}`, payback: years(r.paybackYears[1]) })],
            ] : []),
          ] as [IconName, string][]).map(([icon, text]) => (
            <li key={icon} className="flex gap-3 rounded-xl bg-surface2/70 p-3">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-brand ring-1 ring-line"><Icon name={icon} size={16} /></span>
              <span className="min-w-0">{tidy(text)}</span>
            </li>
          ))}
        </ul>
      </section>
      {!full && economics && <ReportAnswers a={a} locale={locale} samplesHref={samplesHref} seeSample={R.seeSample} />}

      {/* ---------- Key numbers: money and output first, the physics behind them second ---------- */}
      <Section id="numbers" title={R.keyTitle} sub={R.keySub}>
        {economics && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat size="lg" icon="factory" label={R.capex} value={<>{eur(capexLoHi[0])} – {eur(capexLoHi[1])}</>} note={currency !== "EUR" ? f(R.capexNote, { v: money(r.capexEur[1] * a.fx, currency) }) : undefined} />
          <Stat size="lg" icon="clock" label={R.payback} value={years(paybackSorted[0]) === years(paybackSorted[2]) ? years(paybackSorted[0]) : `${years(paybackSorted[0])} – ${years(paybackSorted[2])}`} note={f(R.paybackNote, { v: years(r.paybackYears[1]) })} />
          <Stat size="lg" icon="chart" label={R.npv} value={eur(r.npvEur[1])} note={f(R.npvNote, { lo: eur(npvLoHi[0]), hi: eur(npvLoHi[1]) })} />
          <Stat
            size="lg"
            icon={route === "biomethane" ? "flame" : "bolt"}
            label={R.energy}
            value={route === "biomethane" ? <>{range(r.biomethaneNm3[0], r.biomethaneNm3[2], (x) => compact(sig2(x)))} Nm³</> : <>{range(r.electricityMwh[0], r.electricityMwh[2])} {L.units.mwh}</>}
            note={route === "biomethane" ? R.energyBm : f(R.energyHeat, { v: range(r.heatUsefulMwh[0], r.heatUsefulMwh[2]) })}
          />
        </div>}
        <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${economics ? "mt-3" : ""}`}>
          {process
            ? <Stat size="sm" label={PC.models[process.kind]} value={processValue(PROCESS_INPUT[process.kind][0])} note={`${fields[PROCESS_INPUT[process.kind][1]]}: ${processValue(PROCESS_INPUT[process.kind][1])}`} />
            : <Stat size="sm" icon="leaf" label={R.feedstock} value={<>{n0(sig2(r.feedstockTonnes))} {L.units.tYear}</>} note={f(R.feedNote, { v: n0(best.feed.energyDensityKwhPerTonne) })} />}
          <Stat size="sm" icon="drop" label={R.biogas} value={<>{range(r.biogasM3[0], r.biogasM3[2], (x) => compact(sig2(x)))} m³</>} note={f(R.biogasNote, { v: n0(r.biogasM3[1] / 8000) })} />
          {economics && <>
            <Stat size="sm" icon="bolt" label={R.capacity} value={<>{range(r.kwEl[0], r.kwEl[2])} {L.units.kwe}</>} note={L.plantClass[best.plantClass]} />
            <Stat size="sm" icon="route" label={R.route} value={<span className="text-base md:text-lg">{L.route[route]}</span>} note={f(R.routeNote, { v: L.confidence[a.confidence.level] })} />
          </>}
        </div>
        <DataConfidence a={a} d={d} locale={locale} currency={currency} />
        {process && !economics && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="font-semibold text-amber-950">{R.missing}</div>
            <ul className="mt-1.5 list-disc pl-5 text-sm text-amber-950/90">{process.missingInputs.map((key) => <li key={key}>{fields[key]}</li>)}</ul>
            <p className="mt-2 text-sm text-amber-950/90">{PC.costHint}</p>
          </div>
        )}
        {!a.confidence.factors && a.missingData.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="font-semibold text-amber-950">{R.missing}</div>
            <ul className="mt-1.5 list-disc pl-5 text-sm text-amber-950/90">{a.missingDataCodes.map((id) => <li key={id}>{qualityGaps[id]}</li>)}</ul>
          </div>
        )}
        {full && a.warnings.length > 0 && (
          <div className="mt-3 rounded-xl border border-line bg-surface p-4">
            <div className="font-semibold">{R.warnings}</div>
            <ul lang={a.lang} className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink2">{a.warnings.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
        {full && !process && <MarketCheck a={a} R={R} F={F} locale={locale} />}
        {full && a.quoteCheck && <QuoteCheckPanel a={a} d={d} F={F} locale={locale} />}
      </Section>

      {/* ---------- Energy flow ---------- */}
      <Section id="energy" title={R.flowTitle} sub={R.flowSub}>
        <div className="card overflow-hidden">
          {!process && <div className="border-b border-line bg-[radial-gradient(120%_90%_at_50%_0%,var(--surface-2),var(--surface)_70%)] p-3 md:p-5"><FlowDiagram
            t={d.flow}
            n0={n0}
            compact={compact}
            values={{
              tonnes: best.feed.tonnesYear,
              biogasM3: best.feed.biogasM3Year,
              route,
              elMwhSelf: e.elSelfConsumedKwh / 1000,
              elMwhExport: e.elExportedKwh / 1000,
              heatUsefulMwh: e.heatUsefulKwh / 1000,
              heatLostMwh: heatLost / 1000,
              heatDigesterMwh: e.heatDigesterKwh / 1000,
              biomethaneNm3: e.biomethaneNm3,
              digestateT: a.digestate.tonnesYear,
            }}
          /></div>}
          {economics ? <dl className="grid gap-px bg-line text-sm sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["var(--heat)", R.heatProduced, <>{n0(e.heatProducedKwh / 1000)} {L.units.mwh}</>],
              ["var(--gas)", R.heatDigester, <>{n0(e.heatDigesterKwh / 1000)} {L.units.mwh}</>],
              ["var(--good)", R.heatUseful, <>{n0(e.heatUsefulKwh / 1000)} {L.units.mwh} <span className="font-normal text-muted">{R.of} {n0(e.heatNetAvailableKwh / 1000)}</span></>],
              ["var(--power)", R.elSplit, <>{n0(e.elSelfConsumedKwh / 1000)} / {n0(e.elExportedKwh / 1000)} {L.units.mwh}</>],
            ] as const).map(([color, label, value]) => (
              <div key={label} className="bg-surface p-4">
                <dt className="flex items-center gap-2 text-muted"><span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />{label}</dt>
                <dd className="num mt-1 text-base font-semibold">{value}</dd>
              </div>
            ))}
          </dl> : <dl className="grid gap-3 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">CH₄</dt><dd className="num font-semibold">{n0(best.feed.ch4M3Year)} Nm³/{perYear}</dd></div>
            <div><dt className="text-muted">{R.biogas}</dt><dd className="num font-semibold">{n0(best.feed.biogasM3Year)} Nm³/{perYear}</dd></div>
          </dl>}
        </div>
      </Section>

      {countryNotes.length > 0 && (
        <div className="mt-6 rounded-xl border border-line bg-surface2 p-4 text-sm text-ink2">
          <div className="font-semibold text-ink">{R.countryNotes}</div>
          <ul lang={a.lang} className="mt-1 list-disc space-y-1 pl-5">{countryNotes.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}

      {!full ? (
        <>
          {labSlot}
          {economics && <PaidTeaser a={a} R={R} locale={locale} unlockSlot={unlockSlot} samplesHref={samplesHref} />}
        </>
      ) : (
        <FullSections a={a} d={d} F={F} locale={locale} methodologyHref={methodologyHref} extended={access === "full"} process={process} economics={economics} currency={currency} />
      )}
    </div>
  );
}

function MarketCheck({ a, R, F, locale }: { a: Assessment; R: ResultDict["result"]; F: ReturnType<typeof makeFormat>; locale: Locale }) {
  const b = a.scenarios.base;
  const kw = b.energy.chpKwEl || b.kwElEquivalent;
  if (a.bestRoute === "biomethane" || kw < 10) return null;
  const perKw = b.capex.totalEur / kw;
  const bands = marketBandsFor(kw, b.feed.manureShareVs);
  if (!bands.length) return null;
  return (
    <div className="card mt-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-semibold">{R.market}</div>
        <div className="num text-sm">{f(R.ourEstimate, { v: F.n0(sig2(perKw)), kw: F.n0(kw) })}</div>
      </div>
      <ul className="mt-2 space-y-2 text-sm">
        {bands.map((m) => {
          const pos = perKw < m.lowEurPerKw ? R.below : perKw > m.highEurPerKw ? R.above : R.inRange;
          return (
            <li key={m.id} className="flex flex-col gap-0.5 border-t border-line pt-2 first:border-0 first:pt-0">
              <span><b className="num">{F.n0(m.lowEurPerKw * F.exchangeRate)}–{F.n0(m.highEurPerKw * F.exchangeRate)} {F.currency}/kW</b> — {marketLabel(locale, m.id) ?? m.label} · <span className={pos === R.inRange ? "text-good" : "text-warn"}>{pos}</span></span>
              <span className="text-xs text-muted"><span lang={locale === "uk" ? "uk" : "en"}>{locale === "uk" ? m.source : m.sourceEn}</span> · {m.year} · {marketQuality(locale, m.quality) ?? m.quality}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">{R.marketNote}</p>
    </div>
  );
}

function BreakEvenPanel({ a, F, locale, unreachable }: { a: Assessment; F: ReturnType<typeof makeFormat>; locale: Locale; unreachable: string }) {
  const be = a.breakEven;
  // Reports saved before these fields existed show only the percentage break-even in the sensitivity section.
  if (be.maxCapexEur === undefined && be.product === undefined && be.feedstockEurT === undefined) return null;
  const D = decisionCopy[locale];
  const U = D.units;
  const capex = a.scenarios.base.capex.totalEur;
  const p = be.product;
  const per = p ? (p.unit === "EUR/kWh" ? U.kwh : p.unit === "EUR/kWh th" ? U.kwhTh : U.nm3) : "";
  const productValue = (v: number) => `${F.unitPrice(v)}/${per}`;
  const feed = be.feedstockEurT;
  return (
    <Section id="breakeven" title={D.title} sub={D.sub}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {p && (
          <Stat
            label={D.product[p.product]}
            value={p.breakEvenEur <= 0 ? <span className="text-base md:text-lg">{D.free}</span> : <>{productValue(p.breakEvenEur)}{p.breakEvenEurMwh !== undefined && <span className="block text-sm font-normal text-muted">{F.unitPrice(p.breakEvenEurMwh)}/{U.mwh}</span>}</>}
            note={f(D.now, { v: productValue(p.currentEur) + (p.currentEurMwh !== undefined ? ` · ${F.unitPrice(p.currentEurMwh)}/${U.mwh}` : "") })}
          />
        )}
        {be.maxCapexEur !== undefined && <Stat label={D.maxCapex} value={be.maxCapexEur === null ? <span className="text-base md:text-lg">{unreachable}</span> : F.eur(be.maxCapexEur)} note={f(D.now, { v: F.eur(capex) })} />}
        {feed != null && <Stat label={D.feed} value={`${F.unitPrice(Math.abs(feed))}/${U.t}`} note={f(feed >= 0 ? D.feedPay : D.feedFee, { v: F.unitPrice(Math.abs(feed)) })} />}
      </div>
    </Section>
  );
}

function MeasureFirstPanel({ a, F, locale }: { a: Assessment; F: ReturnType<typeof makeFormat>; locale: Locale }) {
  const items = a.measureFirst?.slice(0, 6);
  if (!items?.length) return null;
  const M = decisionCopy[locale].measure;
  return (
    <Section id="measure" title={M.title} sub={M.sub}>
      <div className="card overflow-x-auto p-1" tabIndex={0}>
        <table className="num w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-3">{M.action}</th><th className="p-3 text-right">{M.range}</th><th className="p-3 text-right">{M.value}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={`${m.kind}:${m.parameterId ?? ""}`} className="border-t border-line align-top">
                <td className="p-3 font-sans">{M.kinds[m.kind]}{m.flips && <span className="chip ml-2 bg-amber-100 text-amber-900">{M.flips}</span>}</td>
                <td className="p-3 text-right">{F.eur(Math.min(m.lowNpvEur, m.highNpvEur))} … {F.eur(Math.max(m.lowNpvEur, m.highNpvEur))}</td>
                <td className="p-3 text-right font-semibold">{m.evpiEur > 0 ? F.eur(m.evpiEur) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((m) => {
          const ev = evidenceRequest(a, m, locale);
          if (!ev) return null;
          return (
            <details key={`how:${m.kind}:${m.parameterId ?? ""}`} className="group card p-4 text-sm">
              <summary className="flex cursor-pointer items-center gap-1.5 font-semibold">
                <span aria-hidden className="inline-block text-muted transition group-open:rotate-90">›</span>
                {M.how}: {M.kinds[m.kind]}
              </summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink2">{ev.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              {ev.request && (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{M.request}</span>
                    <CopyButton text={ev.request} label={M.copy} done={M.copied} />
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-surface2 p-3 font-sans text-xs text-ink2">{ev.request}</pre>
                </div>
              )}
              <p className="mt-3 text-ink2"><span className="font-semibold">{M.enterIn}:</span> {ev.enterIn}</p>
            </details>
          );
        })}
      </div>
    </Section>
  );
}

function MonteCarloPanel({ a, F, locale }: { a: Assessment; F: ReturnType<typeof makeFormat>; locale: Locale }) {
  const mc = a.monteCarlo;
  if (!mc) return null;
  const C = decisionCopy[locale].monteCarlo;
  return (
    <Section id="uncertainty" title={C.title} sub={C.sub}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={C.p10} value={F.eur(mc.p10NpvEur)} />
        <Stat label={C.p50} value={F.eur(mc.p50NpvEur)} />
        <Stat label={C.p90} value={F.eur(mc.p90NpvEur)} />
        <Stat label={C.prob} value={<span className={mc.probPositive >= 0.5 ? "text-good" : "text-warn"}>{probText(mc.probPositive, F)}</span>} />
        <Stat label={C.payback} value={F.years(mc.p50PaybackYears)} />
      </div>
      <p className="mt-3 text-sm text-ink2">{f(C.field, { count: fieldCheck.electricity.n, lo: F.n1(1 / fieldCheck.electricity.p90), hi: F.n1(1 / fieldCheck.electricity.p10) })}</p>
    </Section>
  );
}

function ClimatePanel({ a, F, locale }: { a: Assessment; F: ReturnType<typeof makeFormat>; locale: Locale }) {
  const g = a.ghg;
  if (!g) return null;
  const C = climateCopy[locale];
  const unit = "g CO₂e/MJ";
  const pctFmt = (v: number) => F.pct(v);
  return (
    <Section id="climate" title={C.title} sub={C.sub}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={C.product} value={<>{F.n0(g.productGMJ)} <span className="text-sm font-normal">{unit}</span></>} note={g.digestate === "closed" ? C.closed : C.open} />
        <Stat label={C.comparator} value={<>{F.n0(g.comparatorGMJ)} <span className="text-sm font-normal">{unit}</span></>} />
        <Stat label={C.saving} value={<span className={g.meetsMinimum ? "text-good" : "text-warn"}>{pctFmt(g.saving)}</span>} note={`${C.minimum}: ${pctFmt(g.minSaving)}`} />
        <Stat label={C.avoided} value={<>{F.n0(g.avoidedTco2eYear)} <span className="text-sm font-normal">t CO₂e</span></>} />
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink2">
        <li className={g.meetsMinimum ? "" : "font-semibold text-warn"}>{g.meetsMinimum ? C.meets : C.below}</li>
        <li>{g.criteriaApply ? C.applies : C.notApplies}</li>
        {g.approximated && <li>{C.approximated}</li>}
      </ul>
    </Section>
  );
}

function ScalePanel({ a, d, F, locale }: { a: Assessment; d: ResultDict; F: ReturnType<typeof makeFormat>; locale: Locale }) {
  if (!a.scale?.length) return null;
  const S = decisionCopy[locale].scale;
  const L = d.labels;
  const best = (p: (typeof a.scale)[number]) => (["chp", "boiler", "biomethane"] as RouteId[]).reduce((x, y) => (p.routes[y].npvEur > p.routes[x].npvEur ? y : x));
  const top = a.scale.reduce((x, y) => (y.routes[best(y)].npvEur > x.routes[best(x)].npvEur ? y : x));
  const scaleMax = Math.max(...a.scale.map((p) => Math.abs(p.routes[best(p)].npvEur)));
  return (
    <Section id="scale" title={S.title} sub={S.sub}>
      <div className="card overflow-x-auto p-1" tabIndex={0}>
        <table className="num w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-3">{S.size}</th><th className="p-3 text-right">{L.units.tYear}</th><th className="p-3">{S.best}</th><th className="p-3 text-right">{L.units.kwe}</th><th className="p-3 text-right">{d.result.colCapex}</th><th className="p-3 text-right">{d.result.colNpv}</th>
            </tr>
          </thead>
          <tbody>
            {a.scale.map((p) => {
              const r = best(p);
              const v = p.routes[r];
              return (
                <tr key={p.multiplier} className={`border-t border-line ${p.multiplier === 1 ? "bg-brandsoft/60" : ""}`}>
                  <td className="p-3 font-sans">× {p.multiplier.toLocaleString(INTL_TAG[locale])} {p.multiplier === 1 && <span className="chip ml-1">{S.current}</span>}</td>
                  <td className="p-3 text-right">{F.n0(sig2(p.tonnesYear))}</td>
                  <td className="p-3 font-sans">{L.route[r]}</td>
                  <td className="p-3 text-right">{F.n0(v.kwEl)}</td>
                  <td className="p-3 text-right">{F.eur(v.capexEur)}</td>
                  <td className={`p-3 text-right ${p === top ? "font-bold" : ""} ${v.npvEur >= 0 ? "text-good" : "text-bad"}`}><span className="inline-flex items-center justify-end gap-2.5"><SignedBar value={v.npvEur} max={scaleMax} />{F.eur(v.npvEur)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function QuoteCheckPanel({ a, d, F, locale }: { a: Assessment; d: ResultDict; F: ReturnType<typeof makeFormat>; locale: Locale }) {
  const q = a.quoteCheck!;
  const D = decisionCopy[locale];
  const labels = financialLabels(locale, d);
  const cap = q.capacity && q.capacity.value > 0 ? q.capacity : null;
  const unit = cap ? (cap.unit === "kWe" ? D.units.kwe : D.units.nm3hRaw) : "";
  const specific = (eur: number) => (cap ? ` · ${F.eur(eur / cap.value)}/${unit}` : "");
  const tone = q.position === "within" ? "text-good" : "text-warn";
  return (
    <div className="card mt-4 p-4">
      <div className="font-semibold">{D.quoteTitle} · {d.labels.route[q.route]}</div>
      <p className="mt-1 text-xs text-muted">{D.quoteSub}</p>
      <dl className="num mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-muted">{D.quote}</dt><dd className="font-semibold">{F.eur(q.quoteEur)}{specific(q.quoteEur)}</dd></div>
        <div><dt className="text-muted">{D.model}</dt><dd className="font-semibold">{F.eur(q.modelledEur)}{specific(q.modelledEur)}</dd></div>
        <div><dt className="text-muted">{D.range}</dt><dd className="font-semibold">{F.eur(q.modelRangeEur[0])} – {F.eur(q.modelRangeEur[1])}</dd></div>
        <div><dt className="text-muted">{D.maxPrice}</dt><dd className="font-semibold">{q.maxCapexEur === null ? d.result.unreachable : F.eur(q.maxCapexEur)}</dd></div>
      </dl>
      <p className={`mt-3 text-sm font-semibold ${tone}`}>{D.position[q.position]}</p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-ink2">{D.scope}</summary>
        <ul className="num mt-2 space-y-1">
          {q.scope.map((l) => <li key={l.id} className="flex justify-between gap-3 border-t border-line pt-1 first:border-0"><span className="font-sans">{labels[l.id] ?? l.label}</span><span>{F.eur(l.eur)}</span></li>)}
        </ul>
      </details>
    </div>
  );
}

function FullSections({ a, d, F, locale, methodologyHref, extended, process, economics, currency }: { a: Assessment; d: ResultDict; F: ReturnType<typeof makeFormat>; locale: Locale; methodologyHref: string; extended: boolean; process?: ProcessResult; economics: boolean; currency: string }) {
  const registryHref = `${methodologyHref}?${new URLSearchParams({ c: a.countryCode, r: a.input.regionId })}#parameter-group-4`;
  const parameterNumber = new Intl.NumberFormat(INTL_TAG[locale], { maximumSignificantDigits: 4 }).format;
  const R = d.result;
  const L = d.labels;
  const { n0, n1, eur, years, pct } = F;
  const best = a.scenarios.base;
  const route = a.bestRoute;
  const routes: RouteId[] = ["chp", "boiler", "biomethane"];
  const routeMax = Math.max(...routes.map((x) => Math.abs(a.routeMatrix[x].base.fin.npvEur)));
  const PC = processCopy(locale);
  const fields = processFieldLabels(locale);
  const metricLabels = processMetricLabels(locale);
  const O = offerCopy[locale];
  const metricNumber = new Intl.NumberFormat(INTL_TAG[locale], { maximumSignificantDigits: 6 }).format;
  const moneyLabels: Record<string, string> = { ...financialLabels(locale, d), ...(process && { process: PC.models[process.kind], process_operation: fields.processOpexLocalYear, residual_disposal: fields.residualCostLocalT, gas_supply: fields.gasPriceLocalNm3, treatment: fields.avoidedTreatmentLocalM3 }) };
  const localRows = (rows: { id: string; label: string; eur: number }[]) => rows.map((row) => ({ ...row, label: moneyLabels[row.id] ?? row.label }));
  return (
    <>
      {economics && !extended && <Section id="economics" title={L.scenario.base} sub={f(R.finNote, { debt: pct(best.fin.debtEur / Math.max(1, best.fin.capexEur)) })}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={R.rowRevenue} value={eur(best.opexRev.revenueEur)} />
          <Stat label={R.rowOpex} value={eur(best.opexRev.opexEur)} />
          <Stat label={R.rowEbitda} value={eur(best.fin.ebitdaEurYear)} />
          <Stat label={R.rowNpv} value={eur(best.fin.npvEur)} />
          <Stat label={R.rowCapex} value={eur(best.capex.totalEur)} />
          <Stat label={R.rowPayback} value={years(best.fin.simplePaybackYears)} />
          <Stat label={R.rowIrr} value={best.fin.irr === null ? "—" : pct(best.fin.irr, 1)} />
          <Stat label={R.rowDscr} value={best.fin.dscrMin === null ? "—" : n1(best.fin.dscrMin)} />
        </div>
        <div className="card mt-3 p-4"><span className="text-xs text-muted">{F.currency}</span><CashFlowChart scenarios={a.scenarios} t={d.charts} scn={L.scenario} compact={F.monetaryCompact} ids={["base"]} /></div>
      </Section>}
      {economics && extended && <>
      {/* ---------- Scenarios ---------- */}
      <Section id="economics" title={R.scenariosTitle} sub={f(R.scenariosSub, { route: L.route[route] })}>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="card overflow-x-auto p-1" tabIndex={0}>
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3 font-semibold"><span className="sr-only">{R.scenariosTitle}</span></th>
                  {SCN.map((s) => <th key={s} className="p-3 text-right font-semibold">{L.scenario[s]}</th>)}
                </tr>
              </thead>
              <tbody className="num">
                {([
                  [R.rowBiogas, (s: ScenarioId) => n1(a.scenarios[s].feed.biogasM3Year / 1000)],
                  [R.rowCapex, (s: ScenarioId) => eur(a.scenarios[s].capex.totalEur)],
                  [R.rowOpex, (s: ScenarioId) => eur(a.scenarios[s].opexRev.opexEur)],
                  [R.rowRevenue, (s: ScenarioId) => eur(a.scenarios[s].opexRev.revenueEur)],
                  [R.rowEbitda, (s: ScenarioId) => eur(a.scenarios[s].fin.ebitdaEurYear)],
                  [R.rowPayback, (s: ScenarioId) => years(a.scenarios[s].fin.simplePaybackYears)],
                  [R.rowPaybackDisc, (s: ScenarioId) => years(a.scenarios[s].fin.discountedPaybackYears ?? null)],
                  [R.rowNpv, (s: ScenarioId) => eur(a.scenarios[s].fin.npvEur)],
                  [R.rowIrr, (s: ScenarioId) => (a.scenarios[s].fin.irr === null ? "—" : pct(a.scenarios[s].fin.irr as number, 1))],
                  [R.rowDscr, (s: ScenarioId) => (a.scenarios[s].fin.dscrMin === null ? "—" : n1(a.scenarios[s].fin.dscrMin as number))],
                ] as Array<[string, (s: ScenarioId) => string]>).map(([label, fn]) => (
                  <tr key={label} className="border-t border-line">
                    <td className="p-3 font-sans font-medium text-ink2">{label}</td>
                    {SCN.map((s) => <td key={s} className={`p-3 text-right ${s === "base" ? "font-bold" : ""}`}>{fn(s)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 pb-3 text-xs text-muted">{f(R.finNote, { debt: pct(best.fin.debtEur / Math.max(1, best.fin.capexEur)) })}</p>
          </div>
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold">{R.cashTitle.replaceAll("€", F.currency).replaceAll("EUR", F.currency)}</div>
            <CashFlowChart scenarios={a.scenarios} t={d.charts} scn={L.scenario} compact={F.monetaryCompact} />
          </div>
        </div>
      </Section>

      {/* ---------- Routes ---------- */}
      <Section id="routes" title={R.routesTitle} sub={R.routesSub}>
        <div className="card overflow-x-auto p-1" tabIndex={0}>
          <table className="num w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="p-3">{R.colRoute}</th><th className="p-3 text-right">{R.colCapex}</th><th className="p-3 text-right">{R.colEbitda}</th><th className="p-3 text-right">{R.colPayback}</th><th className="p-3 text-right">{R.colNpv}</th><th className="p-3 text-right">{R.colRange}</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((rt) => {
                const s = a.routeMatrix[rt];
                return (
                  <tr key={rt} className={`border-t border-line ${rt === route ? "bg-brandsoft/60" : ""}`}>
                    <td className="p-3 font-sans font-medium">{L.route[rt]} {rt === route && <span className="chip ml-1">{R.chosen}</span>}</td>
                    <td className="p-3 text-right">{eur(s.base.capex.totalEur)}</td>
                    <td className="p-3 text-right">{eur(s.base.fin.ebitdaEurYear)}</td>
                    <td className="p-3 text-right">{years(s.base.fin.simplePaybackYears)}</td>
                    <td className="p-3 text-right font-semibold"><span className="inline-flex items-center justify-end gap-2.5"><SignedBar value={s.base.fin.npvEur} max={routeMax} />{eur(s.base.fin.npvEur)}</span></td>
                    <td className="p-3 text-right text-muted">{eur(Math.min(s.conservative.fin.npvEur, s.optimistic.fin.npvEur))} … {eur(Math.max(s.conservative.fin.npvEur, s.optimistic.fin.npvEur))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="space-y-1 px-4 pb-4 pt-2 text-xs text-muted">
            <li>{R.routeNoteChp}</li>
            <li>{f(R.routeNoteBm, { v: n0(a.routeMatrix.biomethane.base.energy.rawBiogasNm3PerHour) })}</li>
          </ul>
        </div>
      </Section>

      {/* ---------- Support cases ---------- */}
      <Section id="support" title={R.supportTitle} sub={R.supportSub}>
        <SupportTable a={a} d={d} locale={locale} eur={eur} years={years} />
      </Section>

      {/* ---------- Scores ---------- */}
      <Section id="scores" title={R.scoresTitle} sub={R.scoresSub}>
        <div className="grid gap-3 md:grid-cols-2">
          {a.scores.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-baseline justify-between">
                <div className="font-semibold">{L.score[s.id]}</div>
                <div className="num text-lg font-bold">{s.value}<span className="text-xs font-normal text-muted">/100{s.isRisk ? ` ${R.risk}` : ""}</span></div>
              </div>
              <div className="mt-2"><ScoreBar value={s.value} isRisk={s.isRisk} label={f(d.charts.of100, { v: s.value })} /></div>
              <ul lang={a.lang} className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">{s.explanation.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="card mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <div className="font-semibold">{R.overall}</div>
            <div className="num text-2xl font-extrabold">{a.overall.value}<span className="text-sm font-normal text-muted">/100</span></div>
          </div>
          <ul lang={a.lang} className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink2">{a.overall.explanation.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </Section>

      {/* ---------- Sensitivity ---------- */}
      <Section id="sensitivity" title={R.sensTitle} sub={R.sensSub}>
        <div className="card p-4"><Tornado items={a.sensitivity} baseNpv={best.fin.npvEur} t={{ ...d.charts, sensHeader: d.charts.sensHeader.replaceAll("€", F.currency).replaceAll("EUR", F.currency) }} compact={F.monetaryCompact} /></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Stat label={R.beCapex} value={a.breakEven.capexReductionPct === null ? R.unreachable : a.breakEven.capexReductionPct === 0 ? R.alreadyPositive : F.pct(Math.round(a.breakEven.capexReductionPct) / 100)} note={R.beCapexNote} />
          <Stat label={R.bePrice} value={a.breakEven.energyPriceIncreasePct === null ? R.unreachable : a.breakEven.energyPriceIncreasePct === 0 ? R.alreadyPositive : F.pct(Math.round(a.breakEven.energyPriceIncreasePct) / 100)} note={R.bePriceNote} />
        </div>
        {a.sensitivity.some((s) => s.breaks) && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{f(R.flips, { list: a.sensitivity.filter((s) => s.breaks).map((s) => s.label).join("; ") })}</p>}
      </Section>

      {/* ---------- Details ---------- */}
      </>}
      {economics && <>
      <AdvicePlan a={a} d={d} locale={locale} F={F} currency={currency} />
      <MeasureFirstPanel a={a} F={F} locale={locale} />
      <BreakEvenPanel a={a} F={F} locale={locale} unreachable={R.unreachable} />
      <MonteCarloPanel a={a} F={F} locale={locale} />
      <ScalePanel a={a} d={d} F={F} locale={locale} />
      </>}
      <ClimatePanel a={a} F={F} locale={locale} />
      <Section id="details" title={R.detailsTitle}>
        <div className="space-y-3">
          {process ? <Fold title={PC.models[process.kind]} open>
            <p className="text-sm text-ink2">{PC.inputHint}</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(process.metrics).map(([id, m]) => <div key={id}><dt className="text-muted">{metricLabels[id] ?? PROCESS_METRIC_LABELS[id] ?? fields[id]}</dt><dd className="num font-semibold">{metricNumber(m.value)} {m.unit}</dd></div>)}
            </dl>
            <p className="mt-3 text-xs text-muted">{PC.costHint}</p>
          </Fold> : <Fold title={R.dFeed} open>
            <div className="overflow-x-auto" tabIndex={0}>
              <table className="num w-full min-w-[640px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="py-2">{R.colStream}</th><th className="py-2 text-right">{R.colTonnes}</th><th className="py-2 text-right">{R.colDm}</th><th className="py-2 text-right">{R.colCh4}</th><th className="py-2 text-right">{R.colLogistics}</th><th className="py-2 text-right">{R.colMaxDist}</th></tr></thead>
                <tbody>
                  {best.feed.lines.map((l) => {
                    const lg = a.logistics.perLine.find((x) => x.id === l.id)!;
                    return (
                      <tr key={l.id} className="border-t border-line">
                        <td className="py-2 font-sans">{L.feedstock[l.typeId]}{l.delivered && <span className="chip ml-2">{f(R.deliveredKm, { v: l.distanceKm })}</span>}</td>
                        <td className="py-2 text-right">{n0(l.tonnesYear)}</td>
                        <td className="py-2 text-right">{n1(l.dryMatterPct)}</td>
                        <td className="py-2 text-right">{n1(l.tonnesYear > 0 ? l.ch4M3Year / l.tonnesYear : 0)}</td>
                        <td className={`py-2 text-right ${lg.level === "CRITICAL" ? "font-bold text-bad" : lg.level === "WARNING" ? "font-semibold text-warn" : ""}`}>{lg.distanceKm > 0 ? pct(lg.transportShareOfEnergyValue) : R.onSite}</td>
                        <td className="py-2 text-right">≈ {n0(lg.breakEvenDistanceKm)} {L.units.km}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">{R.maxDistNote}</p>
          </Fold>}

          <Fold title={R.dTech}>
            <p lang={a.lang} className="font-semibold">{processPrimary(locale, best.design.tech.primary)}</p>
            <p lang={a.lang} className="mt-1 text-sm text-ink2">{best.design.tech.reactor}</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
              {([
                [R.workVol, best.design.workingVolumeM3, `≈ ${n0(sig2(best.design.workingVolumeM3))} m³`],
                [R.hrt, best.design.hrtDays, `${n1(best.design.hrtDays)} ${R.days}`],
                [R.olr, best.design.olrKgVsM3Day, `${n1(best.design.olrKgVsM3Day)} kg VS/(m³·d)`],
                [R.storage, best.design.storageVolumeM3, `≈ ${n0(sig2(best.design.storageVolumeM3))} m³`],
              ] as const).filter(([, v]) => !process || v > 0).map(([label, , text]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="num font-semibold">{text}</dd></div>)}
            </dl>
            <ul lang={a.lang} className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink2">{best.design.tech.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
            {best.design.tech.alternatives.length > 0 && <><div className="mt-3 text-sm font-semibold">{R.alternatives}</div><ul lang={a.lang} className="list-disc space-y-1 pl-5 text-sm text-ink2">{best.design.tech.alternatives.map((x) => <li key={x}>{x}</li>)}</ul></>}
            <p className="mt-3 text-xs text-muted">{f(R.climate, { region: a.climate.regionName, t: n1(a.climate.meanTempC), hdd: n0(a.climate.hdd), list: a.climate.analogues.map((x) => `${x.name} (Δ ${n1(x.distance)} °C)`).join(", ") })}</p>
          </Fold>

          <MonthlyBalance a={a} locale={locale} n0={n0} />

          {economics && <Fold title={R.dMoney}>
            <div className="grid gap-6 md:grid-cols-3">
              <LineTable title={`CAPEX (${F.currency})`} rows={localRows(best.capex.lines)} total={best.capex.totalEur} totalLabel={R.total} compact={F.monetaryCompact} />
              <LineTable title={`${R.rowOpex} (${F.currency})`} rows={localRows(best.opexRev.opex)} total={best.opexRev.opexEur} totalLabel={R.total} compact={F.monetaryCompact} />
              <LineTable title={`${R.rowRevenue} (${F.currency})`} rows={localRows(best.opexRev.revenue)} total={best.opexRev.revenueEur} totalLabel={R.total} compact={F.monetaryCompact} />
            </div>
            <p className="mt-3 text-xs text-muted">{preferenceCopy(locale).costs}</p>
          </Fold>}

          {process ? <Fold title={O.residualsTitle}>
            <p className="text-sm">{process.kind === "residue" ? f(O.resResidue, { t: n0(a.digestate.tonnesYear), n: n0(a.digestate.nKgYear) })
              : process.kind === "wastewater" ? f(O.resWastewater, { t: n0(process.metrics.sludge?.value ?? 0), cod: n0(process.metrics.effluentCod?.value ?? 0) })
              : O.resNone}</p>
          </Fold> : <Fold title={R.dDigestate}>
            <p className="text-sm">
              {f(R.dgLine, {
                status: R.dgStatus[a.digestate.status],
                t: n0(a.digestate.tonnesYear),
                n: n0(a.digestate.nKgYear),
                ha: n0(a.digestate.landRequiredHa),
                avail: a.digestate.landAvailableHa !== null ? f(R.dgAvail, { v: n0(a.digestate.landAvailableHa) }) : R.dgUnknown,
              })}
            </p>
            <p className="mt-1 text-sm text-ink2">{f(R.dgValue, { v: eur(a.digestate.fertiliserValueEurYear), h: eur(a.digestate.handlingCostEurYear), n: eur(a.digestate.netValueEurYear) })}</p>
            <ul lang={a.lang} className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink2">{a.digestate.advice.map((x) => <li key={x}>{x}</li>)}</ul>
          </Fold>}

          <Fold title={R.dMethane}>
            <p className="text-sm">
              {f(R.mLine, { v: pct(a.methane.lossShare, 1), lo: pct(a.methane.lossShareRange[0], 1), hi: pct(a.methane.lossShareRange[1], 1), co2: n0(a.methane.co2eTonnesYear), disp: n0(a.methane.displacedCo2eTonnesYear) })}{" "}
              {a.methane.ratio !== null ? f(R.mRatio, { v: pct(a.methane.ratio) }) : ""}
            </p>
            {(process?.metrics.uncapturedCh4?.value ?? 0) > 0 && <p className="mt-2 text-sm">{f(O.methaneUncaptured, { v: n0(process!.metrics.uncapturedCh4.value) })}</p>}
            <ul lang={a.lang} className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink2">{a.methane.advice.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="mt-2 text-xs text-muted">{R.mNote}</p>
          </Fold>

          <Fold title={R.dReg}>
            <p className="text-sm">{f(R.regComplexity, { v: R.regLevel[a.regulatory.complexity] })} {R.regNote}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {a.regulatory.items.map((it) => (
                <li key={it.id} className="rounded-lg border border-line p-3">
                  <div lang={a.lang} className="font-medium">{it.title}</div>
                  <div className="text-xs text-muted"><span lang={a.lang}>{it.appliesBecause}</span> · {f(R.effort, { v: R.regLevel[it.effort] })} · {it.status === "CONFIRMED" ? R.verified : R.toVerify}</div>
                </li>
              ))}
            </ul>
          </Fold>

          <Fold title={R.dSafety}>
            <ul className="space-y-3 text-sm">
              {a.safety.map((s) => (
                <li key={s.id} className="rounded-lg border border-line p-3">
                  <div className="font-semibold"><span lang={a.lang}>{s.hazard}</span> <span className={`chip ml-1 ${s.severity === "HIGH" ? "bg-red-100 text-red-900" : ""}`}>{s.severity === "HIGH" ? R.sevHigh : R.sevMed}</span></div>
                  {s.trigger && <div className="text-xs text-muted">{f(R.condition, { v: "" })}<span lang={a.lang}>{s.trigger}</span></div>}
                  <ul lang={a.lang} className="mt-1 list-disc pl-5 text-ink2">{s.controls.map((c) => <li key={c}>{c}</li>)}</ul>
                </li>
              ))}
            </ul>
            <p lang={a.lang} className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{locText(SAFETY_DISCLAIMER, a.lang)}</p>
          </Fold>

          <Fold title={f(R.dAssumptions, { n: a.assumptionsUsed.length })}>
            <p className="text-sm text-ink2">{R.assumptionsText} <Link className="font-semibold text-brand underline" href={registryHref}>→</Link></p>
            <ul lang={a.lang} className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink2">{a.notes.map((x) => <li key={x}>{x}</li>)}</ul>
            {process && <div className="mt-4 border-t border-line pt-3">
              <p lang="en" className="text-sm text-ink2">{a.input.process?.basisReference}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted">{process.provenance.map((p) => <li key={p.id}>{fields[p.id.replace("process.", "")] ?? p.label}: <span className="num">{parameterNumber(p.value)} {p.unit.replace("local", F.currency)}</span> · {p.origin} · {p.confidence} · {p.date} · {p.country}{p.source.startsWith("https://") && <> · <a href={p.source} className="underline" rel="noreferrer" target="_blank">{p.source}</a></>}</li>)}</ul>
            </div>}
            {economics && extended && !!a.parameterSensitivity?.length && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-sm font-semibold">{R.sensTitle}</p>
                <p className="mt-1 text-xs text-muted">{R.sensSub}</p>
                <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                  {a.parameterSensitivity.map((s) => {
                    const evidence = a.marketEvidence?.find((p) => p.id === s.parameterId);
                    return <div key={s.parameterId} className="min-w-0 rounded-lg border border-line p-3 text-xs">
                      <dt lang="en" className="font-semibold">{(s.parameterId.startsWith("process.") ? fields[s.parameterId.slice(8)] : undefined) ?? evidence?.label ?? s.parameterId}</dt>
                      <dd className="num mt-1">{parameterNumber(s.lowInput)} … {parameterNumber(s.highInput)} {evidence?.unit}</dd>
                      <dd className="num mt-1">{R.colRange}: {eur(Math.min(s.lowNpvEur, s.highNpvEur))} … {eur(Math.max(s.lowNpvEur, s.highNpvEur))}</dd>
                    </div>;
                  })}
                </dl>
              </div>
            )}
            {!!a.marketEvidence?.length && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer font-semibold">{R.assumptionsText}</summary>
                <dl lang="en" className="mt-2 space-y-3 break-words">
                  {a.marketEvidence.map((p) => <div key={p.id}>
                    <dt className="font-semibold">{p.label}: <span className="num">{parameterNumber(displayUnit(p.value, p.unit, { currency: F.currency, rate: F.exchangeRate }).value)} {displayUnit(p.value, p.unit, { currency: F.currency, rate: F.exchangeRate }).unit}</span> · {p.origin ?? p.kind} · {p.confidence}</dt>
                    <dd className="mt-1 text-muted">{p.source}</dd>
                    {/* eslint-disable-next-line react/jsx-no-literals -- parameter register is English by design (lang="en") */}
                    {p.evidence && <dd className="mt-1 text-muted">{p.evidence.period} · checked {p.evidence.checkedOn} · {p.evidence.scope}</dd>}
                    {a.dataAudit?.checks.find((check) => check.parameterId === p.id) && <dd className="mt-1 text-muted">{a.dataAudit.checks.find((check) => check.parameterId === p.id)!.status}: {a.dataAudit.checks.find((check) => check.parameterId === p.id)!.reason}</dd>}
                    {p.evidence?.components && <dd className="mt-1 text-muted">{p.evidence.components.map((c) => `${c.name}: ${parameterNumber(c.value)} ${c.unit} (${c.origin})`).join("; ")}</dd>}
                  </div>)}
                </dl>
              </details>
            )}
          </Fold>
        </div>
      </Section>
    </>
  );
}

/** Base case, chosen route: the monthly arrays the energy model already balances (gas, digester heat, useful heat, power). */
function MonthlyBalance({ a, locale, n0 }: { a: Assessment; locale: Locale; n0: (v: number) => string }) {
  const b = a.scenarios.base;
  const m = b.energy.monthly;
  if (!m?.gasKwh?.length) return null;
  const O = offerCopy[locale];
  const month = new Intl.DateTimeFormat(INTL_TAG[locale], { month: "short", timeZone: "UTC" });
  const mwh = (v: number) => n0(v / 1000);
  const rows = m.gasKwh.map((gas, i) => [month.format(Date.UTC(2025, i, 1)), n0(b.feed.monthlyTonnes[i] ?? 0), mwh(gas), mwh(m.heatDigesterKwh[i]), mwh(m.heatUsefulKwh[i]), mwh(m.elNetKwh[i])]);
  const sum = (x: number[]) => x.reduce((s, v) => s + v, 0);
  return (
    <Fold title={O.monthlyTitle}>
      <p className="text-xs text-muted">{O.monthlySub}</p>
      <div className="mt-2 overflow-x-auto" tabIndex={0}>
        <table className="num w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-muted">{O.monthlyCols.map((c, i) => <th key={c} className={`py-2 ${i ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r[0]} className="border-t border-line">{r.map((v, i) => <td key={i} className={`py-1.5 ${i ? "text-right" : "font-sans"}`}>{v}</td>)}</tr>)}
            <tr className="border-t-2 border-line font-semibold"><td className="py-1.5 font-sans">Σ</td>{[n0(sum(b.feed.monthlyTonnes)), mwh(sum(m.gasKwh)), mwh(sum(m.heatDigesterKwh)), mwh(sum(m.heatUsefulKwh)), mwh(sum(m.elNetKwh))].map((v, i) => <td key={i} className="py-1.5 text-right">{v}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </Fold>
  );
}

function LineTable({ title, rows, total, totalLabel, compact }: { title: string; rows: { id: string; label: string; eur: number }[]; total: number; totalLabel: string; compact: (v: number) => string }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <table className="num w-full text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line first:border-0"><td className="py-1.5 pr-2 font-sans text-ink2">{r.label}</td><td className="py-1.5 text-right">{compact(r.eur)}</td></tr>
          ))}
          <tr className="border-t-2 border-ink"><td className="py-1.5 font-sans font-bold">{totalLabel}</td><td className="py-1.5 text-right font-bold">{compact(total)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { ADVICE_ASSUMPTIONS, applyLevers, runScenario } from "@/core";
import type { Advice, Assessment, CountryAdapter, LeverId, LeverSettings, ProjectInput, ScenarioOutcome } from "@/core";
import { fmt as f, type Dict, type Locale } from "@/i18n";
import { advisorCopy } from "@/i18n/advisor";
import { track } from "@/lib/analytics";
import { makeFormat, sig2 } from "@/lib/format";
import { usePreferences } from "./LocaleProvider";
import { Icon, type IconName } from "./brand/Icon";
import { DecisionRange, SignedBar } from "./Ranges";
import { gapWords, LEVER_ICON, leverWords, localPrice, nextVerdict, shownLevers, signedEur, VerdictPill } from "./Advice";

/** Lab controls, in the units the client thinks in. Zero (or the current debt share) means unchanged. */
interface Controls { heatMwh: number; cosubT: number; feeLocal: number; clusterPct: number; debtPct: number | null }
interface Saved { n: number; controls: Controls; input: ProjectInput; outcome: ScenarioOutcome }

const MAX_SAVED = 3;
/** A step of 1, 2 or 5 × 10ᵏ giving about `parts` positions over the range. */
const niceStep = (max: number, parts = 60) => {
  if (!(max > 0)) return 1;
  const raw = max / parts, p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= raw) ?? p;
};

function settingsOf(c: Controls, base: Controls): LeverSettings {
  return {
    ...(c.heatMwh > 0 ? { heatKwh: c.heatMwh * 1000 } : {}),
    ...(c.cosubT > 0 ? { cosubTonnes: c.cosubT, gateFeeLocal: c.feeLocal } : {}),
    ...(c.clusterPct > 0 ? { clusterShare: c.clusterPct / 100 } : {}),
    ...(c.debtPct !== null && c.debtPct !== base.debtPct ? { debtShare: c.debtPct / 100 } : {}),
  };
}

function controlsOf(s: LeverSettings, base: Controls): Controls {
  return {
    heatMwh: s.heatKwh ? s.heatKwh / 1000 : 0,
    cosubT: s.cosubTonnes ?? 0,
    feeLocal: s.gateFeeLocal ?? base.feeLocal,
    clusterPct: s.clusterShare ? Math.round(s.clusterShare * 100) : 0,
    debtPct: s.debtShare !== undefined ? Math.round(s.debtShare * 100) : base.debtPct,
  };
}

function Slider({ id, icon, label, value, max, step, display, onChange }: { id: string; icon: IconName; label: string; value: number; max: number; step: number; display: string; onChange: (v: number) => void }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon name={icon} size={16} className="shrink-0 text-brand" />{label}</label>
        <output htmlFor={id} className="num shrink-0 text-sm font-bold text-ink">{display}</output>
      </div>
      <input id={id} type="range" min={0} max={max} step={step} value={Math.min(value, max)} aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))} className="lab-range mt-2.5 w-full" style={{ ["--pct" as string]: `${pct}%` }} />
    </div>
  );
}

/**
 * "What would change the result" as a scenario engine: the advisor's tested levers, then the lab — move a lever, see the
 * verdict and NPV range at once (same model, fast path), save up to three scenarios, compare them, apply one to the form.
 */
export function ScenarioLab({ a, advice, input, country, locale, d, currency, onApply }: {
  a: Assessment; advice: Advice; input: ProjectInput; country: CountryAdapter; locale: Locale;
  d: Pick<Dict, "result" | "labels" | "calc">; currency: string; onApply: (next: ProjectInput, source: string) => void;
}) {
  const A = advisorCopy[locale];
  const R = d.result, L = d.labels;
  const preferences = usePreferences();
  const F = makeFormat(locale, L.units, { currency: preferences.currency, rate: preferences.currency === "USD" ? preferences.usd.value : 1 });
  const price = localPrice(locale, currency);
  const ctx = advice.context;
  const asOfDate = a.dataAudit?.asOfDate;
  const base = useMemo<Controls>(() => ({ heatMwh: 0, cosubT: 0, feeLocal: ctx.gateFeeLocal, clusterPct: 0, debtPct: ctx.debtShare === null ? null : Math.round(ctx.debtShare * 100) }), [ctx]);
  const [controls, setControls] = useState<Controls>(base);
  const [saved, setSaved] = useState<Saved[]>([]);
  const counter = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  const deferred = useDeferredValue(controls);
  const scenario = useMemo(() => {
    const settings = settingsOf(deferred, base);
    if (!Object.keys(settings).length) return { input, outcome: advice.base, empty: true };
    const next = applyLevers(input, settings, ctx);
    return { input: next, outcome: runScenario(next, country, asOfDate), empty: false };
  }, [deferred, base, input, ctx, country, asOfDate, advice.base]);
  const pending = deferred !== controls;
  const o = scenario.outcome, b = advice.base;

  const levers = shownLevers(advice);
  const improving = levers.filter((l) => l.improves);
  const quiet = levers.filter((l) => !l.improves);
  const next = nextVerdict(b.verdict);
  const show = { heat: ctx.heatMaxKwh > 0, cosub: ctx.cosubTonnes > 0, cluster: ctx.cluster, debt: ctx.debtShare !== null };
  const hasControls = show.heat || show.cosub || show.cluster || show.debt;
  if (!levers.length && !hasControls && !b.gaps.length) return null;

  const heatMax = Math.ceil(ctx.heatMaxKwh / 1000);
  const cosubMax = Math.max(3 * ctx.cosubTonnes, 1000);
  const feeMax = Math.max(4 * ctx.gateFeeLocal, 50 * ctx.fx);
  const mwh = (v: number) => `${F.n0(sig2(v))} ${L.units.mwh}`;
  const tonnes = (v: number) => `${F.n0(sig2(v))} ${L.units.t}`;
  const changeWords = (c: Controls) => [
    c.heatMwh > 0 ? `${A.ctrlHeat}: ${mwh(c.heatMwh)}` : null,
    c.cosubT > 0 ? `${A.ctrlCosub}: ${tonnes(c.cosubT)} · ${price(c.feeLocal)}/${L.units.t}` : null,
    c.clusterPct > 0 ? `${A.ctrlCluster}: +${F.pct(c.clusterPct / 100)}` : null,
    c.debtPct !== null && c.debtPct !== base.debtPct ? `${A.ctrlDebt}: ${F.pct(c.debtPct / 100)}` : null,
  ].filter((x): x is string => !!x);

  const tryIn = (settings: LeverSettings, source: string) => {
    setControls(controlsOf(settings, base));
    track("lab_try", { lever: source });
    setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };
  const apply = (next: ProjectInput, source: string) => { track("lab_apply", { source }); onApply(next, source); };
  const same = (x: Controls, y: Controls) => JSON.stringify(x) === JSON.stringify(y);
  const save = () => {
    if (scenario.empty || pending || saved.length >= MAX_SAVED || saved.some((s) => same(s.controls, controls))) return;
    counter.current += 1;
    setSaved((list) => [...list, { n: counter.current, controls, input: scenario.input, outcome: scenario.outcome }]);
    track("lab_save", { verdict: scenario.outcome.verdict });
  };
  const canSave = !scenario.empty && !pending && saved.length < MAX_SAVED && !saved.some((s) => same(s.controls, controls));
  const dNpv = o.npvEur[1] - b.npvEur[1], dCapex = o.capexEur - b.capexEur;
  const maxDelta = Math.max(1, ...levers.map((l) => Math.abs(l.deltaNpvEur)), Math.abs(advice.combined?.deltaNpvEur ?? 0));
  const npvLabels = (x: ScenarioOutcome): [string, string, string] => [F.eur(x.npvEur[0]), F.eur(x.npvEur[1]), F.eur(x.npvEur[2])];
  const names: [string, string, string] = [L.scenario.conservative, L.scenario.base, L.scenario.optimistic];
  const card = (id: LeverId | "combined", title: string, text: string, outcome: ScenarioOutcome, delta: number, settings: LeverSettings, nextInput: ProjectInput) => (
    <article key={id} className={`card flex flex-col p-5 transition hover:border-brand/60 hover:shadow-[0_18px_50px_-34px_rgba(11,23,18,0.45)] ${id === "combined" ? "border-brand/40 bg-[linear-gradient(160deg,var(--brand-soft),var(--surface)_55%)]" : ""}`}>
      <div className="flex items-center gap-2.5 font-bold">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brandsoft text-brand"><Icon name={id === "combined" ? "check" : LEVER_ICON[id]} size={18} /></span>
        <span className="min-w-0">{id === "combined" && <span className="eyebrow block text-brand">{A.combined}</span>}{title}</span>
      </div>
      <p className="mt-2 flex-1 text-sm text-ink2">{text}</p>
      <div className="mt-4 rounded-xl bg-surface2 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-1.5"><VerdictPill id={b.verdict} label={L.verdict[b.verdict]} /><span aria-hidden className="text-muted">→</span><VerdictPill id={outcome.verdict} label={L.verdict[outcome.verdict]} /></div>
        <div className={`num mt-2 flex items-center gap-2.5 font-semibold ${delta >= 0 ? "text-good" : "text-bad"}`}><SignedBar value={delta} max={maxDelta} />{A.colDelta} {signedEur(F, delta)}</div>
        {outcome.route !== b.route && <div className="mt-1 text-xs text-muted">{R.route}: {L.route[b.route]} → {L.route[outcome.route]}</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {hasControls && <button type="button" className="btn btn-ghost !px-4 !py-2 text-sm" onClick={() => tryIn(settings, id)}>{A.tryInLab}</button>}
        <button type="button" className="btn btn-primary !px-4 !py-2 text-sm" onClick={() => apply(nextInput, id)}>{R.apply}</button>
      </div>
    </article>
  );

  return (
    <section id="lab" className="no-print mt-12 scroll-mt-32" aria-labelledby="lab-h">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-2 h-5 w-1 shrink-0 rounded-full bg-brand" />
        <div className="min-w-0">
          <h2 id="lab-h" className="text-xl font-bold tracking-tight md:text-2xl">{R.whatIfTitle}</h2>
          <p className="mt-1 text-sm text-muted">{A.sub}</p>
        </div>
      </div>

      {next && b.gaps.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-sm font-semibold text-amber-950">{f(A.gapsTitle, { verdict: L.verdict[next] })}</div>
          <ul className="mt-2 grid gap-1.5 text-sm text-amber-950/90 md:grid-cols-2">
            {b.gaps.map((g) => <li key={g} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" /><span>{gapWords(g, a, b, locale, F)}</span></li>)}
          </ul>
        </div>
      )}

      {improving.length > 0 || advice.combined ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {improving.map((l) => { const w = leverWords(l.id, l.settings, ctx, locale, F, L.units, currency); return card(l.id, w.title, w.text, l.outcome, l.deltaNpvEur, l.settings, l.input); })}
          {advice.combined && card("combined", advice.combined.ids.map((x) => A.levers[x].title).join(" + "), advice.combined.ids.map((x) => leverWords(x, advice.combined!.settings, ctx, locale, F, L.units, currency).text).join(" "), advice.combined.outcome, advice.combined.deltaNpvEur, advice.combined.settings, advice.combined.input)}
        </div>
      ) : <p className="mt-4 rounded-2xl bg-surface2 p-4 text-sm text-ink2">{A.noLever}</p>}

      {quiet.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <span className="font-semibold">{A.alsoTested}</span>
          <ul className="mt-1.5 space-y-1 text-ink2">
            {quiet.map((l) => { const w = leverWords(l.id, l.settings, ctx, locale, F, L.units, currency); return <li key={l.id} className="flex flex-wrap items-baseline gap-x-2"><span className="font-medium text-ink">{w.title}</span><span className={`num text-xs font-semibold ${l.deltaNpvEur >= 0 ? "text-good" : "text-bad"}`}>{A.colDelta} {signedEur(F, l.deltaNpvEur)}</span><span className="text-xs text-muted">{w.text}</span></li>; })}
          </ul>
        </div>
      )}

      {hasControls && (
        <div ref={panel} id="lab-panel" className="mt-6 scroll-mt-32 overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_70px_-40px_rgba(11,23,18,0.45)]">
          <div className="hero relative px-5 py-4 md:px-6">
            <div className="hero-grid absolute inset-0" aria-hidden />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2.5 font-display text-lg font-semibold"><span aria-hidden className="pulse-soft h-2 w-2 rounded-full bg-signal" />{A.labTitle}</h3>
              <button type="button" className="btn btn-ghost-dark !px-4 !py-1.5 text-sm" disabled={scenario.empty && !pending} onClick={() => setControls(base)}>{A.reset}</button>
            </div>
          </div>
          <div className="grid gap-px bg-line lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="space-y-6 bg-surface p-5 md:p-6">
              {show.heat && <Slider id="lab-heat" icon="heat" label={A.ctrlHeat} value={controls.heatMwh} max={heatMax} step={niceStep(heatMax)} display={controls.heatMwh > 0 ? mwh(controls.heatMwh) : "0"} onChange={(v) => setControls((c) => ({ ...c, heatMwh: v }))} />}
              {show.cosub && <Slider id="lab-cosub" icon="leaf" label={A.ctrlCosub} value={controls.cosubT} max={cosubMax} step={niceStep(cosubMax)} display={controls.cosubT > 0 ? tonnes(controls.cosubT) : "0"} onChange={(v) => setControls((c) => ({ ...c, cosubT: v }))} />}
              {show.cosub && controls.cosubT > 0 && <Slider id="lab-fee" icon="scale" label={A.ctrlFee} value={controls.feeLocal} max={feeMax} step={niceStep(feeMax, 80)} display={`${price(controls.feeLocal)}/${L.units.t}`} onChange={(v) => setControls((c) => ({ ...c, feeLocal: v }))} />}
              {show.cluster && <Slider id="lab-cluster" icon="route" label={A.ctrlCluster} value={controls.clusterPct} max={200} step={5} display={controls.clusterPct > 0 ? `+${F.pct(controls.clusterPct / 100)}` : "0"} onChange={(v) => setControls((c) => ({ ...c, clusterPct: v }))} />}
              {show.debt && controls.debtPct !== null && <Slider id="lab-debt" icon="chart" label={A.ctrlDebt} value={controls.debtPct} max={90} step={5} display={F.pct(controls.debtPct / 100)} onChange={(v) => setControls((c) => ({ ...c, debtPct: v }))} />}
            </div>
            <div className="bg-surface p-5 md:p-6" aria-live="polite" aria-busy={pending}>
              <div className="eyebrow text-muted">{A.thisScenario}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2"><VerdictPill id={b.verdict} label={L.verdict[b.verdict]} size="md" /><span aria-hidden className="text-muted">→</span><span key={o.verdict} className="tick-in"><VerdictPill id={o.verdict} label={L.verdict[o.verdict]} size="md" /></span></div>
              <div className={`mt-4 rounded-xl bg-surface2 p-3 transition-opacity duration-200 ${pending ? "opacity-60" : ""}`}>
                <div aria-hidden className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{R.colRange}</div>
                <DecisionRange values={o.npvEur} labels={npvLabels(o)} names={names} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {([
                  [R.npv, F.eur(o.npvEur[1]), scenario.empty ? null : signedEur(F, dNpv), dNpv >= 0],
                  [R.payback, F.years(o.paybackYears), scenario.empty ? null : `${F.years(b.paybackYears)} → ${F.years(o.paybackYears)}`, (o.paybackYears ?? Infinity) <= (b.paybackYears ?? Infinity)],
                  [R.capex, F.eur(o.capexEur), scenario.empty || Math.abs(dCapex) < 1 ? null : signedEur(F, dCapex), dCapex <= 0],
                  [R.route, L.route[o.route], o.route !== b.route ? L.route[b.route] : null, true],
                ] as [string, string, string | null, boolean][]).map(([label, value, note, good]) => (
                  <div key={label} className="rounded-xl border border-line p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
                    <dd key={value} className="num tick-in mt-1 text-base font-bold leading-tight">{value}</dd>
                    {note && <dd className={`num mt-0.5 text-xs font-semibold ${good ? "text-good" : "text-bad"}`}>{note}</dd>}
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost !py-2.5" disabled={!canSave} onClick={save}>{A.save}</button>
                <button type="button" className="btn btn-primary !py-2.5" disabled={scenario.empty || pending} onClick={() => apply(scenario.input, "lab")}>{R.apply}</button>
              </div>
              <p className="mt-2 text-xs text-muted">{A.applyNote}</p>
            </div>
          </div>

          {saved.length > 0 && (
            <div className="border-t border-line bg-surface p-5 md:p-6">
              <h4 className="font-semibold">{A.compareTitle}</h4>
              <div className="mt-3 overflow-x-auto" tabIndex={0}>
                <table className="num w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th className="p-2.5"><span className="sr-only">{A.compareTitle}</span></th>
                      <th className="p-2.5">{A.yourPlan}</th>
                      {saved.map((s) => <th key={s.n} className="p-2.5">{f(A.scenarioN, { n: s.n })}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      [R.verdict, (x: ScenarioOutcome) => <VerdictPill id={x.verdict} label={L.verdict[x.verdict]} />],
                      [R.npv, (x: ScenarioOutcome) => <span className="font-semibold">{F.eur(x.npvEur[1])}</span>],
                      [R.colRange, (x: ScenarioOutcome) => <div className="w-36"><DecisionRange values={x.npvEur} compact /><div className="mt-1 text-xs text-muted">{F.eur(Math.min(x.npvEur[0], x.npvEur[2]))} … {F.eur(Math.max(x.npvEur[0], x.npvEur[2]))}</div></div>],
                      [R.payback, (x: ScenarioOutcome) => F.years(x.paybackYears)],
                      [R.capex, (x: ScenarioOutcome) => F.eur(x.capexEur)],
                      [R.route, (x: ScenarioOutcome) => L.route[x.route]],
                    ] as [string, (x: ScenarioOutcome) => React.ReactNode][]).map(([label, cell]) => (
                      <tr key={label} className="border-t border-line align-top">
                        <th scope="row" className="p-2.5 text-left font-sans text-xs font-semibold text-ink2">{label}</th>
                        <td className="p-2.5">{cell(b)}</td>
                        {saved.map((s) => <td key={s.n} className="p-2.5">{cell(s.outcome)}</td>)}
                      </tr>
                    ))}
                    <tr className="border-t border-line align-top">
                      <th scope="row" className="p-2.5 text-left font-sans text-xs font-semibold text-ink2">{A.changes}</th>
                      <td className="p-2.5 text-muted">—</td>
                      {saved.map((s) => <td key={s.n} className="p-2.5 font-sans text-xs text-ink2"><ul className="space-y-0.5">{changeWords(s.controls).map((x) => <li key={x}>{x}</li>)}</ul></td>)}
                    </tr>
                    <tr className="border-t border-line">
                      <td className="p-2.5" />
                      <td className="p-2.5" />
                      {saved.map((s) => (
                        <td key={s.n} className="p-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => apply(s.input, "compare")}>{R.apply}</button>
                            <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setSaved((list) => list.filter((x) => x.n !== s.n))}>{d.calc.remove}</button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 border-t border-line bg-surface2/60 px-5 py-4 text-sm text-ink2 md:px-6">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-brand" />
            <p>{A.locked} <a href="#offer" className="font-semibold text-brand underline-offset-4 hover:underline">{A.compare}</a></p>
          </div>
        </div>
      )}

      {(show.cosub || show.cluster || show.heat) && <p className="mt-3 text-xs text-muted">{f(A.assumptions, { km1: `${F.n0(ADVICE_ASSUMPTIONS.cosubKm.value)} ${L.units.km}`, fee: price(ctx.gateFeeLocal), km2: `${F.n0(ADVICE_ASSUMPTIONS.clusterKm.value)} ${L.units.km}`, price: price(ctx.heatPriceLocal) })}</p>}
    </section>
  );
}

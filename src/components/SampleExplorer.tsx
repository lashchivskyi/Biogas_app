"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RouteId, VerdictId } from "@/core";
import { INTL_TAG, type Locale } from "@/i18n/config";
import { CountryFlag } from "./CountryFlag";
import { DisplayMoney } from "./DisplayMoney";
import { usePreferences } from "./LocaleProvider";
import { DecisionRange } from "./Ranges";
import { SvgLabel } from "./SvgLabel";
import { Icon } from "./brand/Icon";

export interface SampleCardData {
  id: string;
  href: string;
  title: string;
  countryCode: string;
  country: string;
  business: string;
  group: string;
  plantClass: string;
  feedstocks: string;
  verdict: VerdictId;
  route: RouteId;
  routeValue: string;
  economics: boolean;
  /** Process inlets without budgets: what is missing, instead of money. */
  missing?: string;
  capexEur: number;
  paybackYears: number | null;
  npv: [number, number, number];
  capexText: string;
  paybackText: string;
  npvText: string;
}

export interface SampleExplorerText {
  all: string;
  mapTitle: string;
  mapSub: string;
  investment: string;
  payback: string;
  never: string;
  open: string;
  route: string;
  verify: string;
  verdicts: Record<VerdictId, string>;
  routes: Record<RouteId, string>;
  groups: Record<string, string>;
}

/** Verdict = status: validated palette (green / amber / red; amber below 3:1 → always with a label and a shape). */
const STATUS: Record<VerdictId, { color: string; pill: string }> = {
  STRONG_CANDIDATE: { color: "#0e7a55", pill: "bg-brandsoft text-brandink" },
  POSSIBLE_WITH_CONDITIONS: { color: "#c98a0b", pill: "bg-amber-50 text-amber-900" },
  WEAK_ECONOMICS: { color: "#c0392b", pill: "bg-red-50 text-red-900" },
  NOT_RECOMMENDED_AT_SCALE: { color: "#c0392b", pill: "bg-red-100 text-red-950" },
  INSUFFICIENT_DATA: { color: "#71717a", pill: "bg-zinc-100 text-zinc-800" },
};
const ORDER: VerdictId[] = ["STRONG_CANDIDATE", "POSSIBLE_WITH_CONDITIONS", "WEAK_ECONOMICS", "NOT_RECOMMENDED_AT_SCALE", "INSUFFICIENT_DATA"];

/** Secondary encoding, so the verdict never rests on colour alone: circle, diamond, square, hollow square. */
function Mark({ verdict, x, y, r = 5.5 }: { verdict: VerdictId; x: number; y: number; r?: number }) {
  const c = STATUS[verdict].color;
  if (verdict === "POSSIBLE_WITH_CONDITIONS") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={1.5} transform={`rotate(45 ${x} ${y})`} fill={c} stroke="var(--surface)" strokeWidth={2} />;
  if (verdict === "WEAK_ECONOMICS") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={1.5} fill={c} stroke="var(--surface)" strokeWidth={2} />;
  if (verdict === "NOT_RECOMMENDED_AT_SCALE") return <rect x={x - r + 1} y={y - r + 1} width={r * 2 - 2} height={r * 2 - 2} rx={1.5} fill="var(--surface)" stroke={c} strokeWidth={2.5} />;
  return <circle cx={x} cy={y} r={r} fill={c} stroke="var(--surface)" strokeWidth={2} />;
}

function LegendMark({ verdict }: { verdict: VerdictId }) {
  return <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" className="shrink-0"><Mark verdict={verdict} x={7} y={7} r={4.5} /></svg>;
}

const subscribe = () => () => {};

export function SampleExplorer({ cards, t, locale }: { cards: SampleCardData[]; t: SampleExplorerText; locale: Locale }) {
  const [verdict, setVerdict] = useState<VerdictId | "all">("all");
  const [group, setGroup] = useState<string>("all");
  const [route, setRoute] = useState<RouteId | "all">("all");
  const [hover, setHover] = useState<string>();
  // The map is drawn in real pixels of its box, so axis text stays legible on a phone instead of shrinking with a viewBox.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const { currency, usd } = usePreferences();
  const shown = hydrated ? currency : "EUR";
  const rate = shown === "USD" ? usd.value : 1;

  const match = (c: SampleCardData) => (verdict === "all" || c.verdict === verdict) && (group === "all" || c.group === group) && (route === "all" || c.route === route);
  const visible = cards.filter(match);
  const count = (pred: (c: SampleCardData) => boolean) => cards.filter(pred).length;
  const verdicts = ORDER.filter((v) => cards.some((c) => c.verdict === v));
  const groups = [...new Set(cards.map((c) => c.group))];
  const routes = (["chp", "boiler", "biomethane"] as RouteId[]).filter((r) => cards.some((c) => c.economics && c.route === r));

  // ---------- Map: investment (log) × payback, "no payback" in a band on top ----------
  const H = W < 520 ? 300 : 340, pl = 34, pr = 12, pt = 34, pb = 30, band = 22;
  const plotted = cards.filter((c) => c.economics && c.capexEur > 0);
  const xs = plotted.map((c) => Math.log10(c.capexEur));
  const x0 = Math.floor(Math.min(...xs, 5) * 2) / 2, x1 = Math.ceil(Math.max(...xs, 6) * 2) / 2;
  const finite = plotted.map((c) => c.paybackYears).filter((v): v is number => v !== null && v <= 25);
  const yMax = Math.min(25, Math.max(10, Math.ceil(Math.max(...finite, 0) / 5) * 5));
  const sx = (c: SampleCardData) => pl + ((Math.log10(c.capexEur) - x0) / (x1 - x0)) * (W - pl - pr);
  // Faster payback is lower on the chart (0 at the baseline); no payback within the horizon sits in the band on top.
  const py = (v: number) => H - pb - (v / yMax) * (H - pt - pb - 8);
  const sy = (c: SampleCardData) => (c.paybackYears === null || c.paybackYears > yMax ? pt - band / 2 - 2 : py(c.paybackYears));
  const yTicks = Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5);
  const xTicks = Array.from({ length: Math.floor(x1 - x0) + 1 }, (_, i) => Math.ceil(x0) + i).filter((p) => p <= x1);
  // Ticks are drawn after hydration only: Node and browser CLDR can disagree on compact suffixes (see DisplayMoney).
  const moneyTick = useMemo(() => new Intl.NumberFormat(INTL_TAG[locale], { style: "currency", currency: shown, notation: "compact", maximumFractionDigits: 0 }), [locale, shown]);
  const tip = plotted.find((c) => c.id === hover);

  const chip = (active: boolean) => `inline-flex shrink-0 items-center whitespace-nowrap gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink2 hover:border-brand"}`;

  return (
    <div>
      {/* ---------- One filter row: it scopes the map and the cards together ---------- */}
      <div className="flex flex-col gap-3">
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t.mapTitle}>
          <button type="button" aria-pressed={verdict === "all"} onClick={() => setVerdict("all")} className={chip(verdict === "all")}>{t.all} <span className="num opacity-70">{cards.length}</span></button>
          {verdicts.map((v) => <button key={v} type="button" aria-pressed={verdict === v} onClick={() => setVerdict(v)} className={chip(verdict === v)}><LegendMark verdict={v} />{t.verdicts[v]} <span className="num opacity-70">{count((c) => c.verdict === v)}</span></button>)}
        </div>
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" aria-pressed={group === "all"} onClick={() => setGroup("all")} className={chip(group === "all")}>{t.all}</button>
          {groups.map((g) => <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={chip(group === g)}>{t.groups[g] ?? g}</button>)}
          <span aria-hidden className="mx-1 hidden w-px self-stretch bg-line sm:block" />
          {routes.map((r) => <button key={r} type="button" aria-pressed={route === r} onClick={() => setRoute(route === r ? "all" : r)} className={chip(route === r)}>{t.routes[r]}</button>)}
        </div>
      </div>

      {plotted.length > 1 && (
        <figure className="card mt-6 p-4 md:p-6">
          <figcaption>
            <div className="font-bold">{t.mapTitle}</div>
            <p className="mt-1 text-sm text-muted">{t.mapSub}</p>
          </figcaption>
          <div ref={box} className="relative mt-4">
            <div className="mb-1 text-xs font-semibold text-muted">{t.payback}</div>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="group" aria-label={t.mapTitle}>
              <rect x={pl} y={pt - band - 2} width={W - pl - pr} height={band} rx={6} fill="var(--surface-2)" />
              <SvgLabel text={t.never} x={W - pr - 10} y={pt - band / 2 - 2} width={220} size={11} anchor="end" fill="var(--muted)" />
              {yTicks.map((v) => {
                const y = py(v);
                return <g key={v}><line x1={pl} x2={W - pr} y1={y} y2={y} stroke="var(--line)" /><text x={pl - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--muted)" className="num">{v}</text></g>;
              })}
              {xTicks.map((p) => {
                const x = pl + ((p - x0) / (x1 - x0)) * (W - pl - pr);
                return <g key={p}><line x1={x} x2={x} y1={pt + 8} y2={H - pb} stroke="var(--line)" /><text x={x} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)" className="num">{hydrated ? moneyTick.format(10 ** p * rate) : ""}</text></g>;
              })}
              {plotted.map((c) => {
                const on = match(c);
                const x = sx(c), y = sy(c);
                return (
                  <a key={c.id} href={c.href} aria-label={`${c.title} · ${t.verdicts[c.verdict]}`} onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(undefined)} onFocus={() => setHover(c.id)} onBlur={() => setHover(undefined)} style={{ opacity: on ? 1 : 0.15, transition: "opacity .25s" }} tabIndex={on ? 0 : -1}>
                    <circle cx={x} cy={y} r={13} fill="transparent" />
                    {hover === c.id && <circle cx={x} cy={y} r={11} fill="none" stroke="var(--ink)" strokeWidth={1.5} />}
                    <Mark verdict={c.verdict} x={x} y={y} />
                  </a>
                );
              })}
            </svg>
            <div className="mt-1 text-right text-xs font-semibold text-muted">{t.investment}</div>
            {tip && (
              <div role="status" className="pointer-events-none absolute z-10 w-64 max-w-[80%] rounded-xl border border-line bg-surface p-3 text-sm shadow-xl" style={{ left: `clamp(0px, calc(${(sx(tip) / W) * 100}% - 8rem), calc(100% - 16rem))`, top: `calc(${(sy(tip) / H) * 100}% + 26px)` }}>
                <div className="font-semibold leading-snug">{tip.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><CountryFlag code={tip.countryCode} />{tip.country}</div>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold"><LegendMark verdict={tip.verdict} />{t.verdicts[tip.verdict]}</div>
                <dl className="num mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted">{t.investment}</dt><dd className="text-right font-semibold"><DisplayMoney value={tip.capexEur} initialText={tip.capexText} /></dd>
                  <dt className="text-muted">{t.payback}</dt><dd className="text-right font-semibold">{tip.paybackText}</dd>
                </dl>
              </div>
            )}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink2">
            {verdicts.filter((v) => plotted.some((c) => c.verdict === v)).map((v) => <li key={v} className="flex items-center gap-1.5"><LegendMark verdict={v} />{t.verdicts[v]}</li>)}
          </ul>
        </figure>
      )}

      {/* ---------- Cards: the table view of the same data, grouped by verdict ---------- */}
      {ORDER.map((v) => {
        const list = visible.filter((c) => c.verdict === v);
        if (!list.length) return null;
        return (
          <section key={v} id={v.toLowerCase()} aria-labelledby={`${v}-title`} className="scroll-mt-24 pt-10">
            <h2 id={`${v}-title`} className="mb-5 flex items-center gap-3 text-xl font-bold md:text-2xl"><LegendMark verdict={v} />{t.verdicts[v]} <span className="num rounded-full bg-surface2 px-2.5 py-1 text-sm text-muted">{list.length}</span></h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <Link key={c.id} href={c.href} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_18px_50px_-30px_rgba(11,23,18,0.45)]">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="flex min-w-0 items-start gap-2"><CountryFlag code={c.countryCode} /><span>{c.country} · {c.business}</span></span>
                    <span>{c.plantClass}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold leading-snug">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-ink2">{c.feedstocks}</p>
                  <span className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-bold ${STATUS[c.verdict].pill}`}>{t.verdicts[c.verdict]}</span>
                  {c.economics ? <>
                    <div className="mt-4 rounded-xl bg-surface2 px-3 pb-2.5 pt-2">
                      <div className="mb-1 flex items-baseline justify-between text-xs"><span className="font-semibold text-muted">{"NPV"}</span><span className="num font-semibold"><DisplayMoney value={c.npv[1]} initialText={c.npvText} /></span></div>
                      <DecisionRange compact values={c.npv} />
                    </div>
                    <dl className="mt-3 grid flex-1 grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-muted">{t.investment}</dt><dd className="num font-semibold"><DisplayMoney value={c.capexEur} initialText={c.capexText} /></dd></div>
                      <div><dt className="text-muted">{t.payback}</dt><dd className="num font-semibold">{c.paybackText}</dd></div>
                      <div className="col-span-2"><dt className="text-muted">{t.routes[c.route]}</dt><dd className="num font-semibold">{c.routeValue}</dd></div>
                    </dl>
                  </> : <p className="mt-4 flex-1 text-sm text-muted">{t.verify}: {c.missing}</p>}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">{t.open} <Icon name="arrow" size={15} className="transition group-hover:translate-x-0.5" /></span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

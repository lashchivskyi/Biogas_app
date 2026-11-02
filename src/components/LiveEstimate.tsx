"use client";

import Link from "next/link";
import type { Assessment, QualityFactor } from "@/core";
import { countryName, fmt as f, type Dict, type Locale } from "@/i18n";
import { processCopy } from "@/i18n/processes";
import { qualityGapCopy, qualityPanelCopy } from "@/i18n/quality";
import { workspaceCopy } from "@/i18n/workspace";
import { makeFormat, sig2 } from "@/lib/format";
import { Icon, type IconName } from "./brand/Icon";
import { CountryFlag } from "./CountryFlag";

export interface LiveExample { id: string; title: string; verdict: string; tone: "good" | "mid" | "weak"; countryCode: string }

const CONF_BAR = { LOW: "bg-red-500", MEDIUM: "bg-amber-500", HIGH: "bg-good" } as const;
const MEDIUM_FROM = 50, HIGH_FROM = 85;

/**
 * The questionnaire's running answer: the same `assess()` the result uses, shown as the process chain
 * (feedstock → biogas → energy → plant) plus the data-confidence score and the one input that raises it most.
 * Money stays in the result: before the energy step it would rest on national defaults only.
 */
export function LiveEstimate({ a, d, locale, currency, examples, onExample, samplesHref, samplesLabel }: {
  a: Assessment | null; d: Pick<Dict, "calc" | "labels" | "result" | "flow">; locale: Locale; currency: string;
  examples: LiveExample[]; onExample: (id: string) => void; samplesHref: string; samplesLabel: string;
}) {
  const W = workspaceCopy[locale];
  const R = d.result, L = d.labels;
  if (!a) {
    return (
      <div className="card p-5">
        <div className="eyebrow text-brand">{W.live}</div>
        <p className="mt-2 text-sm text-ink2">{W.liveEmpty}</p>
        <ol aria-hidden className="mt-4 space-y-3">
          {(["leaf", "drop", "bolt"] as IconName[]).map((icon) => (
            <li key={icon} className="flex items-center gap-3 opacity-50">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-line text-muted"><Icon name={icon} size={16} /></span>
              <span className="h-2.5 flex-1 rounded-full bg-surface2" />
            </li>
          ))}
        </ol>
        {examples.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="text-sm font-semibold">{d.calc.examplesTitle}</div>
            <ul className="mt-2 space-y-1.5">
              {examples.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => onExample(e.id)} className="group flex w-full items-start justify-between gap-3 rounded-xl border border-line px-3 py-2 text-left transition hover:border-brand hover:bg-brandsoft/40">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{e.title}</span>
                      <span className={`mt-0.5 flex items-center gap-1.5 text-xs font-semibold ${e.tone === "good" ? "text-good" : e.tone === "mid" ? "text-warn" : "text-muted"}`}><CountryFlag code={e.countryCode} />{countryName(e.countryCode, locale)} · {e.verdict}</span>
                    </span>
                    <Icon name="arrow" size={16} className="mt-1 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                  </button>
                </li>
              ))}
            </ul>
            <Link href={samplesHref} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">{samplesLabel} <Icon name="arrow" size={15} /></Link>
          </div>
        )}
      </div>
    );
  }

  const F = makeFormat(locale, L.units);
  const r = a.ranges, b = a.scenarios.base, route = a.bestRoute;
  const process = a.input.process ? b.process : undefined;
  const economics = a.financialsAvailable !== false;
  const steps: { icon: IconName; label: string; value: string; note?: string; color: string }[] = [
    process
      ? { icon: "factory", label: processCopy(locale).models[process.kind], value: "", color: "var(--feed)" }
      : { icon: "leaf", label: R.feedstock, value: `${F.n0(sig2(r.feedstockTonnes))} ${L.units.tYear}`, color: "var(--feed)" },
    { icon: "drop", label: R.biogas, value: `${F.range(r.biogasM3[0], r.biogasM3[2], (x) => F.compact(sig2(x)))} m³`, note: f(R.biogasNote, { v: F.n0(r.biogasM3[1] / 8000) }), color: "var(--gas)" },
    ...(economics ? [
      route === "biomethane"
        ? { icon: "flame" as IconName, label: R.energy, value: `${F.range(r.biomethaneNm3[0], r.biomethaneNm3[2], (x) => F.compact(sig2(x)))} Nm³`, note: L.route[route], color: "var(--power)" }
        : { icon: "bolt" as IconName, label: R.energy, value: `${F.range(r.electricityMwh[0], r.electricityMwh[2])} ${L.units.mwh}`, note: L.route[route], color: "var(--power)" },
      { icon: "factory" as IconName, label: R.capacity, value: `${F.range(r.kwEl[0], r.kwEl[2])} ${L.units.kwe}`, note: L.plantClass[b.plantClass], color: "var(--brand)" },
    ] : []),
  ];
  const { score, level } = a.confidence;
  const top = (a.confidence.factors ?? []).filter((x) => x.owner === "client").sort((x: QualityFactor, y: QualityFactor) => y.points - x.points)[0];
  const gaps = qualityGapCopy(locale, d, currency);
  const Q = qualityPanelCopy(locale);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <span className="eyebrow text-brand">{W.live}</span>
        <span aria-hidden className="pulse-soft h-2 w-2 rounded-full bg-signal shadow-[0_0_0_4px_color-mix(in_srgb,var(--signal)_25%,transparent)]" />
      </div>
      <ol className="px-5 py-4">
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex items-start gap-3 py-2">
            {i < steps.length - 1 && <span aria-hidden className="flow-v absolute -bottom-2 left-[17px] top-[44px] w-0.5" style={{ color: steps[i + 1].color }} />}
            <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 bg-surface" style={{ borderColor: s.color, color: s.color }}><Icon name={s.icon} size={16} strokeWidth={2} /></span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</span>
              {s.value && <span key={s.value} className="tick-in num block text-lg font-bold leading-snug">{s.value}</span>}
              {s.note && <span className="block text-xs text-muted">{s.note}</span>}
            </span>
          </li>
        ))}
      </ol>
      <div className="border-t border-line px-5 py-4">
        <div className="text-sm font-semibold">{f(R.confidence, { level: L.confidence[level], score })}</div>
        <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-valuetext={`${L.confidence[level]}, ${score}/100`} className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface2">
          <div className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${CONF_BAR[level]}`} style={{ width: `${score}%` }} />
          <div aria-hidden className="absolute inset-y-0 w-px bg-ink/30" style={{ left: `${MEDIUM_FROM}%` }} />
          <div aria-hidden className="absolute inset-y-0 w-px bg-ink/30" style={{ left: `${HIGH_FROM}%` }} />
        </div>
        {top && (
          <p className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-950">
            <span className="min-w-0"><span className="block text-[11px] font-semibold uppercase tracking-wide opacity-80">{Q.biggest}</span>{top.gap ? gaps[top.gap] : <span lang={a.lang}>{top.text}</span>}</span>
            <span className="num shrink-0 font-semibold text-good">+{top.points}</span>
          </p>
        )}
      </div>
      <p className="px-5 pb-4 text-xs text-muted">{W.liveNote}</p>
    </div>
  );
}

/** One line under the questionnaire on small screens, where the panel sits below the form. */
export function LiveStrip({ a, d, locale }: { a: Assessment | null; d: Pick<Dict, "labels" | "result">; locale: Locale }) {
  if (!a) return null;
  const F = makeFormat(locale, d.labels.units);
  const r = a.ranges;
  return (
    <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface2 px-3 py-2 text-sm lg:hidden">
      <span aria-hidden className="pulse-soft h-2 w-2 rounded-full bg-signal" />
      <span className="font-semibold">{d.result.biogas}</span>
      <span className="num">{F.range(r.biogasM3[0], r.biogasM3[2], (x) => F.compact(sig2(x)))} m³</span>
      <span className="text-muted">·</span>
      <span className="num text-ink2">{f(d.result.confidence, { level: d.labels.confidence[a.confidence.level], score: a.confidence.score })}</span>
    </p>
  );
}

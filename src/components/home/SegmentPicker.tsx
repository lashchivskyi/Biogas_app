"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "../brand/Icon";

export interface SegmentCard {
  id: string;
  slug: string;
  label: string;
  businessType: string;
  tone: "good" | "mid" | "weak";
  tendency: string;
  insight: string;
  conditions: string[];
  example: { title: string; verdict: string; payback: string; capex: string; kw: string; biogas: string };
}

const TONE = {
  good: "bg-signal/15 text-signal ring-signal/40",
  mid: "bg-amber-400/15 text-amber-300 ring-amber-300/40",
  weak: "bg-white/10 text-white/70 ring-white/25",
} as const;

export interface SegmentText {
  whatItTakes: string; modelCase: string; biogas: string; capacity: string; investment: string; payback: string; cta: string; more: string; illustrative: string; ariaLabel: string;
}

export function SegmentPicker({ segments, t, base }: { segments: SegmentCard[]; t: SegmentText; base: string }) {
  const [sel, setSel] = useState(segments[0].id);
  const baseId = useId();
  const s = segments.find((x) => x.id === sel)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div role="tablist" aria-label={t.ariaLabel} aria-orientation="vertical" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {segments.map((x) => (
          <button
            key={x.id}
            role="tab"
            id={`${baseId}-tab-${x.id}`}
            aria-selected={x.id === sel}
            aria-controls={`${baseId}-panel`}
            onClick={() => setSel(x.id)}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition ${x.id === sel ? "border-signal bg-white/10 text-white" : "border-white/10 text-white/75 hover:border-white/30 hover:text-white"}`}
          >
            <span>{x.label}</span>
            <span className={`hidden h-2.5 w-2.5 shrink-0 rounded-full lg:block ${x.tone === "good" ? "bg-signal" : x.tone === "mid" ? "bg-amber-300" : "bg-white/35"}`} aria-hidden />
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${s.id}`} className="glass p-6 sm:p-8" key={s.id}>
        <div className="rise-in">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${TONE[s.tone]}`}>{s.tendency}</span>
          <p className="mt-4 text-xl font-bold leading-snug sm:text-2xl">{s.insight}</p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/50">{t.whatItTakes}</div>
              <ul className="mt-3 space-y-2.5">
                {s.conditions.map((c) => (
                  <li key={c} className="flex gap-2.5 text-[15px] text-white/85"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-signal" />{c}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-white/50">{t.modelCase}</div>
              <div className="mt-1 text-sm text-white/70">{s.example.title}</div>
              <div className="mt-2 text-lg font-bold">{s.example.verdict}</div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-white/50">{t.biogas}</dt><dd className="num font-semibold">{s.example.biogas}</dd></div>
                <div><dt className="text-white/50">{t.capacity}</dt><dd className="num font-semibold">{s.example.kw}</dd></div>
                <div><dt className="text-white/50">{t.investment}</dt><dd className="num font-semibold">{s.example.capex}</dd></div>
                <div><dt className="text-white/50">{t.payback}</dt><dd className="num font-semibold">{s.example.payback}</dd></div>
              </dl>
              <p className="mt-3 text-[11.5px] text-white/45">{t.illustrative}</p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={`${base}/calculator?b=${s.businessType}`} className="btn btn-signal">{t.cta} <Icon name="arrow" size={18} /></Link>
            <Link href={`${base}/biogas/${s.slug}`} className="text-sm font-semibold text-white/75 underline-offset-4 hover:text-white hover:underline">{t.more}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

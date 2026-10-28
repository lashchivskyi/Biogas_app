"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Icon } from "../brand/Icon";
import { BUSINESS_TYPES, businessHref, type BusinessTypeId } from "@/core/businesses";
import { businessCopy } from "@/i18n/businesses";
import { INTL_TAG } from "@/i18n/config";
import { useLocale } from "../LocaleProvider";
import { track } from "@/lib/analytics";

export interface SegmentCard {
  id: string;
  label: string;
  group: string;
  businessType: BusinessTypeId;
  insight: string;
  conditions: string[];
  example?: { title: string; verdict: string; payback: string; capex: ReactNode; kw: string; biogas: string };
}

export interface SegmentText {
  whatItTakes: string; modelCase: string; biogas: string; capacity: string; investment: string; payback: string; cta: string; more: string; illustrative: string; ariaLabel: string;
}

export function SegmentPicker({ segments, t, base }: { segments: SegmentCard[]; t: SegmentText; base: string }) {
  const [sel, setSel] = useState(segments[0].id);
  const locale = useLocale();
  const H = businessCopy(locale);
  const baseId = useId();
  const s = segments.find((x) => x.id === sel)!;
  const definition = BUSINESS_TYPES[s.businessType];
  const number = (v: number) => new Intl.NumberFormat(INTL_TAG[locale]).format(v);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div role="tablist" aria-label={t.ariaLabel} className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[38rem] lg:flex-col lg:overflow-y-auto lg:pr-2">
        {segments.map((x) => (
          <button
            key={x.id}
            role="tab"
            id={`${baseId}-tab-${x.id}`}
            aria-selected={x.id === sel}
            aria-controls={`${baseId}-panel`}
            tabIndex={x.id === sel ? 0 : -1}
            onClick={() => { setSel(x.id); const business = BUSINESS_TYPES[x.businessType]; track("business_selected", { source: "home", business_id: x.businessType, business_group: business.audience, business_role: business.role }); }}
            onKeyDown={(event) => {
              const index = segments.findIndex((item) => item.id === x.id);
              const next = event.key === "Home" ? 0 : event.key === "End" ? segments.length - 1 : ["ArrowRight", "ArrowDown"].includes(event.key) ? (index + 1) % segments.length : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (index + segments.length - 1) % segments.length : undefined;
              if (next === undefined) return;
              event.preventDefault();
              setSel(segments[next].id);
              document.getElementById(`${baseId}-tab-${segments[next].id}`)?.focus();
            }}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition ${x.id === sel ? "border-signal bg-white/10 text-white" : "border-white/10 text-white/75 hover:border-white/30 hover:text-white"}`}
          >
            <span><span className="block text-[11px] font-normal opacity-60">{x.group}</span>{x.label}</span>
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${s.id}`} className="glass p-6 sm:p-8" key={s.id}>
        <div className="rise-in">
          {definition.scope !== "screening" && <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{definition.scope === "outside_model" ? H.outside : H.specialist}</span>}
          <h3 className="mt-4 text-xl font-bold leading-snug sm:text-2xl">{s.label}</h3>
          <p className="mt-3 text-white/80">{s.insight}</p>
          {definition.scaleTonnesYear && <p className="mt-3 text-sm text-white/70">{H.scale}: {definition.scaleTonnesYear.map(number).join("–")} t/a</p>}
          {definition.scope === "outside_model" && <p className="mt-4 text-sm text-white/75">{H.scopeNote}</p>}

          {definition.scope !== "outside_model" && <div className={`mt-6 grid gap-6 ${s.example ? "md:grid-cols-2" : ""}`}>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/50">{t.whatItTakes}</div>
              <ul className="mt-3 space-y-2.5">
                {s.conditions.map((c) => (
                  <li key={c} className="flex gap-2.5 text-[15px] text-white/85"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-signal" />{c}</li>
                ))}
              </ul>
            </div>
            {s.example && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
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
            </div>}
          </div>}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {definition.scope !== "outside_model" && <Link href={`${base}/calculator?b=${s.businessType}`} className="btn btn-signal">{t.cta} <Icon name="arrow" size={18} /></Link>}
            <Link href={businessHref(s.businessType, base)} className="text-sm font-semibold text-white/75 underline-offset-4 hover:text-white hover:underline">{t.more}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

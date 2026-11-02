"use client";

import { useMemo } from "react";
import { assess } from "@/core";
import type { Assessment, CountryAdapter, ProjectInput, VerdictId } from "@/core";
import { fmt, type Dict, type Locale } from "@/i18n";
import { makeFormat } from "@/lib/format";
import { LEVERS } from "@/lib/whatif";
import { usePreferences } from "./LocaleProvider";
import { Icon, type IconName } from "./brand/Icon";

const LEVER_ICON: Record<string, IconName> = { cosubstrate: "leaf", heat: "heat", cluster: "route" };
const VERDICT_PILL: Record<VerdictId, string> = {
  STRONG_CANDIDATE: "bg-brandsoft text-brandink", POSSIBLE_WITH_CONDITIONS: "bg-amber-50 text-amber-900", WEAK_ECONOMICS: "bg-red-50 text-red-900",
  NOT_RECOMMENDED_AT_SCALE: "bg-red-100 text-red-950", INSUFFICIENT_DATA: "bg-zinc-100 text-zinc-800",
};

/** Recomputes the verdict for each lever so the user sees what would actually change it. */
export function WhatIf({ input, base, country, locale, d, onApply }: { input: ProjectInput; base: Assessment; country: CountryAdapter; locale: Locale; d: Pick<Dict, "result" | "labels">; onApply: (next: ProjectInput) => void }) {
  const preferences = usePreferences();
  const F = makeFormat(locale, d.labels.units, { currency: preferences.currency, rate: preferences.currency === "USD" ? preferences.usd.value : 1 });
  const fx = base.fx;
  const asOfDate = base.dataAudit?.asOfDate;
  const rows = useMemo(() => LEVERS.filter(l => !input.process || l.id === "heat").map((l) => { const next = l.apply(input, fx); return { lever: l, next, a: assess(next, country, { asOfDate, uncertainty: false }) }; }), [input, country, fx, asOfDate]);
  const basePb = base.scenarios.base.fin.simplePaybackYears;
  return (
    <section className="no-print mt-12" aria-labelledby="whatif-h">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-2 h-5 w-1 shrink-0 rounded-full bg-brand" />
        <div>
          <h2 id="whatif-h" className="text-xl font-bold tracking-tight md:text-2xl">{d.result.whatIfTitle}</h2>
          <p className="mt-1 text-sm text-muted">{d.result.whatIfSub}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rows.map(({ lever, next, a }) => {
          const pb = a.scenarios.base.fin.simplePaybackYears;
          const better = pb !== null && (basePb === null || pb < basePb);
          const L = d.result.levers[lever.id];
          return (
            <div key={lever.id} className="card flex flex-col p-5 transition hover:border-brand/60">
              <div className="flex items-center gap-2.5 font-bold"><span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandsoft text-brand"><Icon name={LEVER_ICON[lever.id] ?? "chart"} size={17} /></span>{L.title}</div>
              <p className="mt-2 flex-1 text-sm text-ink2">{L.text}</p>
              <div className="mt-4 rounded-xl bg-surface2 p-3 text-sm">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${VERDICT_PILL[a.verdict.id]}`}>{d.labels.verdict[a.verdict.id]}</span>
                <div className={`num mt-2 ${better ? "font-semibold text-good" : "text-ink2"}`}>{fmt(d.result.paybackArrow, { a: F.years(basePb), b: F.years(pb) })}</div>
                <div className="num text-xs text-muted">NPV {F.eur(a.scenarios.base.fin.npvEur)}</div>
              </div>
              <button type="button" className="btn btn-ghost mt-3 !py-2 text-sm" onClick={() => onApply(next)}>{d.result.apply}</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

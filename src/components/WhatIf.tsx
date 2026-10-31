"use client";

import { useMemo } from "react";
import { assess } from "@/core";
import type { Assessment, CountryAdapter, ProjectInput } from "@/core";
import { fmt, type Dict, type Locale } from "@/i18n";
import { makeFormat } from "@/lib/format";
import { LEVERS } from "@/lib/whatif";
import { usePreferences } from "./LocaleProvider";

/** Recomputes the verdict for each lever so the user sees what would actually change it. */
export function WhatIf({ input, base, country, locale, d, onApply }: { input: ProjectInput; base: Assessment; country: CountryAdapter; locale: Locale; d: Pick<Dict, "result" | "labels">; onApply: (next: ProjectInput) => void }) {
  const preferences = usePreferences();
  const F = makeFormat(locale, d.labels.units, { currency: preferences.currency, rate: preferences.currency === "USD" ? preferences.usd.value : 1 });
  const fx = base.fx;
  const asOfDate = base.dataAudit?.asOfDate;
  const rows = useMemo(() => LEVERS.filter(l => !input.process || l.id === "heat").map((l) => { const next = l.apply(input, fx); return { lever: l, next, a: assess(next, country, { asOfDate, uncertainty: false }) }; }), [input, country, fx, asOfDate]);
  const basePb = base.scenarios.base.fin.simplePaybackYears;
  return (
    <section className="no-print mt-10" aria-labelledby="whatif-h">
      <h2 id="whatif-h" className="text-xl font-bold tracking-tight md:text-2xl">{d.result.whatIfTitle}</h2>
      <p className="mt-1 text-sm text-muted">{d.result.whatIfSub}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rows.map(({ lever, next, a }) => {
          const pb = a.scenarios.base.fin.simplePaybackYears;
          const better = pb !== null && (basePb === null || pb < basePb);
          const L = d.result.levers[lever.id];
          return (
            <div key={lever.id} className="card flex flex-col p-5">
              <div className="font-bold">{L.title}</div>
              <p className="mt-1 flex-1 text-sm text-ink2">{L.text}</p>
              <div className="mt-4 rounded-xl bg-surface2 p-3 text-sm">
                <div className="font-semibold">{d.labels.verdict[a.verdict.id]}</div>
                <div className={`num mt-1 ${better ? "font-semibold text-good" : "text-ink2"}`}>{fmt(d.result.paybackArrow, { a: F.years(basePb), b: F.years(pb) })}</div>
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

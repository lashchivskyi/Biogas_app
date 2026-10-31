import Link from "next/link";
import type { ReactNode } from "react";
import type { Assessment } from "@/core";
import { countryName, fmt as f, type Dict, type Locale } from "@/i18n";
import { offerCopy } from "@/i18n/offer";

/**
 * Free → paid boundary. The free result already answers "should I continue?"; this lists what each plan adds for
 * THIS project (counts from the assessment, not a generic blurb), and says so honestly when the answer is a clear no.
 */
export function PaidTeaser({ a, R, locale, unlockSlot, samplesHref }: { a: Assessment; R: Dict["result"]; locale: Locale; unlockSlot?: ReactNode; samplesHref?: string }) {
  const O = offerCopy[locale];
  const b = a.scenarios.base;
  const country = countryName(a.countryCode, locale);
  const lines = b.capex.lines.length + b.opexRev.opex.length + b.opexRev.revenue.length;
  const standard = [
    a.measureFirst?.length ? f(O.tChecks, { n: a.measureFirst.length }) : null,
    f(O.tLines, { n: lines }),
    a.input.process ? null : O.tMonthly,
    a.scale?.length ? f(O.tSizes, { n: a.scale.length }) : null,
    a.monteCarlo ? f(O.tMc, { n: a.monteCarlo.n }) : null,
    f(O.tRegister, { n: a.regulatory.items.length }),
    O.tExcel,
  ].filter((x): x is string => !!x);
  const extended = [
    O.tScen,
    f(O.tStress, { n: a.sensitivity.length }),
    a.supportCases.length ? f(O.tSupport, { n: a.supportCases.length, country }) : f(O.tSupportNone, { country }),
  ];
  const insufficient = a.verdict.id === "INSUFFICIENT_DATA";
  const list = (items: string[]) => <ul className="mt-2 space-y-1.5 text-sm text-ink2">{items.map((x) => <li key={x} className="flex gap-2"><span aria-hidden className="text-brand">✓</span><span>{x}</span></li>)}</ul>;
  return (
    <section className="no-print mt-10 rounded-3xl border border-line bg-surface p-6 md:p-8" aria-labelledby="locked-h">
      <h2 id="locked-h" className="font-display text-2xl font-semibold">{R.lockedTitle}</h2>
      <p className="mt-2 text-ink2">{R.lockedText}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl bg-surface2 p-4"><h3 className="font-bold">{O.teaserStandard}</h3>{list(standard)}</div>
        <div className="rounded-2xl bg-surface2 p-4"><h3 className="font-bold">{O.teaserExtended}</h3>{list(extended)}</div>
      </div>
      {a.robustness === "clear_no" && !insufficient && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{O.tClearNo}</p>}
      {insufficient
        ? <p role="status" className="mt-5 rounded-xl bg-surface2 p-3 text-sm font-semibold">{O.insufficient}</p>
        : <div className="mt-5 flex flex-wrap gap-3">{unlockSlot}{samplesHref && <Link href={samplesHref} className="btn btn-ghost">{R.seeSample}</Link>}</div>}
    </section>
  );
}

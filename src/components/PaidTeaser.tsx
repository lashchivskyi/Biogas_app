import Link from "next/link";
import type { ReactNode } from "react";
import type { Assessment } from "@/core";
import { countryName, fmt as f, type Dict, type Locale } from "@/i18n";
import { offerCopy } from "@/i18n/offer";
import { Icon } from "./brand/Icon";

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
    a.measureFirst?.length ? f(O.tChecks, { n: a.measureFirst.length }, locale) : null,
    f(O.tLines, { n: lines }, locale),
    a.input.process ? null : O.tMonthly,
    a.scale?.length ? f(O.tSizes, { n: a.scale.length }, locale) : null,
    a.monteCarlo ? f(O.tMc, { n: a.monteCarlo.n }, locale) : null,
    f(O.tRegister, { n: a.regulatory.items.length }, locale),
    O.tExcel,
  ].filter((x): x is string => !!x);
  const extended = [
    O.tScen,
    f(O.tStress, { n: a.sensitivity.length }, locale),
    a.supportCases.length ? f(O.tSupport, { n: a.supportCases.length, country }, locale) : f(O.tSupportNone, { country }, locale),
  ];
  const insufficient = a.verdict.id === "INSUFFICIENT_DATA";
  const list = (items: string[]) => <ul className="mt-3 space-y-2 text-sm text-ink2">{items.map((x) => <li key={x} className="flex gap-2.5"><Icon name="check" size={17} className="mt-0.5 shrink-0 text-brand" strokeWidth={2.2} /><span>{x}</span></li>)}</ul>;
  return (
    <section className="no-print mt-12 overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_70px_-40px_rgba(11,23,18,0.45)]" aria-labelledby="locked-h">
      <div className="hero relative p-6 md:p-8">
        <div className="hero-grid absolute inset-0" aria-hidden />
        <div className="relative max-w-3xl">
          <h2 id="locked-h" className="font-display text-2xl font-semibold md:text-3xl">{R.lockedTitle}</h2>
          <p className="mt-2 text-white/75">{R.lockedText}</p>
          {insufficient
            ? <p role="status" className="mt-5 rounded-xl bg-white/10 p-3 text-sm font-semibold">{O.insufficient}</p>
            : <div className="mt-6 flex flex-wrap gap-3">{unlockSlot}{samplesHref && <Link href={samplesHref} className="btn btn-ghost-dark">{R.seeSample}</Link>}</div>}
        </div>
      </div>
      <div className="grid gap-px bg-line md:grid-cols-2">
        <div className="bg-surface p-5 md:p-6"><h3 className="flex items-center gap-2 font-bold"><Icon name="doc" size={18} className="text-brand" />{O.teaserStandard}</h3>{list(standard)}</div>
        <div className="bg-surface p-5 md:p-6"><h3 className="flex items-center gap-2 font-bold"><Icon name="chart" size={18} className="text-brand" />{O.teaserExtended}</h3>{list(extended)}</div>
      </div>
      {a.robustness === "clear_no" && !insufficient && <p className="border-t border-line bg-amber-50 p-4 text-sm text-amber-950 md:px-6">{O.tClearNo}</p>}
    </section>
  );
}

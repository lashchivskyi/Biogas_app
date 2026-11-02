import { SAMPLE_CASES } from "@/content/sample-cases";
import { EXAMPLES } from "@/core/examples";
import { INTL_TAG, type Dict, type Locale } from "@/i18n";
import { sampleNotes, sampleReferenceCopy } from "@/i18n/samples";
import { Icon } from "./brand/Icon";

/** The inputs side of a sample: the business situation, what was entered, and what a real client would verify first. */
export function SampleCaseBrief({ id, locale, d }: { id: string; locale: Locale; d: Dict }) {
  const sample = SAMPLE_CASES[id];
  const example = EXAMPLES.find((e) => e.id === id);
  if (!sample || !example) return null;
  const notes = sampleNotes(example, locale, d);
  // Retain the detailed authored case context and checks where they already exist.
  // Operating figures always come from input, so narrative copies cannot become stale.
  const authored = locale === "en" || locale === "uk" ? sample.notes[locale] : undefined;
  const S = d.samples;
  const reference = example.reference, refCopy = sampleReferenceCopy(locale);
  const number = new Intl.NumberFormat(INTL_TAG[locale], { maximumSignificantDigits: 8 }).format;
  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-line bg-surface" aria-labelledby="case-brief">
      <div className="grid gap-px bg-line lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="bg-surface p-5 md:p-6">
          <h2 id="case-brief" className="text-xl font-bold">{S.caseTitle}</h2>
          <p className="mt-1 text-xs text-muted">{S.modelledNote}</p>
          <p lang={locale} className="mt-3 leading-relaxed text-ink2">{authored?.context ?? notes.context}</p>
          <h3 className="mt-5 flex items-center gap-2 font-semibold"><Icon name="leaf" size={17} className="text-brand" />{S.operations}</h3>
          <ul lang={locale} className="mt-2 space-y-2 text-sm leading-relaxed text-ink2">{notes.operations.map((note) => <li key={note} className="flex gap-2.5"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" /><span>{note}</span></li>)}</ul>
        </div>
        <div className="bg-amber-50/60 p-5 md:p-6">
          <h3 className="flex items-center gap-2 font-semibold text-amber-950"><Icon name="shield" size={17} />{S.verify}</h3>
          <p lang={locale} className="mt-2 text-sm leading-relaxed text-amber-950/90">{authored?.verify ?? notes.verify}</p>
        </div>
      </div>
      {reference && <details className="border-t border-line p-5 md:px-6" open>
        <summary className="cursor-pointer font-semibold">{refCopy.title}: {reference.title}</summary>
        <p className="mt-2 text-xs text-muted">{reference.geography} · {reference.period} · {refCopy.checked}: {reference.checkedOn}</p>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[340px] text-left text-sm"><thead><tr>{[d.method.param,d.method.value,d.method.type].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{reference.observations.map((row,i) => <tr className="border-t border-line" key={i}><th className="p-2">{row.label}</th><td className="num p-2">{row.qualifier === "capacity" && "≤ "}{number(row.value)} {row.unit}</td><td className="p-2">{refCopy[row.qualifier]}</td></tr>)}</tbody></table></div>
        <a href={reference.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand underline">{d.method.source}</a>
      </details>}
      <div className="border-t border-line px-5 py-3 text-xs text-muted md:px-6">
        <h3 className="font-semibold">{S.sources}</h3>
        <ul className="mt-1 space-y-1">{sample.sources.map((source) => <li key={source.url}><a href={source.url} lang="en" target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">{source.title}</a></li>)}</ul>
      </div>
    </section>
  );
}

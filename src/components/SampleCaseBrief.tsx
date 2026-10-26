import { SAMPLE_CASES } from "@/content/sample-cases";
import { coreLang, type Dict, type Locale } from "@/i18n";

export function SampleCaseBrief({ id, locale, d }: { id: string; locale: Locale; d: Dict }) {
  const sample = SAMPLE_CASES[id];
  if (!sample) return null;
  const lang = coreLang(locale);
  const notes = sample.notes[lang];
  const S = d.samples;
  return (
    <section className="mb-8 rounded-2xl border border-line bg-surface p-5 md:p-6" aria-labelledby="case-brief">
      <h2 id="case-brief" className="text-xl font-bold">{S.caseTitle}</h2>
      <p className="mt-2 text-xs text-muted">{S.modelledNote}</p>
      {locale !== "en" && locale !== "uk" && <p className="mt-2 text-xs text-muted">{d.common.reportLangNote}</p>}
      <p lang={lang} className="mt-3 leading-relaxed text-ink2">{notes.context}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">{S.operations}</h3>
          <ul lang={lang} className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink2">{notes.operations.map((note) => <li key={note}>{note}</li>)}</ul>
        </div>
        <div>
          <h3 className="font-semibold">{S.verify}</h3>
          <p lang={lang} className="mt-2 text-sm leading-relaxed text-ink2">{notes.verify}</p>
        </div>
      </div>
      <div className="mt-5 border-t border-line pt-3 text-xs text-muted">
        <h3 className="font-semibold">{S.sources}</h3>
        <ul className="mt-1 space-y-1">{sample.sources.map((source) => <li key={source.url}><a href={source.url} lang="en" target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">{source.title}</a></li>)}</ul>
      </div>
    </section>
  );
}

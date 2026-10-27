import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { CountryFlag } from "@/components/CountryFlag";
import { DisplayMoney } from "@/components/DisplayMoney";
import { countryName, getDictionary, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";
import { makeFormat } from "@/lib/format";
import { exampleTitle, rankedExamples } from "@/lib/examples";

export async function generateMetadata({ params }: PageProps<"/[lang]/samples">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return { title: d.samples.title, description: d.samples.lead, alternates: alternates(lang as Locale, "/samples") };
}

const TONE: Record<string, string> = { STRONG_CANDIDATE: "bg-brandsoft text-brandink", POSSIBLE_WITH_CONDITIONS: "bg-amber-50 text-amber-900", WEAK_ECONOMICS: "bg-red-50 text-red-900", NOT_RECOMMENDED_AT_SCALE: "bg-red-100 text-red-950", INSUFFICIENT_DATA: "bg-zinc-100 text-zinc-800" };

export default async function SamplesPage({ params }: PageProps<"/[lang]/samples">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const F = makeFormat(locale, d.labels.units);
  const cards = rankedExamples();
  const groups = [...new Set(cards.map(({ a }) => a.verdict.id))].map((verdict) => ({ verdict, cards: cards.filter(({ a }) => a.verdict.id === verdict) }));
  return (
    <main>
      <PageHero eyebrow={d.samples.eyebrow} title={d.samples.title} lead={d.samples.lead}>
        <Link href={`/${locale}/calculator`} className="btn btn-signal mt-7">{d.samples.run}</Link>
      </PageHero>
      <div className="container-x py-10 md:py-14">
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{d.samples.modelledNote}</p>
        <nav aria-label={d.samples.eyebrow} className="mt-5 flex flex-wrap gap-2">
          {groups.map(({ verdict, cards }) => <a key={verdict} href={`#${verdict.toLowerCase()}`} className={`rounded-full px-3 py-2 text-xs font-semibold ${TONE[verdict]} hover:underline focus-visible:outline-2 focus-visible:outline-brand`}>{d.labels.verdict[verdict]} <span className="num ml-1">{cards.length}</span></a>)}
        </nav>
        {groups.map(({ verdict, cards }) => <section key={verdict} id={verdict.toLowerCase()} aria-labelledby={`${verdict}-title`} className="scroll-mt-24 pt-10">
          <h2 id={`${verdict}-title`} className="mb-5 flex items-center gap-3 text-xl font-bold md:text-2xl">{d.labels.verdict[verdict]} <span className="num rounded-full bg-surface2 px-2.5 py-1 text-sm text-muted">{cards.length}</span></h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ e, a }) => (
          <Link key={e.id} href={`/${locale}/samples/${e.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-2"><CountryFlag code={e.input.countryCode} />{countryName(e.input.countryCode, locale)} · {d.labels.business[e.input.businessType].label}</span>
              <span>{d.labels.plantClass[a.scenarios.base.plantClass]}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold">{exampleTitle(e, d, locale)}</h3>
            <p className="mt-2 text-sm text-ink2">{[...new Set(a.scenarios.base.feed.lines.map((line) => d.labels.feedstock[line.typeId]))].join(" · ")}</p>
            <span className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-bold ${TONE[a.verdict.id]}`}>{d.labels.verdict[a.verdict.id]}</span>
            <dl className="mt-4 grid flex-1 grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted">{d.fit.investment}</dt><dd className="num font-semibold"><DisplayMoney value={a.ranges.capexEur[1]} initialText={F.eur(a.ranges.capexEur[1])} /></dd></div>
              <div><dt className="text-muted">{d.fit.payback}</dt><dd className="num font-semibold">{F.years(a.ranges.paybackYears[1])}</dd></div>
              <div><dt className="text-muted">{d.labels.route[a.bestRoute]}</dt><dd className="num font-semibold">{a.bestRoute === "chp"
                ? <>{F.n0(a.scenarios.base.energy.chpKwEl)} {d.labels.units.kwe}</>
                : a.bestRoute === "biomethane"
                  ? <>{F.compact(a.scenarios.base.energy.biomethaneNm3)} Nm³/{d.labels.units.years}</>
                  : <>{F.n0(a.scenarios.base.energy.heatUsefulKwh / 1000)} {d.labels.units.mwh}/{d.labels.units.years}</>}</dd></div>
              <div><dt className="text-muted">NPV</dt><dd className="num font-semibold"><DisplayMoney value={a.ranges.npvEur[1]} initialText={F.eur(a.ranges.npvEur[1])} /></dd></div>
            </dl>
            <span className="mt-4 text-sm font-semibold text-brand group-hover:underline">{d.samples.open} →</span>
          </Link>
        ))}
          </div>
        </section>)}
      </div>
    </main>
  );
}

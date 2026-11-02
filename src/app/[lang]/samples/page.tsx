import { processFieldLabels } from "@/i18n/processes";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { SampleExplorer, type SampleCardData, type SampleExplorerText } from "@/components/SampleExplorer";
import { BUSINESS_GROUPS } from "@/core/businesses";
import { BUSINESS_TYPES } from "@/core";
import { businessGroupLabel } from "@/i18n/businesses";
import { countryName, getDictionary, type Locale } from "@/i18n";
import { pageMetadata } from "@/i18n/seo";
import { seoCopy } from "@/i18n/seo-copy";
import { workspaceCopy } from "@/i18n/workspace";
import { makeFormat } from "@/lib/format";
import { exampleTitle, rankedExamples } from "@/lib/examples";

export async function generateMetadata({ params }: PageProps<"/[lang]/samples">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return pageMetadata(lang as Locale, "/samples", { title: seoCopy[lang as Locale].samples, description: d.samples.lead });
}

export default async function SamplesPage({ params }: PageProps<"/[lang]/samples">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const F = makeFormat(locale, d.labels.units);
  const W = workspaceCopy[locale];
  const cards: SampleCardData[] = rankedExamples().map(({ e, a }) => {
    const b = a.scenarios.base;
    const missing = b.process?.missingInputs?.length ? b.process.missingInputs.map((key) => processFieldLabels(locale)[key]).join(", ") : undefined;
    return {
      id: e.id,
      href: `/${locale}/samples/${e.id}`,
      title: exampleTitle(e, d, locale),
      countryCode: e.input.countryCode,
      country: countryName(e.input.countryCode, locale),
      business: d.labels.business[e.input.businessType].label,
      group: BUSINESS_TYPES[e.input.businessType].audience,
      plantClass: d.labels.plantClass[b.plantClass],
      feedstocks: [...new Set(b.feed.lines.map((line) => d.labels.feedstock[line.typeId]))].join(" · "),
      verdict: a.verdict.id,
      route: a.bestRoute,
      routeValue: a.bestRoute === "chp"
        ? `${F.n0(b.energy.chpKwEl)} ${d.labels.units.kwe}`
        : a.bestRoute === "biomethane"
          ? `${F.compact(b.energy.biomethaneNm3)} Nm³/${d.labels.units.years}`
          : `${F.n0(b.energy.heatUsefulKwh / 1000)} ${d.labels.units.mwh}/${d.labels.units.years}`,
      economics: !missing,
      missing,
      capexEur: a.ranges.capexEur[1],
      paybackYears: a.ranges.paybackYears[1],
      npv: [a.ranges.npvEur[0], a.ranges.npvEur[1], a.ranges.npvEur[2]],
      capexText: F.eur(a.ranges.capexEur[1]),
      paybackText: F.years(a.ranges.paybackYears[1]),
      npvText: F.eur(a.ranges.npvEur[1]),
    };
  });
  const t: SampleExplorerText = {
    all: W.all, mapTitle: W.mapTitle, mapSub: W.mapSub,
    investment: d.fit.investment, payback: d.result.payback, never: d.labels.units.never,
    open: d.samples.open, route: d.result.colRoute, verify: d.samples.verify,
    verdicts: d.labels.verdict, routes: d.labels.route,
    groups: Object.fromEntries(BUSINESS_GROUPS.map((g) => [g.id, businessGroupLabel(g.id, locale)])),
  };
  return (
    <main>
      <PageHero eyebrow={d.samples.eyebrow} title={d.samples.title} lead={d.samples.lead} wideLead>
        <Link href={`/${locale}/calculator`} className="btn btn-signal mt-7">{d.samples.run}</Link>
      </PageHero>
      <div className="container-x py-10 md:py-14">
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-muted">{d.samples.modelledNote}</p>
        <SampleExplorer cards={cards} t={t} locale={locale} />
      </div>
    </main>
  );
}

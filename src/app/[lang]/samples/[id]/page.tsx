import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PrintButton } from "@/components/PrintButton";
import { ExportButton } from "@/components/ExportButton";
import { decisionCopy } from "@/i18n/decision";
import { ResultView, type ResultViewProps } from "@/components/ResultView";
import { CurrencyResultView } from "@/components/CurrencyResultView";
import { SampleCaseBrief } from "@/components/SampleCaseBrief";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { countryName, getDictionary, type Locale } from "@/i18n";
import { coreLang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";
import { exampleTitle } from "@/lib/examples";

export function generateStaticParams() {
  return EXAMPLES.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/samples/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const d = await getDictionary(lang);
  const ex = EXAMPLES.find((e) => e.id === id);
  const title = ex ? exampleTitle(ex, d, lang as Locale) : id;
  return { title: `${d.report.sampleEyebrow}: ${title}${ex ? ` · ${countryName(ex.input.countryCode, lang as Locale)}` : ""}`, description: d.samples.lead, alternates: alternates(lang as Locale, `/samples/${id}`) };
}

export default async function SamplePage({ params }: PageProps<"/[lang]/samples/[id]">) {
  const { lang, id } = await params;
  const locale = lang as Locale;
  const ex = EXAMPLES.find((e) => e.id === id);
  if (!ex) notFound();
  const d = await getDictionary(locale);
  const country = getCountry(ex.input.countryCode);
  const cl = coreLang(locale);
  const a = assess(ex.input, country, { lang: cl });
  const title = exampleTitle(ex, d, lang as Locale);
  const report: ResultViewProps = { a, d, locale, currency: country.currency, countryNotes: country.approachNotes[cl], access: "full", methodologyHref: `/${locale}/methodology` };
  return (
    <main>
      <PageHero
        crumbs={[{ name: d.samples.eyebrow, href: `/${locale}/samples` }, { name: title, href: `/${locale}/samples/${id}` }]}
        eyebrow={`${d.report.sampleEyebrow} · ${countryName(ex.input.countryCode, locale)}`}
        title={title}
        lead={d.report.sampleBanner}
      />
      <div className="container-x py-8">
        <div className="no-print mb-4 flex flex-wrap justify-between gap-3">
          <Link href={`/${locale}/calculator`} className="btn btn-primary">{d.samples.run}</Link>
          <div className="flex flex-wrap gap-3">
            <ExportButton a={a} currency={country.currency} access="full" label={decisionCopy[locale].exportXlsx} />
            <PrintButton label={d.report.print} />
          </div>
        </div>
        <SampleCaseBrief id={ex.id} locale={locale} d={d} />
        <CurrencyResultView {...report} serverView={<ResultView {...report} />} />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { Calculator, type ExampleSummary } from "@/components/Calculator";
import { PageHero } from "@/components/PageHero";
import { getDictionary, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";
import { paymentsMode } from "@/server/payments/providers";
import { exampleTitle, rankedExamples } from "@/lib/examples";

export async function generateMetadata({ params }: PageProps<"/[lang]/calculator">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return { title: d.calc.title, description: d.meta.description, alternates: alternates(lang as Locale, "/calculator") };
}

export default async function CalculatorPage({ params }: PageProps<"/[lang]/calculator">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const examples: ExampleSummary[] = rankedExamples().map(({ e, a }) => {
    const v = a.verdict.id;
    const tone = v === "STRONG_CANDIDATE" ? "good" : v === "POSSIBLE_WITH_CONDITIONS" ? "mid" : "weak";
    return { id: e.id, title: exampleTitle(e, d, locale), verdict: d.labels.verdict[v], tone, countryCode: e.input.countryCode };
  });
  const dict = { calc: d.calc, labels: d.labels, result: d.result, flow: d.flow, charts: d.charts, common: d.common, checkout: d.checkout, pricing: d.pricing, country: d.country, audience: d.audience };
  return (
    <main>
      <PageHero eyebrow={d.calc.eyebrow} title={d.calc.title} lead={d.calc.lead} />
      <div className="container-x py-8">
        <Calculator locale={locale} d={dict} examples={examples} demo={paymentsMode().demo} samplesHref={`/${locale}/samples`} />
      </div>
    </main>
  );
}

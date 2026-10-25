import type { Metadata } from "next";
import { Calculator, type ExampleSummary } from "@/components/Calculator";
import { PageHero } from "@/components/PageHero";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { getDictionary, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";
import { paymentsMode } from "@/server/payments/providers";

export async function generateMetadata({ params }: PageProps<"/[lang]/calculator">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return { title: d.calc.title, description: d.meta.description, alternates: alternates(lang as Locale, "/calculator") };
}

export default async function CalculatorPage({ params }: PageProps<"/[lang]/calculator">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const examples: ExampleSummary[] = EXAMPLES.map((e) => {
    const v = assess(e.input, getCountry(e.input.countryCode)).verdict.id;
    const tone = v === "STRONG_CANDIDATE" ? "good" : v === "POSSIBLE_WITH_CONDITIONS" ? "mid" : "weak";
    return { id: e.id, title: d.examples[e.id as keyof typeof d.examples] ?? e.title, verdict: d.labels.verdict[v], tone, countryCode: e.input.countryCode };
  });
  const dict = { calc: d.calc, labels: d.labels, result: d.result, flow: d.flow, charts: d.charts, common: d.common, checkout: d.checkout, pricing: d.pricing, country: d.country };
  return (
    <main>
      <PageHero eyebrow={d.calc.eyebrow} title={d.calc.title} lead={d.calc.lead} />
      <div className="container-x py-8">
        <Calculator locale={locale} d={dict} examples={examples} demo={paymentsMode().demo} samplesHref={`/${locale}/samples`} />
      </div>
    </main>
  );
}

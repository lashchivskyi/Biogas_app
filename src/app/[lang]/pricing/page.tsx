import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { PageHero } from "@/components/PageHero";
import { PricingPlans } from "@/components/payments/PricingPlans";
import { Emblem } from "@/components/three/Emblem";
import { PLAN_PRICES_EUR_CENTS } from "@/config/plans";
import { SITE, absoluteUrl } from "@/config/site";
import { getDictionary, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";
import { paymentsMode } from "@/server/payments/providers";

export async function generateMetadata({ params }: PageProps<"/[lang]/pricing">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return { title: d.pricing.title, description: d.pricing.lead, alternates: alternates(lang as Locale, "/pricing") };
}

export default async function PricingPage({ params }: PageProps<"/[lang]/pricing">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const P = d.pricing;
  return (
    <main>
      <PageHero crumbs={[{ name: SITE.name, href: `/${locale}` }, { name: d.nav.pricing, href: `/${locale}/pricing` }]} eyebrow={P.eyebrow} title={P.title} lead={P.lead}>
        <div className="pointer-events-none absolute -top-6 right-0 hidden lg:block"><Emblem size={220} /></div>
      </PageHero>
      <section className="container-x -mt-4 pb-16 pt-8">
        <PricingPlans locale={locale} d={{ pricing: d.pricing, checkout: d.checkout, common: d.common }} demo={paymentsMode().demo} />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          {P.trust.map((t) => <span key={t} className="flex items-center gap-2"><Icon name="shield" size={18} className="text-brand" />{t}</span>)}
        </div>
        <div className="mt-6 text-center"><Link href={`/${locale}/samples`} className="font-semibold text-brand underline underline-offset-4">{P.sampleCta}</Link></div>
      </section>
      <section className="border-t border-line bg-surface py-16">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{P.faqTitle}</h2>
          <div className="divide-y divide-line border-y border-line">
            {P.faq.map((x) => (
              <details key={x.q} className="group py-4">
                <summary className="flex items-center justify-between gap-4 font-bold">{x.q}<span aria-hidden className="text-muted transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-ink2">{x.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: P.title,
            provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
            areaServed: "Worldwide",
            url: absoluteUrl(`/${locale}/pricing`),
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: P.title,
              itemListElement: (["report", "expert"] as const).map((p) => ({
                "@type": "Offer",
                name: P.plans[p].name,
                priceSpecification: { "@type": "PriceSpecification", minPrice: PLAN_PRICES_EUR_CENTS[p].C / 100, maxPrice: PLAN_PRICES_EUR_CENTS[p].A / 100, priceCurrency: "EUR" },
              })),
            },
          }),
        }}
      />
    </main>
  );
}

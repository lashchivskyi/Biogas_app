import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { PLAN_PRICES_EUR_CENTS } from "@/config/plans";
import { SITE } from "@/config/site";
import { getDictionary, INTL_TAG, type Locale } from "@/i18n";
import { legalCopy } from "@/i18n/legal";
import { alternates } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return { title: d.terms.title, alternates: alternates(lang as Locale, "/terms") };
}

/**
 * Localised template. Payment providers require public terms, prices, a refund policy and company
 * details. Fill SITE.legal and have a lawyer review — for the selling entity's jurisdiction — before launch.
 */
export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  const d = await getDictionary(lang as Locale);
  const copy = legalCopy[lang as Locale];
  const L = SITE.legal;
  const filled = !Object.values(L).some((v) => v.startsWith("["));
  const eur = (c: number) => new Intl.NumberFormat(INTL_TAG[lang as Locale], { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(c / 100);
  return (
    <main>
      <PageHero title={d.terms.title} />
      <div className="container-x max-w-3xl py-12">
        {!filled && <p className="mb-8 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">{d.terms.template}</p>}
        <div className="space-y-8 text-[15.5px] leading-relaxed text-ink2">
          <section><h2 className="text-xl font-bold text-ink">1. {copy.headings[0]}</h2><p className="mt-2">{[L.entity, L.registration, L.address].map((v) => v.startsWith("[") ? d.common.unknown : v).join(", ")}. <a className="text-brand underline" href={`mailto:${L.email.startsWith("[") ? SITE.supportEmail : L.email}`}>{L.email.startsWith("[") ? SITE.supportEmail : L.email}</a></p></section>
          <section><h2 className="text-xl font-bold text-ink">2. {copy.headings[1]}</h2><p className="mt-2">{d.footer.about} {copy.automation} {d.footer.disclaimer}</p></section>
          <section>
            <h2 className="text-xl font-bold text-ink">3. {copy.headings[2]}</h2>
            <p className="mt-2">{d.pricing.regional} (A / B / C)</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{d.pricing.plans.standard.name}: {eur(PLAN_PRICES_EUR_CENTS.standard.A)} / {eur(PLAN_PRICES_EUR_CENTS.standard.B)} / {eur(PLAN_PRICES_EUR_CENTS.standard.C)} · {d.pricing.perProject}.</li>
              <li>{d.pricing.plans.report.name}: {eur(PLAN_PRICES_EUR_CENTS.report.A)} / {eur(PLAN_PRICES_EUR_CENTS.report.B)} / {eur(PLAN_PRICES_EUR_CENTS.report.C)} · {d.pricing.perProject}.</li>
            </ul>
            <p className="mt-2">{copy.vat}</p>
          </section>
          <section><h2 className="text-xl font-bold text-ink">4. {copy.headings[3]}</h2><p className="mt-2">{d.pricing.faq[0].a} {copy.cards}</p></section>
          <section><h2 className="text-xl font-bold text-ink">5. {copy.headings[4]}</h2><p className="mt-2">{d.pricing.faq[1].a}</p></section>
          <section><h2 className="text-xl font-bold text-ink">6. {copy.headings[5]}</h2><p className="mt-2">{d.pricing.faq[2].a} {copy.withdrawal}</p></section>
          <section><h2 className="text-xl font-bold text-ink">7. {copy.headings[6]}</h2><p className="mt-2">{copy.liability}</p></section>
          <section><h2 className="text-xl font-bold text-ink">8. {copy.headings[7]}</h2><p className="mt-2">{copy.privacy}</p></section>
        </div>
      </div>
    </main>
  );
}

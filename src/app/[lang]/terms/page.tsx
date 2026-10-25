import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { PLAN_PRICES_EUR_CENTS } from "@/config/plans";
import { SITE } from "@/config/site";
import { getDictionary, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return { title: d.terms.title, alternates: alternates(lang as Locale, "/terms") };
}

/**
 * TEMPLATE (English). Payment providers require public terms, prices, a refund policy and company
 * details. Fill SITE.legal and have a lawyer review — for the selling entity's jurisdiction — before launch.
 */
export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  const d = await getDictionary(lang as Locale);
  const L = SITE.legal;
  const filled = !Object.values(L).some((v) => v.startsWith("["));
  const eur = (c: number) => `€${(c / 100).toLocaleString("en-GB")}`;
  return (
    <main>
      <PageHero title={d.terms.title} />
      <div className="container-x max-w-3xl py-12">
        {!filled && <p className="mb-8 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">{d.terms.template}</p>}
        {lang !== "en" && <p className="mb-6 rounded-2xl bg-surface2 p-4 text-sm text-ink2">{d.common.englishOnly}</p>}
        <div className="space-y-8 text-[15.5px] leading-relaxed text-ink2">
          <section><h2 className="text-xl font-bold text-ink">1. Provider</h2><p className="mt-2">{L.entity}, {L.registration}, {L.address}. Email: {L.email}.</p></section>
          <section><h2 className="text-xl font-bold text-ink">2. Service</h2><p className="mt-2">{SITE.name} provides information and advisory services: an automated preliminary feasibility screening of biogas and biomethane projects and, on request, a review by an engineer. Results are an analytical estimate — not an engineering design, a guarantee of income, a safety assessment or an offer to sell equipment.</p></section>
          <section>
            <h2 className="text-xl font-bold text-ink">3. Prices</h2>
            <p className="mt-2">Prices depend on the country where the project is located (tiers A / B / C):</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Full Feasibility Report: {eur(PLAN_PRICES_EUR_CENTS.report.A)} / {eur(PLAN_PRICES_EUR_CENTS.report.B)} / {eur(PLAN_PRICES_EUR_CENTS.report.C)} per project site.</li>
              <li>Expert-Reviewed Feasibility: {eur(PLAN_PRICES_EUR_CENTS.expert.A)} / {eur(PLAN_PRICES_EUR_CENTS.expert.B)} / {eur(PLAN_PRICES_EUR_CENTS.expert.C)} per project site.</li>
            </ul>
            <p className="mt-2">Prices are in euro and exclude VAT where VAT applies; the checkout shows the final amount and may display it in your currency.</p>
          </section>
          <section><h2 className="text-xl font-bold text-ink">4. Payment</h2><p className="mt-2">Payment is processed by Stripe (cards, Apple Pay, Google Pay and local methods). We do not receive or store card details. A receipt or invoice is sent by email.</p></section>
          <section><h2 className="text-xl font-bold text-ink">5. Delivery</h2><p className="mt-2">The Full Report is available immediately after payment at a private link. For the expert review, an engineer contacts you within one business day and delivers the written recommendation within five business days of receiving your data.</p></section>
          <section><h2 className="text-xl font-bold text-ink">6. Refunds</h2><p className="mt-2">Expert review: a full refund if work has not started. Full Report: a refund within 14 days if the report could not be generated for your case. Consumers in the EU and UK keep their statutory rights; by requesting immediate access to digital content you acknowledge that the right of withdrawal ends once the report is delivered.</p></section>
          <section><h2 className="text-xl font-bold text-ink">7. Liability</h2><p className="mt-2">Investment decisions remain yours. Our liability is limited to the price paid, except where the law does not allow such a limitation.</p></section>
          <section><h2 className="text-xl font-bold text-ink">8. Personal data</h2><p className="mt-2">We process contact and project data only to deliver the service and to contact you, and share it only with the payment provider. You can request deletion at any time.</p></section>
        </div>
      </div>
    </main>
  );
}

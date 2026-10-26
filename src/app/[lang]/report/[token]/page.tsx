import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PrintButton } from "@/components/PrintButton";
import { ResultView } from "@/components/ResultView";
import { ReportPending } from "@/components/payments/ReportPending";
import { assess } from "@/core";
import { getCountry } from "@/countries";
import { countryName, fmt, getDictionary, type Locale } from "@/i18n";
import { coreLang, INTL_TAG } from "@/i18n/config";
import { orders } from "@/server/orders";
import { refreshOrder } from "@/server/payments/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Paid report. The token is an unguessable capability; the report is recomputed from the stored input. */
export default async function ReportPage({ params }: PageProps<"/[lang]/report/[token]">) {
  const { lang, token } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const found = await orders.byToken(token);
  if (!found) notFound();
  const order = await refreshOrder(found);
  const country = getCountry(order.input.countryCode);
  const cl = coreLang(locale);
  const who = order.customer.company || order.customer.name || order.customer.email;
  const date = new Date(order.createdAt).toLocaleDateString(INTL_TAG[locale], { dateStyle: "long" });

  if (order.status !== "paid") {
    return (
      <main>
        <PageHero eyebrow={d.report.eyebrow} title={d.labels.business[order.input.businessType].label} lead={countryName(order.input.countryCode, locale)} />
        <div className="container-x max-w-3xl py-12">
          <ReportPending token={token} t={d.report} pricingHref={`/${locale}/pricing`} />
        </div>
      </main>
    );
  }

  const a = assess(order.input, country, { lang: cl });
  return (
    <main>
      <PageHero eyebrow={d.report.eyebrow} title={`${d.labels.business[order.input.businessType].label} · ${countryName(order.input.countryCode, locale)}`} lead={fmt(d.report.paidFor, { who, date })} />
      <div className="container-x py-8">
        <div className="no-print mb-4 flex justify-end"><PrintButton label={d.report.print} /></div>
        <ResultView a={a} d={d} locale={locale} currency={country.currency} countryNotes={country.approachNotes[cl]} access={order.plan === "standard" ? "standard" : "full"} methodologyHref={`/${locale}/methodology`} />
      </div>
    </main>
  );
}

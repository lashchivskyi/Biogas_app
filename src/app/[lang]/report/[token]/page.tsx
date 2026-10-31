import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PrintButton } from "@/components/PrintButton";
import { ExportButton } from "@/components/ExportButton";
import { decisionCopy } from "@/i18n/decision";
import { ResultView, type ResultViewProps } from "@/components/ResultView";
import { CurrencyResultView } from "@/components/CurrencyResultView";
import { ReportPending } from "@/components/payments/ReportPending";
import { assess } from "@/core";
import { getCountry } from "@/countries";
import { countryName, fmt, getDictionary, type Locale } from "@/i18n";
import { coreLang, INTL_TAG } from "@/i18n/config";
import { deliveryCopy } from "@/i18n/delivery";
import { orders } from "@/server/orders";
import { refreshOrder } from "@/server/payments/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Paid report. New orders retain their purchased calculation; legacy orders are explicitly recomputed. */
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
          <ReportPending token={token} t={d.report} refunded={{ title: deliveryCopy[locale][5], text: deliveryCopy[locale][6] }} initialStatus={order.status} pricingHref={`/${locale}/pricing`} />
        </div>
      </main>
    );
  }

  const a = order.assessmentSnapshot ?? assess(order.input, country, { lang: cl, asOfDate: new Date().toISOString().slice(0, 10) });
  const report: ResultViewProps = { a, d, locale, currency: country.currency, countryNotes: country.approachNotes[cl], access: order.plan === "standard" ? "standard" : "full", methodologyHref: `/${locale}/methodology` };
  return (
    <main>
      <PageHero eyebrow={d.report.eyebrow} title={`${d.labels.business[order.input.businessType].label} · ${countryName(order.input.countryCode, locale)}`} lead={fmt(d.report.paidFor, { who, date })} />
      <div className="container-x py-8">
        {!order.assessmentSnapshot && <p lang={cl} className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">{cl === "uk" ? "Історичну версію розрахунку для цього замовлення не збережено. Нижче наведено повторну оцінку за поточною версією моделі та наявними даними." : "The original calculation version was not saved for this legacy order. This report is a new evaluation using the current model and available data."}</p>}
        <div className="no-print mb-4 flex flex-wrap justify-end gap-3"><ExportButton a={a} currency={country.currency} access={report.access === "full" ? "full" : "standard"} label={decisionCopy[locale].exportXlsx} /><PrintButton label={d.report.print} /></div>
        <CurrencyResultView {...report} serverView={<ResultView {...report} />} />
      </div>
    </main>
  );
}

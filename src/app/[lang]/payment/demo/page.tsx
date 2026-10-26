import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { DemoPay } from "@/components/payments/DemoPay";
import { getDictionary, type Locale } from "@/i18n";
import { INTL_TAG } from "@/i18n/config";
import { orders } from "@/server/orders";
import { paymentsMode } from "@/server/payments/providers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DemoPaymentPage({ params, searchParams }: PageProps<"/[lang]/payment/demo">) {
  const { lang } = await params;
  const { order: id } = await searchParams;
  if (!paymentsMode().demo) notFound();
  const order = typeof id === "string" ? await orders.get(id) : null;
  if (!order || order.provider !== "demo" || order.plan === "expert") notFound();
  const d = await getDictionary(lang as Locale);
  return (
    <main>
      <PageHero title={d.payment.demoTitle} lead={d.payment.demoText} />
      <div className="container-x max-w-2xl py-12">
        <div className="card p-6">
          <div className="num font-display text-3xl font-semibold">{new Intl.NumberFormat(INTL_TAG[lang as Locale], { style: "currency", currency: order.currency }).format(order.amountMinor / 100)}</div>
          <div className="text-sm text-muted">{d.pricing.plans[order.plan].name} · {order.customer.email}</div>
          <DemoPay orderId={order.id} next={`/${lang}/report/${order.reportToken}`} t={d.payment} />
        </div>
      </div>
    </main>
  );
}

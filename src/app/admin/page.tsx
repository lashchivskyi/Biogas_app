import type { Metadata } from "next";
import { AdminLeadRow } from "@/components/AdminLeadRow";
import { AdminOrderRow } from "@/components/AdminOrderRow";
import { leads } from "@/server/leads";
import { orders } from "@/server/orders";
import { paymentsMode } from "@/server/payments/providers";
import { requestLocale } from "@/i18n/request";
import { adminCopy } from "@/i18n/admin";
import { getDictionary } from "@/i18n";
import { makeFormat } from "@/lib/format";
import { COUNTRIES } from "@/countries";

export const metadata: Metadata = { title: "CRM", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const locale = await requestLocale();
  const d = await getDictionary(locale);
  const t = adminCopy(locale);
  const F = makeFormat(locale, d.labels.units);
  const [all, allOrders] = await Promise.all([leads.list(), orders.list()]);
  const counts = all.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {});
  const paidEur = allOrders.filter((o) => o.status === "paid").reduce((a, o) => a + o.priceEurCents / 100, 0);
  const mode = paymentsMode();
  return (
    <main>
      <section className="hero pb-8 pt-28">
        <div className="container-x">
          <h1 className="font-display text-3xl font-semibold">CRM</h1>
          <p className="mt-2 text-[color:var(--hero-muted)]">
            {t.leads}: {F.n0(all.length)} ({t.leadStatus.new}: {F.n0(counts.new ?? 0)}, {t.leadStatus.qualified}: {F.n0(counts.qualified ?? 0)}) · {t.orders}: {F.n0(allOrders.length)} · {t.orderStatus.paid}: {F.price(paidEur, "EUR")} · {mode.provider ?? "—"}
          </p>
        </div>
      </section>
      <div className="container-x space-y-10 py-8">
        <section>
          <h2 className="text-xl font-bold">{t.orders}</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">{d.method.date}</th><th className="p-3">{d.checkout.name}</th><th className="p-3">{d.checkout.plan}</th><th className="p-3">{d.result.colStatus}</th><th className="p-3">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((o) => <AdminOrderRow key={o.id} order={o} locale={locale} d={d} t={t} />)}
                {allOrders.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">{t.noOrders}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-bold">{t.leads}</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">{d.method.date}</th><th className="p-3">{d.checkout.name}</th><th className="p-3">{d.calc.title}</th><th className="p-3">{d.result.verdict}</th><th className="p-3">{d.result.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {all.map((l) => {
                  const r = COUNTRIES[l.input.countryCode]?.regions.find((r) => r.id === l.input.regionId);
                  return <AdminLeadRow key={l.id} lead={l} locale={locale} d={d} t={t} region={r?.names?.[locale] ?? r?.name ?? l.input.regionId} />;
                })}
                {all.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">{t.noLeads}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

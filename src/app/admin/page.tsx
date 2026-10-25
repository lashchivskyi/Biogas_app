import type { Metadata } from "next";
import { AdminLeadRow } from "@/components/AdminLeadRow";
import { AdminOrderRow } from "@/components/AdminOrderRow";
import { leads } from "@/server/leads";
import { orders } from "@/server/orders";
import { paymentsMode } from "@/server/payments/providers";

export const metadata: Metadata = { title: "CRM", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
            Leads: {all.length} (new {counts.new ?? 0}, qualified {counts.qualified ?? 0}) · Orders: {allOrders.length} · Paid: €{new Intl.NumberFormat("en-GB").format(paidEur)} · Payments: {mode.provider ?? "off"}
          </p>
        </div>
      </section>
      <div className="container-x space-y-10 py-8">
        <section>
          <h2 className="text-xl font-bold">Orders & payments</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((o) => <AdminOrderRow key={o.id} order={o} />)}
                {allOrders.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-bold">Calculator leads</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">Date</th><th className="p-3">Contact</th><th className="p-3">Project</th><th className="p-3">Verdict</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {all.map((l) => <AdminLeadRow key={l.id} lead={l} />)}
                {all.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">No leads yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

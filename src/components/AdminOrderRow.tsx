"use client";

import { useState } from "react";
import type { Order } from "@/server/orders";
import { countryName, type Dict, type Locale, INTL_TAG } from "@/i18n";
import type { AdminCopy } from "@/i18n/admin";
import { makeFormat } from "@/lib/format";

export function AdminOrderRow({ order, locale, d, t }: { order: Order; locale: Locale; d: Pick<Dict, "labels" | "pricing" | "samples">; t: AdminCopy }) {
  const F = makeFormat(locale, d.labels.units);
  const [status, setStatus] = useState(order.status);
  const [msg, setMsg] = useState("");
  async function set(s: "paid" | "cancelled" | "reversed") {
    setMsg("…");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: s }) });
      if (res.ok) setStatus(s);
      setMsg(res.ok ? t.saved : t.orderStatus.failed);
    } catch { setMsg(t.orderStatus.failed); }
  }
  return (
    <tr className="border-t border-line align-top text-sm">
      <td className="whitespace-nowrap p-3 text-muted">{new Date(order.createdAt).toLocaleString(INTL_TAG[locale], { dateStyle: "short", timeStyle: "short" })}</td>
      <td className="p-3">
        <div className="font-semibold">{order.customer.name || order.customer.email}</div>
        <div className="text-muted">{order.customer.email}</div>
        {order.customer.company && <div>{order.customer.company} {order.customer.vatId && <span className="text-muted">· {order.customer.vatId}</span>}</div>}
      </td>
      <td className="p-3">
        <div>{order.plan === "expert" ? <code>expert</code> : d.pricing.plans[order.plan].name} · {order.priceTier}</div>
        <div className="num font-semibold">{F.price(order.amountMinor / 100, order.currency)}</div>
        <div className="text-xs text-muted">{order.provider} · {countryName(order.input.countryCode, locale)} · {d.labels.business[order.input.businessType].label} · {order.lang}</div>
        <a className="text-xs font-semibold text-brand underline" href={`/${order.lang}/report/${order.reportToken}`} target="_blank" rel="noreferrer">{d.samples.open}</a>
      </td>
      <td className="p-3">
        <span className={`chip ${status === "paid" ? "bg-brandsoft text-brandink" : ""}`}>{t.orderStatus[status]}</span>
        {order.notes && <div className="mt-1 max-w-xs whitespace-pre-line text-xs text-bad">{order.notes}</div>}
      </td>
      <td className="p-3">
        {status !== "paid" && <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => set("paid")}>{t.markPaid}</button>}
        {status === "paid" && <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => set("reversed")}>{t.markRefunded}</button>}
        {status !== "paid" && status !== "cancelled" && <button type="button" className="ml-1 text-xs text-muted underline" onClick={() => set("cancelled")}>{t.cancel}</button>}
        <div className="h-4 text-xs text-muted">{msg}</div>
      </td>
    </tr>
  );
}

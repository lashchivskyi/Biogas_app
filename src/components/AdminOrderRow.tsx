"use client";

import { useState } from "react";
import type { Order } from "@/server/orders";

export function AdminOrderRow({ order }: { order: Order }) {
  const [status, setStatus] = useState(order.status);
  const [msg, setMsg] = useState("");
  async function set(s: "paid" | "cancelled" | "reversed") {
    setMsg("…");
    const res = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: s }) });
    if (res.ok) setStatus(s);
    setMsg(res.ok ? "saved" : "error");
  }
  return (
    <tr className="border-t border-line align-top text-sm">
      <td className="whitespace-nowrap p-3 text-muted">{new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
      <td className="p-3">
        <div className="font-semibold">{order.customer.name || order.customer.email}</div>
        <div className="text-muted">{order.customer.email}</div>
        {order.customer.company && <div>{order.customer.company} {order.customer.vatId && <span className="text-muted">· {order.customer.vatId}</span>}</div>}
      </td>
      <td className="p-3">
        <div>{order.plan === "expert" ? "Expert review" : "Full report"} · tier {order.priceTier}</div>
        <div className="num font-semibold">{(order.amountMinor / 100).toLocaleString("en-GB")} {order.currency}</div>
        <div className="text-xs text-muted">{order.provider} · {order.input.countryCode} · {order.input.businessType} · {order.lang}</div>
        <a className="text-xs font-semibold text-brand underline" href={`/${order.lang}/report/${order.reportToken}`} target="_blank" rel="noreferrer">report</a>
      </td>
      <td className="p-3">
        <span className={`chip ${status === "paid" ? "bg-brandsoft text-brandink" : ""}`}>{status}</span>
        {order.notes && <div className="mt-1 max-w-xs whitespace-pre-line text-xs text-bad">{order.notes}</div>}
      </td>
      <td className="p-3">
        {status !== "paid" && <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => set("paid")}>Mark paid</button>}
        {status === "paid" && <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => set("reversed")}>Mark refunded</button>}
        {status !== "paid" && status !== "cancelled" && <button type="button" className="ml-1 text-xs text-muted underline" onClick={() => set("cancelled")}>cancel</button>}
        <div className="h-4 text-xs text-muted">{msg}</div>
      </td>
    </tr>
  );
}

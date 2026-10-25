"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Development-only stand-in for the provider's hosted page. */
export function DemoPay({ orderId, next, t }: { orderId: string; next: string; t: { demoPay: string; demoFail: string } }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function finish(outcome: "paid" | "failed") {
    setBusy(true);
    await fetch("/api/payments/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: orderId, outcome }) });
    router.push(next);
  }
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => finish("paid")}>{t.demoPay}</button>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => finish("failed")}>{t.demoFail}</button>
    </div>
  );
}

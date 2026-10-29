"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

/** Shown on a report whose payment is not confirmed yet (or was refunded); polls and refreshes the server page when paid. */
export function ReportPending({ token, t, refunded, initialStatus, pricingHref }: {
  token: string; t: { pending: string; pendingText: string; failed: string; tryAgain: string };
  refunded: { title: string; text: string }; initialStatus: string; pricingHref: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  useEffect(() => {
    if (initialStatus === "reversed") return;
    let stop = false;
    let n = 0;
    const tick = async () => {
      try {
        const res = await fetch(`/api/payments/status?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const d = (await res.json()) as { status: string; plan: string };
        if (stop) return;
        setStatus(d.status);
        if (d.status === "paid") {
          track("payment_success", { plan: d.plan });
          router.refresh();
          return;
        }
        if ((d.status === "pending" || d.status === "created") && n++ < 60) setTimeout(tick, 2500);
      } catch {
        if (!stop && n++ < 60) setTimeout(tick, 4000);
      }
    };
    tick();
    return () => {
      stop = true;
    };
  }, [token, router, initialStatus]);
  if (status === "reversed") {
    return (
      <div className="rounded-3xl bg-surface2 p-6 text-ink sm:p-8" role="status">
        <h2 className="font-display text-2xl font-semibold">{refunded.title}</h2>
        <p className="mt-2">{refunded.text}</p>
      </div>
    );
  }
  const failed = ["failed", "expired", "cancelled"].includes(status);
  return (
    <div className={`rounded-3xl p-6 sm:p-8 ${failed ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-950"}`} role="status" aria-live="polite">
      <h2 className="font-display text-2xl font-semibold">{failed ? t.failed : t.pending}</h2>
      {!failed && <p className="mt-2">{t.pendingText}</p>}
      {failed && <Link href={pricingHref} className="btn btn-primary mt-5">{t.tryAgain}</Link>}
    </div>
  );
}

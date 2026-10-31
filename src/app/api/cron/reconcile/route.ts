import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { absoluteUrl } from "@/config/site";
import { reportError } from "@/server/monitoring";
import { deliverPaidReport, notifyOwner } from "@/server/notify";
import { orders } from "@/server/orders";
import { refreshOrder } from "@/server/payments/service";

export const dynamic = "force-dynamic";

/** Grace for the normal webhook/redirect path; Stripe Checkout sessions stay open for 24 h by default. */
const MIN_AGE_MS = 5 * 60_000;
const MAX_AGE_MS = 3 * 86_400_000;
/** A paid order still without its link email this long is raised once (the cron runs every 15 min). */
const ALERT_AFTER_MS = 60 * 60_000;
const CRON_INTERVAL_MS = 15 * 60_000;

const authorized = (header: string | null) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Scheduled backup for missed webhooks (vercel.json, or any scheduler sending
 * `Authorization: Bearer $CRON_SECRET`): asks the provider about unfinished orders and retries
 * report-link emails that failed after the payment was recorded.
 */
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return new NextResponse("Unauthorized", { status: 401 });
  const now = Date.now();
  const open = await orders.listOpen(new Date(now - MAX_AGE_MS).toISOString(), 100);
  const due = open.filter((o) => now - Date.parse(o.createdAt) >= MIN_AGE_MS);
  const result: Record<string, number> = { checked: due.length };
  for (const order of due) {
    try {
      const fresh = await refreshOrder(order);
      result[fresh.status] = (result[fresh.status] ?? 0) + 1;
    } catch (error) {
      await reportError(error, { where: "cron:reconcile", orderId: order.id });
    }
  }
  const undelivered = await orders.listUndelivered(new Date(now - MAX_AGE_MS).toISOString(), 100);
  for (const order of undelivered.filter((o) => now - Date.parse(o.createdAt) >= MIN_AGE_MS)) {
    if (await deliverPaidReport(order)) {
      result.delivered = (result.delivered ?? 0) + 1;
      continue;
    }
    result.undelivered = (result.undelivered ?? 0) + 1;
    const age = now - Date.parse(order.createdAt);
    if (age >= ALERT_AFTER_MS && age < ALERT_AFTER_MS + CRON_INTERVAL_MS) {
      await notifyOwner(`Report link not delivered for order ${order.id}`, ["The customer paid, but the link email keeps failing (address or sender domain?).", `Open the order in ${absoluteUrl("/admin")} and send the report link by hand.`]);
    }
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

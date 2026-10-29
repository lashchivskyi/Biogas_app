import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reportError } from "@/server/monitoring";
import { orders } from "@/server/orders";
import { refreshOrder } from "@/server/payments/service";

export const dynamic = "force-dynamic";

/** Grace for the normal webhook/redirect path; Stripe Checkout sessions stay open for 24 h by default. */
const MIN_AGE_MS = 5 * 60_000;
const MAX_AGE_MS = 3 * 86_400_000;

const authorized = (header: string | null) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Scheduled backup for missed webhooks (vercel.json, or any scheduler sending
 * `Authorization: Bearer $CRON_SECRET`): asks the provider about unfinished orders.
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
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

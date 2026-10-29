import { NextResponse } from "next/server";
import { absoluteUrl } from "@/config/site";
import { reportError } from "@/server/monitoring";
import { notifyOwner } from "@/server/notify";
import { orders } from "@/server/orders";
import { mapStripeSession, paymentIntentId, verifyStripeEvent } from "@/server/payments/providers";
import { applyProviderStatus } from "@/server/payments/service";

type StripeEvent = ReturnType<typeof verifyStripeEvent>;

/**
 * Stripe webhook. Configure in the dashboard with events:
 * checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired, charge.refunded,
 * charge.dispute.created.
 * The signature is verified on the RAW body before anything else. A processing error returns 500 so
 * Stripe retries the delivery; the cron reconciliation covers sessions that are never re-delivered.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  let event: StripeEvent;
  try {
    event = verifyStripeEvent(raw, request.headers.get("stripe-signature"));
  } catch {
    return new NextResponse("bad signature", { status: 400 });
  }
  try {
    return NextResponse.json(await handle(event));
  } catch (error) {
    await reportError(error, { where: "webhook:stripe", event: event.type, eventId: event.id });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}

async function handle(event: StripeEvent): Promise<Record<string, unknown>> {
  if (event.type.startsWith("checkout.session.")) {
    const s = event.data.object as { id: string; client_reference_id: string | null; status: string | null; payment_status: string; amount_subtotal: number | null; currency: string | null; payment_intent: string | { id: string } | null; customer_details?: { address?: { country?: string } } };
    const order = (await orders.findByProviderRef(s.id)) ?? (s.client_reference_id ? await orders.get(s.client_reference_id) : null);
    if (!order) return { ok: true, ignored: "unknown order" };
    const status = event.type === "checkout.session.async_payment_failed" ? "failed" : mapStripeSession(s);
    await applyProviderStatus(order, { status, amountMinor: s.amount_subtotal ?? undefined, currency: s.currency?.toUpperCase(), billingCountry: s.customer_details?.address?.country, paymentRef: paymentIntentId(s.payment_intent), modifiedAt: new Date(event.created * 1000).toISOString() }, `webhook:stripe:${event.type}`);
  } else if (event.type === "charge.refunded") {
    const c = event.data.object as { payment_intent: string | { id: string } | null; amount_refunded: number; amount: number; currency: string };
    const pi = paymentIntentId(c.payment_intent);
    const match = pi ? await orders.findByPaymentRef(pi) : null;
    if (!match) return { ok: true, ignored: "unknown payment" };
    // Record full refunds automatically; partial refunds are handled manually in the admin.
    const full = c.amount_refunded >= c.amount;
    if (full) await orders.update(match.id, { status: "reversed" }, "webhook:stripe:refund");
    else await orders.update(match.id, { notes: `${match.notes}\n[${new Date().toISOString()}] Partial refund ${c.amount_refunded} of ${c.amount} ${c.currency.toUpperCase()} — access unchanged, review manually`.trim() }, "webhook:stripe:refund");
    await notifyOwner(`${full ? "Refund" : "Partial refund"} on order ${match.id}`, [`${c.amount_refunded} of ${c.amount} ${c.currency.toUpperCase()} (minor units)`, `Admin: ${absoluteUrl("/admin")}`]);
  } else if (event.type === "charge.dispute.created") {
    const d = event.data.object as { payment_intent: string | { id: string } | null; amount: number; currency: string; reason: string; evidence_details?: { due_by?: number | null } };
    const pi = paymentIntentId(d.payment_intent);
    const match = pi ? await orders.findByPaymentRef(pi) : null;
    const due = d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toISOString().slice(0, 10) : "see Stripe";
    const line = `Dispute opened (${d.reason}): ${d.amount} ${d.currency.toUpperCase()} minor units; evidence due ${due}`;
    if (match) await orders.update(match.id, { notes: `${match.notes}\n[${new Date().toISOString()}] ${line}`.trim() }, "webhook:stripe:dispute");
    await notifyOwner(`Dispute${match ? ` on order ${match.id}` : ""}`, [line, "Respond in the Stripe Dashboard → Disputes before the deadline.", `Admin: ${absoluteUrl("/admin")}`]);
  }
  return { ok: true };
}

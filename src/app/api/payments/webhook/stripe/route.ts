import { NextResponse } from "next/server";
import { orders } from "@/server/orders";
import { mapStripeSession, verifyStripeEvent } from "@/server/payments/providers";
import { applyProviderStatus } from "@/server/payments/service";

/**
 * Stripe webhook. Configure in the dashboard with events:
 * checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired, charge.refunded.
 * The signature is verified on the RAW body before anything else.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  let event;
  try {
    event = verifyStripeEvent(raw, request.headers.get("stripe-signature"));
  } catch {
    return new NextResponse("bad signature", { status: 400 });
  }

  if (event.type.startsWith("checkout.session.")) {
    const s = event.data.object as { id: string; client_reference_id: string | null; status: string | null; payment_status: string; amount_subtotal: number | null; currency: string | null; payment_intent: string | { id: string } | null };
    const order = (await orders.findByProviderRef(s.id)) ?? (s.client_reference_id ? await orders.get(s.client_reference_id) : null);
    if (!order) return NextResponse.json({ ok: true, ignored: "unknown order" });
    const status = event.type === "checkout.session.async_payment_failed" ? "failed" : mapStripeSession(s);
    const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
    if (pi && !order.paymentRef) await orders.update(order.id, { paymentRef: pi }, "webhook:stripe");
    await applyProviderStatus(order, { status, amountMinor: s.amount_subtotal ?? undefined, currency: s.currency?.toUpperCase(), modifiedAt: new Date(event.created * 1000).toISOString() }, `webhook:stripe:${event.type}`);
  } else if (event.type === "charge.refunded") {
    const c = event.data.object as { payment_intent: string | null; amount_refunded: number; amount: number };
    // Record full refunds automatically; partial refunds are handled manually in the admin.
    if (c.amount_refunded >= c.amount && c.payment_intent) {
      const match = await orders.findByPaymentRef(c.payment_intent);
      if (match) await orders.update(match.id, { status: "reversed" }, "webhook:stripe:refund");
    }
  }
  return NextResponse.json({ ok: true });
}

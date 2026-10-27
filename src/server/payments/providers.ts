import Stripe from "stripe";
import type { Order, OrderStatus, ProviderId } from "../orders";

/**
 * Payment providers. One is active at a time (env PAYMENT_PROVIDER):
 *
 *  - stripe   (default, international): Stripe Checkout — cards, Apple Pay, Google Pay, Link and the
 *             local methods enabled in the dashboard (BLIK, iDEAL, Bancontact, …). Signed EUR/USD quotes;
 *             Adaptive Pricing is disabled per session. Webhooks verified with the signing secret.
 *             NOTE: Stripe does not onboard Ukrainian legal entities — the merchant must be an entity in a
 *             Stripe-supported country (docs/payments.md).
 *  - demo     local simulator for development and staging only.
 */
export interface CreateResult {
  redirectUrl: string;
  providerRef: string;
}

export interface StatusResult {
  status: OrderStatus;
  /** Amount actually charged in the order currency's minor units (for mismatch detection). */
  amountMinor?: number;
  currency?: string;
  modifiedAt?: string;
  billingCountry?: string;
}

export interface PaymentProvider {
  id: ProviderId;
  /** Currency this provider charges in for an order priced in EUR. */
  chargeCurrency: string;
  create(order: Order, urls: { success: string; cancel: string; webhook: string }, product: { name: string; description: string }): Promise<CreateResult>;
  fetchStatus(order: Order): Promise<StatusResult | null>;
}

/* ------------------------------------------------------------------ Stripe */

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { maxNetworkRetries: 2 });
  return stripeClient;
}

export function mapStripeSession(s: { status: string | null; payment_status: string }): OrderStatus {
  if (s.payment_status === "paid" || s.payment_status === "no_payment_required") return "paid";
  if (s.status === "expired") return "expired";
  return "pending"; // open, or complete with async payment still processing
}

export const stripeCheckoutLocale = (locale: string) => locale === "uk" || locale === "sr" ? "en" : locale === "pt" ? "pt-BR" : locale === "en" ? "en-GB" : locale;

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  chargeCurrency: "EUR",
  async create(order, urls, product) {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      customer_email: order.customer.email,
      locale: stripeCheckoutLocale(order.lang),
      adaptive_pricing: { enabled: false }, // Keep the signed, explicitly confirmed EUR/USD quote unchanged.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: order.amountMinor,
            tax_behavior: process.env.STRIPE_TAX === "1" ? "exclusive" : undefined,
            product_data: { name: product.name, description: product.description },
          },
        },
      ],
      automatic_tax: process.env.STRIPE_TAX === "1" ? { enabled: true } : undefined,
      tax_id_collection: { enabled: true },
      billing_address_collection: "required",
      invoice_creation: { enabled: true },
      metadata: { orderId: order.id, plan: order.plan, country: order.input.countryCode },
      success_url: `${urls.success}${urls.success.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: urls.cancel,
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return { redirectUrl: session.url, providerRef: session.id };
  },
  async fetchStatus(order) {
    if (!order.providerRef) return null;
    const s = await stripe().checkout.sessions.retrieve(order.providerRef);
    return { status: mapStripeSession(s), amountMinor: s.amount_subtotal ?? undefined, currency: s.currency?.toUpperCase(), billingCountry: s.customer_details?.address?.country ?? undefined };
  },
};

/** Verifies the Stripe-Signature header against the raw body; throws on failure. */
export function verifyStripeEvent(rawBody: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!signature || !secret) throw new Error("Missing signature or webhook secret");
  return stripe().webhooks.constructEvent(rawBody, signature, secret);
}

/* ------------------------------------------------------------------ demo */

export const demo: PaymentProvider = {
  id: "demo",
  chargeCurrency: "EUR",
  async create(order, urls) {
    const back = new URL(urls.success);
    return { redirectUrl: `${back.pathname.replace(/\/report\/.*/, "")}/payment/demo?order=${encodeURIComponent(order.id)}`, providerRef: `demo_${order.id}` };
  },
  async fetchStatus() {
    return null;
  },
};

/* ------------------------------------------------------------------ selection */

export type PaymentsMode = { online: boolean; provider: ProviderId | null; demo: boolean };

export function paymentsMode(): PaymentsMode {
  const p = process.env.PAYMENT_PROVIDER ?? "stripe";
  if (p === "stripe" && process.env.STRIPE_SECRET_KEY) return { online: true, provider: "stripe", demo: false };
  if (process.env.NODE_ENV !== "production" || process.env.PAYMENTS_DEMO === "1") return { online: true, provider: "demo", demo: true };
  return { online: false, provider: null, demo: false };
}

export function activeProvider(): PaymentProvider | null {
  const m = paymentsMode();
  return m.online ? providerById(m.provider) : null;
}

export function providerById(id: ProviderId | null): PaymentProvider | null {
  return id === "stripe" ? stripeProvider : id === "demo" ? demo : null;
}

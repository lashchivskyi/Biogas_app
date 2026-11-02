import { z } from "zod";
import { PLAN_IDS, type PlanId } from "@/config/plans";
import { absoluteUrl } from "@/config/site";
import { getCountry } from "@/countries";
import { advise, assess } from "@/core";
import { getCoreCatalog } from "@/i18n";
import { coreLang, isLocale, type Locale } from "@/i18n/config";
import { offerCopy } from "@/i18n/offer";
import { deliverPaidReport, notifyOwner } from "../notify";
import { orders, type Order } from "../orders";
import { inputSchema } from "../validate";
import { activeProvider, providerById, type StatusResult } from "./providers";
import { CheckoutError, createPaymentQuote, verifyPaymentQuote } from "./quote";
export { CheckoutError } from "./quote";

export const checkoutSchema = z.object({
  plan: z.enum(PLAN_IDS as [PlanId, ...PlanId[]]),
  lang: z.string().refine(isLocale, "Unsupported locale"),
  email: z.string().trim().email().max(160),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  vatId: z.string().trim().max(40).optional().or(z.literal("")),
  consent: z.literal(true),
  /** Separate, unticked box: express request for immediate delivery + acknowledgement of losing withdrawal. */
  withdrawalWaiver: z.literal(true),
  paymentCurrency: z.enum(["EUR", "USD"]).optional(),
  quoteToken: z.string().max(4096).optional(),
  input: inputSchema,
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

const PRODUCT: Record<PlanId, { name: string; description: string }> = {
  standard: { name: "Standard Report — preliminary biogas project screening", description: "Automated pre-feasibility screening, not a feasibility study: base-case design, CAPEX/OPEX and cash flow for one project site" },
  report: { name: "Extended Report — preliminary biogas project screening", description: "Automated pre-feasibility screening, not a feasibility study: scenario and route comparisons, stress tests and support cases for one project site" },
};

/** A report on an INSUFFICIENT_DATA verdict would not answer the client's question, so it is not sold. */
export function assertSellable(a: Pick<ReturnType<typeof assess>, "verdict">) {
  if (a.verdict.id === "INSUFFICIENT_DATA") throw new CheckoutError("insufficient_data", 422);
}

/**
 * Creates the order (price from the plan table × the PROJECT country's tier, never from the client)
 * and a provider checkout session. Returns where to send the browser.
 */
export async function startCheckout(input: CheckoutInput): Promise<{ order: Order; redirectUrl: string }> {
  const country = getCountry(input.input.countryCode);
  const tier = country.priceTier;
  const provider = activeProvider();
  if (!provider) throw new CheckoutError("Online payment is not available", 503);
  const locale = (isLocale(input.lang) ? input.lang : "en") as Locale;
  await getCoreCatalog(locale); // registers the catalog the snapshot text is written from
  const reportLang = coreLang(locale);
  const assessmentSnapshot = assess({ ...input.input, lang: reportLang }, country, { asOfDate: new Date().toISOString().slice(0, 10) });
  assertSellable(assessmentSnapshot);
  // The action plan is part of what was sold: computed now, with break-even values, and stored with the snapshot.
  const advice = advise(assessmentSnapshot, country, { thresholds: true });
  if (advice) assessmentSnapshot.advice = advice;

  const quote = input.quoteToken ? verifyPaymentQuote(input.quoteToken, input) : createPaymentQuote(input);
  const { amountMinor, priceEurCents } = quote;

  const order = await orders.create({
    plan: input.plan,
    amountMinor,
    currency: quote.currency,
    paymentQuote: { currency: quote.currency, amountMinor, priceEurCents, rate: quote.rate, rateDate: quote.rateDate, issuedAt: quote.issuedAt, expiresAt: quote.expiresAt },
    priceEurCents,
    priceTier: tier,
    provider: provider.id,
    status: "created",
    lang: input.lang,
    customer: { email: input.email, name: input.name || undefined, company: input.company || undefined, vatId: input.vatId || undefined },
    input: { ...input.input, lang: reportLang },
    assessmentSnapshot,
    withdrawalWaiver: { at: new Date().toISOString(), text: offerCopy[locale].waiver },
  });
  const reportPath = `/${input.lang}/report/${order.reportToken}`;
  let session;
  try {
    session = await provider.create(
      order,
      { success: absoluteUrl(reportPath), cancel: absoluteUrl(`/${input.lang}/pricing?cancelled=1`), webhook: absoluteUrl(`/api/payments/webhook/${provider.id}`) },
      PRODUCT[input.plan],
    );
  } catch (error) {
    // No session exists, so no payment can arrive for this order; close it instead of leaving it "created".
    await orders.update(order.id, { status: "failed", notes: "Payment session could not be created" }, "checkout");
    throw error;
  }
  const updated = await orders.update(order.id, { providerRef: session.providerRef, status: "pending" }, "checkout");
  return { order: updated ?? order, redirectUrl: session.redirectUrl };
}

/** Applies a provider-reported status; refuses a "paid" whose amount does not match the order. */
export async function applyProviderStatus(order: Order, s: StatusResult, source: string): Promise<Order | null> {
  const paymentRef = s.paymentRef && !order.paymentRef ? { paymentRef: s.paymentRef } : {};
  const sameCurrency = s.currency === order.currency;
  if (s.status === "paid" && (!sameCurrency || s.amountMinor !== order.amountMinor)) {
    const note = `Payment mismatch: ${s.amountMinor ?? "unknown"} ${s.currency ?? "unknown"} vs order ${order.amountMinor} ${order.currency} — check manually`;
    const flagged = await orders.update(order.id, { ...paymentRef, notes: `${order.notes}\n[${new Date().toISOString()}] ${note}`.trim() }, source);
    await notifyOwner(`Payment mismatch on order ${order.id}`, [note, `Source: ${source}`, `Admin: ${absoluteUrl("/admin")}`]);
    return flagged;
  }
  const updated = await orders.update(order.id, { ...paymentRef, status: s.status, providerModifiedAt: s.modifiedAt, ...(s.billingCountry ? { billingCountry: s.billingCountry } : {}) }, source);
  // Throwing turns the webhook answer into a 500, so Stripe re-delivers until the link email goes out.
  if (updated?.status === "paid" && !(await deliverPaidReport(updated))) throw new Error(`Report link email failed for order ${order.id}`);
  return updated;
}

/** Pull the latest status from the provider (backup for missed webhooks). */
export async function refreshOrder(order: Order): Promise<Order> {
  if (["paid", "reversed", "failed", "expired", "cancelled"].includes(order.status)) return order;
  const provider = providerById(order.provider);
  if (!provider) return order;
  try {
    const s = await provider.fetchStatus(order);
    if (!s) return order;
    return (await applyProviderStatus(order, s, "poll")) ?? order;
  } catch {
    // The status may have been saved before the link email failed; show what is stored.
    return (await orders.get(order.id).catch(() => null)) ?? order;
  }
}

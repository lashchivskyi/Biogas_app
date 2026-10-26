import { z } from "zod";
import { PLAN_IDS, priceFor, type PlanId } from "@/config/plans";
import { absoluteUrl } from "@/config/site";
import { getCountry } from "@/countries";
import { isLocale } from "@/i18n/config";
import { orders, type Order } from "../orders";
import { inputSchema } from "../validate";
import { activeProvider, providerById, type StatusResult } from "./providers";

export const checkoutSchema = z.object({
  plan: z.enum(PLAN_IDS as [PlanId, ...PlanId[]]),
  lang: z.string().refine(isLocale, "Unsupported locale"),
  email: z.string().trim().email().max(160),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  vatId: z.string().trim().max(40).optional().or(z.literal("")),
  consent: z.literal(true),
  input: inputSchema,
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const PRODUCT: Record<PlanId, { name: string; description: string }> = {
  standard: { name: "Standard Feasibility Report", description: "Automated base-case biogas report: design, CAPEX/OPEX and cash flow for one project site" },
  report: { name: "Extended Feasibility Report", description: "Automated report with scenario and route comparisons, stress tests and support cases for one project site" },
};

/**
 * Creates the order (price from the plan table × the PROJECT country's tier, never from the client)
 * and a provider checkout session. Returns where to send the browser.
 */
export async function startCheckout(input: CheckoutInput): Promise<{ order: Order; redirectUrl: string }> {
  const country = getCountry(input.input.countryCode);
  const tier = country.priceTier;
  const priceEurCents = priceFor(input.plan, tier);
  const provider = activeProvider();
  if (!provider) throw new CheckoutError("Online payment is not available", 503);

  // monobank charges UAH: convert at the adapter's FX rate (UA) and round to whole hryvnia.
  const fx = provider.chargeCurrency === "UAH" ? getCountry("UA").params.find((p) => p.id === "econ.fx_local_per_eur")!.value : 1;
  const amountMinor = provider.chargeCurrency === "UAH" ? Math.round((priceEurCents / 100) * fx) * 100 : priceEurCents;

  const order = await orders.create({
    plan: input.plan,
    amountMinor,
    currency: provider.chargeCurrency,
    priceEurCents,
    priceTier: tier,
    provider: provider.id,
    status: "created",
    lang: input.lang,
    customer: { email: input.email, name: input.name || undefined, company: input.company || undefined, vatId: input.vatId || undefined },
    input: { ...input.input, lang: input.lang === "uk" ? "uk" : "en" },
  });
  const reportPath = `/${input.lang}/report/${order.reportToken}`;
  const { redirectUrl, providerRef } = await provider.create(
    order,
    { success: absoluteUrl(reportPath), cancel: absoluteUrl(`/${input.lang}/pricing?cancelled=1`), webhook: absoluteUrl(`/api/payments/webhook/${provider.id}`) },
    PRODUCT[input.plan],
  );
  const updated = await orders.update(order.id, { providerRef, status: "pending" }, "checkout");
  return { order: updated ?? order, redirectUrl };
}

/** Applies a provider-reported status; refuses a "paid" whose amount does not match the order. */
export async function applyProviderStatus(order: Order, s: StatusResult, source: string): Promise<Order | null> {
  const sameCurrency = !s.currency || s.currency === order.currency;
  if (s.status === "paid" && s.amountMinor !== undefined && sameCurrency && s.amountMinor !== order.amountMinor) {
    return orders.update(order.id, { notes: `${order.notes}\n[${new Date().toISOString()}] Paid amount ${s.amountMinor} ≠ order ${order.amountMinor} ${order.currency} — check manually`.trim() }, source);
  }
  return orders.update(order.id, { status: s.status, providerModifiedAt: s.modifiedAt }, source);
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
    return order;
  }
}

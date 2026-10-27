import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { priceFor, type PlanId } from "@/config/plans";
import { getCountry } from "@/countries";
import { fxFor } from "@/countries/sources";
import type { ProjectInput } from "@/core";
import { activeProvider } from "./providers";

export class CheckoutError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
type QuoteInput = { plan: PlanId; lang: string; input: ProjectInput; paymentCurrency?: "EUR" | "USD" };
export type PaymentQuote = {
  currency: "EUR" | "USD" | "UAH"; amountMinor: number; priceEurCents: number;
  rate: number; rateDate: string; issuedAt: string; expiresAt: string;
};
type SignedQuote = PaymentQuote & { provider: string; binding: string };
export type PublicPaymentQuote = PaymentQuote & { token: string; availableCurrencies: string[] };
const signatureKey = () => {
  const configured = process.env.CHECKOUT_QUOTE_SECRET ?? process.env.STRIPE_SECRET_KEY ?? process.env.MONOBANK_TOKEN;
  if (configured) return configured;
  const scope = globalThis as typeof globalThis & { __mxQuoteSecret?: string };
  return scope.__mxQuoteSecret ??= randomBytes(32).toString("hex"); // Development/demo only; shared by local route bundles.
};
const binding = (input: QuoteInput) => createHash("sha256").update(JSON.stringify({ plan: input.plan, lang: input.lang, input: input.input })).digest("hex");
const sign = (payload: string) => createHmac("sha256", signatureKey()).update(payload).digest("base64url");
const fresh = (rate: ReturnType<typeof fxFor>) => {
  const age = rate ? (Date.now() - Date.parse(`${rate.date}T00:00:00Z`)) / 86400000 : Infinity;
  return Boolean(rate && rate.value > 0 && age >= 0 && age <= 7);
};

export function availablePaymentCurrencies(): string[] {
  const provider = activeProvider();
  if (!provider) return [];
  if (provider.id === "monobank") return fresh(fxFor("UAH")) ? ["UAH"] : [];
  const usd = fxFor("USD");
  return fresh(usd) ? ["EUR", "USD"] : ["EUR"];
}

/** A dated commercial quote, not a claim that the reference FX is a bank execution rate. */
export function createPaymentQuote(input: QuoteInput): PublicPaymentQuote {
  const provider = activeProvider();
  if (!provider) throw new CheckoutError("Online payment is not available", 503);
  const availableCurrencies = availablePaymentCurrencies();
  if (!availableCurrencies.length) throw new CheckoutError("Current payment FX unavailable", 503);
  const currency = (provider.id === "monobank" ? "UAH" : availableCurrencies.includes(input.paymentCurrency ?? "EUR") ? input.paymentCurrency ?? "EUR" : "EUR") as PaymentQuote["currency"];
  const rate = currency === "EUR" ? { value: 1, date: new Date().toISOString().slice(0, 10) } : fxFor(currency)!;
  if (!(rate?.value > 0)) throw new CheckoutError("Currency quotation unavailable", 503);
  const priceEurCents = priceFor(input.plan, getCountry(input.input.countryCode).priceTier);
  const issuedAt = new Date().toISOString();
  const quote: SignedQuote = { currency, amountMinor: Math.round(priceEurCents * rate.value), priceEurCents,
    rate: rate.value, rateDate: rate.date, issuedAt, expiresAt: new Date(Date.now() + 30 * 60000).toISOString(), provider: provider.id, binding: binding(input) };
  const encoded = Buffer.from(JSON.stringify(quote)).toString("base64url");
  return { currency, amountMinor: quote.amountMinor, priceEurCents, rate: quote.rate, rateDate: quote.rateDate, issuedAt, expiresAt: quote.expiresAt, token: `${encoded}.${sign(encoded)}`, availableCurrencies };
}

export function verifyPaymentQuote(token: string, input: QuoteInput): PaymentQuote {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) throw new Error("Malformed quote");
    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error("Invalid signature");
    const quote = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignedQuote;
    if (quote.binding !== binding(input) || quote.provider !== activeProvider()?.id || Date.parse(quote.expiresAt) <= Date.now() || !Number.isFinite(Date.parse(quote.expiresAt))) throw new Error("Stale or mismatched quote");
    return quote;
  } catch { throw new CheckoutError("Quote expired or changed; review the payment total again", 409); }
}

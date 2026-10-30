import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fxFor } from "@/countries/sources";
import { convertedPlanPrice, PLAN_PRICES_EUR_CENTS, type PlanId } from "@/config/plans";
import { EXAMPLES } from "@/core/examples";
import { MODEL_VERSION } from "@/core/modelAudit";
import { signCity } from "../cities";
import { cityRegionId } from "@/core/location";

// isolate the JSON stores before the modules read their paths
const dir = mkdtempSync(join(tmpdir(), "biogas-pay-"));
process.env.ORDERS_FILE = join(dir, "orders.json");
process.env.LEADS_FILE = join(dir, "leads.json");
delete process.env.STRIPE_SECRET_KEY;

type Providers = typeof import("../payments/providers");
type Service = typeof import("../payments/service");
type Orders = typeof import("../orders");
let P: Providers;
let S: Service;
let O: Orders;
let Q: typeof import("../payments/quote");

beforeAll(async () => {
  P = await import("../payments/providers");
  S = await import("../payments/service");
  O = await import("../orders");
  Q = await import("../payments/quote");
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
afterAll(() => rmSync(dir, { recursive: true, force: true })); // Only this test's mkdtemp directory.

const input = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;
const req = (plan: PlanId, exampleId = "slaughter_5000") => ({ plan, lang: "en" as const, email: "t@example.com", consent: true as const, input: input(exampleId) });

describe("stripe", () => {
  it("passes the confirmed currency and subtotal without automatic FX and collects billing country", async () => {
    const { order } = await S.startCheckout(req("report"));
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_only");
    const create = vi.spyOn(P.stripe().checkout.sessions, "create").mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.com/test" } as never);
    await P.stripeProvider.create({ ...order, lang: "uk", currency: "USD", amountMinor: 21267 }, { success: "https://example.com/uk/report/token", cancel: "https://example.com/cancel", webhook: "https://example.com/webhook" }, { name: "Report", description: "Test" });
    const sent = create.mock.calls[0][0]!;
    expect(sent.adaptive_pricing).toEqual({ enabled: false });
    expect(sent.locale).toBe("en");
    expect(sent.billing_address_collection).toBe("required");
    expect(sent.line_items?.[0].price_data).toMatchObject({ currency: "usd", unit_amount: 21267 });
  });
  it("maps the UI language to a supported hosted-checkout locale", () => {
    expect(P.stripeCheckoutLocale("uk")).toBe("en");
    expect(P.stripeCheckoutLocale("sr")).toBe("en");
    expect(P.stripeCheckoutLocale("pt")).toBe("pt-BR");
    expect(P.stripeCheckoutLocale("de")).toBe("de");
  });
  it("maps checkout session states", () => {
    expect(P.mapStripeSession({ status: "complete", payment_status: "paid" })).toBe("paid");
    expect(P.mapStripeSession({ status: "expired", payment_status: "unpaid" })).toBe("expired");
    expect(P.mapStripeSession({ status: "open", payment_status: "unpaid" })).toBe("pending");
  });

  it("rejects webhooks without a valid signature", () => {
    expect(() => P.verifyStripeEvent("{}", null)).toThrow();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    expect(() => P.verifyStripeEvent("{}", "t=1,v1=bad")).toThrow();
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });
});

describe("checkout", () => {
  it("retains the selected city and its exact climate evidence in the purchased assessment", async () => {
    const region = (await import("@/countries")).COUNTRIES.UA.regions.find((r) => r.id === "lviv")!;
    const city = signCity({ id: 702550, countryCode: "UA", name: "Lviv", admin1: "Lviv Oblast", latitude: 49.83826, longitude: 24.02324,
      gridLatitude: 49.75, gridLongitude: 24, elevationM: region.altitudeM!, monthlyTempC: [...region.monthlyTempC], startDate: "2016-01-01", endDate: "2025-12-31", fetchedOn: "2026-10-27" });
    const request = req("report");
    const { order } = await S.startCheckout({ ...request, input: { ...request.input, city, regionId: cityRegionId(city) } });
    expect(order.input.city).toEqual(city);
    expect(order.assessmentSnapshot?.input.city).toEqual(city);
    expect(order.assessmentSnapshot?.climate.regionName).toBe("Lviv, Lviv Oblast");
    const before = JSON.stringify(order.assessmentSnapshot);
    await S.applyProviderStatus(order, { status: "paid", amountMinor: order.amountMinor, currency: order.currency }, "test");
    expect(JSON.stringify((await O.orders.get(order.id))?.assessmentSnapshot)).toBe(before);
  });
  it("uses the same commercial price rounded up to USD 10 for both plans in every country tier", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${fxFor("USD")!.date}T12:00:00Z`));
    expect(convertedPlanPrice(16000, "USD", 1.1193)).toBe(18000);
    expect(convertedPlanPrice(19000, "USD", 1.1193)).toBe(22000);
    for (const plan of ["standard", "report"] as const) for (const example of ["slaughter_5000", "de_nawaro", "it_whey"]) {
      const request = { ...req(plan, example), paymentCurrency: "USD" as const };
      const quote = Q.createPaymentQuote(request);
      expect(quote.amountMinor % 1000).toBe(0);
      expect(quote.amountMinor).toBe(convertedPlanPrice(quote.priceEurCents, "USD", quote.rate));
      expect(quote.amountMinor).toBeGreaterThanOrEqual(Math.round(quote.priceEurCents * quote.rate));
      expect(quote.amountMinor - Math.round(quote.priceEurCents * quote.rate)).toBeLessThan(1000);
      expect(convertedPlanPrice(quote.priceEurCents, "EUR", 1)).toBe(quote.priceEurCents);
    }
  });
  it("binds the exact dated USD quote to the plan, language and project before creating an order", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${fxFor("USD")!.date}T12:00:00Z`));
    const request = { ...req("report"), paymentCurrency: "USD" as const };
    const quote = Q.createPaymentQuote(request);
    expect(quote.currency).toBe("USD");
    expect(quote.amountMinor).toBe(convertedPlanPrice(PLAN_PRICES_EUR_CENTS.report.C, "USD", fxFor("USD")!.value));
    expect(quote.rateDate).toBe(fxFor("USD")!.date);
    expect(Q.verifyPaymentQuote(quote.token, request)).toMatchObject({ amountMinor: quote.amountMinor, currency: "USD" });
    expect(() => Q.verifyPaymentQuote(quote.token + "x", request)).toThrow(/Quote expired/);
    expect(() => Q.verifyPaymentQuote(quote.token, { ...request, plan: "standard" })).toThrow();
    expect(() => Q.verifyPaymentQuote(quote.token, { ...request, lang: "uk" })).toThrow();
    expect(() => Q.verifyPaymentQuote(quote.token, { ...request, input: input("de_nawaro") })).toThrow();
    const { order } = await S.startCheckout({ ...request, quoteToken: quote.token });
    expect(order.amountMinor).toBe(quote.amountMinor);
    expect(order.paymentQuote?.rateDate).toBe(quote.rateDate);
    expect(order.currency).toBe("USD");
    const after = await S.applyProviderStatus(order, { status: "paid", amountMinor: quote.amountMinor, currency: "USD", billingCountry: "CA" }, "test");
    expect(after?.billingCountry).toBe("CA");
    expect(after?.input.countryCode).toBe("UA");
    expect(after?.priceTier).toBe("C");
    vi.setSystemTime(new Date(`${fxFor("USD")!.date}T12:31:00Z`));
    expect(() => Q.verifyPaymentQuote(quote.token, request)).toThrow();
  });
  it("falls back to EUR for stale conversion rates", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(Date.parse(`${fxFor("USD")!.date}T00:00:00Z`) + 21 * 86400000));
    expect(Q.createPaymentQuote({ ...req("report"), paymentCurrency: "USD" }).currency).toBe("EUR");
    expect(Q.availablePaymentCurrencies()).toEqual(["EUR"]);
    vi.setSystemTime(new Date(`${fxFor("USD")!.date}T00:00:00Z`));
    const quote = Q.createPaymentQuote({ ...req("report"), paymentCurrency: "USD" });
    expect(quote.availableCurrencies).toEqual(["EUR", "USD"]);
    expect(quote.currency).toBe("USD");
    expect(quote.amountMinor).toBe(convertedPlanPrice(PLAN_PRICES_EUR_CENTS.report.C, "USD", fxFor("USD")!.value));
  });
  it("does not mark a payment as paid without both the amount and currency", async () => {
    const { order } = await S.startCheckout(req("report"));
    for (const status of [{ status: "paid" as const }, { status: "paid" as const, amountMinor: order.amountMinor }, { status: "paid" as const, currency: order.currency }]) {
      expect((await S.applyProviderStatus(order, status, "test"))?.status).not.toBe("paid");
    }
  });
  it("prices the order from config × the PROJECT country tier, never from the client", async () => {
    const ua = await S.startCheckout(req("report", "slaughter_5000")); // UA → tier C
    expect(ua.order.priceTier).toBe("C");
    expect(ua.order.amountMinor).toBe(PLAN_PRICES_EUR_CENTS.report.C);
    expect(ua.order.currency).toBe("EUR");
    const de = await S.startCheckout(req("standard", "de_nawaro")); // DE → tier A
    expect(de.order.priceTier).toBe("A");
    expect(de.order.amountMinor).toBe(PLAN_PRICES_EUR_CENTS.standard.A);
  });

  it("uses the demo provider outside production and returns a private report token", async () => {
    const { order, redirectUrl } = await S.startCheckout(req("report"));
    expect(order.provider).toBe("demo");
    expect(order.status).toBe("pending");
    expect(redirectUrl).toContain("/en/payment/demo?order=");
    expect(order.reportToken.length).toBeGreaterThanOrEqual(32);
    expect((await O.orders.byToken(order.reportToken))?.id).toBe(order.id);
  });

  it("rejects a paid notification with the wrong amount and keeps the order unpaid", async () => {
    const { order } = await S.startCheckout(req("report"));
    const after = await S.applyProviderStatus(order, { status: "paid", amountMinor: 100, currency: "EUR" }, "test");
    expect(after?.status).not.toBe("paid");
    expect(after?.notes).toMatch(/check manually/);
  });

  it("rejects payment in a different currency even when the numeric amount matches", async () => {
    const { order } = await S.startCheckout(req("report"));
    const after = await S.applyProviderStatus(order, { status: "paid", amountMinor: order.amountMinor, currency: "USD" }, "test");
    expect(after?.status).not.toBe("paid");
    expect(after?.notes).toMatch(/check manually/);
  });

  it("persists the exact assessment with model/data/input versions before payment and preserves it on updates", async () => {
    const { order } = await S.startCheckout(req("report"));
    const snapshot = JSON.stringify(order.assessmentSnapshot);
    expect(order.assessmentSnapshot!.dataAudit!.modelVersion).toBe(MODEL_VERSION);
    expect(order.assessmentSnapshot!.dataAudit!.dataVersion).toMatch(/^[0-9a-f]{16}$/);
    expect(order.assessmentSnapshot!.dataAudit!.asOfDate).toBe(order.createdAt.slice(0, 10));
    expect(JSON.stringify((await O.orders.byToken(order.reportToken))!.assessmentSnapshot)).toBe(snapshot);
    await S.applyProviderStatus(order, { status: "paid", amountMinor: order.amountMinor, currency: "EUR" }, "test");
    expect(JSON.stringify((await O.orders.byToken(order.reportToken))!.assessmentSnapshot)).toBe(snapshot);
  });

  it("paid is sticky against late pending/failed webhooks, but a refund is recorded", async () => {
    const { order } = await S.startCheckout(req("report"));
    await S.applyProviderStatus(order, { status: "paid", amountMinor: order.amountMinor, currency: "EUR" }, "test");
    const late = await O.orders.update(order.id, { status: "pending" }, "webhook");
    expect(late?.status).toBe("paid");
    const refund = await O.orders.update(order.id, { status: "reversed" }, "webhook");
    expect(refund?.status).toBe("reversed");
  });

  it("validates input", () => {
    expect(S.checkoutSchema.safeParse(req("report")).success).toBe(true);
    expect(S.checkoutSchema.safeParse({ ...req("report"), plan: "premium" }).success).toBe(false);
    expect(S.checkoutSchema.safeParse({ ...req("report"), plan: "expert" }).success).toBe(false);
    expect(S.checkoutSchema.safeParse(req("standard")).success).toBe(true);
    expect(S.checkoutSchema.safeParse({ ...req("report"), consent: false }).success).toBe(false);
    expect(S.checkoutSchema.safeParse({ ...req("report"), lang: "xx" }).success).toBe(false);
    expect(S.checkoutSchema.safeParse({ ...req("report"), email: "nope" }).success).toBe(false);
    expect(S.checkoutSchema.safeParse({ ...req("report"), input: { ...input("slaughter_5000"), countryCode: "ZZ" } }).success).toBe(false);
  });
});

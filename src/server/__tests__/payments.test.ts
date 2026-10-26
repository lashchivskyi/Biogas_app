import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PLAN_PRICES_EUR_CENTS, type PlanId } from "@/config/plans";
import { EXAMPLES } from "@/core/examples";

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

beforeAll(async () => {
  P = await import("../payments/providers");
  S = await import("../payments/service");
  O = await import("../orders");
});

const input = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;
const req = (plan: PlanId, exampleId = "slaughter_5000") => ({ plan, lang: "en" as const, email: "t@example.com", consent: true as const, input: input(exampleId) });

describe("monobank webhook signature", () => {
  it("accepts a valid ECDSA-SHA256 signature over the raw body and rejects tampering", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const body = JSON.stringify({ invoiceId: "inv1", status: "success", amount: 490000 });
    const sig = sign("sha256", Buffer.from(body), privateKey).toString("base64");
    expect(P.verifyMonoSignature(body, sig, pem)).toBe(true);
    expect(P.verifyMonoSignature(body.replace("490000", "1"), sig, pem)).toBe(false);
    expect(P.verifyMonoSignature(body, "garbage", pem)).toBe(false);
  });

  it("maps statuses", () => {
    expect(P.mapMonoStatus("success")).toBe("paid");
    expect(P.mapMonoStatus("processing")).toBe("pending");
    expect(P.mapMonoStatus("failure")).toBe("failed");
    expect(P.mapMonoStatus("reversed")).toBe("reversed");
  });
});

describe("stripe", () => {
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
  it("prices the order from config × the PROJECT country tier, never from the client", async () => {
    const ua = await S.startCheckout(req("report", "slaughter_5000")); // UA → tier C
    expect(ua.order.priceTier).toBe("C");
    expect(ua.order.amountMinor).toBe(PLAN_PRICES_EUR_CENTS.report.C);
    expect(ua.order.currency).toBe("EUR");
    const de = await S.startCheckout(req("standard", "de_guelle")); // DE → tier A
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

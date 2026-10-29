import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { EXAMPLES } from "@/core/examples";
import type { Locale } from "@/i18n/config";
import { appEnv, configProblems } from "../config";
import { redact, reportError, sentryEndpoint } from "../monitoring";

// isolate the JSON stores before the modules read their paths
const dir = mkdtempSync(join(tmpdir(), "biogas-ops-"));
process.env.ORDERS_FILE = join(dir, "orders.json");
process.env.LEADS_FILE = join(dir, "leads.json");
delete process.env.STRIPE_SECRET_KEY;
delete process.env.DATABASE_URL;

let O: typeof import("../orders");
let S: typeof import("../payments/service");
let P: typeof import("../payments/providers");
let webhook: typeof import("@/app/api/payments/webhook/stripe/route");
let cron: typeof import("@/app/api/cron/reconcile/route");
let health: typeof import("@/app/api/health/route");

beforeAll(async () => {
  [O, S, P, webhook, cron, health] = await Promise.all([
    import("../orders"), import("../payments/service"), import("../payments/providers"),
    import("@/app/api/payments/webhook/stripe/route"), import("@/app/api/cron/reconcile/route"), import("@/app/api/health/route"),
  ]);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
afterAll(() => rmSync(dir, { recursive: true, force: true })); // Only this test's mkdtemp directory.

const input = EXAMPLES.find((e) => e.id === "slaughter_5000")!.input;
const checkout = (lang: Locale = "de") => S.startCheckout({ plan: "report", lang, email: "buyer@example.com", consent: true, input });
const mailer = () => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM", "Methalytics <reports@mail.example.com>");
  vi.stubEnv("OWNER_EMAIL", "owner@example.com");
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
};
const sent = (fetch: ReturnType<typeof mailer>) => fetch.mock.calls.filter(([url]) => String(url).includes("resend")).map(([, init]) => JSON.parse(String(init!.body)) as { to: string[]; subject: string; text: string });

const good = {
  NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://methalytics.com", STRIPE_SECRET_KEY: "sk_live_x", STRIPE_WEBHOOK_SECRET: "whsec_x",
  CHECKOUT_QUOTE_SECRET: "q".repeat(32), LOCATION_SIGNING_SECRET: "l".repeat(32), DATABASE_URL: "postgres://u:p@h/db",
  ADMIN_USER: "owner", ADMIN_PASSWORD: "p".repeat(20), RESEND_API_KEY: "re_x", EMAIL_FROM: "a@b.c", OWNER_EMAIL: "o@b.c", CRON_SECRET: "c", SENTRY_DSN: "https://k@s.io/1",
};

const legal = { entity: "Example OÜ", registration: "12345678", address: "Tallinn", email: "legal@example.com" };
const check = (env: Record<string, string | undefined>) => configProblems(env, legal);

describe("deployment configuration", () => {
  it("detects the stage and skips checks for local previews", () => {
    expect(appEnv({ NODE_ENV: "development" })).toBe("local");
    expect(appEnv({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe("staging");
    expect(appEnv({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe("production");
    expect(appEnv({ NODE_ENV: "production", APP_ENV: "local" })).toBe("local");
    expect(configProblems({ NODE_ENV: "production", APP_ENV: "local" })).toEqual({ errors: [], warnings: [] });
  });
  it("accepts a complete production setup", () => {
    expect(check(good)).toEqual({ errors: [], warnings: [] });
  });
  it("blocks settings that give away reports, lose orders or drop payments", () => {
    const errors = (env: Record<string, string | undefined>) => check({ ...good, ...env }).errors.join("\n");
    expect(errors({ PAYMENTS_DEMO: "1" })).toMatch(/PAYMENTS_DEMO/);
    expect(errors({ STRIPE_SECRET_KEY: "sk_test_x" })).toMatch(/live Stripe key/);
    expect(errors({ STRIPE_WEBHOOK_SECRET: undefined })).toMatch(/STRIPE_WEBHOOK_SECRET/);
    expect(errors({ DATABASE_URL: undefined })).toMatch(/DATABASE_URL/);
    expect(errors({ DATABASE_URL: undefined, STORAGE: "json" })).toMatch(/ORDERS_FILE/);
    expect(errors({ DATABASE_URL: undefined, STORAGE: "json", ORDERS_FILE: "/data/o.json", LEADS_FILE: "/data/l.json" })).toBe("");
    expect(errors({ LOCATION_SIGNING_SECRET: "q".repeat(32) })).toMatch(/must all differ/);
    expect(errors({ CHECKOUT_QUOTE_SECRET: "short" })).toMatch(/CHECKOUT_QUOTE_SECRET/);
    expect(errors({ NEXT_PUBLIC_SITE_URL: "http://methalytics.com" })).toMatch(/NEXT_PUBLIC_SITE_URL/);
    expect(errors({ ADMIN_PASSWORD: "short" })).toMatch(/ADMIN_PASSWORD/);
    expect(errors({ RESEND_API_KEY: undefined })).toMatch(/RESEND_API_KEY/);
    expect(configProblems(good, { ...legal, entity: "[Legal entity — fill in]" }).errors.join(" ")).toMatch(/SITE.legal/);
  });
  it("lets staging use Stripe test mode and treats missing email as a warning there", () => {
    const staging = { ...good, VERCEL_ENV: "preview", STRIPE_SECRET_KEY: "sk_test_x", RESEND_API_KEY: undefined };
    const result = check(staging);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join("\n")).toMatch(/RESEND_API_KEY/);
    expect(check({ ...staging, STRIPE_SECRET_KEY: "sk_live_x" }).errors.join("\n")).toMatch(/test key/);
    expect(check({ ...good, PAYMENT_PROVIDER: "off", STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined }).errors).toEqual([]);
  });
});

describe("error reporting", () => {
  it("removes report tokens, session ids and emails", () => {
    expect(redact("GET /en/report/AbCdEfGhIjKlMnOpQrStUvWxYz012345?session_id=cs_live_1 from a.b@c.de"))
      .toBe("GET /en/report/[token]?session_id=[redacted] from [email]");
    expect(redact("/api/payments/status?token=AbCdEfGhIjKlMnOpQrSt&x=1")).toBe("/api/payments/status?token=[redacted]&x=1");
  });
  it("parses a Sentry DSN into the envelope endpoint", () => {
    expect(sentryEndpoint("https://abc@o1.ingest.de.sentry.io/4507")).toEqual({ url: "https://o1.ingest.de.sentry.io/api/4507/envelope/", key: "abc" });
    expect(sentryEndpoint("not a dsn")).toBeNull();
  });
  it("sends a redacted envelope to Sentry when configured", async () => {
    vi.stubEnv("SENTRY_DSN", "https://abc@o1.ingest.sentry.io/42");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    await reportError(new Error("failed for x@y.com"), { path: "/uk/report/AbCdEfGhIjKlMnOpQrStUvWx" });
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://o1.ingest.sentry.io/api/42/envelope/");
    expect(String(init!.body)).not.toMatch(/x@y\.com|AbCdEfGhIjKlMnOpQrStUvWx/);
    expect(String(init!.body)).toMatch(/\/uk\/report\/\[token\]/);
  });
});

describe("report delivery", () => {
  it("emails the private link once in the order language and notifies the owner", async () => {
    const fetch = mailer();
    const { order } = await checkout("de");
    const paid = { status: "paid" as const, amountMinor: order.amountMinor, currency: order.currency };
    await S.applyProviderStatus(order, paid, "webhook");
    await S.applyProviderStatus(order, paid, "poll");
    const mails = sent(fetch);
    const customer = mails.filter((m) => m.to[0] === "buyer@example.com");
    expect(customer).toHaveLength(1);
    expect(customer[0].subject).toBe("Ihr Methalytics-Bericht ist fertig");
    expect(customer[0].text).toContain(`/de/report/${order.reportToken}`);
    expect(mails.filter((m) => m.to[0] === "owner@example.com")).toHaveLength(1);
  });
  it("releases the claim when sending fails so the next status check retries", async () => {
    mailer().mockResolvedValueOnce(new Response("down", { status: 503 }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { order } = await checkout("en");
    const paid = { status: "paid" as const, amountMinor: order.amountMinor, currency: order.currency };
    await S.applyProviderStatus(order, paid, "webhook");
    expect((await O.orders.get(order.id))?.customerNotifiedAt).toBeUndefined();
    await S.applyProviderStatus(order, paid, "poll");
    expect((await O.orders.get(order.id))?.customerNotifiedAt).toBeTruthy();
  });
  it("does not email unpaid or mismatched orders, and alerts the owner on a mismatch", async () => {
    const fetch = mailer();
    const { order } = await checkout("en");
    await S.applyProviderStatus(order, { status: "paid", amountMinor: 1, currency: order.currency }, "webhook");
    const mails = sent(fetch);
    expect(mails.map((m) => m.to[0])).toEqual(["owner@example.com"]);
    expect(mails[0].subject).toMatch(/mismatch/);
  });
});

describe("stripe webhook", () => {
  const post = (event: object) => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_only"); // after any demo checkout: the client needs a key to exist
    const payload = JSON.stringify(event);
    const signature = P.stripe().webhooks.generateTestHeaderString({ payload, secret: "whsec_test" });
    return webhook.POST(new Request("https://example.com/api/payments/webhook/stripe", { method: "POST", body: payload, headers: { "stripe-signature": signature } }));
  };
  const event = (type: string, object: object) => ({ id: `evt_${Math.random()}`, type, created: Math.floor(Date.now() / 1000), data: { object } });

  it("rejects an invalid signature", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const res = await webhook.POST(new Request("https://example.com/x", { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=bad" } }));
    expect(res.status).toBe(400);
  });
  it("marks paid with the PaymentIntent, closes access on a full refund and keeps it on a partial one", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const { order } = await checkout("en");
    const session = { id: order.providerRef, client_reference_id: order.id, status: "complete", payment_status: "paid", amount_subtotal: order.amountMinor, currency: order.currency.toLowerCase(), payment_intent: "pi_full" };
    expect((await post(event("checkout.session.completed", session))).status).toBe(200);
    expect(await O.orders.get(order.id)).toMatchObject({ status: "paid", paymentRef: "pi_full" });
    await post(event("charge.refunded", { payment_intent: "pi_full", amount: order.amountMinor, amount_refunded: 500, currency: "eur" }));
    expect(await O.orders.get(order.id)).toMatchObject({ status: "paid", notes: expect.stringMatching(/Partial refund/) });
    await post(event("charge.refunded", { payment_intent: "pi_full", amount: order.amountMinor, amount_refunded: order.amountMinor, currency: "eur" }));
    expect((await O.orders.get(order.id))?.status).toBe("reversed");
  });
  it("records a dispute on the order and alerts the owner", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const fetch = mailer();
    const { order } = await checkout("en");
    await O.orders.update(order.id, { status: "paid", paymentRef: "pi_dispute" }, "test");
    await post(event("charge.dispute.created", { payment_intent: "pi_dispute", amount: order.amountMinor, currency: "eur", reason: "fraudulent", evidence_details: { due_by: 1_800_000_000 } }));
    expect((await O.orders.get(order.id))?.notes).toMatch(/Dispute opened \(fraudulent\).*evidence due 2027-01-15/);
    expect(sent(fetch).some((m) => m.to[0] === "owner@example.com" && /Dispute/.test(m.subject))).toBe(true);
  });
  it("answers 500 on a processing failure so Stripe retries", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(O.orders, "findByProviderRef").mockRejectedValue(new Error("db down"));
    const res = await post(event("checkout.session.completed", { id: "cs_x", client_reference_id: null, status: "complete", payment_status: "paid", amount_subtotal: 1, currency: "eur", payment_intent: null }));
    expect(res.status).toBe(500);
  });
});

describe("operations endpoints", () => {
  it("protects the reconciliation cron and refreshes only orders past the grace period", async () => {
    expect((await cron.GET(new Request("https://example.com/api/cron/reconcile"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "cron-secret");
    expect((await cron.GET(new Request("https://example.com/api/cron/reconcile", { headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
    const { order } = await checkout("en");
    const run = async () => (await cron.GET(new Request("https://example.com/api/cron/reconcile", { headers: { authorization: "Bearer cron-secret" } }))).json() as Promise<Record<string, number>>;
    const before = await run();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse(order.createdAt) + 10 * 60_000);
    const after = await run();
    expect(after.checked).toBeGreaterThan(before.checked);
  });
  it("reports storage health without secrets", async () => {
    const res = await health.GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, storage: "json" });
  });
});

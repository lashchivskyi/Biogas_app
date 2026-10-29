import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EXAMPLES } from "@/core/examples";
import type { Database } from "../db";

// isolate the JSON stores before the modules read their paths
const dir = mkdtempSync(join(tmpdir(), "biogas-store-"));
process.env.ORDERS_FILE = join(dir, "orders.json");
process.env.LEADS_FILE = join(dir, "leads.json");
delete process.env.STRIPE_SECRET_KEY;
delete process.env.DATABASE_URL;

type Orders = typeof import("../orders");
type Leads = typeof import("../leads");
type Db = typeof import("../db");
let O: Orders;
let L: Leads;
let D: Db;
let pglite: PGlite;
let pg: Database;

beforeAll(async () => {
  [O, L, D] = await Promise.all([import("../orders"), import("../leads"), import("../db")]);
  pglite = new PGlite();
  pg = {
    query: (text, params) => pglite.query(text, params) as never,
    transaction: (fn) => pglite.transaction((tx) => fn({ query: (text, params) => tx.query(text, params) as never })),
  };
});
afterAll(async () => {
  D.useDatabase(undefined);
  await pglite.close();
  rmSync(dir, { recursive: true, force: true }); // Only this test's mkdtemp directory.
});

const input = EXAMPLES.find((e) => e.id === "slaughter_5000")!.input;
const snapshot = { verdict: { id: "go" }, b: 2, a: 1, nested: { z: [1, 2.5, null], y: "ü" } } as never;
const draft = (over: Partial<import("../orders").NewOrder> = {}): import("../orders").NewOrder => ({
  plan: "report", amountMinor: 19000, currency: "EUR", priceEurCents: 19000, priceTier: "C", provider: "stripe", status: "created",
  lang: "en", customer: { email: "t@example.com" }, input, assessmentSnapshot: snapshot, ...over,
});

const stores = () => [
  ["json", () => { D.useDatabase(null); }],
  ["postgres", () => { D.useDatabase(pg); }],
] as const;

describe.each(stores())("order repository (%s)", (_name, select) => {
  beforeAll(() => select());

  it("creates, finds by token/provider/payment refs and keeps the snapshot byte-identical", async () => {
    const o = await O.orders.create(draft());
    expect(o.reportToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(JSON.stringify((await O.orders.byToken(o.reportToken))!.assessmentSnapshot)).toBe(JSON.stringify(snapshot));
    expect(await O.orders.byToken("not a token")).toBeNull();
    const pending = await O.orders.update(o.id, { status: "pending", providerRef: `cs_${o.id}` }, "checkout");
    expect(JSON.stringify(pending!.assessmentSnapshot)).toBe(JSON.stringify(snapshot));
    expect((await O.orders.findByProviderRef(`cs_${o.id}`))?.id).toBe(o.id);
    await O.orders.update(o.id, { paymentRef: `pi_${o.id}` }, "webhook");
    expect((await O.orders.findByPaymentRef(`pi_${o.id}`))?.id).toBe(o.id);
    expect((await O.orders.get(o.id))?.history.map((h) => h.status)).toEqual(["created", "pending"]);
  });

  it("applies the shared status rules: sticky paid, refund, stale provider events and admin override", async () => {
    const o = await O.orders.create(draft());
    await O.orders.update(o.id, { status: "paid", providerModifiedAt: "2026-10-29T10:00:00.000Z" }, "webhook");
    expect((await O.orders.update(o.id, { status: "failed" }, "webhook"))?.status).toBe("paid");
    expect((await O.orders.update(o.id, { status: "pending", providerModifiedAt: "2026-10-29T09:00:00.000Z" }, "webhook"))?.status).toBe("paid");
    expect((await O.orders.update(o.id, { status: "reversed" }, "webhook"))?.status).toBe("reversed");
    expect((await O.orders.update(o.id, { status: "pending" }, "webhook"))?.status).toBe("reversed");
    expect((await O.orders.update(o.id, { status: "paid" }, "admin"))?.status).toBe("paid");
    expect(await O.orders.update("missing", { status: "paid" }, "admin")).toBeNull();
  });

  it("lists newest first without snapshots and returns only recent open orders for reconciliation", async () => {
    const open = await O.orders.create(draft());
    const closed = await O.orders.create(draft());
    await O.orders.update(closed.id, { status: "expired" }, "webhook");
    const list = await O.orders.list();
    expect(list.every((o) => o.assessmentSnapshot === undefined)).toBe(true);
    expect(list.map((o) => o.createdAt)).toEqual([...list.map((o) => o.createdAt)].sort().reverse());
    const due = await O.orders.listOpen(new Date(Date.now() - 60_000).toISOString(), 100);
    expect(due.map((o) => o.id)).toContain(open.id);
    expect(due.map((o) => o.id)).not.toContain(closed.id);
    expect(await O.orders.listOpen(new Date(Date.now() + 60_000).toISOString(), 100)).toEqual([]);
  });

  it("grants the customer-email claim exactly once, even concurrently, and can release it", async () => {
    const o = await O.orders.create(draft({ status: "paid" }));
    const claims = await Promise.all(Array.from({ length: 6 }, () => O.orders.claimCustomerNotice(o.id)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await O.orders.get(o.id))?.customerNotifiedAt).toBeTruthy();
    await O.orders.update(o.id, { customerNotifiedAt: undefined }, "email");
    expect((await O.orders.get(o.id))?.customerNotifiedAt).toBeUndefined();
    expect(await O.orders.claimCustomerNotice(o.id)).toBe(true);
    expect(await O.orders.claimCustomerNotice("missing")).toBe(false);
  });

  it("stores and updates leads", async () => {
    const lead = await L.leads.add({ name: "N", phone: "+380", input, verdict: "go" as never, confidence: "medium" as never, route: "chp", summary: { tonnesYear: 1, kwEl: 2, capexEur: 3, paybackYears: null, npvEur: 4 } });
    expect((await L.leads.get(lead.id))?.status).toBe("new");
    expect((await L.leads.update(lead.id, { status: "contacted", notes: "called" }))?.notes).toBe("called");
    expect((await L.leads.list())[0].id).toBe(lead.id);
    expect(await L.leads.update("missing", { notes: "x" })).toBeNull();
  });
});

describe("postgres schema", () => {
  it("applies versioned migrations once and is safe to re-run", async () => {
    expect(await D.migrate(pg)).toBe(0); // already applied by useDatabase above
    const { rows } = await pg.query<{ version: number }>("SELECT version FROM schema_migrations ORDER BY version");
    expect(rows.map((r) => Number(r.version))).toEqual(D.MIGRATIONS.map((_, i) => i + 1));
  });

  it("runs a full checkout against Postgres with the immutable assessment snapshot", async () => {
    D.useDatabase(pg);
    const S = await import("../payments/service");
    const { order } = await S.startCheckout({ plan: "report", lang: "en", email: "t@example.com", consent: true, input });
    const before = JSON.stringify(order.assessmentSnapshot);
    expect(before.length).toBeGreaterThan(10_000);
    const paid = await S.applyProviderStatus(order, { status: "paid", amountMinor: order.amountMinor, currency: order.currency, paymentRef: "pi_pg" }, "test");
    expect(paid?.status).toBe("paid");
    expect(paid?.paymentRef).toBe("pi_pg");
    expect(JSON.stringify((await O.orders.byToken(order.reportToken))?.assessmentSnapshot)).toBe(before);
  });
});

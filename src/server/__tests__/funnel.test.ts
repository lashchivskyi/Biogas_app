import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ageBucket, dimsKey, FUNNEL_EVENTS, FUNNEL_STAGES, pageClass, referrerClass, sanitizeEvent, SERVER_EVENTS, summarizeFunnel, summarizeVisits, type FunnelRecord } from "@/lib/funnel";
import type { Database } from "../db";

const dir = mkdtempSync(join(tmpdir(), "biogas-funnel-"));
process.env.FUNNEL_FILE = join(dir, "funnel.json");
delete process.env.DATABASE_URL;

describe("funnel contract: no free text, URL or contact detail can pass", () => {
  it("drops unknown events, unknown keys and any value that is not a short slug, finite number or boolean", () => {
    expect(sanitizeEvent("user_signed_in", { email: "a@b.c" })).toBeNull();
    expect(sanitizeEvent("checkout_submit", { plan: "standard", country: "DE", email: "a@b.c", name: "Anna" })).toEqual({ event: "checkout_submit", props: { plan: "standard", country: "DE" } });
    for (const bad of ["a@b.c", "https://x.test/en/report/abc", "two words", "x".repeat(65), "ü", "", "a.b"]) {
      expect(sanitizeEvent("whatif_applied", { source: bad })!.props).toEqual({});
    }
    expect(sanitizeEvent("calculator_step", { step: Number.NaN })!.props).toEqual({});
    expect(sanitizeEvent("calculator_step", { step: Number.POSITIVE_INFINITY })!.props).toEqual({});
    expect(sanitizeEvent("calculator_step", { step: 1e12 })!.props).toEqual({});
    expect(sanitizeEvent("calculator_submit", { npv_keur: -1234.567, payback_y: 7.25 })!.props).toEqual({ npv_keur: -1234.57, payback_y: 7.25 });
    expect(sanitizeEvent("constructor", {})).toBeNull();
    expect(sanitizeEvent("page_view", null)).toEqual({ event: "page_view", props: {} });
  });

  it("classifies pages and referrers without passing the path, token or referrer through", () => {
    expect(pageClass("/en/report/Zx9_secretToken_0123456789abcdef")).toBe("report");
    expect(pageClass("/uk")).toBe("home");
    expect(pageClass("/de/biogas/dairy-farms")).toBe("segment");
    expect(pageClass("/fr/pricing")).toBe("pricing");
    expect(pageClass("/fr/whatever/else")).toBe("other");
    expect(referrerClass("", "methalytics.com")).toBe("direct");
    expect(referrerClass("https://www.google.de/search?q=biogas", "methalytics.com")).toBe("search");
    expect(referrerClass("https://methalytics.com/en", "methalytics.com")).toBe("internal");
    expect(referrerClass("https://newsletter.example/x", "methalytics.com")).toBe("other");
    expect(referrerClass("not a url", "methalytics.com")).toBe("other");
  });

  it("buckets report views by days since payment; day 0 is delivery, later is a return", () => {
    const paid = "2026-11-01T10:00:00.000Z";
    const at = (iso: string) => ageBucket(paid, Date.parse(iso));
    expect(at("2026-11-01T20:00:00.000Z")).toBe("d0");
    expect(at("2026-11-03T10:00:00.000Z")).toBe("d1_7");
    expect(at("2026-11-20T10:00:00.000Z")).toBe("d8_30");
    expect(at("2027-01-20T10:00:00.000Z")).toBe("d31p");
    expect(ageBucket(undefined)).toBe("unknown");
  });

  it("every stage names a known event; the money stages come only from the server", () => {
    for (const s of FUNNEL_STAGES) expect(FUNNEL_EVENTS).toContain(s.event);
    for (const id of ["checkout_created", "paid", "report_opened", "report_return"]) expect(SERVER_EVENTS.has(FUNNEL_STAGES.find((s) => s.id === id)!.event)).toBe(true);
  });

  it("summarises stages with step conversion and counts every return bucket", () => {
    const row = (event: string, props: Record<string, string | number | boolean>, count: number) => ({ day: "2026-11-04", event, dims: dimsKey(props), count });
    const s = summarizeFunnel([
      row("page_view", { page: "home", entry: true, ref: "search" }, 100),
      row("page_view", { page: "pricing", entry: false }, 12),
      row("calculator_start", {}, 40),
      row("calculator_submit", { verdict: "WEAK" }, 20),
      row("checkout_open", { plan: "standard" }, 6),
      row("checkout_created", { plan: "standard", tier: "A", currency: "EUR" }, 3),
      row("payment_paid", { plan: "standard", tier: "A", currency: "EUR" }, 2),
      row("report_view", { plan: "standard", age: "d0" }, 3),
      row("report_view", { plan: "standard", age: "d8_30" }, 1),
      row("report_view", { plan: "standard", age: "d31p" }, 1),
    ]);
    const by = Object.fromEntries(s.map((x) => [x.id, x]));
    expect(by.visit.count).toBe(100);
    expect(by.calculator_start.ofPrevious).toBeCloseTo(0.4);
    expect(by.pricing_view.count).toBe(12);
    expect(by.paid.ofPrevious).toBeCloseTo(2 / 3);
    expect(by.report_opened.count).toBe(5);
    expect(by.report_return.count).toBe(2);
  });

  it("counts visits, crediting webhook payments to the visit that created the order, so a repeated payment counts once", () => {
    const ev = (event: string, visit: string | null, order: string | null = null, props: FunnelRecord["props"] = {}): FunnelRecord => ({ at: "2026-11-04T10:00:00.000Z", event, visit, order, props });
    const by = Object.fromEntries(summarizeVisits([
      ev("page_view", "v1", null, { entry: true }),
      ev("page_view", "v2", null, { entry: true }),
      ev("calculator_start", "v1"),
      ev("calculator_start", "v1"),
      ev("checkout_created", "v1", "o1"),
      ev("payment_paid", null, "o1"),
      ev("payment_paid", null, "o1"),
      ev("payment_paid", null, "o2"),
      ev("report_view", "v9", "o1", { age: "d8_30" }),
    ]).map((x) => [x.id, x]));
    expect(by.visit.count).toBe(2);
    expect(by.calculator_start.count).toBe(1);
    expect(by.paid.count).toBe(2);
    expect(by.report_return.count).toBe(1);
  });
});

describe("funnel store and public endpoint", () => {
  let pglite: PGlite;
  let pg: Database;
  let D: typeof import("../db");
  let F: typeof import("../funnel");
  let R: typeof import("@/app/api/events/route");
  beforeAll(async () => {
    [D, F, R] = await Promise.all([import("../db"), import("../funnel"), import("@/app/api/events/route")]);
    pglite = new PGlite();
    pg = { query: (text, params) => pglite.query(text, params) as never, transaction: (fn) => pglite.transaction((tx) => fn({ query: (text, params) => tx.query(text, params) as never })) };
  });
  afterAll(async () => {
    D.useDatabase(undefined);
    await pglite.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it.each(["json", "postgres"] as const)("stores each event with a daily-salted visit id and the order id (%s)", async (kind) => {
    D.useDatabase(kind === "json" ? null : pg);
    const at = new Date("2026-11-04T12:00:00Z");
    const from = (ua: string) => ({ headers: new Headers({ "x-real-ip": "203.0.113.7", "user-agent": ua }) });
    await F.recordEvent("checkout_open", { plan: "report" }, { from: from("A"), at });
    await F.recordEvent("checkout_open", { plan: "standard" }, { from: from("A"), at });
    await F.recordEvent("checkout_open", { plan: "report" }, { from: from("B"), at });
    await F.recordEvent("payment_paid", { plan: "report", email: "a@b.c" } as never, { order: "o1", at });
    const events = (await F.funnelEvents("2026-11-04")).filter((e) => e.at.startsWith("2026-11-04T12"));
    expect(events.map((e) => [e.event, e.props])).toEqual([["checkout_open", { plan: "report" }], ["checkout_open", { plan: "standard" }], ["checkout_open", { plan: "report" }], ["payment_paid", { plan: "report" }]]);
    expect(events[0].visit).toMatch(/^[0-9a-f]{16}$/);
    expect(events[1].visit).toBe(events[0].visit);
    expect(events[2].visit).not.toBe(events[0].visit);
    expect(events[3]).toMatchObject({ visit: null, order: "o1" });
    expect(JSON.stringify(events)).not.toContain("203.0.113.7");
  });

  it("the endpoint stores browser events, refuses server-only events and cross-site posts, and never errors", async () => {
    D.useDatabase(null);
    const post = (body: string, headers: Record<string, string> = {}) =>
      R.POST(new Request("https://x.test/api/events", { method: "POST", body, headers: { "sec-fetch-site": "same-origin", "user-agent": "Mozilla/5.0", ...headers } }));
    for (const res of await Promise.all([
      post(JSON.stringify({ e: "calculator_start", p: {} })),
      post(JSON.stringify({ e: "payment_paid", p: { plan: "report" } })),
      post(JSON.stringify({ e: "calculator_start", p: {} }), { "sec-fetch-site": "cross-site" }),
      post(JSON.stringify({ e: "calculator_start", p: {} }), { "user-agent": "Googlebot/2.1" }),
      post("not json"),
      post("x".repeat(3000)),
    ])) expect(res.status).toBe(204);
    const stored = JSON.parse(readFileSync(process.env.FUNNEL_FILE!, "utf8")) as FunnelRecord[];
    expect(stored.filter((r) => r.event === "calculator_start")).toHaveLength(1);
    expect(stored.find((r) => r.event === "calculator_start")?.visit).toMatch(/^[0-9a-f]{16}$/);
    expect(stored.some((r) => r.event === "payment_paid" && r.visit)).toBe(false);
  });
});

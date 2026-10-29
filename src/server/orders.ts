import { randomBytes } from "node:crypto";
import type { Assessment, ProjectInput } from "@/core";
import type { PlanId } from "@/config/plans";
import { database, type Database } from "./db";
import { dataFile, exclusive, readJsonArray, writeJsonArray } from "./jsonFile";
import type { PaymentQuote } from "./payments/quote";

export type OrderStatus = "created" | "pending" | "paid" | "failed" | "expired" | "reversed" | "cancelled";
export type ProviderId = "stripe" | "demo";

export interface Order {
  id: string;
  /** Unguessable token that grants access to the paid report (/[lang]/report/[token]). */
  reportToken: string;
  createdAt: string;
  updatedAt: string;
  /** Legacy expert orders retain their report access; that service is no longer sold. */
  plan: PlanId | "expert";
  /** Integer minor units (cents / kopiyky) — never floats for money. */
  amountMinor: number;
  currency: string;
  /** Price in EUR cents from the plan table (reference, regardless of charge currency). */
  priceEurCents: number;
  priceTier: "A" | "B" | "C";
  paymentQuote?: PaymentQuote;
  /** Actual billing country returned by the payment provider; never inferred from project or language. */
  billingCountry?: string;
  provider: ProviderId;
  providerRef?: string;
  /** Underlying payment id (e.g. Stripe PaymentIntent) for refund matching. */
  paymentRef?: string;
  providerModifiedAt?: string;
  /** Set once the private report link was emailed to the customer (exactly-once delivery claim). */
  customerNotifiedAt?: string;
  status: OrderStatus;
  lang: string;
  customer: { email: string; name?: string; company?: string; vatId?: string };
  /** Project input and immutable calculation saved at checkout. Legacy orders have no snapshot. */
  input: ProjectInput;
  assessmentSnapshot?: Assessment;
  notes: string;
  history: Array<{ at: string; status: OrderStatus; source: string }>;
}

export type NewOrder = Omit<Order, "id" | "reportToken" | "createdAt" | "updatedAt" | "history" | "notes">;
export type OrderPatch = Partial<Pick<Order, "status" | "providerRef" | "paymentRef" | "providerModifiedAt" | "notes" | "billingCountry" | "customerNotifiedAt">>;

export interface OrderRepository {
  /** Newest first, without assessment snapshots (admin overview). */
  list(): Promise<Order[]>;
  get(id: string): Promise<Order | null>;
  byToken(token: string): Promise<Order | null>;
  findByPaymentRef(ref: string): Promise<Order | null>;
  findByProviderRef(ref: string): Promise<Order | null>;
  /** Unfinished orders created after `since`, oldest first, without snapshots (reconciliation). */
  listOpen(since: string, limit: number): Promise<Order[]>;
  create(o: NewOrder): Promise<Order>;
  update(id: string, patch: OrderPatch, source: string): Promise<Order | null>;
  /** Atomically marks the customer email as sent; true only for the first caller. */
  claimCustomerNotice(id: string): Promise<boolean>;
}

const FINAL: OrderStatus[] = ["paid", "failed", "expired", "reversed", "cancelled"];
const OPEN: OrderStatus[] = ["created", "pending"];
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

function newOrder(o: NewOrder): Order {
  const now = new Date().toISOString();
  return {
    ...o,
    id: randomBytes(9).toString("base64url"),
    reportToken: randomBytes(24).toString("base64url"),
    createdAt: now,
    updatedAt: now,
    notes: "",
    history: [{ at: now, status: o.status, source: "create" }],
  };
}

/**
 * Status rules shared by every store. `paid` is sticky against late `pending`/`failed` events
 * (webhooks can arrive out of order); `reversed` may follow `paid` (refund). Admin may override.
 */
export function applyOrderPatch(cur: Order, patch: OrderPatch, source: string): Order {
  if (patch.providerModifiedAt && cur.providerModifiedAt && patch.providerModifiedAt < cur.providerModifiedAt) return cur;
  let status = patch.status ?? cur.status;
  if (cur.status === "paid" && status !== "reversed" && status !== "paid" && source !== "admin") status = "paid";
  if (FINAL.includes(cur.status) && cur.status !== "paid" && status === "pending" && source !== "admin") status = cur.status;
  const now = new Date().toISOString();
  const next: Order = { ...cur, ...patch, status, updatedAt: now };
  if (status !== cur.status) next.history = [...cur.history, { at: now, status, source }];
  return next;
}

const withoutSnapshot = (o: Order): Order => {
  const rest = { ...o };
  delete rest.assessmentSnapshot;
  return rest;
};

/* ------------------------------------------------------------------ JSON file (development, single process) */

const FILE = dataFile("ORDERS_FILE", "orders.json");

const jsonOrders: OrderRepository = {
  async list() {
    return (await readJsonArray<Order>(FILE)).map(withoutSnapshot).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(id) {
    return (await readJsonArray<Order>(FILE)).find((o) => o.id === id) ?? null;
  },
  async byToken(token) {
    if (!TOKEN.test(token)) return null;
    return (await readJsonArray<Order>(FILE)).find((o) => o.reportToken === token) ?? null;
  },
  async findByPaymentRef(ref) {
    return (await readJsonArray<Order>(FILE)).find((o) => o.paymentRef === ref) ?? null;
  },
  async findByProviderRef(ref) {
    return (await readJsonArray<Order>(FILE)).find((o) => o.providerRef === ref) ?? null;
  },
  async listOpen(since, limit) {
    return (await readJsonArray<Order>(FILE)).filter((o) => OPEN.includes(o.status) && o.createdAt >= since)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, limit).map(withoutSnapshot);
  },
  create(o) {
    return exclusive(FILE, async () => {
      const all = await readJsonArray<Order>(FILE);
      const order = newOrder(o);
      all.push(order);
      await writeJsonArray(FILE, all);
      return order;
    });
  },
  update(id, patch, source) {
    return exclusive(FILE, async () => {
      const all = await readJsonArray<Order>(FILE);
      const i = all.findIndex((o) => o.id === id);
      if (i < 0) return null;
      const next = applyOrderPatch(all[i], patch, source);
      if (next === all[i]) return next;
      all[i] = next;
      await writeJsonArray(FILE, all);
      return next;
    });
  },
  claimCustomerNotice(id) {
    return exclusive(FILE, async () => {
      const all = await readJsonArray<Order>(FILE);
      const i = all.findIndex((o) => o.id === id);
      if (i < 0 || all[i].customerNotifiedAt) return false;
      all[i] = { ...all[i], customerNotifiedAt: new Date().toISOString() };
      await writeJsonArray(FILE, all);
      return true;
    });
  },
};

/* ------------------------------------------------------------------ Postgres (production) */

type Row = { record: Order; snapshot?: Order["assessmentSnapshot"] | null };
const FULL = "SELECT record, snapshot FROM orders";
const SLIM = "SELECT record FROM orders";
const toOrder = (r: Row): Order => (r.snapshot ? { ...r.record, assessmentSnapshot: r.snapshot } : r.record);
const one = (rows: Row[]) => (rows[0] ? toOrder(rows[0]) : null);
const columns = (o: Order) => [o.status, o.providerRef ?? null, o.paymentRef ?? null, JSON.stringify(withoutSnapshot(o))];

export function postgresOrders(db: Database): OrderRepository {
  return {
    async list() {
      return (await db.query<Row>(`${SLIM} ORDER BY created_at DESC`)).rows.map(toOrder);
    },
    async get(id) {
      return one((await db.query<Row>(`${FULL} WHERE id = $1`, [id])).rows);
    },
    async byToken(token) {
      if (!TOKEN.test(token)) return null;
      return one((await db.query<Row>(`${FULL} WHERE report_token = $1`, [token])).rows);
    },
    async findByPaymentRef(ref) {
      return one((await db.query<Row>(`${SLIM} WHERE payment_ref = $1 ORDER BY created_at DESC LIMIT 1`, [ref])).rows);
    },
    async findByProviderRef(ref) {
      return one((await db.query<Row>(`${SLIM} WHERE provider_ref = $1 ORDER BY created_at DESC LIMIT 1`, [ref])).rows);
    },
    async listOpen(since, limit) {
      return (await db.query<Row>(`${SLIM} WHERE status = ANY($1) AND created_at >= $2 ORDER BY created_at LIMIT $3`, [OPEN, since, limit])).rows.map(toOrder);
    },
    async create(o) {
      const order = newOrder(o);
      await db.query(
        "INSERT INTO orders (id, report_token, created_at, status, provider_ref, payment_ref, record, snapshot) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::json)",
        [order.id, order.reportToken, order.createdAt, ...columns(order), order.assessmentSnapshot ? JSON.stringify(order.assessmentSnapshot) : null],
      );
      return order;
    },
    update(id, patch, source) {
      return db.transaction(async (tx) => {
        const cur = (await tx.query<Row>(`${SLIM} WHERE id = $1 FOR UPDATE`, [id])).rows[0]?.record;
        if (!cur) return null;
        const next = applyOrderPatch(cur, patch, source);
        const { rows } = await tx.query<{ snapshot: Row["snapshot"] }>(
          next === cur ? "SELECT snapshot FROM orders WHERE id = $1" : "UPDATE orders SET status = $2, provider_ref = $3, payment_ref = $4, record = $5::jsonb WHERE id = $1 RETURNING snapshot",
          next === cur ? [id] : [id, ...columns(next)],
        );
        return toOrder({ record: next, snapshot: rows[0]?.snapshot });
      });
    },
    async claimCustomerNotice(id) {
      const { rows } = await db.query(
        "UPDATE orders SET record = jsonb_set(record, '{customerNotifiedAt}', to_jsonb($2::text)) WHERE id = $1 AND NOT (record ? 'customerNotifiedAt') RETURNING id",
        [id, new Date().toISOString()],
      );
      return rows.length === 1;
    },
  };
}

/* ------------------------------------------------------------------ selection */

async function repo(): Promise<OrderRepository> {
  const db = database();
  return db ? postgresOrders(await db) : jsonOrders;
}

export const orders: OrderRepository = {
  list: async () => (await repo()).list(),
  get: async (id) => (await repo()).get(id),
  byToken: async (token) => (await repo()).byToken(token),
  findByPaymentRef: async (ref) => (await repo()).findByPaymentRef(ref),
  findByProviderRef: async (ref) => (await repo()).findByProviderRef(ref),
  listOpen: async (since, limit) => (await repo()).listOpen(since, limit),
  create: async (o) => (await repo()).create(o),
  update: async (id, patch, source) => (await repo()).update(id, patch, source),
  claimCustomerNotice: async (id) => (await repo()).claimCustomerNotice(id),
};

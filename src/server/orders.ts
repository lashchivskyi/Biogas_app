import { randomBytes } from "node:crypto";
import type { ProjectInput } from "@/core";
import type { PlanId } from "@/config/plans";
import { dataFile, exclusive, readJsonArray, writeJsonArray } from "./jsonFile";

export type OrderStatus = "created" | "pending" | "paid" | "failed" | "expired" | "reversed" | "cancelled";
export type ProviderId = "stripe" | "monobank" | "demo";

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
  provider: ProviderId;
  providerRef?: string;
  /** Underlying payment id (e.g. Stripe PaymentIntent) for refund matching. */
  paymentRef?: string;
  providerModifiedAt?: string;
  status: OrderStatus;
  lang: string;
  customer: { email: string; name?: string; company?: string; vatId?: string };
  /** The project the report is about (re-assessed on the server when the report is opened). */
  input: ProjectInput;
  notes: string;
  history: Array<{ at: string; status: OrderStatus; source: string }>;
}

const FILE = dataFile("ORDERS_FILE", "orders.json");
const FINAL: OrderStatus[] = ["paid", "failed", "expired", "reversed", "cancelled"];

export const orders = {
  async list(): Promise<Order[]> {
    return (await readJsonArray<Order>(FILE)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(id: string): Promise<Order | null> {
    return (await readJsonArray<Order>(FILE)).find((o) => o.id === id) ?? null;
  },
  async byToken(token: string): Promise<Order | null> {
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
    return (await readJsonArray<Order>(FILE)).find((o) => o.reportToken === token) ?? null;
  },
  async findByPaymentRef(ref: string): Promise<Order | null> {
    return (await readJsonArray<Order>(FILE)).find((o) => o.paymentRef === ref) ?? null;
  },
  async findByProviderRef(ref: string): Promise<Order | null> {
    return (await readJsonArray<Order>(FILE)).find((o) => o.providerRef === ref) ?? null;
  },
  create(o: Omit<Order, "id" | "reportToken" | "createdAt" | "updatedAt" | "history" | "notes">): Promise<Order> {
    return exclusive(FILE, async () => {
      const all = await readJsonArray<Order>(FILE);
      const now = new Date().toISOString();
      const order: Order = {
        ...o,
        id: randomBytes(9).toString("base64url"),
        reportToken: randomBytes(24).toString("base64url"),
        createdAt: now,
        updatedAt: now,
        notes: "",
        history: [{ at: now, status: o.status, source: "create" }],
      };
      all.push(order);
      await writeJsonArray(FILE, all);
      return order;
    });
  },
  /**
   * Apply a status change. `paid` is sticky against late `pending`/`failed` events (webhooks can
   * arrive out of order); `reversed` may follow `paid` (refund). Admin may override.
   */
  update(id: string, patch: Partial<Pick<Order, "status" | "providerRef" | "paymentRef" | "providerModifiedAt" | "notes">>, source: string): Promise<Order | null> {
    return exclusive(FILE, async () => {
      const all = await readJsonArray<Order>(FILE);
      const i = all.findIndex((o) => o.id === id);
      if (i < 0) return null;
      const cur = all[i];
      if (patch.providerModifiedAt && cur.providerModifiedAt && patch.providerModifiedAt < cur.providerModifiedAt) return cur;
      let status = patch.status ?? cur.status;
      if (cur.status === "paid" && status !== "reversed" && status !== "paid" && source !== "admin") status = "paid";
      if (FINAL.includes(cur.status) && cur.status !== "paid" && status === "pending" && source !== "admin") status = cur.status;
      const now = new Date().toISOString();
      const next: Order = { ...cur, ...patch, status, updatedAt: now };
      if (status !== cur.status) next.history = [...cur.history, { at: now, status, source }];
      all[i] = next;
      await writeJsonArray(FILE, all);
      return next;
    });
  },
};

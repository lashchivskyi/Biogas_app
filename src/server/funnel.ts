import { createHash, randomBytes } from "node:crypto";
import { sanitizeEvent, type FunnelEvent, type FunnelProps, type FunnelRecord } from "@/lib/funnel";
import { database } from "./db";
import { dataFile, exclusive, readJsonArray, writeJsonArray } from "./jsonFile";
import { clientIp, type HeaderSource } from "./rateLimit";

/** Funnel event log: Postgres when DATABASE_URL is set, otherwise data/funnel.json for local development. */
const FILE = dataFile("FUNNEL_FILE", "funnel.json");
/** About 13 months, so a year can be compared with the year before; older events are deleted. */
export const RETENTION_DAYS = 400;

let salt: { day: string; value: string } | null = null;

/** Today's salt, shared by every instance through Postgres; yesterday's is deleted, so old visit ids cannot be recomputed. */
async function dailySalt(day: string): Promise<string> {
  if (salt?.day === day) return salt.value;
  let value = randomBytes(16).toString("hex");
  const pending = database();
  if (pending) {
    const db = await pending;
    const { rows } = await db.query<{ salt: string }>(
      "INSERT INTO funnel_salts (day, salt) VALUES ($1, $2) ON CONFLICT (day) DO UPDATE SET salt = funnel_salts.salt RETURNING salt",
      [day, value],
    );
    value = rows[0]?.salt ?? value;
    await db.query("DELETE FROM funnel_salts WHERE day < $1", [day]);
  }
  salt = { day, value };
  return value;
}

/** Pseudonymous visit id: hash of today's salt, address and browser. Neither the address nor the browser is stored. */
export async function visitId(from: HeaderSource, at = new Date()): Promise<string> {
  const value = await dailySalt(at.toISOString().slice(0, 10));
  return createHash("sha256").update(`${value}|${clientIp(from)}|${from.headers.get("user-agent") ?? ""}`).digest("hex").slice(0, 16);
}

export interface EventContext {
  /** The request the event came from; gives the visit id. Webhooks have none and are linked through `order`. */
  from?: HeaderSource;
  order?: string;
  at?: Date;
}

export async function recordEvent(event: FunnelEvent, props: FunnelProps = {}, ctx: EventContext = {}): Promise<void> {
  const clean = sanitizeEvent(event, props);
  if (!clean) return;
  const at = ctx.at ?? new Date();
  const visit = ctx.from ? await visitId(ctx.from, at) : null;
  const order = ctx.order ?? null;
  const pending = database();
  if (pending) {
    const db = await pending;
    await db.query("INSERT INTO funnel_events (at, event, visit, order_id, props) VALUES ($1, $2, $3, $4, $5)", [at.toISOString(), clean.event, visit, order, JSON.stringify(clean.props)]);
    if (Math.random() < 0.01) await db.query(`DELETE FROM funnel_events WHERE at < now() - interval '${RETENTION_DAYS} days'`);
    return;
  }
  await exclusive(FILE, async () => {
    const cutoff = new Date(at.getTime() - RETENTION_DAYS * 86_400_000).toISOString();
    const rows = (await readJsonArray<FunnelRecord>(FILE)).filter((r) => r.at >= cutoff);
    rows.push({ at: at.toISOString(), event: clean.event, visit, order, props: clean.props });
    await writeJsonArray(FILE, rows);
  });
}

/** Never lets analytics fail a payment, a webhook or a page. */
export const recordEventSafely = (event: FunnelEvent, props: FunnelProps = {}, ctx: EventContext = {}) => recordEvent(event, props, ctx).catch(() => undefined);

/** Events from `since` (YYYY-MM-DD) on, oldest first. */
export async function funnelEvents(since: string): Promise<FunnelRecord[]> {
  const pending = database();
  if (pending) {
    const db = await pending;
    const { rows } = await db.query<{ at: string | Date; event: string; visit: string | null; order_id: string | null; props: FunnelProps | string }>(
      "SELECT at, event, visit, order_id, props FROM funnel_events WHERE at >= $1 ORDER BY at, id",
      [since],
    );
    return rows.map((r) => ({
      at: typeof r.at === "string" ? new Date(r.at).toISOString() : r.at.toISOString(),
      event: r.event,
      visit: r.visit,
      order: r.order_id,
      props: typeof r.props === "string" ? JSON.parse(r.props) : r.props,
    }));
  }
  return (await readJsonArray<FunnelRecord>(FILE)).filter((r) => r.at >= since);
}

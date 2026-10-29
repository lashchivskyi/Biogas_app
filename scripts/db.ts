/**
 * Postgres maintenance for the order/lead store (DATABASE_URL must be set; nothing is printed from rows).
 *
 *   npx tsx scripts/db.ts migrate                       apply pending schema migrations
 *   npx tsx scripts/db.ts import-json <orders> <leads>  copy JSON-file stores in; existing ids are kept, never overwritten
 *   npx tsx scripts/db.ts export-json <dir>             write orders.json + leads.json (backup / restore drill; contains PII)
 *
 * Exported files have the same shape as the JSON store, so `import-json` restores them into an empty database.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { migrate, type Database } from "../src/server/db";
import type { Lead } from "../src/server/leads";
import type { Order } from "../src/server/orders";

const [command, ...args] = process.argv.slice(2);
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL first");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db: Database = {
  query: (text, params) => pool.query(text, params) as never,
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn({ query: (text, params) => client.query(text, params) as never });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};

const readArray = <T>(file: string): T[] => {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${file} is not a JSON array`);
  return parsed as T[];
};

async function main() {
  const applied = await migrate(db);
  if (command === "migrate") {
    console.log(`migrations applied: ${applied}`);
  } else if (command === "import-json" && args.length === 2) {
    let orders = 0;
    for (const { assessmentSnapshot, ...o } of readArray<Order>(args[0])) {
      const r = await db.query("INSERT INTO orders (id, report_token, created_at, status, provider_ref, payment_ref, record, snapshot) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::json) ON CONFLICT (id) DO NOTHING RETURNING id",
        [o.id, o.reportToken, o.createdAt, o.status, o.providerRef ?? null, o.paymentRef ?? null, JSON.stringify(o), assessmentSnapshot ? JSON.stringify(assessmentSnapshot) : null]);
      orders += r.rows.length;
    }
    let leads = 0;
    for (const l of readArray<Lead>(args[1])) {
      const r = await db.query("INSERT INTO leads (id, created_at, record) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id", [l.id, l.createdAt, JSON.stringify(l)]);
      leads += r.rows.length;
    }
    console.log(`imported orders: ${orders}, leads: ${leads} (existing ids skipped)`);
  } else if (command === "export-json" && args.length === 1) {
    mkdirSync(args[0], { recursive: true });
    const orders = (await db.query<{ record: Order; snapshot: Order["assessmentSnapshot"] | null }>("SELECT record, snapshot FROM orders ORDER BY created_at")).rows
      .map((r) => (r.snapshot ? { ...r.record, assessmentSnapshot: r.snapshot } : r.record));
    const leads = (await db.query<{ record: Lead }>("SELECT record FROM leads ORDER BY created_at")).rows.map((r) => r.record);
    writeFileSync(path.join(args[0], "orders.json"), JSON.stringify(orders));
    writeFileSync(path.join(args[0], "leads.json"), JSON.stringify(leads));
    console.log(`exported orders: ${orders.length}, leads: ${leads.length} → ${path.resolve(args[0])}`);
  } else {
    throw new Error("Usage: migrate | import-json <orders.json> <leads.json> | export-json <dir>");
  }
}

main().finally(() => pool.end()).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

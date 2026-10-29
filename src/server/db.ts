import type { Pool, PoolClient } from "pg";

/**
 * Postgres access for production storage. With DATABASE_URL unset (local development, tests) the
 * repositories keep using the JSON files in jsonFile.ts. Schema changes are additive, versioned
 * migrations applied once per process under an advisory lock (docs/architecture.md §7).
 */
export interface Sql {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}
export interface Database extends Sql {
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
}

/** Append only. Never edit an applied migration; add a new one (expand → migrate → contract). */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE orders (
     id text PRIMARY KEY,
     report_token text NOT NULL UNIQUE,
     provider_ref text,
     payment_ref text,
     status text NOT NULL,
     created_at timestamptz NOT NULL,
     record jsonb NOT NULL,
     snapshot json
   );
   CREATE INDEX orders_provider_ref ON orders (provider_ref) WHERE provider_ref IS NOT NULL;
   CREATE INDEX orders_payment_ref ON orders (payment_ref) WHERE payment_ref IS NOT NULL;
   CREATE INDEX orders_status_created ON orders (status, created_at);
   CREATE TABLE leads (
     id text PRIMARY KEY,
     created_at timestamptz NOT NULL,
     record jsonb NOT NULL
   );`,
];

const MIGRATION_LOCK = 724_001;

export async function migrate(db: Database): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK]);
    await tx.query("CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const { rows } = await tx.query<{ version: number }>("SELECT version FROM schema_migrations");
    const applied = new Set(rows.map((r) => Number(r.version)));
    let count = 0;
    for (const [i, sql] of MIGRATIONS.entries()) {
      if (applied.has(i + 1)) continue;
      for (const statement of sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean)) await tx.query(statement);
      await tx.query("INSERT INTO schema_migrations (version) VALUES ($1)", [i + 1]);
      count++;
    }
    return count;
  });
}

function fromPool(pool: Pool): Database {
  return {
    query: (text, params) => pool.query(text, params) as never,
    async transaction(fn) {
      const client: PoolClient = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({ query: (text, params) => client.query(text, params) as never });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function connect(url: string): Promise<Database> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX) || 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 8_000 });
  const db = fromPool(pool);
  await migrate(db);
  return db;
}

const scope = globalThis as typeof globalThis & { __mxDb?: Promise<Database>; __mxDbOverride?: Promise<Database> | null };

/** Shared connection when DATABASE_URL is configured; null selects the JSON-file development store. */
export function database(): Promise<Database> | null {
  if (scope.__mxDbOverride !== undefined) return scope.__mxDbOverride;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  scope.__mxDb ??= connect(url).catch((error) => {
    scope.__mxDb = undefined; // Retry on the next request instead of caching a failed connection.
    throw error;
  });
  return scope.__mxDb;
}

/** Tests and scripts: use a given database (migrated first), or null for the JSON store; undefined restores the default. */
export function useDatabase(db: Database | null | undefined): void {
  scope.__mxDbOverride = db === undefined ? undefined : db === null ? null : migrate(db).then(() => db);
}

export const storageKind = () => (database() ? "postgres" : "json");

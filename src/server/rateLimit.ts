/** Naive per-key sliding-window limiter in process memory (enough against casual abuse; use a WAF/Redis at scale). */
type Bucket = { hits: number[]; windowMs: number };
const buckets = new Map<string, Bucket>();
const SWEEP_AT = 5_000;

/** Drops buckets whose window has passed, so keys from many addresses cannot grow memory without bound. */
function sweep(now: number) {
  for (const [key, b] of buckets) if (b.hits.every((t) => now - t >= b.windowMs)) buckets.delete(key);
}

export function rateLimited(key: string, max: number, windowMs = 3_600_000): boolean {
  const now = Date.now();
  if (buckets.size >= SWEEP_AT) sweep(now);
  const recent = (buckets.get(key)?.hits ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, { hits: recent, windowMs });
  return recent.length > max;
}

/**
 * The in-memory check first, then a counter shared by every instance when Postgres is configured
 * (serverless instances each hold their own memory). Fixed windows, so a burst at a boundary may
 * reach 2 × max. Fails open: a limiter outage must not stop sales.
 */
export async function rateLimitedShared(key: string, max: number, windowMs = 3_600_000): Promise<boolean> {
  if (rateLimited(key, max, windowMs)) return true;
  const { database } = await import("./db");
  const pending = database();
  if (!pending) return false;
  try {
    const db = await pending;
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
    const { rows } = await db.query<{ hits: number }>(
      "INSERT INTO rate_limits (key, window_start, hits) VALUES ($1, $2, 1) ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1 RETURNING hits",
      [key, windowStart],
    );
    if (Math.random() < 0.01) await db.query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
    return Number(rows[0]?.hits) > max;
  } catch {
    return false;
  }
}

/**
 * Caller address for rate limiting. The LEFT-most X-Forwarded-For entry is whatever the client sent,
 * so a script could rotate it to dodge every limit (including admin password guessing). Platform
 * headers are set by the edge itself; otherwise the RIGHT-most entry is the one our proxy appended.
 */
/** Anything with request headers: a Request, or `await headers()` in a server component. */
export type HeaderSource = { headers: Pick<Headers, "get"> };

export function clientIp(request: HeaderSource): string {
  const h = request.headers;
  const platform = h.get("x-vercel-forwarded-for") ?? h.get("cf-connecting-ip") ?? h.get("x-real-ip");
  if (platform?.trim()) return platform.trim();
  const chain = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return chain?.length ? chain[chain.length - 1] : "local";
}

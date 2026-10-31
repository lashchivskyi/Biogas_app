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
 * Caller address for rate limiting. The LEFT-most X-Forwarded-For entry is whatever the client sent,
 * so a script could rotate it to dodge every limit (including admin password guessing). Platform
 * headers are set by the edge itself; otherwise the RIGHT-most entry is the one our proxy appended.
 */
export function clientIp(request: Request): string {
  const h = request.headers;
  const platform = h.get("x-vercel-forwarded-for") ?? h.get("cf-connecting-ip") ?? h.get("x-real-ip");
  if (platform?.trim()) return platform.trim();
  const chain = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return chain?.length ? chain[chain.length - 1] : "local";
}

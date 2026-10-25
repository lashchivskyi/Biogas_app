/** Naive per-key sliding-window limiter in process memory (enough against casual abuse; use a WAF/Redis at scale). */
const buckets = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs = 3_600_000): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > max;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

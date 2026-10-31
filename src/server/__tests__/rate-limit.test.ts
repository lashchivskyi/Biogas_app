import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimited } from "../rateLimit";

const req = (headers: Record<string, string>) => new Request("https://x.test/", { headers });

describe("rate limiter", () => {
  afterEach(() => vi.useRealTimers());

  it("blocks after max hits inside the window and recovers after it", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) expect(rateLimited("k1", 3, 1000)).toBe(false);
    expect(rateLimited("k1", 3, 1000)).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(rateLimited("k1", 3, 1000)).toBe(false);
  });

  it("does not let a client choose its own address by prepending to X-Forwarded-For", () => {
    const a = clientIp(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }));
    const b = clientIp(req({ "x-forwarded-for": "2.2.2.2, 203.0.113.7" }));
    expect(a).toBe("203.0.113.7");
    expect(b).toBe(a);
  });

  it("prefers the platform header over the forwarded chain", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "9.9.9.9" }))).toBe("198.51.100.4");
    expect(clientIp(req({}))).toBe("local");
  });
});

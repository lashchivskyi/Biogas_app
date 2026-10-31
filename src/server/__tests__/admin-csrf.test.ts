import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy, sameSite } from "@/proxy";

const req = (headers: Record<string, string>, method = "PATCH") => new NextRequest("https://methalytics.com/api/admin/orders/x", { method, headers });

describe("admin cross-site protection", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts same-origin and non-browser calls, refuses cross-site ones", () => {
    expect(sameSite(req({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(sameSite(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(sameSite(req({ "sec-fetch-site": "same-site" }))).toBe(false);
    expect(sameSite(req({ origin: "https://evil.example", host: "methalytics.com" }))).toBe(false);
    expect(sameSite(req({ origin: "https://methalytics.com", host: "methalytics.com" }))).toBe(true);
    expect(sameSite(req({}))).toBe(true);
  });

  it("returns 403 for an authenticated cross-site PATCH and lets a same-origin one through", () => {
    vi.stubEnv("ADMIN_USER", "owner");
    vi.stubEnv("ADMIN_PASSWORD", "a-long-admin-password-123");
    const authorization = `Basic ${Buffer.from("owner:a-long-admin-password-123").toString("base64")}`;
    expect(proxy(req({ authorization, "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect(proxy(req({ authorization, "sec-fetch-site": "same-origin" })).status).toBe(200);
    expect(proxy(req({ authorization, "sec-fetch-site": "cross-site" }, "GET")).status).toBe(200);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { countryCode, countryFromHeaders, detectVisitorLocation, isLocalHost } from "../visitor-location";
import { GET } from "@/app/api/location/route";
import { pickLocale } from "@/proxy";
import { NextRequest } from "next/server";

afterEach(() => vi.restoreAllMocks());
const fetchMock = (...responses: Response[]) => {
  const mock = vi.fn<typeof fetch>();
  for (const response of responses) mock.mockResolvedValueOnce(response);
  return mock;
};

describe("visitor IP country", () => {
  it("selects the new IP country's language ahead of stale cookies and browser language", () => {
    const previous = encodeURIComponent(JSON.stringify({ country: "US", detectedCountry: "US" }));
    expect(pickLocale(new NextRequest("https://example.com", { headers: { "x-vercel-ip-country": "IT", "accept-language": "uk", cookie: `NEXT_LOCALE=uk; mx_context=${previous}` } }))).toBe("it");
    expect(pickLocale(new NextRequest("https://example.com", { headers: { "x-vercel-ip-country": "US", cookie: `NEXT_LOCALE=uk; mx_context=${previous}` } }))).toBe("uk");
  });
  it("accepts ISO-shaped codes and ignores provider placeholders and malformed responses", () => {
    expect(countryCode(" us\n")).toBe("US");
    for (const bad of ["XX", "T1", "error", "USA", null, { country: "US" }, "<html>"]) expect(countryCode(bad)).toBeUndefined();
    expect(countryFromHeaders(new Headers({ "x-vercel-ip-country": "XX", "cf-ipcountry": "PL" }))).toBe("PL");
  });
  it.each(["CH", "PT", "JP", "AE"])("chooses English for newly detected unsupported %s ahead of other language hints", (country) => {
    const request = (context: object) => new NextRequest("https://example.com", { headers: {
      "x-vercel-ip-country": country, "accept-language": "uk,pl;q=0.9", cookie: `NEXT_LOCALE=uk; mx_context=${encodeURIComponent(JSON.stringify(context))}`,
    } });
    expect(pickLocale(request({ country: "UA", detectedCountry: "UA" }))).toBe("en");
    expect(pickLocale(request({ country: "DE", detectedCountry: country }))).toBe("en");
    expect(pickLocale(request({ country: "DE", detectedCountry: country, locationDefaultsVersion: 2 }))).toBe("uk");
  });
  it("returns fresh CDN country without caching or invoking an external service", async () => {
    const fetcher = fetchMock(Response.json({ country: "IT" }));
    expect(await detectVisitorLocation({ hostname: "example.com", timeZone: "Europe/Kyiv", fetcher })).toEqual({ country: "IT", source: "ip" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]).toMatchObject(["/api/location", { cache: "no-store", credentials: "same-origin" }]);
  });
  it("uses the browser's public IP service on localhost, rather than the unchanged timezone", async () => {
    const fetcher = fetchMock(Response.json({ country: null }), new Response("US\n"), Response.json({ country: null }), new Response("PL"));
    const options = { hostname: "localhost", timeZone: "Europe/Kyiv", localIpEnabled: true, fetcher };
    expect(await detectVisitorLocation(options)).toEqual({ country: "US", source: "ip" });
    expect(await detectVisitorLocation(options)).toEqual({ country: "PL", source: "ip" });
    expect(fetcher.mock.calls[1]).toMatchObject(["https://ipapi.co/country/", { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" }]);
  });
  it("never calls the local-development external fallback on public production hosts or when disabled", async () => {
    for (const options of [{ hostname: "example.com", localIpEnabled: true }, { hostname: "localhost", localIpEnabled: false }]) {
      const fetcher = fetchMock(Response.json({ country: null }));
      expect(await detectVisitorLocation({ ...options, timeZone: "Europe/Rome", fetcher })).toEqual({ country: "IT", source: "timezone" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
    expect(isLocalHost("localhost.evil.example")).toBe(false);
    expect(isLocalHost("[::1]")).toBe(true);
  });
  it("labels network failure, rate limiting and invalid responses as fallback, not IP detection", async () => {
    for (const response of [new Response("rate limited", { status: 429 }), new Response('{"error":true}'), new Response("XX")]) {
      const fetcher = fetchMock(Response.json({ country: null }), response);
      expect(await detectVisitorLocation({ hostname: "127.0.0.1", localIpEnabled: true, timeZone: "Europe/Warsaw", fetcher })).toEqual({ country: "PL", source: "timezone" });
    }
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
    expect(await detectVisitorLocation({ hostname: "localhost", localIpEnabled: true, timeZone: "unknown", fetcher })).toEqual({ country: undefined, source: "unknown" });
  });
  it("does not start a third-party request after unmount/cancellation", async () => {
    const controller = new AbortController(); controller.abort();
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    expect(await detectVisitorLocation({ hostname: "localhost", localIpEnabled: true, timeZone: "Europe/Rome", fetcher, signal: controller.signal })).toEqual({ source: "unknown" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("the no-store endpoint reads each new request's country and clears stale geo on localhost", async () => {
    for (const country of ["US", "IT", "PL"]) {
      const response = await GET(new Request("https://example.com/api/location", { headers: { "x-vercel-ip-country": country } }));
      expect(await response.json()).toEqual({ country });
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.cookies.get("mx_country")?.value).toBe(country);
    }
    const local = await GET(new Request("http://localhost/api/location", { headers: { cookie: "mx_country=US" } }));
    expect(await local.json()).toEqual({ country: null });
    expect(local.cookies.get("mx_country")?.value).toBe("");
  });
});

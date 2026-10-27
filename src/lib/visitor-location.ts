import { TZ_COUNTRY } from "@/i18n/config";

export type VisitorLocation = { country?: string; source: "ip" | "timezone" | "unknown" };
export const countryCode = (value: unknown): string | undefined => typeof value === "string" && /^[a-z]{2}$/i.test(value.trim()) && !["XX", "T1"].includes(value.trim().toUpperCase()) ? value.trim().toUpperCase() : undefined;

export function countryFromHeaders(headers: Headers): string | undefined {
  for (const name of ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country", "fastly-geo-country", "x-country-code"]) {
    const code = countryCode(headers.get(name));
    if (code) return code;
  }
}

export const isLocalHost = (host: string) => ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);

/** The external request must run in the browser: a server lookup would locate the server's IP. */
export async function detectVisitorLocation({ hostname, timeZone, localIpEnabled = false, fetcher = fetch, signal }: {
  hostname: string; timeZone: string; localIpEnabled?: boolean; fetcher?: typeof fetch; signal?: AbortSignal;
}): Promise<VisitorLocation> {
  const requestSignal = () => signal ? AbortSignal.any([signal, AbortSignal.timeout(4000)]) : AbortSignal.timeout(4000);
  try {
    const response = await fetcher("/api/location", { cache: "no-store", credentials: "same-origin", signal: requestSignal() });
    if (response.ok) {
      const data = await response.json() as { country?: unknown };
      const country = countryCode(data.country);
      if (country) return { country, source: "ip" };
    }
  } catch { /* A missing CDN location must not break the product. */ }
  if (signal?.aborted) return { source: "unknown" };
  if (localIpEnabled && isLocalHost(hostname)) {
    try {
      // Development only, no account/API key; request only the country, not coordinates or an address.
      const response = await fetcher("https://ipapi.co/country/", { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: requestSignal() });
      const country = response.ok ? countryCode(await response.text()) : undefined;
      if (country) return { country, source: "ip" };
    } catch { /* VPN exit nodes can be blocked or rate-limited by the external service. */ }
  }
  const country = TZ_COUNTRY[timeZone];
  return { country, source: country ? "timezone" : "unknown" };
}

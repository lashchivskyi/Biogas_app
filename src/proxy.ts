import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COUNTRY_COOKIE, COUNTRY_LOCALE, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/config";
import { checkBasicAuth } from "@/server/adminAuth";
import { countryFromHeaders } from "@/lib/visitor-location";
import { locationDefaults, readPreferenceCookie, type ProjectPreferences } from "@/lib/preferences";

/** Country from common CDN / platform geo headers (Vercel, Cloudflare, CloudFront, Fastly, generic). */
function geoCountry(req: NextRequest): string | null {
  return countryFromHeaders(req.headers) ?? null;
}

/** Accept-Language negotiation against supported locales (q-values honoured; base language match). */
export function negotiate(header: string | null): Locale | null {
  if (!header) return null;
  const prefs = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((p) => p.tag && p.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const p of prefs) {
    const base = p.tag.split("-")[0];
    if (p.tag === "pt-br" || base === "pt") return "pt";
    if (base === "sh" || base === "bs" || base === "hr" || base === "cnr") return "sr";
    if (isLocale(base)) return base;
  }
  return null;
}

/** A newly detected IP country wins; within that country retain explicit language choices. */
export function pickLocale(req: NextRequest): Locale {
  const country = geoCountry(req);
  const saved = readPreferenceCookie(req.headers.get("cookie") ?? "") as Partial<ProjectPreferences> | null;
  if (country && (country !== saved?.detectedCountry || (!Object.hasOwn(COUNTRY_LOCALE, country) && saved?.locationDefaultsVersion !== 2))) return locationDefaults(country).language;
  const fromCookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const fromHeader = negotiate(req.headers.get("accept-language"));
  if (fromHeader) return fromHeader;
  const c = geoCountry(req);
  if (c) return locationDefaults(c).language;
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const res = checkBasicAuth(request.headers.get("authorization"));
    if (res === "ok") return NextResponse.next();
    if (res === "disabled") return new NextResponse("CRM disabled: set ADMIN_USER and ADMIN_PASSWORD.", { status: 503 });
    return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Methalytics CRM", charset="UTF-8"' } });
  }

  const first = pathname.split("/")[1];
  const country = geoCountry(request);
  if ((LOCALES as readonly string[]).includes(first)) {
    // Global 404 rendering bypasses [lang]/layout; forward the explicit URL locale.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-mx-path-locale", first);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (country && request.cookies.get(COUNTRY_COOKIE)?.value !== country) res.cookies.set(COUNTRY_COOKIE, country, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return res;
  }

  // Legacy Ukrainian slugs → new localized routes.
  const legacy: Record<string, string> = { "/biogaz": "/biogas", "/pakety": "/pricing", "/umovy": "/terms", "/oplata": "/payment" };
  const legacyKey = Object.keys(legacy).find((k) => pathname === k || pathname.startsWith(`${k}/`));
  const locale = legacyKey ? "uk" : pickLocale(request);
  const rest = legacyKey ? pathname.replace(legacyKey, legacy[legacyKey]) : pathname;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${rest === "/" ? "" : rest}`;
  const res = NextResponse.redirect(url, legacyKey ? 308 : 307);
  if (country) res.cookies.set(COUNTRY_COOKIE, country, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  res.headers.set("Vary", "Accept-Language, Cookie");
  return res;
}

export const config = {
  // Everything except Next internals, API routes (other than admin), metadata files and static assets.
  matcher: ["/((?!_next|api/(?!admin)|icon\\.svg|robots\\.txt|sitemap\\.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};

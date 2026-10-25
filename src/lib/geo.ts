import { COUNTRIES } from "@/countries";
import { COUNTRY_COOKIE, LOCALE_COUNTRY, TZ_COUNTRY, type Locale } from "@/i18n/config";

/**
 * Best guess of the project country in the browser, privacy-friendly (no IP lookups from the client):
 * 1) country cookie set by the proxy from the CDN geo header, 2) the browser time zone, 3) the locale's default.
 */
export function guessCountry(locale: Locale): { code: string; source: "geo" | "timezone" | "locale" } {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([A-Z]{2})`));
    if (m && COUNTRIES[m[1]]) return { code: m[1], source: "geo" };
  } catch {
    /* no cookies */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const c = TZ_COUNTRY[tz];
    if (c && COUNTRIES[c]) return { code: c, source: "timezone" };
  } catch {
    /* no Intl tz */
  }
  const fallback = LOCALE_COUNTRY[locale];
  return { code: COUNTRIES[fallback] ? fallback : "GB", source: "locale" };
}

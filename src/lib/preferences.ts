import { COUNTRY_LOCALE, isLocale, LOCALE_COUNTRY, type Locale } from "@/i18n/config";
import { cityRegionId, validCity, type CityClimate } from "@/core/location";

export const PREFERENCES_COOKIE = "mx_context";
export const PREFERENCES_STORAGE = "mx.context.v1";
export const DRAFT_STORAGE = "mx.form.v2";
export type CurrencyPreference = "AUTO" | "EUR" | "USD";
export type ProjectPreferences = { country: string; region?: string; city?: CityClimate; displayCurrency: CurrencyPreference; paymentCurrency: CurrencyPreference; detectedCountry?: string; locationDefaultsVersion?: 2 };
export type PreferenceMarkets = Record<string, { currency: string; regions: { id: string; name: string; names?: Record<string, string> }[] }>;
export type CurrencyReference = { value: number; date: string };

/** Euro-oriented visitor countries: EU, EEA/EFTA, UK, Balkans, Eastern Europe, Caucasus, Turkey and euro-pegged/EU-trade neighbours. Everyone else defaults to USD. */
const EURO_ORIENTED = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "CH", "GB", "AD", "MC", "SM", "VA", "GI", "GG", "JE", "IM", "FO", "GL", "AX",
  "AL", "BA", "ME", "MK", "RS", "XK", "UA", "MD", "BY", "RU", "GE", "AM", "AZ", "TR",
  "MA", "TN", "DZ", "CV", "SN", "CI", "CM", "BJ", "BF", "ML", "NE", "TG", "GA", "CG", "TD", "CF", "GQ", "GW", "KM", "RE", "GP", "MQ", "GF", "YT", "NC", "PF"
]);

/** Shared first-visit/IP-change policy; the detected visitor country itself is never relabelled US. Currency follows the visitor's country, not the project country. */
export function locationDefaults(country: string, markets: object = COUNTRY_LOCALE): { country: string; language: Locale; currency: "EUR" | "USD" } {
  const supported = Object.hasOwn(markets, country);
  const projectCountry = supported ? country : "US";
  return { country: projectCountry, language: supported ? COUNTRY_LOCALE[country] ?? "en" : "en", currency: EURO_ORIENTED.has(country) ? "EUR" : "USD" };
}

export function normalizePreferences(raw: unknown, markets: PreferenceMarkets, fallback: string): ProjectPreferences {
  const p = raw && typeof raw === "object" ? raw as Partial<ProjectPreferences> : {};
  const country = typeof p.country === "string" && Object.hasOwn(markets, p.country) ? p.country : fallback;
  const city = validCity(p.city, country) && p.region === cityRegionId(p.city) ? p.city : undefined;
  const pendingCity = typeof p.region === "string" && /^city:[1-9]\d{0,9}$/.test(p.region);
  return { country, ...(city ? { city } : {}), region: city ? cityRegionId(city) : pendingCity || markets[country]?.regions.some((r) => r.id === p.region) ? p.region : undefined,
    displayCurrency: ["AUTO", "EUR", "USD"].includes(p.displayCurrency ?? "") ? p.displayCurrency! : "AUTO",
    paymentCurrency: ["AUTO", "EUR", "USD"].includes(p.paymentCurrency ?? "") ? p.paymentCurrency! : "AUTO",
    ...(typeof p.detectedCountry === "string" && /^[A-Z]{2}$/.test(p.detectedCountry) ? { detectedCountry: p.detectedCountry } : {}),
    ...(p.locationDefaultsVersion === 2 ? { locationDefaultsVersion: 2 as const } : {}) };
}

/** A newly detected IP country replaces earlier defaults and overrides once, without redirect loops. */
export function adaptToLocation(current: ProjectPreferences, country: string, markets: PreferenceMarkets): { preferences: ProjectPreferences; language?: Locale; changed: boolean } {
  const supported = Object.hasOwn(markets, country);
  // Migrate previously detected unsupported countries once, then retain manual choices until IP changes.
  if (!/^[A-Z]{2}$/.test(country) || ["XX", "T1"].includes(country) || (current.detectedCountry === country && (supported || current.locationDefaultsVersion === 2))) return { preferences: current, changed: false };
  const defaults = locationDefaults(country, markets);
  return { preferences: { ...current, detectedCountry: country, locationDefaultsVersion: 2, country: defaults.country,
    region: defaults.country !== current.country ? undefined : current.region, city: defaults.country !== current.country ? undefined : current.city,
    displayCurrency: defaults.currency, paymentCurrency: defaults.currency },
    language: defaults.language, changed: true };
}

/** Explicit project URL → remembered project → draft → location guess. Language is a fallback only. */
export function resolvePreferences({ locale, markets, query, saved, draft, visitorCountry }: {
  locale: Locale; markets: PreferenceMarkets; query?: URLSearchParams; saved?: unknown; draft?: { countryCode?: string; regionId?: string; city?: CityClimate }; visitorCountry?: string;
}): ProjectPreferences {
  const fallback = visitorCountry ? locationDefaults(visitorCountry, markets).country : LOCALE_COUNTRY[locale];
  const remembered = saved && typeof saved === "object" && Object.hasOwn(markets, (saved as ProjectPreferences).country ?? "") ? saved : draft ? { country: draft.countryCode, region: draft.regionId, city: draft.city } : undefined;
  const base = normalizePreferences(remembered, markets, fallback);
  const c = query?.get("c")?.toUpperCase();
  if (c && Object.hasOwn(markets, c)) {
    const region = query?.get("r") ?? (c === base.country ? base.region : undefined);
    return normalizePreferences({ ...base, country: c, region }, markets, fallback);
  }
  return base;
}

/** Unsupported visitor markets share the US/USD default; language and project country do not set currency. */
export function displayCurrency(preference: CurrencyPreference, visitorCountry?: string): "EUR" | "USD" {
  return preference === "AUTO" ? visitorCountry ? locationDefaults(visitorCountry).currency : "EUR" : preference;
}

export function readPreferenceCookie(cookie: string): unknown {
  try { return JSON.parse(decodeURIComponent(cookie.split("; ").find((c) => c.startsWith(`${PREFERENCES_COOKIE}=`))?.slice(PREFERENCES_COOKIE.length + 1) ?? "null")); } catch { return undefined; }
}

export function swapLocaleUrl(url: string, next: Locale): string {
  const parsed = new URL(url, "https://local.invalid");
  const parts = parsed.pathname.split("/");
  if (isLocale(parts[1])) parts[1] = next;
  else parts.splice(1, 0, next);
  return `${parts.join("/")}${parsed.search}${parsed.hash}`;
}

export function contextHref(path: string, p: Pick<ProjectPreferences, "country" | "region">): string {
  const url = new URL(path, "https://local.invalid");
  url.searchParams.set("c", p.country);
  if (p.region) url.searchParams.set("r", p.region); else url.searchParams.delete("r");
  return `${url.pathname}${url.search}${url.hash}`;
}


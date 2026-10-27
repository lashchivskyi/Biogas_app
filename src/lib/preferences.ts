import { COUNTRY_LOCALE, isLocale, LOCALE_COUNTRY, type Locale } from "@/i18n/config";

export const PREFERENCES_COOKIE = "mx_context";
export const PREFERENCES_STORAGE = "mx.context.v1";
export const DRAFT_STORAGE = "mx.form.v2";
export type CurrencyPreference = "AUTO" | "EUR" | "USD";
export type ProjectPreferences = { country: string; region?: string; displayCurrency: CurrencyPreference; paymentCurrency: CurrencyPreference; detectedCountry?: string };
export type PreferenceMarkets = Record<string, { currency: string; regions: { id: string; name: string; names?: Record<string, string> }[] }>;
export type CurrencyReference = { value: number; date: string };

export function normalizePreferences(raw: unknown, markets: PreferenceMarkets, fallback: string): ProjectPreferences {
  const p = raw && typeof raw === "object" ? raw as Partial<ProjectPreferences> : {};
  const country = typeof p.country === "string" && Object.hasOwn(markets, p.country) ? p.country : fallback;
  return { country, region: markets[country]?.regions.some((r) => r.id === p.region) ? p.region : undefined,
    displayCurrency: ["AUTO", "EUR", "USD"].includes(p.displayCurrency ?? "") ? p.displayCurrency! : "AUTO",
    paymentCurrency: ["AUTO", "EUR", "USD"].includes(p.paymentCurrency ?? "") ? p.paymentCurrency! : "AUTO",
    ...(typeof p.detectedCountry === "string" && /^[A-Z]{2}$/.test(p.detectedCountry) ? { detectedCountry: p.detectedCountry } : {}) };
}

/** A newly detected IP country replaces earlier defaults and overrides once, without redirect loops. */
export function adaptToLocation(current: ProjectPreferences, country: string, markets: PreferenceMarkets): { preferences: ProjectPreferences; language?: Locale; changed: boolean } {
  if (!/^[A-Z]{2}$/.test(country) || ["XX", "T1"].includes(country) || current.detectedCountry === country) return { preferences: current, changed: false };
  const currency = country === "US" ? "USD" : "EUR";
  const supported = Object.hasOwn(markets, country);
  return { preferences: { ...current, detectedCountry: country, country: supported ? country : current.country,
    region: supported && country !== current.country ? undefined : current.region, displayCurrency: currency, paymentCurrency: currency },
    language: COUNTRY_LOCALE[country], changed: true };
}

/** Explicit project URL → remembered project → draft → location guess. Language is a fallback only. */
export function resolvePreferences({ locale, markets, query, saved, draft, visitorCountry }: {
  locale: Locale; markets: PreferenceMarkets; query?: URLSearchParams; saved?: unknown; draft?: { countryCode?: string; regionId?: string }; visitorCountry?: string;
}): ProjectPreferences {
  const fallback = visitorCountry && Object.hasOwn(markets, visitorCountry) ? visitorCountry : LOCALE_COUNTRY[locale];
  const remembered = saved && typeof saved === "object" && Object.hasOwn(markets, (saved as ProjectPreferences).country ?? "") ? saved : draft ? { country: draft.countryCode, region: draft.regionId } : undefined;
  const base = normalizePreferences(remembered, markets, fallback);
  const c = query?.get("c")?.toUpperCase();
  if (c && Object.hasOwn(markets, c)) {
    const region = query?.get("r") ?? (c === base.country ? base.region : undefined);
    return normalizePreferences({ ...base, country: c, region }, markets, fallback);
  }
  return base;
}

/** USD is a US visitor default, never an inference from English or the plant's country. */
export function displayCurrency(preference: CurrencyPreference, visitorCountry?: string): "EUR" | "USD" {
  return preference === "AUTO" ? visitorCountry === "US" ? "USD" : "EUR" : preference;
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


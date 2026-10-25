import type { CountryAdapter } from "@/core/country";
import { buildAdapter } from "./build";
import { PROFILES } from "./profiles";
import { UA } from "./ua";

export const COUNTRIES: Record<string, CountryAdapter> = Object.fromEntries([UA, ...PROFILES.map((p) => buildAdapter(p))].map((c) => [c.code, c]));

/** Display order: home market first, then Europe, Americas, Asia (as in docs/international-markets.md). */
export const COUNTRY_ORDER: string[] = ["UA", "PL", "CZ", "SK", "HU", "RO", "MD", "BG", "RS", "GR", "TR", "LT", "LV", "EE", "DE", "AT", "IT", "FR", "ES", "NL", "DK", "SE", "FI", "GB", "US", "CA", "MX", "AR", "BR", "IN", "TH", "VN", "KZ"];

export function getCountry(code: string): CountryAdapter {
  const c = COUNTRIES[code];
  if (!c) throw new Error(`Unknown country adapter: ${code}`);
  return c;
}

export const isCountry = (code: string | undefined | null): code is string => !!code && code in COUNTRIES;

export { UA };

import type { CountryAdapter } from "@/core/country";
import { buildAdapter } from "./build";
import { PROFILES } from "./profiles";
import { UA } from "./ua";
import { rankCountries } from "./ranking";

export const COUNTRIES: Record<string, CountryAdapter> = Object.fromEntries([UA, ...PROFILES.map((p) => buildAdapter(p))].map((c) => [c.code, c]));

/** One weighted order for selectors and the methodology table; selected country is independent. */
export const COUNTRY_PRIORITY = rankCountries(COUNTRIES);
export const COUNTRY_ORDER: string[] = COUNTRY_PRIORITY.map((c) => c.code);

export function getCountry(code: string): CountryAdapter {
  const c = COUNTRIES[code];
  if (!c) throw new Error(`Unknown country adapter: ${code}`);
  return c;
}

export const isCountry = (code: string | undefined | null): code is string => !!code && code in COUNTRIES;

export { UA };

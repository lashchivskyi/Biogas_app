import { COUNTRY_ORDER } from "@/countries";
import { LOCALE_COUNTRY, LOCALES, type Locale } from "./config";

export interface LanguageOption { locale: Locale; countryCode: string }

/** Build on the server so the header does not need the country adapters in its client bundle. */
export const LANGUAGE_OPTIONS: LanguageOption[] = LOCALES
  .map((locale) => ({ locale, countryCode: LOCALE_COUNTRY[locale] }))
  .sort((a, b) => COUNTRY_ORDER.indexOf(a.countryCode) - COUNTRY_ORDER.indexOf(b.countryCode));

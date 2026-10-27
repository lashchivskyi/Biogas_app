import { LOCALE_COUNTRY, LOCALES, type Locale } from "./config";

export interface LanguageOption { locale: Locale; countryCode: string }

/** The settings panel sorts native language labels using its current UI locale. */
export const LANGUAGE_OPTIONS: LanguageOption[] = LOCALES
  .map((locale) => ({ locale, countryCode: LOCALE_COUNTRY[locale] }));

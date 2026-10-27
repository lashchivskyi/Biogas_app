/**
 * Supported UI locales. English is the source language; every other dictionary must satisfy the
 * English type (missing keys fail the build). Countries map to a default locale for detection.
 *
 * Report language: the model's explanatory text (core) exists in English and Ukrainian; other
 * locales show the translated UI with English model explanations (see `coreLang`).
 */
export const LOCALES = ["en", "uk", "pl", "de", "fr", "it", "es", "pt", "nl", "cs", "sk", "hu", "ro", "bg", "sr", "el", "tr", "lt", "lv", "et", "da", "sv", "fi", "vi", "th"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (v: string | undefined | null): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);

/** BCP-47 tag used for Intl formatting and <html lang>. */
export const INTL_TAG: Record<Locale, string> = {
  en: "en-GB", uk: "uk-UA", pl: "pl-PL", de: "de-DE", fr: "fr-FR", it: "it-IT", es: "es-ES", pt: "pt-BR", nl: "nl-NL", cs: "cs-CZ", sk: "sk-SK",
  hu: "hu-HU", ro: "ro-RO", bg: "bg-BG", sr: "sr-Latn-RS", el: "el-GR", tr: "tr-TR", lt: "lt-LT", lv: "lv-LV", et: "et-EE", da: "da-DK", sv: "sv-SE",
  fi: "fi-FI", vi: "vi-VN", th: "th-TH",
};

/** Native language names (shown in the switcher without depending on Intl data). */
export const NATIVE_NAME: Record<Locale, string> = {
  en: "English", uk: "Українська", pl: "Polski", de: "Deutsch", fr: "Français", it: "Italiano", es: "Español", pt: "Português (Brasil)", nl: "Nederlands",
  cs: "Čeština", sk: "Slovenčina", hu: "Magyar", ro: "Română", bg: "Български", sr: "Srpski", el: "Ελληνικά", tr: "Türkçe", lt: "Lietuvių", lv: "Latviešu",
  et: "Eesti", da: "Dansk", sv: "Svenska", fi: "Suomi", vi: "Tiếng Việt", th: "ไทย",
};

export const coreLang = (l: Locale): "en" | "uk" => (l === "uk" ? "uk" : "en");

/** Supported project markets and their default UI locales. Unsupported visitor countries use US/en/USD. */
export const COUNTRY_LOCALE: Record<string, Locale> = {
  UA: "uk", PL: "pl", CZ: "cs", SK: "sk", HU: "hu", RO: "ro", MD: "ro", BG: "bg", RS: "sr", GR: "el", TR: "tr", LT: "lt", LV: "lv", EE: "et",
  DE: "de", AT: "de", IT: "it", FR: "fr", ES: "es", NL: "nl", DK: "da", SE: "sv", FI: "fi", GB: "en", US: "en",
  CA: "en", MX: "es", AR: "es", BR: "pt", IN: "en", TH: "th", VN: "vi", KZ: "en",
};

/** Default project country for each locale, when geo is unknown. */
export const LOCALE_COUNTRY: Record<Locale, string> = {
  en: "GB", uk: "UA", pl: "PL", de: "DE", fr: "FR", it: "IT", es: "ES", pt: "BR", nl: "NL", cs: "CZ", sk: "SK", hu: "HU", ro: "RO", bg: "BG",
  sr: "RS", el: "GR", tr: "TR", lt: "LT", lv: "LV", et: "EE", da: "DK", sv: "SE", fi: "FI", vi: "VN", th: "TH",
};

/** IANA time zone → country, a privacy-friendly client-side fallback when no geo header exists. */
export const TZ_COUNTRY: Record<string, string> = {
  "Europe/Kyiv": "UA", "Europe/Kiev": "UA", "Europe/Uzhgorod": "UA", "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Bratislava": "SK", "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO", "Europe/Chisinau": "MD", "Europe/Sofia": "BG", "Europe/Belgrade": "RS", "Europe/Athens": "GR", "Europe/Istanbul": "TR",
  "Europe/Vilnius": "LT", "Europe/Riga": "LV", "Europe/Tallinn": "EE", "Europe/Berlin": "DE", "Europe/Vienna": "AT", "Europe/Rome": "IT", "Europe/Paris": "FR",
  "Europe/Madrid": "ES", "Europe/Amsterdam": "NL", "Europe/Copenhagen": "DK", "Europe/Stockholm": "SE", "Europe/Helsinki": "FI", "Europe/London": "GB",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Toronto": "CA",
  "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA", "America/Mexico_City": "MX",
  "America/Argentina/Buenos_Aires": "AR", "America/Buenos_Aires": "AR", "America/Sao_Paulo": "BR", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN", "Asia/Almaty": "KZ", "Asia/Qostanay": "KZ",
};

export const COUNTRY_COOKIE = "mx_country";
export const LOCALE_COOKIE = "NEXT_LOCALE";

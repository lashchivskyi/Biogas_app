import en, { type Dict } from "./dict/en";
import { CORE_LOCALES, DEFAULT_LOCALE, INTL_TAG, isLocale, type Locale } from "./config";
import { formatMessage, type MessageVars } from "./message";
import { registerMessages, type Messages } from "@/core/i18n";

export type { Dict } from "./dict/en";
export * from "./config";

/** A translation may omit keys that read the same as English (units, "{v} MWh"…); they fall back to en. */
export type Translation = { readonly [K in keyof Dict]?: DeepPartial<Dict[K]> };
type DeepPartial<T> = T extends string ? string : T extends readonly unknown[] ? T : { readonly [K in keyof T]?: DeepPartial<T[K]> };

function merge<T>(base: T, over: unknown): T {
  if (over === undefined) return base;
  if (typeof base !== "object" || base === null || Array.isArray(base)) return over as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) out[k] = merge((base as Record<string, unknown>)[k], v);
  return out as T;
}

const cache = new Map<Locale, Dict>();

const loaders: Record<Locale, () => Promise<{ default: Dict | Translation }>> = {
  en: () => import("./dict/en"),
  uk: () => import("./dict/uk"),
  pl: () => import("./dict/pl"),
  de: () => import("./dict/de"),
  fr: () => import("./dict/fr"),
  it: () => import("./dict/it"),
  es: () => import("./dict/es"),
  pt: () => import("./dict/pt"),
  nl: () => import("./dict/nl"),
  cs: () => import("./dict/cs"),
  sk: () => import("./dict/sk"),
  hu: () => import("./dict/hu"),
  ro: () => import("./dict/ro"),
  bg: () => import("./dict/bg"),
  sr: () => import("./dict/sr"),
  el: () => import("./dict/el"),
  tr: () => import("./dict/tr"),
  lt: () => import("./dict/lt"),
  lv: () => import("./dict/lv"),
  et: () => import("./dict/et"),
  da: () => import("./dict/da"),
  sv: () => import("./dict/sv"),
  fi: () => import("./dict/fi"),
  vi: () => import("./dict/vi"),
  th: () => import("./dict/th"),
};

/** Model-text catalogs (`core/<locale>.ts`, English text → translation) for the locales listed in `CORE_LOCALES`. */
const coreLoaders: Partial<Record<Locale, () => Promise<{ default: Messages }>>> = {
  de: () => import("./core/de"),
  pl: () => import("./core/pl"),
  fr: () => import("./core/fr"),
  es: () => import("./core/es"),
  cs: () => import("./core/cs"),
  sk: () => import("./core/sk"),
  sr: () => import("./core/sr"),
  bg: () => import("./core/bg"),
  nl: () => import("./core/nl"),
  da: () => import("./core/da"),
  sv: () => import("./core/sv"),
  fi: () => import("./core/fi"),
};

/**
 * Loads and registers the catalog of the model's own sentences (verdict reasons, warnings, report sheets) for `locale`.
 * Server pages await it before `assess()`/rendering; client components receive the object as a prop and call `registerMessages`.
 * Returns undefined for en/uk (authored beside the code) and for locales without a complete catalog (English is shown).
 */
export async function getCoreCatalog(locale: string): Promise<Messages | undefined> {
  const l: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  if (!CORE_LOCALES.includes(l)) return undefined;
  const load = coreLoaders[l];
  if (!load) return undefined;
  const messages = (await load()).default;
  registerMessages(l, messages);
  return messages;
}

export async function getDictionary(locale: string): Promise<Dict> {
  const l: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  if (l === "en") return en;
  let d = cache.get(l);
  if (!d) {
    d = merge(en, (await loaders[l]()).default);
    cache.set(l, d);
  }
  return d;
}

/**
 * "{n} of {total}" interpolation. Unknown keys are left visible so missing data is noticed.
 * Strings with `{n, plural, one{…} few{…} other{…}}` / `{x, select, …}` follow the CLDR rules of `locale`
 * (see message.ts); pass the locale whenever the string can contain them.
 */
export function fmt(s: string, vars: MessageVars = {}, locale: Locale = DEFAULT_LOCALE): string {
  return formatMessage(s, vars, INTL_TAG[locale]);
}

/** Localised country name via Intl (no manual translation of 33 names × 25 languages). */
export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([INTL_TAG[locale]], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Path helper: localise an internal path. */
export const lp = (locale: Locale, path = "/") => `/${locale}${path === "/" ? "" : path}`;

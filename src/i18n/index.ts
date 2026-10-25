import en, { type Dict } from "./dict/en";
import { DEFAULT_LOCALE, INTL_TAG, isLocale, type Locale } from "./config";

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

/** "{n} of {total}" interpolation. Unknown keys are left visible so missing data is noticed. */
export function fmt(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Split a headline at [accent] markers into parts for rendering. */
export function accentParts(s: string): Array<{ text: string; accent: boolean }> {
  const out: Array<{ text: string; accent: boolean }> = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), accent: false });
    out.push({ text: m[1], accent: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), accent: false });
  return out;
}

export const intlTag = (l: Locale) => INTL_TAG[l];

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

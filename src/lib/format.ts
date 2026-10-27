import type { Dict, Locale } from "@/i18n";
import { INTL_TAG } from "@/i18n/config";

/** Sort the visible labels, never ISO codes, flags or market priority. Do not mutate shared arrays. */
export function alphabetically<T>(items: readonly T[], locale: Locale, label: (item: T) => string): T[] {
  const collator = new Intl.Collator(INTL_TAG[locale], { sensitivity: "base", numeric: true });
  return [...items].sort((a, b) => collator.compare(label(a), label(b)));
}

/** Round to 2 significant digits for ranges — we do not publish fake precision. */
export function sig2(v: number): number {
  if (!Number.isFinite(v) || v === 0) return 0;
  const m = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1);
  return Math.round(v / m) * m;
}

export type Fmt = ReturnType<typeof makeFormat>;

/** Locale-aware formatters. Compact notation and currency symbols come from Intl. */
export function makeFormat(locale: Locale, units: Dict["labels"]["units"], display: { currency: "EUR" | "USD"; rate: number } = { currency: "EUR", rate: 1 }) {
  const tag = INTL_TAG[locale];
  const nf0 = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 });
  const cmp = new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 });
  const cur = (code: string) => new Intl.NumberFormat(tag, { style: "currency", currency: code, notation: "compact", maximumFractionDigits: 1 });
  const curFull = (code: string) => new Intl.NumberFormat(tag, { style: "currency", currency: code, maximumFractionDigits: 0 });

  const n0 = (v: number) => nf0.format(Math.round(v));
  const n1 = (v: number) => nf1.format(v);
  const compact = (v: number) => cmp.format(v);
  const eur = (v: number) => cur(display.currency).format(sig2(v * display.rate));
  const monetaryCompact = (v: number) => cmp.format(sig2(v * display.rate));
  const money = (v: number, code: string) => cur(code).format(sig2(v));
  const price = (v: number, code: string) => curFull(code).format(v);
  const years = (v: number | null) => (v === null || !Number.isFinite(v) ? units.never : v > 25 ? units.over25 : `${n1(v)} ${units.years}`);
  const pct = (v: number, digits = 0) => new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: digits }).format(v);
  const range = (a: number, b: number, f: (v: number) => string = (v) => n0(sig2(v))) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const fl = f(lo);
    const fh = f(hi);
    return fl === fh ? fl : `${fl} – ${fh}`;
  };
  return { n0, n1, compact, monetaryCompact, currency: display.currency, exchangeRate: display.rate, eur, money, price, years, pct, range, sig2 };
}

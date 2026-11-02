import { INTL_TAG, type Locale } from "@/i18n/config";

/** Parse the complete value using the selected UI locale, never the browser's ambient locale. */
export function parseLocalizedNumber(value: string, locale: Locale): number | undefined {
  let s = value.trim().normalize("NFKC").replace(/[−–]/g, "-").replace(/[๐-๙]/g, (n) => String(n.charCodeAt(0) - 0x0e50));
  if (!s) return undefined;
  const parts = new Intl.NumberFormat(INTL_TAG[locale]).formatToParts(12345.6);
  const group = parts.find((p) => p.type === "group")?.value;
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  s = s.replace(/[\s\u00a0\u202f]/g, "");
  // Both separators: the final one is the decimal mark (also accepts pasted foreign invoices).
  if (s.includes(",") && s.includes(".")) {
    const commaDecimal = s.lastIndexOf(",") > s.lastIndexOf(".");
    const decimalMark = commaDecimal ? "," : ".";
    const groupingMark = commaDecimal ? "." : ",";
    const at = s.lastIndexOf(decimalMark);
    const whole = s.slice(0, at);
    if (!new RegExp(`^[+-]?\\d{1,3}(?:\\${groupingMark}\\d{3})+$`).test(whole) || !/^\d+$/.test(s.slice(at + 1))) return undefined;
    s = commaDecimal ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else {
    if (group && group !== decimal && !/\s/.test(group)) {
      // A single separator followed by three digits may be grouping in this locale.
      if (s.includes(group) && new RegExp(`^[+-]?\\d{1,3}(?:\\${group}\\d{3})+$`).test(s)) s = s.split(group).join("");
    }
    if (decimal !== ".") s = s.replace(decimal, ".");
    else if (s.includes(",")) s = s.replace(",", ".");
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** The text a user sees for a number in their locale: grouping and the locale's decimal mark, no rounding. */
export function formatLocalizedNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 20 }).format(n);
}

/**
 * Tidy a valid entry once the user leaves the field (1234,5 → 1 234,5). The value is unchanged, so what the calculation
 * reads is what the field shows, and a doubtful separator ("1.234") is shown the way it was understood. Invalid text is kept.
 */
export function normalizeNumberText(value: string, locale: Locale): string {
  const n = parseLocalizedNumber(value, locale);
  return n === undefined ? value : formatLocalizedNumber(n, locale);
}

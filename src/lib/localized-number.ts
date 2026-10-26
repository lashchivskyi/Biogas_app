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

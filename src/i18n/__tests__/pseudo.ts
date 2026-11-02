/**
 * Pseudo-localisation of the English dictionary: accented vowels (finds fonts and encodings that drop diacritics),
 * ≥ 40 % longer text (finds layouts that only fit English) and ⟦ ⟧ markers (any text on a page that is NOT marked
 * did not come from the dictionary: a hard-coded string). {placeholders}, ICU blocks and [accent] markers stay intact.
 */
const MAP: Record<string, string> = { a: "á", e: "é", i: "í", o: "ö", u: "ü", y: "ý", A: "Å", E: "Ê", I: "Ï", O: "Ø", U: "Û", c: "ç", n: "ñ", s: "š", z: "ž" };
const FILL = ["ẃéĺĺ", "ƒôŕ", "ŷöü", "ƥĺéàšé", "ñöẃ"];

export const PSEUDO_OPEN = "⟦";
export const PSEUDO_CLOSE = "⟧";

export function pseudo(s: string): string {
  if (!/[A-Za-z]{4}|[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(s.replace(/\{[^}]*\}/g, ""))) return s; // numbers, symbols, units: nothing to localise
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{" || ch === "[") {
      const close = ch === "{" ? "}" : "]";
      let depth = 0, j = i;
      for (; j < s.length; j++) { if (s[j] === ch) depth++; else if (s[j] === close && --depth === 0) break; }
      out += s.slice(i, j + 1);
      i = j;
    } else out += MAP[ch] ?? ch;
  }
  let k = 0;
  while ([...out].length < s.length * 1.4) out += ` ${FILL[k++ % FILL.length]}`;
  return `${PSEUDO_OPEN}${out}${PSEUDO_CLOSE}`;
}

/** Deep copy of a dictionary with every string pseudo-localised. */
export function pseudoDeep<T>(value: T): T {
  if (typeof value === "string") return pseudo(value) as T;
  if (Array.isArray(value)) return value.map(pseudoDeep) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, pseudoDeep(v)])) as T;
  return value;
}

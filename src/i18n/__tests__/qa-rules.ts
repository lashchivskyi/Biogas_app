import { CYRILLIC_UNITS, DO_NOT_TRANSLATE, DRY_MATTER_TOKENS, ENGLISH_LEAKS, GLOSSARY, LOCALISED_ABBREVIATIONS, SI_UNITS, type SiUnit } from "../glossary";
import type { Locale } from "..";

const L = "\\p{L}\\p{M}";
/** Whole-word match that also works for Cyrillic, Greek and Thai (no \b). */
const word = (w: string, flags = "u") => new RegExp(`(?<![${L}\\d])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![${L}\\d])`, flags);

// ---- placeholders and ICU-style syntax -------------------------------------------------------------------------
export const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** The app interpolates plain `{name}` only (`fmt`). Anything else with braces is a typo or an unsupported ICU form. */
export function icuIssues(s: string): string[] {
  const out: string[] = [];
  const stripped = s.replace(/\{\w+\}/g, "");
  if (/[{}]/.test(stripped)) out.push(`stray brace in "${stripped.match(/.{0,12}[{}].{0,12}/)?.[0]}"`);
  if (/\{\s*\}/.test(s)) out.push("empty placeholder");
  if (/\{\w+\s*,\s*(plural|select|selectordinal|number|date)/.test(s)) out.push("ICU plural/select is not supported by fmt()");
  const sq = (s.match(/\[/g) ?? []).length - (s.match(/\]/g) ?? []).length;
  if (sq !== 0) out.push("unbalanced [ ]");
  return out;
}

/** `[accent]` markers must survive translation. */
export const accentMarks = (s: string) => (s.match(/\[[^\]]+\]/g) ?? []).length;

// ---- glossary ------------------------------------------------------------------------------------------------
export function forbiddenHits(locale: Locale, s: string): { stem: string; use: string }[] {
  const g = GLOSSARY[locale];
  const stems = [...g.forbidden, ...(locale === "en" ? [] : ENGLISH_LEAKS.map((stem) => ({ stem, use: "the approved local term" })))];
  return [...new Map(stems.map((x) => [x.stem, x])).values()].filter(({ stem }) => new RegExp(`(?<![${L}])${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "iu").test(s));
}

/** DO-NOT-TRANSLATE tokens present in the English source but missing from the translation. */
export function dntMissing(locale: Locale, en: string, text: string): string[] {
  if (locale === "en") return [];
  const missing: string[] = DO_NOT_TRANSLATE.filter((t) => word(t, "u").test(en) && !word(t, "u").test(text));
  const dm = GLOSSARY[locale].terms.dm;
  for (const t of DRY_MATTER_TOKENS) if (word(t).test(en) && !word(t).test(text) && !text.toLowerCase().includes(dm.toLowerCase())) missing.push(`${t} (or ${dm})`);
  return missing;
}

/** SI symbols that the English has next to a number or as a unit but the translation lost or replaced. */
export function unitsMissing(locale: Locale, en: string, text: string): string[] {
  if (locale === "en") return [];
  const cyr = CYRILLIC_UNITS[locale] ?? {};
  const has = (s: string, u: SiUnit) => new RegExp(`(?<![${L}\\d'’])${u.replace(/[³]/g, "³")}(?![${L}])`, "u").test(s);
  return SI_UNITS.filter((u) => has(en, u) && !has(text, u) && !cyr[u]?.some((c) => text.includes(c)));
}

/** Local replacements of English abbreviations (NPV → VAN …): an English one without the local term nearby is drift. */
export function abbreviationDrift(locale: Locale, text: string): string[] {
  const t = GLOSSARY[locale].terms;
  return LOCALISED_ABBREVIATIONS.filter(({ en, term }) => t[term] !== en && word(en).test(text) && !text.toLowerCase().includes(t[term].toLowerCase())).map((a) => a.en);
}

// ---- scripts -------------------------------------------------------------------------------------------------
const SCRIPT_OF: Record<string, RegExp> = {
  Latin: /\p{Script=Latin}/u, Cyrillic: /\p{Script=Cyrillic}/u, Greek: /\p{Script=Greek}/u, Thai: /\p{Script=Thai}/u,
};
/** Scripts a language may use for its words. Latin tokens (units, codes, names) are checked separately. */
export const MAIN_SCRIPT: Record<Locale, "Latin" | "Cyrillic" | "Greek" | "Thai"> = {
  en: "Latin", uk: "Cyrillic", pl: "Latin", de: "Latin", fr: "Latin", it: "Latin", es: "Latin", pt: "Latin", nl: "Latin", cs: "Latin", sk: "Latin",
  hu: "Latin", ro: "Latin", bg: "Cyrillic", sr: "Latin", el: "Greek", tr: "Latin", lt: "Latin", lv: "Latin", et: "Latin", da: "Latin", sv: "Latin",
  fi: "Latin", vi: "Latin", th: "Thai",
};
/** Greek letters used as maths/units symbols everywhere (Δ NPV, µ, Ω, π, Σ). */
const SYMBOL_GREEK = /[ΔΩΣπµμ]/u;

export function scriptIssues(locale: Locale, s: string): string[] {
  const out: string[] = [];
  const main = MAIN_SCRIPT[locale];
  const foreign = (["Cyrillic", "Greek", "Thai"] as const).filter((sc) => sc !== main);
  for (const sc of foreign) {
    // A single Greek letter is a maths symbol (ρ, η, Δ); a foreign script shows as a run of two or more letters.
    const run = sc === "Greek" ? "\\p{Script=Greek}{2,}" : SCRIPT_OF[sc].source;
    const m = s.match(new RegExp(`.{0,10}${run}.{0,10}`, "u"));
    if (m) out.push(`${sc} text in a ${main} locale: "${m[0]}"`);
  }
  // Homoglyphs: one word mixing scripts (Latin "a" inside a Cyrillic word).
  for (const w of s.match(new RegExp(`[${L}]+`, "gu")) ?? []) {
    const scripts = (["Latin", "Cyrillic", "Greek", "Thai"] as const).filter((sc) => [...w].some((ch) => SCRIPT_OF[sc].test(ch) && !(sc === "Greek" && SYMBOL_GREEK.test(ch))));
    if (scripts.length > 1) out.push(`mixed scripts in "${w}" (${scripts.join("+")})`);
  }
  return out;
}

/** Latin words inside a non-Latin locale that are not DO-NOT-TRANSLATE / units / approved terms (candidates for translation). */
export function strayLatin(locale: Locale, s: string): string[] {
  if (MAIN_SCRIPT[locale] === "Latin") return [];
  const g = GLOSSARY[locale].terms;
  const known = new Set<string>([
    ...DO_NOT_TRANSLATE.flatMap((t) => t.split(/[\s-]+/)), ...DRY_MATTER_TOKENS, ...SI_UNITS,
    ...Object.values(g).flatMap((t) => t.split(/[\s/]+/)),
    "CO", "CH", "NH", "CAPEX", "OPEX", "EBITDA", "DSCR", "IRR", "NPV", "COD", "CHP", "VAT", "AACE", "PDF", "Excel", "CSV", "IPCC", "ERA", "GWP", "NOx", "SO", "H", "pp", "e", "VS", "kWp",
    "Apple", "Pay", "Google", "EUR", "USD", "GBP", "Email", "email", "IP", "EIA", "DAF", "ppm", "bar", "Nm", "Q", "pH", "LCOE", "CNG", "LNG", "FIT", "FiT", "CfD", "WACC", "BESS", "HRT", "OLR", "FOS", "TAC", "SRT", "UF", "RO", "ID", "Wh",
  ]);
  const out: string[] = [];
  for (const w of s.replace(/\{\w+\}/g, "").match(/\p{Script=Latin}{2,}/gu) ?? []) if (!known.has(w)) out.push(w);
  return out;
}

// ---- invisible characters -------------------------------------------------------------------------------------
/** Built from code points so this file itself holds no invisible characters. */
const cp = (...codes: number[]) => String.fromCharCode(...codes);
const INVISIBLE: [RegExp, string][] = [
  [new RegExp(cp(0xAD)), "U+00AD soft hyphen"], [new RegExp(cp(0x200B)), "U+200B zero-width space"], [new RegExp(cp(0x200C)), "U+200C ZWNJ"], [new RegExp(cp(0x200D)), "U+200D ZWJ"],
  [new RegExp(`[${cp(0x200E, 0x200F)}]`), "U+200E/F direction mark"], [new RegExp(cp(0x2060)), "U+2060 word joiner"], [new RegExp(cp(0xFEFF)), "U+FEFF BOM"],
  [new RegExp(`[${cp(0x202A)}-${cp(0x202E)}${cp(0x2066)}-${cp(0x2069)}]`), "bidi control"],
  [new RegExp(`[${cp(0)}-${cp(8)}${cp(0xB, 0xC)}${cp(0xE)}-${cp(0x1F)}${cp(0x7F)}-${cp(0x9F)}]`), "control character"],
  [new RegExp(`${cp(0xA0, 0xA0)}| {2,}`), "double space"], [/^\s|\s$/, "leading/trailing space"],
  [new RegExp(`${cp(0xFFFD)}|[?]{3}`), "replacement character / ???"], [new RegExp(`[${cp(0x2028, 0x2029)}]`), "line separator"],
];
export function invisibleIssues(locale: Locale, s: string, en = ""): string[] {
  return INVISIBLE.filter(([re, name]) => !(locale === "th" && /U\+200B/.test(name)) && !(name === "leading/trailing space" && (/^\s|\s$/.test(en))) && re.test(s)).map(([, name]) => name);
}

// ---- typography --------------------------------------------------------------------------------------------------
export function quoteIssues(locale: Locale, s: string): string[] {
  const out: string[] = [];
  if (/"/.test(s)) out.push('straight quote "');
  const allowed = GLOSSARY[locale].style.quotes;
  for (const ch of s.match(/[“”„«»‹›]/gu) ?? []) if (!allowed.includes(ch)) out.push(`quote ${ch} (expected ${allowed})`);
  return [...new Set(out)];
}

/** A decimal point between digits in a comma-decimal language (`0.25` → `0,25`). Versions, URLs and IDs are skipped. */
export function decimalIssues(locale: Locale, s: string): string[] {
  if (GLOSSARY[locale].style.decimal !== ",") return [];
  if (/https?:|@|\d\.\d+\.\d/.test(s)) return [];
  // "3.000" is a thousands group in de/it/es…; "0.25", "1.5" and "0.125" are decimals.
  return [...s.matchAll(/(?<![\d.,])(?:\d{1,3}\.\d{1,2}|0\.\d{3})(?![\d.]|\.\d)/g)].map((m) => m[0]);
}

export function percentIssues(locale: Locale, s: string): string[] {
  const style = GLOSSARY[locale].style.percent;
  const out: string[] = [];
  const spaced = new RegExp(`[0-9][ ${cp(0xA0, 0x202F)}]%`).test(s), tight = /\d%/.test(s), prefix = /(^|[^\d])%\d/.test(s);
  if (style === "space" && tight) out.push("expects a space before %");
  if (style === "tight" && spaced) out.push("expects no space before %");
  if (style === "prefix" && (spaced || tight) && !prefix) out.push("expects %50");
  return out;
}

const INFORMAL: Partial<Record<Locale, RegExp>> = {
  de: /(?<![\p{L}])(du|dich|dir|dein\w*)(?![\p{L}])/u, fr: /(?<![\p{L}])(tu|toi|tes|ta)(?![\p{L}])/u, es: /(?<![\p{L}])(tú|tienes|puedes|quieres)(?![\p{L}])/u,
  nl: /(?<![\p{L}])(jij|jouw)(?![\p{L}])/u, sv: /(?<![\p{L}])Ni(?![\p{L}])/u,
};
export function addressIssues(locale: Locale, s: string): string[] {
  const m = INFORMAL[locale]?.exec(s);
  return m ? [`informal address "${m[0]}" (house style: ${GLOSSARY[locale].style.address})`] : [];
}

// ---- English leakage and expansion ----------------------------------------------------------------------------
const letters = (s: string) => s.replace(/\{\w+\}/g, "");
/** Same as English and long enough to be a phrase (not a unit, code, brand or number). */
export function sameAsEnglish(text: string, en: string | undefined): boolean {
  if (en === undefined || text !== en) return false;
  let t = letters(text);
  for (const k of DO_NOT_TRANSLATE) t = t.split(k).join(" ");
  return /[a-z]{4,}/i.test(t);
}

/** Length in code points, ignoring placeholders. */
const len = (s: string) => [...letters(s)].length;
export const SHORT_MAX = 28;
export function expansion(text: string, en: string | undefined): number | undefined {
  if (en === undefined || len(en) < 4 || len(en) > SHORT_MAX || /\s.*\s.*\s.*\s/.test(en)) return undefined;
  return len(text) / len(en) - 1;
}

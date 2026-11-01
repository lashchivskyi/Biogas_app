import { INTL_TAG, type Locale } from "../i18n/config";
import { formatMessage, type MessageVars } from "../i18n/message";

/**
 * Language of the model's own explanatory text (verdict reasons, warnings, line labels, report sheets).
 * The sentences are authored in English and Ukrainian next to the code (`T(en, uk)`); every other language is a catalog
 * keyed by the English source text (`src/i18n/core/<locale>.ts`, held in the dictionary as `d.core`).
 * `CORE_LOCALES` (i18n/config) lists the languages whose catalog is complete; any other locale is shown English model text.
 */
export type CoreLang = Locale;

export type Messages = Readonly<Record<string, string>>;

const CATALOGS = new Map<Locale, Messages>();

/** Called wherever a dictionary is loaded or received (idempotent: catalogs are static per locale). */
export function registerMessages(locale: Locale, messages: Messages | undefined): void {
  if (messages && Object.keys(messages).length) CATALOGS.set(locale, messages);
}

export type Tr = ((en: string, uk: string, vars?: MessageVars) => string) & { readonly lang: CoreLang };

/**
 * `T(en, uk, vars)`: the English template is the catalog key. `{name}` and ICU plural/select follow `src/i18n/message.ts`;
 * numbers in `vars` are already formatted for the language. A missing catalog entry falls back to the English template.
 */
export const tr = (lang: CoreLang): Tr => Object.assign((en: string, uk: string, vars?: MessageVars) => {
  const src = lang === "en" ? en : lang === "uk" ? uk : (CATALOGS.get(lang)?.[en] ?? en);
  return vars ? formatMessage(src, vars, INTL_TAG[lang]) : src;
}, { lang });

/** A `{ en, uk }` pair (names, labels, notes) in the model language; other languages read the catalog by the English text. */
export const locText = (pair: { readonly en: string; readonly uk: string }, lang: CoreLang): string =>
  lang === "en" ? pair.en : lang === "uk" ? pair.uk : (CATALOGS.get(lang)?.[pair.en] ?? pair.en);

/** Same for a list of sentences (`{ en: string[]; uk: string[] }`). */
export const locList = (pair: { readonly en: readonly string[]; readonly uk: readonly string[] }, lang: CoreLang): string[] =>
  lang === "en" ? [...pair.en] : lang === "uk" ? [...pair.uk] : pair.en.map((s) => CATALOGS.get(lang)?.[s] ?? s);

const NF = new Map<string, Intl.NumberFormat>();
const nf = (lang: CoreLang, o: Intl.NumberFormatOptions) => {
  const key = `${lang}${JSON.stringify(o)}`;
  let f = NF.get(key);
  if (!f) NF.set(key, (f = new Intl.NumberFormat(INTL_TAG[lang], o)));
  return f;
};

/** Fixed-decimal formatting inside model sentences: the decimal mark follows the language (uk: 1,5), never toFixed. */
export const fmtDec = (lang: CoreLang) => (n: number, digits = 0) => nf(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export type CoreUnit = "year" | "month" | "day";

/**
 * A number with a unit word from CLDR, so the noun agrees with the number: "1 month", "5 months"; "1 місяць", "2 місяці", "5 місяців", "1,5 місяця".
 * `short` gives the abbreviation ("5.2 yrs", "5,2 р."), used where a verdict line must stay compact.
 */
export const fmtUnit = (lang: CoreLang) => (n: number, unit: CoreUnit, digits = 0, display: "short" | "long" = "long") =>
  nf(lang, { style: "unit", unit, unitDisplay: display, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

/** Three significant digits, no exponent ("23 400", never "2.34e+4"); the decimal mark follows the language. */
export const fmtSig = (lang: CoreLang) => (n: number, digits = 3) => nf(lang, { maximumSignificantDigits: digits }).format(n);

/** Whole multiplier: Ukrainian "у N раз/рази/разів" needs CLDR agreement; every other language writes "N×". */
export const fmtTimes = (lang: CoreLang) => (n: number) => {
  if (lang !== "uk") return `${Math.round(n)}×`;
  const word = { one: "раз", few: "рази", many: "разів", other: "раза" }[new Intl.PluralRules(INTL_TAG.uk).select(Math.round(n)) as "one" | "few" | "many" | "other"];
  return `${Math.round(n)} ${word}`;
};

/** Integer formatting inside model sentences. */
export const fmtInt = (lang: CoreLang) => (n: number) => nf(lang, { maximumFractionDigits: 0 }).format(Math.round(n));

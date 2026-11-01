/**
 * Language of the model's own explanatory text (verdict reasons, warnings, line labels).
 * The UI is translated into many locales (src/i18n); the engineering report text is authored in
 * English and Ukrainian only — other locales fall back to English for these explanations.
 */
export type CoreLang = "en" | "uk";

export type Tr = ((en: string, uk: string) => string) & { readonly lang: CoreLang };

export const tr = (lang: CoreLang): Tr => Object.assign((en: string, uk: string) => (lang === "uk" ? uk : en), { lang });

const NF: Record<CoreLang, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }),
  uk: new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }),
};

const DF = new Map<string, Intl.NumberFormat>();

/** Fixed-decimal formatting inside model sentences: the decimal mark follows the language (uk: 1,5), never toFixed. */
export const fmtDec = (lang: CoreLang) => (n: number, digits = 0) => {
  const key = `${lang}${digits}`;
  let f = DF.get(key);
  if (!f) DF.set(key, (f = new Intl.NumberFormat(lang === "uk" ? "uk-UA" : "en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits })));
  return f.format(n);
};

const TAG: Record<CoreLang, string> = { en: "en-GB", uk: "uk-UA" };
const UF = new Map<string, Intl.NumberFormat>();

export type CoreUnit = "year" | "month" | "day";

/**
 * A number with a unit word from CLDR, so the noun agrees with the number: "1 month", "5 months"; "1 місяць", "2 місяці", "5 місяців", "1,5 місяця".
 * `short` gives the abbreviation ("5.2 yrs", "5,2 р."), used where a verdict line must stay compact.
 */
export const fmtUnit = (lang: CoreLang) => (n: number, unit: CoreUnit, digits = 0, display: "short" | "long" = "long") => {
  const key = `${lang}${unit}${digits}${display}`;
  let f = UF.get(key);
  if (!f) UF.set(key, (f = new Intl.NumberFormat(TAG[lang], { style: "unit", unit, unitDisplay: display, minimumFractionDigits: digits, maximumFractionDigits: digits })));
  return f.format(n);
};

/** Three significant digits, no exponent ("23 400", never "2.34e+4"); the decimal mark follows the language. */
export const fmtSig = (lang: CoreLang) => (n: number, digits = 3) => new Intl.NumberFormat(TAG[lang], { maximumSignificantDigits: digits }).format(n);

/** Ukrainian "у N раз/рази/разів" for a whole multiplier; English is "N×" and needs no inflection. */
export const fmtTimes = (lang: CoreLang) => (n: number) => {
  if (lang === "en") return `${Math.round(n)}×`;
  const word = { one: "раз", few: "рази", many: "разів", other: "раза" }[new Intl.PluralRules(TAG.uk).select(Math.round(n)) as "one" | "few" | "many" | "other"];
  return `${Math.round(n)} ${word}`;
};

/** Integer formatting inside model sentences. */
export const fmtInt = (lang: CoreLang) => (n: number) => NF[lang].format(Math.round(n));


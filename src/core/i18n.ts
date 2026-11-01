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

/** Integer formatting inside model sentences. */
export const fmtInt = (lang: CoreLang) => (n: number) => NF[lang].format(Math.round(n));


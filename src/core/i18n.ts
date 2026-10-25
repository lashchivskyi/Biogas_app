/**
 * Language of the model's own explanatory text (verdict reasons, warnings, line labels).
 * The UI is translated into many locales (src/i18n); the engineering report text is authored in
 * English and Ukrainian only — other locales fall back to English for these explanations.
 */
export type CoreLang = "en" | "uk";

export type Tr = (en: string, uk: string) => string;

export const tr = (lang: CoreLang): Tr => (en, uk) => (lang === "uk" ? uk : en);

const NF: Record<CoreLang, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }),
  uk: new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }),
};

/** Integer formatting inside model sentences. */
export const fmtInt = (lang: CoreLang) => (n: number) => NF[lang].format(Math.round(n));

/** One-decimal formatting with the right decimal separator. */
export const fmt1 = (lang: CoreLang) => (n: number) => (lang === "uk" ? n.toFixed(1).replace(".", ",") : n.toFixed(1));

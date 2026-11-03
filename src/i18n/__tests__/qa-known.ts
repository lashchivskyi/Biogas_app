import type { Locale } from "..";

/**
 * Known localisation defects per locale, found when the QA was introduced (a ratchet, enforced by `qa.test.ts`):
 * a new defect fails the test, and fixing one fails it too until the number is lowered, so the list only shrinks.
 * `npm run scorecard` reports their sum as the hard l10n errors still open.
 */
export const KNOWN: Record<"dnt" | "unit" | "abbreviation", Partial<Record<Locale, number>>> = {
  // Monte Carlo, HHV/LHV and FACT/ASSUMPTION/CALCULATION/ESTIMATE written in local script or translated.
  dnt: { uk: 4, pl: 2, de: 6, fr: 0, it: 4, es: 0, pt: 0, nl: 4, cs: 6, sk: 10, hu: 0, ro: 0, bg: 7, sr: 5, el: 0, tr: 0, lt: 0, lv: 0, et: 0, da: 5, sv: 3, fi: 8, vi: 0, th: 4 },
  // "kWe" → "kWel", "t" → "tấn"/"ตัน" and similar local unit words (vi, th, fi write them natively: owner decision).
  unit: { uk: 1, pl: 1, de: 2, nl: 1, cs: 1, sk: 1, hu: 2, ro: 1, bg: 1, sr: 1, el: 1, tr: 2, lt: 1, lv: 1, et: 1, da: 1, sv: 1, fi: 8, vi: 11, th: 16 },
  // English CHP / COD / NPV / IRR left where the glossary has the local term.
  abbreviation: { uk: 3, pl: 5, de: 0, fr: 0, it: 0, es: 0, pt: 0, nl: 0, cs: 0, sk: 0, hu: 0, ro: 0, bg: 0, sr: 0, el: 0, tr: 0, lt: 0, lv: 0, et: 0, da: 0, sv: 0, vi: 0, th: 6 },
};

import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n";
import { formatLocalizedNumber, normalizeNumberText, parseLocalizedNumber } from "../localized-number";

describe.each(LOCALES)("number text in %s", (locale) => {
  it("shows a value in the locale's own marks and reads it back unchanged", () => {
    for (const v of [0, 0.5, 12.5, 1234, 1234.5, 1234567.891, -1234.5, 0.000123, 1e6, 2.5e9]) {
      const shown = formatLocalizedNumber(v, locale);
      expect(parseLocalizedNumber(shown, locale), `${locale}: ${shown}`).toBe(v);
      expect(normalizeNumberText(shown, locale), `${locale}: ${shown} is already tidy`).toBe(shown);
    }
  });

  it("tidies a typed entry on blur and keeps invalid text for the error message", () => {
    expect(parseLocalizedNumber(normalizeNumberText("1234567,5", locale), locale)).toBe(1234567.5);
    expect(normalizeNumberText("12 abc", locale)).toBe("12 abc");
    expect(normalizeNumberText("", locale)).toBe("");
  });
});

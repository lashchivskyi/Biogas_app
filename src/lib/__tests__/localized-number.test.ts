import { describe, expect, it } from "vitest";
import { LOCALES, INTL_TAG } from "@/i18n/config";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { parseLocalizedNumber } from "../localized-number";
import { formToInput, inputToForm } from "../form";

describe.each(LOCALES)("number input %s", (locale) => {
  it("accepts the locale's grouping and decimal separators, including negative gate fees", () => {
    for (const value of [1234567.89, -1234.56, 0.015, 17.123, 12000]) {
      const text = new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 6 }).format(value);
      expect(parseLocalizedNumber(text, locale), text).toBeCloseTo(value, 6);
    }
  });
  it("preserves project quantities and prices through a localised form", () => {
    const input = EXAMPLES.find((e) => e.id === "de_food_30k")!.input;
    const modified = { ...input, feedstocks: [{ ...input.feedstocks[0], quantity: 1234.567, dryMatterPct: 17.123, purchasePricePerTonneLocal: -12.34 }] };
    const form = inputToForm(modified, locale);
    const actual = formToInput(form, getCountry(input.countryCode), "en", locale).feedstocks[0];
    expect(actual.quantity).toBeCloseTo(1234.567, 6);
    expect(actual.dryMatterPct).toBeCloseTo(17.123, 6);
    expect(actual.purchasePricePerTonneLocal).toBeCloseTo(-12.34, 6);
  });
});

it("rejects partial or malformed numeric values", () => {
  for (const value of ["12foo", "1,2,3", "", "NaN", "Infinity", "12%", "1.2.3"]) expect(parseLocalizedNumber(value, "en")).toBeUndefined();
  expect(parseLocalizedNumber("๑๒๓.๔๕", "th")).toBe(123.45);
});

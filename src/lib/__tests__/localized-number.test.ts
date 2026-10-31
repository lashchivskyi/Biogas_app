import { describe, expect, it } from "vitest";
import { LOCALES, INTL_TAG } from "@/i18n/config";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { parseLocalizedNumber } from "../localized-number";
import { formToInput, inputToForm, invalidNumberStep } from "../form";
import { calendarDateAt } from "../format";

it("uses the local calendar day for assessment freshness near UTC midnight", () => {
  const instant = new Date("2026-10-28T22:30:00Z");
  expect(calendarDateAt(instant,"Europe/Kyiv")).toBe("2026-10-29");
  expect(calendarDateAt(instant,"America/New_York")).toBe("2026-10-28");
  expect(calendarDateAt(new Date("2025-12-31T23:30:00Z"),"Europe/Warsaw")).toBe("2026-01-01");
});

describe.each(LOCALES)("number input %s", (locale) => {
  it("accepts the locale's grouping and decimal separators, including negative gate fees", () => {
    for (const value of [1234567.89, -1234.56, 0.015, 17.123, 12000]) {
      const text = new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 6 }).format(value);
      expect(parseLocalizedNumber(text, locale), text).toBeCloseTo(value, 6);
    }
  });
  it("preserves project quantities and prices through a localised form", () => {
    const input = EXAMPLES.find((e) => e.id === "de_starch")!.input;
    const modified = { ...input, feedstocks: [{ ...input.feedstocks[0], quantity: 1234.567, dryMatterPct: 17.123, purchasePricePerTonneLocal: -12.34 }] };
    const form = inputToForm(modified, locale);
    expect(invalidNumberStep(form)).toBeNull();
    const actual = formToInput(form, getCountry(input.countryCode), "en").feedstocks[0];
    expect(actual.quantity).toBeCloseTo(1234.567, 6);
    expect(actual.dryMatterPct).toBeCloseTo(17.123, 6);
    expect(actual.purchasePricePerTonneLocal).toBeCloseTo(-12.34, 6);
  });
});

it("migrates an untagged old draft without interpreting decimal points as grouping", () => {
  const input = EXAMPLES.find((e) => e.id === "de_starch")!.input;
  const form = inputToForm(input);
  delete form.numberLocale;
  form.lines[0].quantity = "1 234.567";
  form.lines[0].dryMatterPct = "17,123";
  const restored = formToInput(form, getCountry(input.countryCode), "en");
  expect(restored.feedstocks[0].quantity).toBe(1234.567);
  expect(restored.feedstocks[0].dryMatterPct).toBe(17.123);
  const migrated = inputToForm(restored, "de");
  const values: Partial<typeof restored.feedstocks[0]> = { ...restored.feedstocks[0] };
  delete values.id;
  expect(formToInput(migrated, getCountry(input.countryCode), "en").feedstocks[0]).toMatchObject(values);
});

it("rejects partial or malformed numeric values", () => {
  for (const value of ["12foo", "1,2,3", "", "NaN", "Infinity", "12%", "1.2.3"]) expect(parseLocalizedNumber(value, "en")).toBeUndefined();
  expect(parseLocalizedNumber("๑๒๓.๔๕", "th")).toBe(123.45);
});

it("locates invalid numbers before partial projects can be submitted", () => {
  const input = EXAMPLES.find((e) => e.id === "de_starch")!.input;
  const form = inputToForm(input, "de");
  form.lines[0].quantity = "12foo";
  expect(invalidNumberStep(form)).toBe(1);
  form.lines[0].quantity = "12.000,5";
  form.elecPrice = "1,2,3";
  expect(invalidNumberStep(form)).toBe(2);
  form.elecPrice = "0,21";
  form.landHa = "unknown";
  expect(invalidNumberStep(form)).toBe(3);
});

describe.each(LOCALES)("optional contract and financing inputs %s", (locale) => {
  it("round-trips export/heat price, operator cost and loan terms, and drops nonsense values", () => {
    const input = EXAMPLES.find((e) => e.id === "de_starch")!.input;
    const withTerms = { ...input, energy: { ...input.energy, exportPriceLocalPerKwh: 0.123456, heatPriceLocalPerKwh: 0.045, heatNeed: "year_round_process" as const }, finance: { debtShare: 0.55, debtRate: 0.0725, debtTenorYears: 12, operatorWageLocalPerHour: 31.5 } };
    const form = inputToForm(withTerms, locale);
    expect(invalidNumberStep(form)).toBeNull();
    const back = formToInput(form, getCountry(input.countryCode), "en");
    expect(back.energy.exportPriceLocalPerKwh).toBeCloseTo(0.123456, 6);
    expect(back.energy.heatPriceLocalPerKwh).toBeCloseTo(0.045, 6);
    expect(back.finance).toMatchObject({ debtShare: expect.closeTo(0.55, 6), debtRate: expect.closeTo(0.0725, 6), debtTenorYears: 12, operatorWageLocalPerHour: 31.5 });
    const bad = { ...form, debtSharePct: "95", debtRatePct: "-3", debtTenorYears: "40", operatorWage: "0" };
    expect(formToInput(bad, getCountry(input.countryCode), "en").finance).toBeUndefined();
    expect(formToInput({ ...inputToForm(input, locale) }, getCountry(input.countryCode), "en").finance).toBeUndefined();
    expect(invalidNumberStep({ ...form, debtRatePct: "8abc" })).toBe(3);
  });
});

describe.each(LOCALES)("supplier quote form fields %s", (locale) => {
  it("needs both the price and the technology, and round-trips them", () => {
    const input = EXAMPLES.find((e) => e.id === "de_starch")!.input;
    const withQuote = { ...input, finance: { capexQuoteLocal: 3_250_000.5, capexQuoteRoute: "biomethane" as const } };
    const form = inputToForm(withQuote, locale);
    expect(invalidNumberStep(form)).toBeNull();
    expect(formToInput(form, getCountry(input.countryCode), "en").finance).toMatchObject({ capexQuoteLocal: expect.closeTo(3_250_000.5, 3), capexQuoteRoute: "biomethane" });
    expect(formToInput({ ...form, capexQuoteRoute: "" }, getCountry(input.countryCode), "en").finance).toBeUndefined();
    expect(formToInput({ ...form, capexQuote: "" }, getCountry(input.countryCode), "en").finance).toBeUndefined();
    expect(invalidNumberStep({ ...form, capexQuote: "3 million" })).toBe(3);
  });
});

describe("financing section checkbox", () => {
  const input = EXAMPLES.find((e) => e.id === "de_starch")!.input;
  const country = getCountry(input.countryCode);
  const terms = { ...input, finance: { debtRate: 0.07, operatorWageLocalPerHour: 30, capexQuoteLocal: 2e6, capexQuoteRoute: "chp" as const } };

  it("is ticked for an input that already has terms, unticked for one that has none", () => {
    expect(inputToForm(terms).refineOpen).toBe(true);
    expect(inputToForm(input).refineOpen).toBe(false);
  });
  it("ignores typed terms, and their typos, while unticked (like the natural-gas toggle)", () => {
    const form = inputToForm(terms);
    expect(formToInput(form, country, "en").finance).toMatchObject({ debtRate: 0.07, operatorWageLocalPerHour: 30 });
    const closed = { ...form, refineOpen: false };
    expect(formToInput(closed, country, "en").finance).toBeUndefined();
    expect(invalidNumberStep({ ...closed, debtRatePct: "8abc" })).toBeNull();
    expect(invalidNumberStep({ ...form, debtRatePct: "8abc" })).toBe(3);
  });
});

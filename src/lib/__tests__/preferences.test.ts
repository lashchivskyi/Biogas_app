import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DisplayMoney } from "@/components/DisplayMoney";
import { COUNTRIES } from "@/countries";
import { EXAMPLES } from "@/core/examples";
import { getDictionary, LOCALES } from "@/i18n";
import { COUNTRY_LOCALE } from "@/i18n/config";
import { preferenceCopy } from "@/i18n/preferences";
import { adaptToLocation, contextHref, displayCurrency, normalizePreferences, readPreferenceCookie, resolvePreferences, swapLocaleUrl } from "../preferences";
import { formToInput, inputToForm, recontextualizeForm } from "../form";
import { makeFormat } from "../format";

describe("shared project and language preferences", () => {
  const saved = { country: "DE", region: COUNTRIES.DE.regions[1].id, displayCurrency: "USD", paymentCurrency: "EUR" };
  it.each([ ["US", "en", "USD"], ["IT", "it", "EUR"], ["PL", "pl", "EUR"] ])("adapts project, language and currencies to a newly detected %s location", (country, language, currency) => {
    const current = normalizePreferences({ ...saved, detectedCountry: "UA" }, COUNTRIES, "GB");
    const adapted = adaptToLocation(current, country, COUNTRIES);
    expect(adapted).toMatchObject({ changed: true, language, preferences: { country, detectedCountry: country, displayCurrency: currency, paymentCurrency: currency } });
    expect(adapted.preferences.region).toBeUndefined();
    expect(adaptToLocation(adapted.preferences, country, COUNTRIES)).toEqual({ preferences: adapted.preferences, changed: false });
  });
  it("keeps manual choices within the same IP country, but replaces them when location changes", () => {
    const manual = normalizePreferences({ ...saved, detectedCountry: "US" }, COUNTRIES, "GB");
    expect(adaptToLocation(manual, "US", COUNTRIES).changed).toBe(false);
    expect(adaptToLocation(manual, "PL", COUNTRIES).preferences).toMatchObject({ country: "PL", displayCurrency: "EUR", paymentCurrency: "EUR", detectedCountry: "PL" });
    expect(adaptToLocation(manual, "XX", COUNTRIES).changed).toBe(false);
    expect(adaptToLocation(manual, "ZZ", COUNTRIES).preferences.country).toBe("US");
  });
  it.each(["CH", "BE", "PT", "IE", "AU", "JP", "AE"])("defaults unsupported %s visitors to US/en/USD and keeps the real detected country", (country) => {
    const current = normalizePreferences({ ...saved, detectedCountry: "UA" }, COUNTRIES, "GB");
    const adapted = adaptToLocation(current, country, COUNTRIES);
    expect(adapted).toMatchObject({ changed: true, language: "en", preferences: { country: "US", detectedCountry: country, displayCurrency: "USD", paymentCurrency: "USD", locationDefaultsVersion: 2 } });
    expect(adapted.preferences.region).toBeUndefined();
    expect(adapted.preferences.city).toBeUndefined();
    expect(displayCurrency("AUTO", country)).toBe("USD");
    expect(resolvePreferences({ locale: "uk", markets: COUNTRIES, visitorCountry: country }).country).toBe("US");
    expect(adaptToLocation(adapted.preferences, country, COUNTRIES).changed).toBe(false);
  });
  it("migrates old unsupported-country defaults once without repeatedly overriding manual preferences", () => {
    const old = normalizePreferences({ ...saved, detectedCountry: "CH" }, COUNTRIES, "GB");
    const adapted = adaptToLocation(old, "CH", COUNTRIES);
    expect(adapted.changed).toBe(true);
    const manual = normalizePreferences({ ...adapted.preferences, ...saved }, COUNTRIES, "GB");
    expect(adaptToLocation(manual, "CH", COUNTRIES)).toEqual({ changed: false, preferences: manual });
    expect(adaptToLocation(manual, "JP", COUNTRIES)).toMatchObject({ changed: true, language: "en", preferences: { country: "US", displayCurrency: "USD" } });
    expect(displayCurrency("EUR", "JP")).toBe("EUR");
    expect(resolvePreferences({ locale: "uk", markets: COUNTRIES, visitorCountry: "JP", saved }).country).toBe("DE");
  });
  it("uses the same supported-country registry for server language negotiation and project adapters", () => {
    expect(Object.keys(COUNTRY_LOCALE).sort()).toEqual(Object.keys(COUNTRIES).sort());
  });
  it("keeps a remembered project and currency independent of language and visitor location", () => {
    for (const locale of LOCALES) {
      expect(resolvePreferences({ locale, markets: COUNTRIES, saved, visitorCountry: "US" })).toEqual(saved);
    }
    expect(displayCurrency("AUTO", "US")).toBe("USD");
    expect(displayCurrency("AUTO", "UA")).toBe("EUR");
    expect(displayCurrency("EUR", "US")).toBe("EUR");
    expect(displayCurrency("USD", "DE")).toBe("USD");
  });
  it("prioritizes explicit project URLs over remembered context, draft and geolocation", () => {
    const options = { locale: "uk" as const, markets: COUNTRIES, saved, draft: { countryCode: "PL" }, visitorCountry: "US" };
    const region = COUNTRIES.UA.regions[0].id;
    expect(resolvePreferences({ ...options, query: new URLSearchParams({ c: "ua", r: region }) })).toMatchObject({ ...saved, country: "UA", region });
    expect(resolvePreferences({ ...options, saved: null })).toMatchObject({ country: "PL" });
    expect(resolvePreferences({ ...options, saved: null, draft: undefined })).toMatchObject({ country: "US" });
    expect(resolvePreferences({ ...options, saved: null, draft: undefined, visitorCountry: undefined })).toMatchObject({ country: "UA" });
    expect(resolvePreferences({ ...options, query: new URLSearchParams({ c: "PL", r: saved.region }) }).region).toBeUndefined();
    expect(resolvePreferences({ ...options, query: new URLSearchParams({ c: "DE", r: "" }) }).region).toBeUndefined();
  });
  it("rejects invalid persisted locations, currencies and prototype keys", () => {
    expect(normalizePreferences({ country: "__proto__", displayCurrency: "BTC", paymentCurrency: "UAH" }, COUNTRIES, "GB")).toEqual({ country: "GB", region: undefined, displayCurrency: "AUTO", paymentCurrency: "AUTO" });
    expect(resolvePreferences({ locale: "uk", markets: COUNTRIES, saved, query: new URLSearchParams({ c: "ZZ" }) })).toEqual(saved);
    expect(readPreferenceCookie("other=x; mx_context=%broken")).toBeUndefined();
    expect(readPreferenceCookie(`other=x; mx_context=${encodeURIComponent(JSON.stringify(saved))}`)).toEqual(saved);
  });
  it("preserves report tokens, checkout parameters and anchors when changing language or location", () => {
    const path = "/uk/report/private-token?session_id=cs_123&c=DE&r=old#cash-flow";
    expect(swapLocaleUrl(path, "pl")).toBe("/pl/report/private-token?session_id=cs_123&c=DE&r=old#cash-flow");
    expect(contextHref(path, { country: "UA" })).toBe("/uk/report/private-token?session_id=cs_123&c=UA#cash-flow");
    expect(contextHref("/de/calculator?plan=report&b=dairy_farm", { country: "PL", region: "PL-test" })).toContain("plan=report&b=dairy_farm&c=PL&r=PL-test");
  });
});

describe("project changes preserve quantities without reinterpreting prices", () => {
  const input = EXAMPLES.find((e) => e.id === "de_starch")!.input;
  it("keeps an unselected region empty instead of silently choosing the first climate profile", () => {
    const form = inputToForm(input, "de");
    const next = recontextualizeForm(form, COUNTRIES.DE, undefined, "de");
    expect(next.regionId).toBe("");
    expect(formToInput(next, COUNTRIES.DE, "en").regionId).toBe("");
    expect(formToInput({ ...next, regionId: "foreign-region" }, COUNTRIES.DE, "en").regionId).toBe("");
  });
  it("preserves an explicit SSR monetary snapshot across different compact-format conventions", () => {
    const html = renderToStaticMarkup(createElement(DisplayMoney, { value: 11000000, initialText: "€11.0M" }));
    expect(html).toContain('data-display-currency="EUR">€11.0M</span>');
  });
  it.each(LOCALES)("preserves partial inputs and number meanings on a change to %s", (locale) => {
    const form = inputToForm(input, "de");
    form.lines[0].quantity = "1234,567";
    form.lines[0].purchasePrice = "-12,34";
    form.lines[0].vsPctOfDm = "";
    form.landHa = "unfinished";
    const next = recontextualizeForm(form, COUNTRIES.DE, form.regionId, locale);
    const actual = formToInput(next, COUNTRIES.DE, "en");
    expect(actual.feedstocks[0].quantity).toBe(1234.567);
    expect(actual.feedstocks[0].purchasePricePerTonneLocal).toBe(-12.34);
    expect(next.lines[0].id).toBe(form.lines[0].id);
    expect(next.lines[0].vsPctOfDm).toBe("");
    expect(next.landHa).toBe("unfinished");
  });
  it("clears all local money on a country change, even between two EUR markets", () => {
    const form = inputToForm(input, "de");
    form.elecBillMonthly = "1000"; form.gasBillMonthly = "500";
    form.lines[0].disposalCost = "12"; form.lines[0].opportunityValue = "20"; form.lines[0].purchasePrice = "-30";
    for (const code of ["UA", "FR"]) {
      const next = recontextualizeForm(form, COUNTRIES[code], undefined, "uk");
      expect([next.elecBillMonthly, next.elecPrice, next.gasBillMonthly, next.gasPrice, next.lines[0].disposalCost, next.lines[0].opportunityValue, next.lines[0].purchasePrice]).toEqual(Array(7).fill(""));
      expect(formToInput(next, COUNTRIES[code], "uk").feedstocks[0].quantity).toBe(input.feedstocks[0].quantity);
      expect(next.regionId).toBe("");
    }
  });
  it("converts monetary presentation without changing quantities or source data", async () => {
    const d = await getDictionary("en");
    const eur = makeFormat("en", d.labels.units);
    const usd = makeFormat("en", d.labels.units, { currency: "USD", rate: 1.1 });
    expect(usd.eur(100)).toContain("110");
    expect(usd.monetaryCompact(1000)).toBe("1.1K");
    expect(usd.compact(1000)).toBe(eur.compact(1000));
    expect(usd.pct(0.15)).toBe(eur.pct(0.15));
    expect(usd.money(100, "UAH")).toBe(eur.money(100, "UAH"));
  });
  it.each(LOCALES)("provides complete preference copy in %s", (locale) => {
    const copy = preferenceCopy(locale);
    expect(Object.values(copy).every((value) => value.trim())).toBe(true);
  });
});

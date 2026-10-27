import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { cityClimate, searchCities, signCity, verifyCity } from "../cities";
import { inputSchema } from "../validate";
import { assess, buildParams } from "@/core";
import { COUNTRIES } from "@/countries";
import { EXAMPLES } from "@/core/examples";
import { cityRegionId } from "@/core/location";
import { contextHref, normalizePreferences, resolvePreferences, adaptToLocation } from "@/lib/preferences";
import { formToInput, inputToForm, recontextualizeForm } from "@/lib/form";
import { getDictionary, LOCALES } from "@/i18n";
import { locationCopy } from "@/i18n/location";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ResultView } from "@/components/ResultView";

const place = { id: 702550, name: "Lviv", admin1: "Lviv Oblast", country_code: "UA", latitude: 49.84, longitude: 24.03, feature_code: "PPLA" };
const snapshot = () => signCity({ id: place.id, name: place.name, admin1: place.admin1, countryCode: "UA", latitude: place.latitude, longitude: place.longitude,
  gridLatitude: 49.75, gridLongitude: 24, elevationM: 286, monthlyTempC: [-2, -1, 3, 9, 14, 18, 20, 19, 14, 9, 3, -1], startDate: "2016-01-01", endDate: "2025-12-31", fetchedOn: "2026-10-27" });
const template = EXAMPLES.find((e) => e.id === "slaughter_5000")!.input;
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("city search and climate evidence", () => {
  let cityData: { cities: { id: number; name: string; countryCode: string }[] };
  beforeAll(async () => {
    cityData = JSON.parse(gunzipSync(await readFile("src/server/data/cities.json.gz")).toString());
  });
  it("searches real local names and aliases within the selected country", async () => {
    const ua = await searchCities("Львів", "UA", "uk");
    expect(ua[0]).toMatchObject({ id: place.id, countryCode: "UA", name: "Львів" });
    expect(ua.every((p) => p.countryCode === "UA")).toBe(true);
    expect((await searchCities("Lviv", "UA", "uk"))[0].id).toBe(place.id);
    expect((await searchCities("Lodz", "PL", "pl"))[0].name).toBe("Łódź");
    expect((await searchCities("Roma", "IT", "it"))[0].id).toBe(3169070);
    await expect(searchCities("Paris", "XX", "en")).rejects.toThrow("wrong_country");
  });
  it("reads real ERA5 temperatures and preserves the dataset period rather than inventing a new date", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2028-01-01T00:00:00Z"));
    const city = await cityClimate(place.id, "UA", "en");
    // Independently prepared historical API reference at the same city, including its terrain correction.
    const reference = COUNTRIES.UA.regions.find((r) => r.id === "lviv")!.monthlyTempC;
    city.monthlyTempC.forEach((t, i) => expect(Math.abs(t - reference[i])).toBeLessThan(0.3));
    expect(city.gridLatitude).toBe(49.75); expect(city.gridLongitude).toBe(24);
    expect(city.dataset).toBe("era5-planette-0.25");
    expect(city.fetchedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(city.fetchedOn).not.toBe("2028-01-01");
    expect(city.startDate).toBe("2016-01-01"); expect(city.endDate).toBe("2025-12-31");
    expect(verifyCity(city, "UA")).toBe(true);
    expect(verifyCity({ ...city, dataset: undefined }, "UA")).toBe(false);
  });
  it("rejects foreign and unknown IDs without manufacturing a regional proxy", async () => {
    await expect(cityClimate(place.id, "PL", "en")).rejects.toThrow("wrong_country");
    await expect(cityClimate(9999999999, "UA", "en")).rejects.toThrow("not_found");
    expect(await searchCities("zzzzzzzzzz", "UA", "uk")).toEqual([]);
  });
  it("works in production with all external fetch calls disabled and only a local signing secret", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("LOCATION_SIGNING_SECRET", "offline-test-signing-secret");
    const fetch = vi.fn(() => { throw new Error("Network disabled"); }); vi.stubGlobal("fetch", fetch);
    expect((await searchCities("Lviv", "UA", "en"))[0].id).toBe(place.id);
    const city = await cityClimate(place.id, "UA", "en");
    expect(verifyCity(city, "UA")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(city)).not.toContain("offline-test-signing-secret");
  });
  it.each(Object.keys(COUNTRIES))("has real offline city/climate coverage in %s", async (country) => {
    const largest = cityData.cities.find((c) => c.countryCode === country)!;
    expect(largest).toBeDefined();
    const found = await searchCities(largest.name, country, "en");
    expect(found.some((p) => p.id === largest.id)).toBe(true);
    const city = await cityClimate(largest.id, country, "en");
    expect(verifyCity(city, country)).toBe(true);
    expect(city.monthlyTempC).toHaveLength(12);
    expect(Math.abs(city.latitude - city.gridLatitude)).toBeLessThanOrEqual(0.125);
    expect(Math.abs(city.longitude - city.gridLongitude)).toBeLessThanOrEqual(0.125);
  });
});

describe("city location through engineering, persistence and server validation", () => {
  it("uses the city's temperatures, reconciles energy and rejects climate or country tampering", () => {
    const city = snapshot(); const input = { ...template, regionId: cityRegionId(city), city };
    expect(inputSchema.safeParse(input).success).toBe(true);
    const a = assess(input, COUNTRIES.UA);
    expect(a.climate.regionName).toBe("Lviv, Lviv Oblast");
    expect(a.climate.meanTempC).toBeCloseTo(city.monthlyTempC.reduce((s, n) => s + n) / 12);
    const warm = snapshot(); warm.monthlyTempC = warm.monthlyTempC.map((n) => n + 10);
    expect(verifyCity(warm, "UA")).toBe(false);
    expect(inputSchema.safeParse({ ...input, city: warm }).success).toBe(false);
    expect(inputSchema.safeParse({ ...input, countryCode: "PL" }).success).toBe(false);
    expect(inputSchema.safeParse({ ...input, regionId: "lviv" }).success).toBe(false);
    expect(() => assess({ ...input, countryCode: "PL" }, COUNTRIES.PL)).toThrow();
    expect(inputSchema.safeParse({ ...input, city: { ...city, longitude: 0 } }).success).toBe(false);
    const params = buildParams(COUNTRIES.UA, input.regionId, input.energy);
    const national = buildParams(COUNTRIES.UA, undefined, input.energy);
    expect(params.get("econ.electricity_retail_eur_kwh")).toBe(national.get("econ.electricity_retail_eur_kwh"));
    const hotter = signCity({ ...city, monthlyTempC: city.monthlyTempC.map((t) => t + 10) });
    expect(assess({ ...input, city: hotter }, COUNTRIES.UA).routesBase.chp.design.heatDemandKwhYear).not.toBe(a.routesBase.chp.design.heatDemandKwhYear);
  });
  it("retains the city in drafts, URLs and locale changes and clears it on a country change", () => {
    const city = snapshot(), region = cityRegionId(city);
    const input = { ...template, city, regionId: region };
    const saved = normalizePreferences({ country: "UA", region, city }, COUNTRIES, "GB");
    expect(saved.city).toEqual(city);
    expect(contextHref("/uk/calculator", saved)).toContain("r=city%3A702550");
    expect(resolvePreferences({ locale: "de", markets: COUNTRIES, saved }).city).toEqual(city);
    expect(resolvePreferences({ locale: "en", markets: COUNTRIES, query: new URLSearchParams({ c: "UA", r: region }) }).region).toBe(region);
    const form = inputToForm(input, "uk");
    expect(formToInput(recontextualizeForm(form, COUNTRIES.UA, region, "de", city), COUNTRIES.UA, "en").city).toEqual(city);
    expect(recontextualizeForm(form, COUNTRIES.PL, undefined, "pl").city).toBeUndefined();
    expect(normalizePreferences({ ...saved, country: "PL" }, COUNTRIES, "GB").city).toBeUndefined();
    expect(adaptToLocation({ ...saved, detectedCountry: "UA" }, "PL", COUNTRIES).preferences.city).toBeUndefined();
  });
  it("shows the selected city, coordinates and observation period in the report", async () => {
    const city = snapshot(); const a = assess({ ...template, city, regionId: cityRegionId(city) }, COUNTRIES.UA);
    const d = await getDictionary("uk");
    const html = renderToStaticMarkup(createElement(ResultView, { a, d, locale: "uk", access: "free", currency: "UAH", methodologyHref: "/uk/methodology" }));
    expect(html).toContain("Lviv, Lviv Oblast"); expect(html).toContain("49,84"); expect(html).toContain("2016–2025");
  });
  it.each(LOCALES)("has complete city selection copy in %s", (locale) => {
    expect(Object.values(locationCopy(locale)).every((s) => s.trim().length > 0)).toBe(true);
  });
});

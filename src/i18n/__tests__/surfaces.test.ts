import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { SEGMENTS } from "@/content/segments";
import { localizedHub, localizedSegment } from "@/content/localized";
import { LocaleProvider } from "@/components/LocaleProvider";
import NotFoundPage from "@/app/[lang]/not-found";
import ErrorPage from "@/app/[lang]/error";
import { ResultView } from "@/components/ResultView";
import { getDictionary, LOCALES } from "..";
import { adminCopy } from "../admin";
import { legalCopy } from "../legal";
import { errorCopy, numberError } from "../errors";
import { financialLabels, sensitivityLabels } from "../financial-labels";
import { qualityGapCopy } from "../quality";
import { marketLabel, marketQuality } from "../market";
import { MARKET_BANDS } from "@/core/marketBenchmarks";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
}

// Collect actual line IDs across technologies, countries and operating cases.
const assessments = EXAMPLES.map((ex) => assess(ex.input, getCountry(ex.input.countryCode)));
const lineIds = new Set(assessments.flatMap((a) => Object.values(a.routesBase).flatMap((s) => [
  ...s.capex.lines, ...s.opexRev.opex, ...s.opexRev.revenue,
]).map((l) => l.id)));

describe.each(LOCALES)("localised surfaces %s", (locale) => {
  it("provides legal, CRM and failure copy without missing positional entries", () => {
    const admin = adminCopy(locale);
    expect(Object.keys(admin.orderStatus)).toHaveLength(7);
    expect(Object.keys(admin.leadStatus)).toHaveLength(5);
    expect(legalCopy[locale].headings).toHaveLength(8);
    expect(errorCopy[locale]).toHaveLength(6);
    expect(numberError[locale].trim()).toBeTruthy();
    for (const s of strings([admin, legalCopy[locale], errorCopy[locale]])) expect(s.trim().length).toBeGreaterThan(0);
  });

  it("covers every financial line and stress-test ID used by sample projects", async () => {
    const d = await getDictionary(locale);
    const lines = financialLabels(locale, d);
    for (const id of lineIds) expect(lines[id]?.trim(), `financial label ${id}`).toBeTruthy();
    const stresses = sensitivityLabels(locale, d);
    for (const a of assessments) for (const s of a.sensitivity) expect(stresses[s.id]?.trim(), s.id).toBeTruthy();
    expect(Object.values(lines)).not.toContain(undefined);
    expect(Object.values(lines)).not.toContain("");
    const gaps = qualityGapCopy(locale, d, "EUR");
    for (const a of assessments) for (const id of a.missingDataCodes) expect(gaps[id]?.trim(), id).toBeTruthy();
    for (const band of MARKET_BANDS) {
      expect(marketLabel(locale, band.id)).toBeTruthy();
      expect(marketQuality(locale, band.quality)).toBeTruthy();
    }
  });

  it("renders recovery and 404 copy in the locale supplied by its layout", () => {
    const missing = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(NotFoundPage)));
    const failure = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(ErrorPage, { error: new Error("private server detail"), retry: () => undefined })));
    expect(missing).toContain(errorCopy[locale][0]);
    expect(missing).toContain(`href="/${locale}"`);
    expect(failure).toContain(errorCopy[locale][3]);
    expect(failure).not.toContain("private server detail");
  });

  it("uses native product copy on each guide and sector page", async () => {
    const d = await getDictionary(locale);
    const hub = localizedHub(locale, d);
    expect(hub.sections.length).toBeGreaterThan(4);
    for (const s of strings(hub)) expect(s.trim()).toBeTruthy();
    for (const sector of SEGMENTS) {
      const content = localizedSegment(sector, locale, d);
      expect(content.h1.trim()).toBeTruthy();
      if (locale !== "en" && locale !== "uk") {
        expect(content.h1).toBe(d.fit.segments[sector.id].label);
        expect(content.intro).toContain(d.fit.segments[sector.id].insight);
      }
    }
  });
});

it("keeps a stable localisation ID for every missing-input rule", () => {
  const input = EXAMPLES[0].input;
  const a = assess({ ...input, labAnalysisAvailable: false, feedstocks: [{ id: "missing", type: "food_waste", quantity: 10000, delivered: true }], energy: { heatNeed: "year_round_process", hasGridConnection: true }, site: {} }, getCountry(input.countryCode));
  expect(a.missingDataCodes).toHaveLength(a.missingData.length);
  expect(new Set(a.missingDataCodes)).toEqual(new Set(["lab", "electricity", "electricity_price", "heat", "land", "distance", "disposal"]));
});

it("keeps the selected region name consistent between the form and the report without mutating model output", async () => {
  const input = EXAMPLES.find((e) => e.id === "de_food_30k")!.input;
  const country = getCountry(input.countryCode);
  const region = country.regions.find((r) => r.id === input.regionId)!;
  const assessment = assess(input, country, { lang: "en" });
  const before = assessment.climate.regionName;
  const html = renderToStaticMarkup(createElement(ResultView, { a: assessment, d: await getDictionary("de"), locale: "de", currency: "EUR", access: "standard", methodologyHref: "/de/methodology" }));
  expect(html).toContain(region.names?.de ?? region.name);
  expect(assessment.climate.regionName).toBe(before);
});

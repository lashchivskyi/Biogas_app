import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { assess } from "@/core";
import { allProvenance } from "@/core/assess";
import { EXAMPLES } from "@/core/examples";
import { COUNTRIES, getCountry } from "@/countries";
import { SEGMENTS } from "@/content/segments";
import { localizedHub, localizedSegment } from "@/content/localized";
import { LocaleProvider } from "@/components/LocaleProvider";
import NotFoundPage from "@/app/[lang]/not-found";
import ErrorPage from "@/app/[lang]/error";
import MethodologyPage from "@/app/[lang]/methodology/page";
import { ResultView } from "@/components/ResultView";
import { getDictionary, INTL_TAG, LOCALES, LOCALE_COUNTRY } from "..";
import { methodologyCopy } from "../methodology";
import { preferenceCopy } from "../preferences";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, toString: () => "" }) }));
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
  it("renders a localised country registry without the old Ukraine-only calibration claim", async () => {
    const copy = methodologyCopy[locale];
    const page = await MethodologyPage({ params: Promise.resolve({ lang: locale }), searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);
    const market = html.match(/<section[^>]*id="parameter-group-4"[\s\S]*?<\/section>/)![0];
    expect(market).toContain(`data-country="${LOCALE_COUNTRY[locale]}"`);
    expect(market).toContain(preferenceCopy(locale).change);
    expect(copy.groups[4]).not.toMatch(/Ukraine|Україн|Ukrain|Ucrain|Ucrân|Oekraïn|Ukrajn|Ουκραν|Ukrayn|Ukrain|Ukrain|ยูเครน/i);
    for (const text of Object.values(copy.registry)) expect(text).not.toMatch(/\uFFFD|\?{3}/);
    expect(market).not.toContain("<select"); // Reuses the shared header settings instead of another location selector.
  });

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
  expect(html).toContain(`/de/methodology?c=DE&amp;r=${input.regionId}#parameter-group-4`);
  expect(assessment.climate.regionName).toBe(before);
});

describe("universal methodology registry", () => {
  const render = async (query: Record<string, string | string[]>) => renderToStaticMarkup(await MethodologyPage({ params: Promise.resolve({ lang: "uk" }), searchParams: Promise.resolve(query) }));
  const market = (html: string) => html.match(/<section[^>]*id="parameter-group-4"[\s\S]*?<\/section>/)![0];

  it("shows each country's actual economic parameters, sources and units", async () => {
    const format = new Intl.NumberFormat(INTL_TAG.uk, { maximumFractionDigits: 8 });
    for (const country of Object.values(COUNTRIES)) {
      const html = market(await render({ c: country.code }));
      expect(html).toContain(`data-country="${country.code}"`);
      for (const parameter of allProvenance(country).filter((p) => p.id.startsWith("econ."))) {
        const row = html.match(new RegExp(`<tr data-parameter="${parameter.id.replaceAll(".", "\\.")}">[\\s\\S]*?<\\/tr>`))?.[0];
        expect(row, `${country.code}/${parameter.id}`).toBeDefined();
        expect(row).toContain(format.format(parameter.value));
        expect(row).toContain(parameter.unit);
      }
    }
  });

  it("uses regional overrides and resets invalid regions or countries safely", async () => {
    const region = market(await render({ c: "BR", r: "parana" }));
    expect(region).toContain('data-region="parana"');
    const retailRow = region.match(/<tr data-parameter="econ\.electricity_retail_eur_kwh">[\s\S]*?<\/tr>/)![0];
    const fx = getCountry("BR").params.find((p) => p.id === "econ.fx_local_per_eur")!.value;
    expect(retailRow).toContain(new Intl.NumberFormat(INTL_TAG.uk, { maximumFractionDigits: 8 }).format(720.19 / 1000 / fx));
    expect(retailRow).not.toContain(new Intl.NumberFormat(INTL_TAG.uk, { maximumFractionDigits: 8 }).format(840.76 / 1000 / fx));
    expect(region).not.toContain("UAH/EUR");
    expect(market(await render({ c: "DE", r: "parana" }))).not.toContain("data-region=");
    expect(market(await render({ c: "__proto__" }))).toContain('data-country="UA"');
    expect(market(await render({ c: ["BR", "DE"] }))).toContain('data-country="UA"');
    expect(market(await render({ c: "de" }))).toContain('data-country="DE"');
  });
});

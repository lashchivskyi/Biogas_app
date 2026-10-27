import { describe, expect, it } from "vitest";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { SAMPLE_CASES } from "@/content/sample-cases";
import { getCountry } from "@/countries";
import { formToInput, inputToForm, type FormLine } from "../form";
import { exampleTitle } from "../examples";
import { getDictionary, INTL_TAG, LOCALES } from "@/i18n";
import { sampleNotes } from "@/i18n/samples";
import { SampleCaseBrief } from "@/components/SampleCaseBrief";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const detailed = EXAMPLES.filter((e) => e.id in SAMPLE_CASES);

describe("detailed sample inputs", () => {
  it.each(LOCALES)("renders every case brief in %s without an English fallback or stale input figures", async (locale) => {
    const d = await getDictionary(locale);
    const en = await getDictionary("en");
    const localNumber = new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 2 }).format;
    for (const e of EXAMPLES) {
      const notes = sampleNotes(e, locale, d);
      const title = exampleTitle(e, d, locale);
      const html = renderToStaticMarkup(createElement(SampleCaseBrief, { id: e.id, locale, d }));
      expect(html, e.id).toContain(`lang="${locale}"`);
      expect(html, e.id).not.toContain(d.common.reportLangNote);
      expect(html, e.id).not.toMatch(/undefined|NaN|\uFFFD|\?{3}/);
      expect(title, e.id).not.toBe(e.id);
      expect(notes.operations.length, e.id).toBeGreaterThanOrEqual(e.input.feedstocks.length + 3);
      for (const line of e.input.feedstocks) expect(notes.operations.join(" "), e.id).toContain(localNumber(line.quantity));
      if (locale !== "en") {
        expect(notes.context, e.id).not.toBe(sampleNotes(e, "en", en).context);
        expect(title, e.id).not.toBe(exampleTitle(e, en, "en"));
        expect(notes.verify, e.id).not.toBe(sampleNotes(e, "en", en).verify);
      }
    }
  });

  it("preserves exact tariff precision, negative gate fees and the seasonal starting month in localised copy", async () => {
    const d = await getDictionary("uk");
    const slaughter = EXAMPLES.find((e) => e.id === "gb_slaughter")!;
    expect(sampleNotes(slaughter, "uk", d).operations.join(" ")).toContain("0,245 GBP/");
    const merchant = EXAMPLES.find((e) => e.id === "gb_food")!;
    expect(sampleNotes(merchant, "uk", d).operations.join(" ")).toContain("-30 GBP/");
    const campaign = EXAMPLES.find((e) => e.id === "it_food_30k")!;
    expect(sampleNotes(campaign, "uk", d).operations.join(" ")).toContain("липень");
    const before = structuredClone(campaign.input);
    sampleNotes(campaign, "fr", await getDictionary("fr"));
    expect(campaign.input).toEqual(before);
  });
  it("provides a complete brief for every sample, varied sectors and valid country regions", () => {
    expect(detailed).toHaveLength(EXAMPLES.length);
    expect(new Set(detailed.map((e) => e.input.businessType)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(detailed.map((e) => e.id)).size).toBe(detailed.length);
    for (const e of detailed) {
      expect(getCountry(e.input.countryCode).regions.some((r) => r.id === e.input.regionId), e.id).toBe(true);
      for (const lang of ["en", "uk"] as const) {
        const notes = SAMPLE_CASES[e.id].notes[lang];
        expect(notes.context.length, e.id).toBeGreaterThan(80);
        expect(notes.operations.length, e.id).toBeGreaterThanOrEqual(2);
        expect(notes.verify.length, e.id).toBeGreaterThan(80);
      }
    }
  });

  it.each(detailed)("preserves monthly supply and economics when $id is loaded into the calculator", ({ input }) => {
    const country = getCountry(input.countryCode);
    const restored = formToInput(inputToForm(input), country, "en");
    const original = assess(input, country);
    const recalculated = assess(restored, country);
    expect(recalculated.scenarios.base.feed.monthlyTonnes).toEqual(original.scenarios.base.feed.monthlyTonnes);
    expect(recalculated.scenarios.base.fin.npvEur).toBeCloseTo(original.scenarios.base.fin.npvEur, 5);
    expect(recalculated.bestRoute).toBe(original.bestRoute);
  });

  it("keeps the Italian summer campaign and Indian winter supply in their own months", () => {
    for (const id of ["it_food_30k", "in_food_40k", "br_vinasse"]) {
      const e = detailed.find((e) => e.id === id)!;
      const restored = formToInput(inputToForm(e.input), getCountry(e.input.countryCode), "en");
      expect(restored.feedstocks.map((f) => f.startMonth)).toEqual(e.input.feedstocks.map((f) => f.startMonth));
    }
  });

  it("includes favourable, conditional, weak, undersized and evidence-limited outcomes without changing verdict rules", () => {
    const verdicts = detailed.map((e) => assess(e.input, getCountry(e.input.countryCode)).verdict.id);
    expect(new Set(verdicts)).toEqual(new Set(["STRONG_CANDIDATE", "POSSIBLE_WITH_CONDITIONS", "WEAK_ECONOMICS", "NOT_RECOMMENDED_AT_SCALE", "INSUFFICIENT_DATA"]));
  });

  it("can still open saved forms created before the season-start field existed", () => {
    const e = detailed[0];
    const form = inputToForm(e.input);
    for (const line of form.lines) delete (line as Partial<FormLine>).startMonth;
    expect(() => formToInput(form, getCountry(e.input.countryCode), "en")).not.toThrow();
  });
});

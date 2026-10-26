import { describe, expect, it } from "vitest";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { SAMPLE_CASES } from "@/content/sample-cases";
import { getCountry } from "@/countries";
import { formToInput, inputToForm, type FormLine } from "../form";

const detailed = EXAMPLES.filter((e) => e.id in SAMPLE_CASES);

describe("detailed sample inputs", () => {
  it("provides ten distinct operating sectors with valid country regions", () => {
    expect(detailed).toHaveLength(10);
    expect(new Set(detailed.map((e) => e.input.businessType)).size).toBe(10);
    for (const e of detailed) {
      expect(getCountry(e.input.countryCode).regions.some((r) => r.id === e.input.regionId), e.id).toBe(true);
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
    for (const id of ["it_food_30k", "in_food_40k"]) {
      const e = detailed.find((e) => e.id === id)!;
      const restored = formToInput(inputToForm(e.input), getCountry(e.input.countryCode), "en");
      expect(restored.feedstocks.map((f) => f.startMonth)).toEqual(e.input.feedstocks.map((f) => f.startMonth));
    }
  });

  it("can still open saved forms created before the season-start field existed", () => {
    const e = detailed[0];
    const form = inputToForm(e.input);
    for (const line of form.lines) delete (line as Partial<FormLine>).startMonth;
    expect(() => formToInput(form, getCountry(e.input.countryCode), "en")).not.toThrow();
  });
});

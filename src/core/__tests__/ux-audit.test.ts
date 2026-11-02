import { describe, expect, it } from "vitest";
import { getCountry } from "@/countries";
import { assess } from "../assess";
import { MARKET_BANDS, UPGRADING_BAND } from "../marketBenchmarks";
import { minimumGapsForVerdict } from "../quality";
import { VERDICT_MIN_SCORE } from "../verdict";
import { EXAMPLES } from "../examples";
import type { QualityFactor } from "../types";

const CYRILLIC = /[А-Яа-яІіЇїЄє]/;
const factor = (gap: QualityFactor["gap"], points: number, owner: QualityFactor["owner"] = "client"): QualityFactor => ({ id: String(gap ?? points), owner, points, text: "", gap });

describe("minimum fields for a verdict", () => {
  it("is empty when the gate is already met", () => {
    expect(minimumGapsForVerdict([factor("electricity", 12)], VERDICT_MIN_SCORE, VERDICT_MIN_SCORE)).toEqual([]);
  });
  it("takes the biggest customer-fillable gaps first and stops once the gate is reached", () => {
    const f = [factor("land", 8), factor("lab", 15), factor("electricity", 12), factor("disposal", 5)];
    expect(minimumGapsForVerdict(f, 23, 35)).toEqual(["lab"]);
    expect(minimumGapsForVerdict(f, 10, 35)).toEqual(["lab", "electricity"]);
  });
  it("ignores model-side factors and reasons that are not a field the customer can fill in", () => {
    const f = [factor("electricity", 12, "model"), factor(undefined, 20), factor("land", 8)];
    expect(minimumGapsForVerdict(f, 20, 35)).toEqual(["land"]);
  });
  // Head counts are the standard way to state manure (no deduction since 2026-11-02); a laying-hen farm without energy,
  // site or lab data still lacks enough of its own data for a conclusion (LOW-confidence catalogue).
  it("matches the verdict: a hen farm with no energy, site or lab data is INSUFFICIENT and the listed minimum clears the gate", () => {
    const e = EXAMPLES.find((x) => x.id === "layers_200k")!;
    const input = { ...e.input, energy: { heatNeed: "none" as const, hasGridConnection: true }, site: {}, labAnalysisAvailable: false, feedstocks: e.input.feedstocks.map((f) => ({ id: f.id, animal: f.animal, type: f.type, quantity: f.quantity, housing: f.housing })) };
    const a = assess(input, getCountry(input.countryCode), { uncertainty: false });
    expect(a.verdict.id).toBe("INSUFFICIENT_DATA");
    const gaps = minimumGapsForVerdict(a.confidence.factors!, a.confidence.clientScore!, VERDICT_MIN_SCORE);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.length).toBeLessThan(a.missingDataCodes.length + 1);
    const gained = a.confidence.factors!.filter((f) => f.gap && gaps.includes(f.gap)).reduce((s, f) => s + f.points, 0);
    expect(a.confidence.clientScore! + gained).toBeGreaterThanOrEqual(VERDICT_MIN_SCORE);
  });
});

describe("English reports carry no Ukrainian-only text", () => {
  it("market band and upgrading sources have an English version", () => {
    for (const b of MARKET_BANDS) expect(CYRILLIC.test(b.sourceEn), b.id).toBe(false);
    expect(CYRILLIC.test(UPGRADING_BAND.sourceEn)).toBe(false);
  });
  it("climate analogues are named in English unless the report language is Ukrainian", () => {
    const e = EXAMPLES[0];
    const country = getCountry(e.input.countryCode);
    const en = assess({ ...e.input, lang: "en" }, country, { lang: "en", uncertainty: false });
    const uk = assess({ ...e.input, lang: "uk" }, country, { lang: "uk", uncertainty: false });
    expect(en.climate.analogues.every((x) => !CYRILLIC.test(x.name))).toBe(true);
    expect(uk.climate.analogues.every((x) => CYRILLIC.test(x.name))).toBe(true);
  });
  it("the Ukrainian auction scheme name carries an English gloss", () => {
    const scheme = getCountry("UA").support.schemes.find((s) => s.id === "ua.auction")!;
    expect(scheme.name).toMatch(/market-premium auction/i);
  });
});

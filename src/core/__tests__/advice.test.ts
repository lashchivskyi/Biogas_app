import { describe, expect, it } from "vitest";
import { advise, applyLevers, assess, leverContext, outcomeOf, STRONG_RULE } from "@/core";
import type { Assessment, VerdictGap } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { COUNTRIES } from "@/countries";
import { formToInput, inputToForm } from "@/lib/form";

/**
 * The advisor and the scenario lab preview every change with `assess(..., { lite: true })`. A preview the client acts
 * on must be the result they get after "Apply": lite and full runs agree on verdict, ranges, route and confidence, and
 * each lever's outcome equals a full assessment of the lever's input.
 */
const AS_OF = "2026-11-02";
const cases = EXAMPLES.map((e) => {
  const country = COUNTRIES[e.input.countryCode];
  return { id: e.id, input: e.input, country, a: assess(e.input, country, { asOfDate: AS_OF, uncertainty: false }) };
});
const same = (x: Assessment, y: Assessment) => ({
  verdict: x.verdict.id === y.verdict.id, gaps: JSON.stringify(x.verdict.gaps) === JSON.stringify(y.verdict.gaps), robustness: x.robustness === y.robustness,
  route: x.bestRoute === y.bestRoute, ranges: JSON.stringify(x.ranges) === JSON.stringify(y.ranges), confidence: x.confidence.score === y.confidence.score && x.confidence.level === y.confidence.level,
});

describe("lite assessment (scenario previews)", () => {
  it.each(cases)("$id: same verdict, gaps, robustness, route, ranges and confidence as the full run", ({ input, country, a }) => {
    const lite = assess(input, country, { asOfDate: AS_OF, lite: true });
    expect(same(lite, a)).toEqual({ verdict: true, gaps: true, robustness: true, route: true, ranges: true, confidence: true });
    expect(lite.sensitivity).toEqual([]);
    expect(lite.supportCases).toEqual([]);
    expect(lite.monteCarlo).toBeUndefined();
    expect(lite.scale).toBeUndefined();
  });
});

describe("verdict gaps name what the next better verdict needs", () => {
  it.each(cases)("$id", ({ a }) => {
    const g = a.verdict.gaps ?? [];
    const b = a.scenarios.base.fin, c = a.scenarios.conservative.fin;
    if (a.verdict.id === "POSSIBLE_WITH_CONDITIONS") {
      expect(g.length).toBeGreaterThan(0);
      const expected: VerdictGap[] = [];
      if (a.scenarios.base.feed.fatDominantShareVs > 0.5) expected.push("fat");
      if (b.simplePaybackYears === null || b.simplePaybackYears > STRONG_RULE.paybackYears) expected.push("payback");
      if (c.simplePaybackYears === null || c.simplePaybackYears > STRONG_RULE.conservativePaybackYears || c.npvEur <= 0) expected.push("conservative");
      if ((b.dscrMin ?? Infinity) < STRONG_RULE.dscrMin) expected.push("dscr");
      if (a.confidence.level === "LOW") expected.push("confidence");
      expect(g).toEqual(expected);
    } else if (a.verdict.id === "WEAK_ECONOMICS") {
      expect(g.length).toBeGreaterThan(0);
      expect(g.every((x) => x === "npv" || x === "payback")).toBe(true);
    } else expect(a.verdict.gaps).toBeUndefined();
    // Break-even sentences are kept apart from the free advice.
    if (a.verdict.id !== "WEAK_ECONOMICS") expect(a.verdict.thresholds).toBeUndefined();
    for (const t of a.verdict.whatWouldChange) expect(t).not.toMatch(/^NPV = 0/);
  });
});

describe("advisor", () => {
  const advised = cases.map((c) => ({ ...c, advice: advise(c.a, c.country) }));

  it("gives no advice where there is no verdict to improve", () => {
    for (const c of advised) if (c.a.verdict.id === "INSUFFICIENT_DATA" || c.a.financialsAvailable === false) expect(c.advice, c.id).toBeUndefined();
    expect(advised.filter((c) => c.advice).length).toBeGreaterThan(30);
  });

  it.each(advised.filter((c) => c.advice))("$id: every lever preview equals the full assessment of its input", ({ advice, country, a }) => {
    expect(advice!.base).toEqual(outcomeOf(a));
    for (const l of advice!.levers) {
      const full = assess(l.input, country, { asOfDate: AS_OF, uncertainty: false });
      expect(outcomeOf(full), l.id).toEqual(l.outcome);
      expect(l.deltaNpvEur).toBeCloseTo(l.outcome.npvEur[1] - a.ranges.npvEur[1], 6);
    }
  });

  it.each(advised.filter((c) => c.advice))("$id: ranked, honest and deterministic", ({ advice, country, a }) => {
    const ad = advice!;
    const firstQuiet = ad.levers.findIndex((l) => !l.improves);
    if (firstQuiet >= 0) expect(ad.levers.slice(firstQuiet).every((l) => !l.improves)).toBe(true);
    for (const l of ad.levers) {
      // Levers change the client's own project, never prices, yields, CAPEX or support.
      expect(l.input.finance?.capexQuoteLocal).toBe(a.input.finance?.capexQuoteLocal);
      expect(l.input.energy.electricityPriceLocalPerKwh).toBe(a.input.energy.electricityPriceLocalPerKwh);
      if (l.id === "heat") expect(l.settings.heatKwh!).toBeLessThanOrEqual(ad.context.heatMaxKwh);
      if (l.id === "equity") {
        expect(a.verdict.id).toBe("POSSIBLE_WITH_CONDITIONS");
        expect(l.outcome.npvEur).toEqual(ad.base.npvEur); // financing never moves the NPV
      }
    }
    if (ad.combined) {
      const bestSingle = Math.max(...ad.levers.filter((l) => l.improves).map((l) => l.outcome.npvEur[1]));
      expect(ad.combined.outcome.npvEur[1]).toBeGreaterThan(bestSingle);
      expect(ad.combined.ids.length).toBeGreaterThanOrEqual(2);
    }
    expect(JSON.stringify(advise(a, country))).toBe(JSON.stringify(ad));
  });

  it.each(advised.filter((c) => c.advice?.levers.length))("$id: \"Apply\" puts the lever into the form and the result shows what the preview promised", ({ advice, country }) => {
    const ad = advice!;
    for (const l of [...ad.levers, ...(ad.combined ? [ad.combined] : [])]) {
      for (const locale of ["en", "de"] as const) {
        const round = formToInput(inputToForm(l.input, locale), country, "en");
        const after = assess(round, country, { asOfDate: AS_OF, uncertainty: false });
        expect(after.verdict.id, `${locale}`).toBe(l.outcome.verdict);
        expect(after.bestRoute).toBe(l.outcome.route);
        expect(after.ranges.npvEur[1]).toBeCloseTo(l.outcome.npvEur[1], 0);
      }
    }
  });

  it("applies each lever as a plain change of the input", () => {
    const { input, a, country } = cases.find((c) => c.id === "dairy_400")!;
    const ctx = leverContext(a, country);
    const cluster = applyLevers(input, { clusterShare: 1 }, ctx);
    const added = cluster.feedstocks.slice(input.feedstocks.length);
    expect(added).toHaveLength(input.feedstocks.filter((f) => f.quantity > 0).length);
    for (const f of added) {
      expect(f.delivered).toBe(true);
      expect(f.distanceKm).toBe(5);
      expect(f.methaneYieldLPerKgVs ?? f.dryMatterPct ?? f.vsPctOfDm ?? f.measuredTonnesYear).toBeUndefined();
    }
    const co = applyLevers(input, { cosubTonnes: 1500, gateFeeLocal: 300 }, ctx).feedstocks.at(-1)!;
    expect(co).toMatchObject({ type: "food_waste", quantity: 1500, delivered: true, distanceKm: 15, purchasePricePerTonneLocal: -300 });
    const heat = applyLevers(input, { heatKwh: 200_000 }, ctx).energy;
    expect(heat.heatNeed).toBe("year_round_process");
    expect(heat.heatKwhYear).toBe(ctx.heatKnownKwh + 200_000);
    expect(applyLevers(input, {}, ctx)).toEqual(input);
    expect(input.feedstocks.some((f) => f.id.includes("~nb"))).toBe(false); // the client's input is not mutated
  });

  it("break-even values (paid detail) are real roots: the change pays off from there (plan NPV, or zero for a losing plan)", () => {
    let checked = 0;
    for (const c of cases.filter((x) => ["ro_pig_complex", "gb_food", "dairy_400", "de_nawaro", "mx_pig_lagoon"].includes(x.id))) {
      const ad = advise(c.a, c.country, { thresholds: true })!;
      const ctx = ad.context;
      for (const l of ad.levers) {
        if (l.breakEvenLocal === undefined || l.breakEvenLocal === null) continue;
        const input = l.id === "heat"
          ? { ...l.input, energy: { ...l.input.energy, heatPriceLocalPerKwh: l.breakEvenLocal } }
          : applyLevers(c.input, { ...l.settings, gateFeeLocal: l.breakEvenLocal }, ctx);
        if (l.id === "heat" && l.breakEvenLocal <= 0) continue; // pays even with free heat: no price to test
        const npv = assess(input, c.country, { asOfDate: AS_OF, lite: true }).routeMatrix[l.outcome.route].base.fin.npvEur;
        expect(Math.abs(npv - Math.max(0, ad.base.npvEur[1])), `${c.id} ${l.id}`).toBeLessThan(1 + 1e-6 * l.outcome.capexEur);
        checked++;
      }
      expect(advise(c.a, c.country)!.levers.every((l) => l.breakEvenLocal === undefined)).toBe(true);
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });
});

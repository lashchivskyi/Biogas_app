import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { ANIMALS, FEEDSTOCKS, HANDLING_IDS } from "@/core";
import { BUSINESS_IDS, modelsForBusiness } from "../businesses";
import { COUNTRIES } from "@/countries";
import { inputSchema } from "@/server/validate";
import type { Assessment, FeedstockLineInput, ProjectInput, VerdictId } from "../types";
import { physicalViolations, run } from "./scenario-matrix";

/**
 * Property-based robustness of the screening model. Inputs are drawn from the domain the server accepts (inputSchema),
 * so a failure here is a defect for a real customer, not a rejected request. Seeds are fixed for reproducibility;
 * raise numRuns locally for a deeper hunt (FC_RUNS=2000 npx vitest run src/core/__tests__/properties.test.ts).
 */
vi.setConfig({ testTimeout: 300_000 });
const NUM_RUNS = Number(process.env.FC_RUNS ?? 60);
const cfg = { numRuns: NUM_RUNS, seed: 20261031, endOnFailure: true } satisfies fc.Parameters<unknown>;

const countryCodes = Object.keys(COUNTRIES);
const adBusinesses = BUSINESS_IDS.filter((id) => modelsForBusiness(id).includes("ad"));
const animalIds = Object.keys(ANIMALS) as (keyof typeof ANIMALS)[];
const feedstockIds = Object.keys(FEEDSTOCKS) as (keyof typeof FEEDSTOCKS)[];
const logUniform = (lo: number, hi: number) => fc.double({ min: Math.log10(lo), max: Math.log10(hi), noNaN: true }).map((x) => 10 ** x);

const lineArb: fc.Arbitrary<FeedstockLineInput> = fc.oneof(
  fc.record({ animal: fc.constantFrom(...animalIds), quantity: logUniform(1, 1e6).map(Math.round).map((n) => Math.max(1, n)) }),
  fc.record({
    type: fc.constantFrom(...feedstockIds), quantity: logUniform(0.01, 1e8),
    delivered: fc.boolean(), distanceKm: fc.double({ min: 0, max: 500, noNaN: true }),
    purchasePricePerTonneLocal: fc.double({ min: -2000, max: 2000, noNaN: true }),
    handling: fc.constantFrom(...HANDLING_IDS), currentDisposalCostPerTonneLocal: fc.double({ min: 0, max: 5000, noNaN: true }),
  }, { requiredKeys: ["type", "quantity"] }),
).map((l) => l as FeedstockLineInput);

const energyArb = fc.record({
  heatNeed: fc.constantFrom("none", "seasonal_buildings", "year_round_process", "greenhouse" as const),
  hasGridConnection: fc.boolean(),
  electricityKwhYear: logUniform(1, 1e9), electricityPriceLocalPerKwh: logUniform(0.001, 50),
  gasM3Year: logUniform(1, 1e8), gasPriceLocalPerM3: logUniform(0.001, 500),
  heatKwhYear: logUniform(1, 1e9),
}, { requiredKeys: ["heatNeed", "hasGridConnection"] });

const siteArb = fc.record({
  landHa: logUniform(0.01, 1e5), existingStorageM3: logUniform(1, 1e6), gasGridKm: fc.double({ min: 0, max: 200, noNaN: true }),
  neighboursWithin300m: fc.boolean(), nearProtectedOrWaterArea: fc.boolean(),
}, { requiredKeys: [] });

const inputArb: fc.Arbitrary<ProjectInput> = fc.record({
  country: fc.constantFrom(...countryCodes), regionPick: fc.nat(), business: fc.constantFrom(...adBusinesses),
  feedstocks: fc.array(lineArb, { minLength: 1, maxLength: 4 }).map((ls) => ls.map((l, i) => ({ ...l, id: `l${i}` }))), energy: energyArb, site: siteArb,
}).map(({ country, regionPick, business, feedstocks, energy, site }) => {
  const regions = COUNTRIES[country].regions;
  return { countryCode: country, regionId: regions[regionPick % regions.length].id, businessType: business, feedstocks, energy, site } as ProjectInput;
}).filter((i) => inputSchema.safeParse(i).success);

const must = (input: ProjectInput): Assessment => {
  const r = run(input);
  if (!r.ok) throw new Error(`assess threw for a schema-valid input: ${r.error}`);
  return r.a;
};
const scaleLines = (input: ProjectInput, k: number): ProjectInput => ({ ...input, feedstocks: input.feedstocks.map((l) => ({ ...l, quantity: l.animal ? Math.max(1, Math.round(l.quantity * k)) : l.quantity * k })) });
const withEnergy = (input: ProjectInput, patch: Partial<ProjectInput["energy"]>): ProjectInput => ({ ...input, energy: { ...input.energy, ...patch } });
const RANK: Partial<Record<VerdictId, number>> = { NOT_RECOMMENDED_AT_SCALE: 0, WEAK_ECONOMICS: 1, POSSIBLE_WITH_CONDITIONS: 2, STRONG_CANDIDATE: 3 };
const rank = (v: VerdictId) => RANK[v];

describe("property: any schema-valid project", () => {
  it("never throws, never yields NaN/Infinity, and closes mass, methane, energy and money balances", () => {
    fc.assert(fc.property(inputArb, (input) => {
      const a = must(input);
      expect(physicalViolations(a)).toEqual([]);
    }), cfg);
  });

  it("is deterministic", () => {
    fc.assert(fc.property(inputArb, (input) => {
      expect(JSON.stringify(must(input))).toBe(JSON.stringify(must(input)));
    }), { ...cfg, numRuns: Math.ceil(NUM_RUNS / 4) });
  });
});

describe("property: monotonicity in feedstock", () => {
  it("more of the same feedstock never gives less methane or less digested mass", () => {
    fc.assert(fc.property(inputArb, fc.double({ min: 1.01, max: 20, noNaN: true }), (input, k) => {
      const lo = must(input).routesBase.chp, hi = must(scaleLines(input, k)).routesBase.chp;
      expect(hi.feed.tonnesYear).toBeGreaterThanOrEqual(lo.feed.tonnesYear * (1 - 1e-9));
      expect(hi.feed.ch4M3Year).toBeGreaterThanOrEqual(lo.feed.ch4M3Year * (1 - 1e-9));
      expect(hi.energy.ch4ProducedM3).toBeGreaterThanOrEqual(lo.energy.ch4ProducedM3 * (1 - 1e-9));
    }), cfg);
  });

  it("adding a feedstock line never reduces gross methane", () => {
    fc.assert(fc.property(inputArb, lineArb, (input, extra) => {
      const more: ProjectInput = { ...input, feedstocks: [...input.feedstocks, { ...extra, id: "extra" }].slice(0, 5) };
      fc.pre(inputSchema.safeParse(more).success);
      expect(must(more).routesBase.chp.feed.ch4M3Year).toBeGreaterThanOrEqual(must(input).routesBase.chp.feed.ch4M3Year * (1 - 1e-9));
    }), cfg);
  });
});

describe("property: monotonicity in the price of what the plant sells", () => {
  // Only the revenue-side prices are monotone by construction. The grid purchase price is not: a route that buys more power than it makes is worse when power is dearer.
  const cases = [
    { key: "exportPriceLocalPerKwh", route: "chp", lo: 0.001, hi: 50 },
    { key: "heatPriceLocalPerKwh", route: "boiler", lo: 0.001, hi: 20 },
    { key: "biomethanePriceLocalPerMwhHhv", route: "biomethane", lo: 1, hi: 5000 },
  ] as const;
  for (const { key, route, lo, hi } of cases) it(`${key}: a higher price never lowers the ${route} NPV or the verdict`, () => {
    fc.assert(fc.property(inputArb, logUniform(lo, hi), fc.double({ min: 0.01, max: 3, noNaN: true }), (input, p, d) => {
      const cheap = must(withEnergy(input, { [key]: p })), dear = must(withEnergy(input, { [key]: p * (1 + d) }));
      // The heat price also values heat the digester has to buy, so a route that buys more heat than it sells is legitimately worse when heat is dearer.
      if (key === "heatPriceLocalPerKwh") for (const scn of ["conservative", "base", "optimistic"] as const) { const e = cheap.routeMatrix[route][scn].energy; fc.pre(e.heatUsefulKwh >= e.heatExternalPurchasedKwh); }
      for (const scn of ["conservative", "base", "optimistic"] as const) {
        const a = cheap.routeMatrix[route][scn].fin.npvEur, b = dear.routeMatrix[route][scn].fin.npvEur;
        expect(b, `${route}/${scn}`).toBeGreaterThanOrEqual(a - Math.max(1e-6, 1e-9 * Math.abs(a)));
      }
      expect(dear.scenarios.base.fin.npvEur).toBeGreaterThanOrEqual(cheap.scenarios.base.fin.npvEur - Math.max(1e-6, 1e-9 * Math.abs(cheap.scenarios.base.fin.npvEur)));
      const [r1, r2] = [rank(cheap.verdict.id), rank(dear.verdict.id)];
      if (r1 !== undefined && r2 !== undefined) expect(r2, `${cheap.verdict.id} → ${dear.verdict.id}`).toBeGreaterThanOrEqual(r1);
    }), cfg);
  });
});

describe("property: stability near thresholds", () => {
  /** Perturb every continuous input by a relative eps (animal head counts are integers and stay put). */
  const nudge = (input: ProjectInput, eps: number): ProjectInput => ({
    ...input,
    feedstocks: input.feedstocks.map((l) => (l.animal ? l : { ...l, quantity: l.quantity * (1 + eps) })),
    energy: { ...input.energy, ...Object.fromEntries((["electricityKwhYear", "electricityPriceLocalPerKwh", "gasM3Year", "gasPriceLocalPerM3", "heatKwhYear"] as const).filter((k) => input.energy[k] !== undefined).map((k) => [k, input.energy[k]! * (1 + eps)])) },
  });

  it("a one-in-a-million change of the inputs does not change the verdict or the chosen route", () => {
    fc.assert(fc.property(inputArb, (input) => {
      const a = must(input), b = must(nudge(input, 1e-6));
      expect(b.verdict.id).toBe(a.verdict.id);
      expect(b.bestRoute).toBe(a.bestRoute);
    }), cfg);
  });

  it("a 0.7 % change in feedstock moves each route's NPV smoothly (equipment steps stay below ~30 % of CAPEX)", () => {
    fc.assert(fc.property(inputArb, (input) => {
      fc.pre(input.feedstocks.every((l) => !l.animal));
      const a = must(input), b = must(scaleLines(input, 1.007));
      for (const route of ["chp", "boiler", "biomethane"] as const) {
        const x = a.routeMatrix[route].base.fin, y = b.routeMatrix[route].base.fin;
        const allowed = 0.05 * Math.max(Math.abs(x.npvEur), Math.abs(y.npvEur)) + 0.3 * Math.max(x.capexEur, y.capexEur) + 1;
        expect(Math.abs(y.npvEur - x.npvEur), route).toBeLessThanOrEqual(allowed);
      }
    }), cfg);
  });
});

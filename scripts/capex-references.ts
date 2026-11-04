/**
 * Published plant costs the model's CAPEX is compared with: reference plants with a stated cost range (`PLANT_COST_CASES`,
 * printed by `benchmark.ts`) and the per-country cost points in `src/countries/data/capex-benchmarks.json` (sized here by
 * bisection, used by `calibrate-capex.ts`). `capexReferenceRows()` gives both as one list for `scorecard.ts`.
 * Reconstructed inputs are not independently validated designs.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assess } from "../src/core";
import type { Assessment, BusinessTypeId, FeedstockTypeId, ProjectInput, RouteId } from "../src/core/types";
import { getCountry } from "../src/countries";
import { ENGINEERING_MAP } from "../src/core/engineeringParams";

/** Who published the number. Only primary sources are kept: official bodies, issuer filings, academic studies with a stated scope
 * (DECISIONS 2026-11-03: news, vendor quotes, sector aggregates and undated or pre-2024 figures were removed). */
export type CostQuality = "official" | "company" | "academic";
export const COUNTED_QUALITY: CostQuality[] = ["official", "company", "academic"];

export interface Benchmark {
  id: string;
  country: string;
  route: "chp" | "biomethane";
  /** kWel for chp, Nm³/h biomethane for biomethane */
  size: number;
  capexEur: number;
  year: number;
  quality: CostQuality;
  source: string;
  build: "agri_chp" | "agri_biomethane" | "food_waste_chp";
  publishedOn?: string;
  costStatus?: "budget" | "realised";
  sourceGroup?: string;
  role?: "fit" | "check";
  url?: string;
  /** The plant's main feedstock where it is published (default maize silage) and the matching business. */
  feed?: FeedstockTypeId;
  business?: BusinessTypeId;
  /** The plant's own region (climate decides lagoon vs heated tank); default the country's first region. */
  regionId?: string;
}

const DIR = resolve(import.meta.dirname ?? ".", "../src/countries/data");
export const BENCHMARKS = (JSON.parse(readFileSync(resolve(DIR, "capex-benchmarks.json"), "utf-8")) as { benchmarks: Benchmark[] }).benchmarks;

export function capexInput(b: Benchmark, q: number): ProjectInput {
  const code = b.country;
  const regionId = b.regionId ?? getCountry(code).regions[0].id;
  // Agricultural co-digestion plants in PL, TR, FR, ES are typically built around maize silage (energy crop), not manure alone:
  // a manure-only plant of this capacity would need >100 000 pig places, which is not a comparable configuration.
  if (b.build === "agri_chp") {
    return {
      countryCode: code, regionId, businessType: "dairy_farm",
      feedstocks: [{ id: "a", type: "maize_silage", quantity: Math.round(q), delivered: true, distanceKm: 5 }],
      energy: { electricityKwhYear: 0, heatNeed: "year_round_process", heatKwhYear: 3_000_000, hasGridConnection: true },
      site: { landHa: 500, gasGridKm: 0.5 },
    };
  }
  if (b.build === "agri_biomethane") {
    return {
      countryCode: code, regionId, businessType: b.business ?? "dairy_farm",
      feedstocks: [{ id: "a", type: b.feed ?? "maize_silage", quantity: Math.round(q), delivered: true, distanceKm: 5 }],
      energy: { electricityKwhYear: 0, heatNeed: "year_round_process", heatKwhYear: 1_000_000, hasGridConnection: true },
      site: { landHa: 1500, gasGridKm: 1 },
    };
  }
  return {
    countryCode: code, regionId, businessType: "municipal_biowaste",
    feedstocks: [{ id: "a", type: "food_waste", quantity: Math.round(q), delivered: true, distanceKm: 15 }],
    energy: { electricityKwhYear: 0, heatNeed: "year_round_process", heatKwhYear: Math.round(q) * 150, hasGridConnection: true },
    site: { landHa: 50, gasGridKm: 1 },
  };
}

export const capexMetric = (a: Assessment, b: Benchmark) => (b.route === "chp" ? a.routesBase.chp.energy.chpKwEl : a.routesBase.biomethane.energy.biomethaneNm3 / ENGINEERING_MAP["eng.chp_design_hours"].value);

/** Bisection on the model's own output: smallest input whose output reaches the target. */
export function sizeFor(b: Benchmark): { q: number; a: Assessment } {
  const f = (q: number) => assess(capexInput(b, q), getCountry(b.country), { uncertainty: false });
  let lo = 1, hi = 1000;
  while (capexMetric(f(hi), b) < b.size && hi < 5e6) { lo = hi; hi *= 2; }
  for (let i = 0; i < 40 && hi - lo > 1; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (capexMetric(f(mid), b) < b.size) lo = mid; else hi = mid;
  }
  return { q: hi, a: f(hi) };
}

const DE = getCountry("DE");

function dairy(code: "DE", cows: number, young: number, opts: { existingStorage?: number } = {}): ProjectInput {
  return {
    countryCode: code, regionId: "sachsen", businessType: "dairy_farm",
    feedstocks: [{ id: "a", animal: "dairy_cow", quantity: cows }, ...(young ? [{ id: "b", animal: "cattle_other" as const, quantity: young }] : [])],
    energy: { electricityKwhYear: cows * 1000, heatNeed: "year_round_process", heatKwhYear: cows * 300, hasGridConnection: true },
    site: { landHa: cows * 2, existingStorageM3: opts.existingStorage },
  };
}

/** BMWK/Fraunhofer IEE/DBFZ/ESE-Consult, Kurzfristanalyse Kostenentwicklungen Biomasseanlagen, 13.02.2024, Tab. 4-1: new plant,
 * 510 kW rated (3 942 h at 1 135 kW installed, two engines, flexible), 70 % energy crops (30–40 % maize silage) + 30 % cattle
 * slurry, 50 €/t maize silage. Sized here to the same gross electricity (510 kW × 8 760 h) with maize as the only crop. */
function nawaro510(): ProjectInput {
  return {
    countryCode: "DE", regionId: "sachsen", businessType: "dairy_farm",
    feedstocks: [
      { id: "crop", type: "maize_silage", quantity: 12071, monthsActive: 12, purchasePricePerTonneLocal: 50 },
      { id: "slurry", type: "dairy_slurry", quantity: 5173, monthsActive: 12 },
    ],
    energy: { electricityKwhYear: 0, heatNeed: "none", hasGridConnection: true },
    site: { landHa: 400, existingStorageM3: 0, gasGridKm: 5 },
  };
}

/** Herd that gives the LWK reference plant's 75 kWe in this model (750 cows gave ≈ 110 kWe; 580 gave 85 kWe after the realisation
 * 1.0 change of 2026-11-03, so the reference was a bigger plant than published: re-sized to 510 cows on 2026-11-04). */
// "New digestate storage" needs existingStorage 0: an empty field means the farm's store already holds its slurry (DECISIONS 2026-10-31).
const LWK_COWS = 510;

export interface PlantCostCase { id: string; route?: RouteId; name: string; input: ProjectInput; country: typeof DE; published: string; low: number; high: number; quality: CostQuality; note: string }

export const PLANT_COST_CASES: PlantCostCase[] = [
  { id: "de-75kw-lwk-existing", name: "DE ≈75 kW manure-only, existing storage, no solids", input: dairy("DE", LWK_COWS, 0, { existingStorage: 1e6 }), country: DE, published: "≈€0.5M (≈2014) → ≈€0.68M (2025)", low: 0.5e6, high: 0.75e6, quality: "official", note: "LWK Niedersachsen; +35–40 % CHP/plant inflation (DBFZ/Fraunhofer for BMWK 2024)" },
  { id: "de-75kw-lwk-new", name: "DE ≈75 kW manure-only, new digestate storage", input: dairy("DE", LWK_COWS, 0, { existingStorage: 0 }), country: DE, published: "≈€0.75M (≈2014) → ≈€1.0M; 'conventional > €1M' (Hohenheim 2026)", low: 0.75e6, high: 1.1e6, quality: "official", note: "LWK Niedersachsen; agrarheute 2026; C.A.R.M.E.N. up to €10k/kW" },
  { id: "us-500cow-agstar", name: "US-style 500-cow dairy (as DE costs)", input: dairy("DE", 500, 0, { existingStorage: 1e6 }), country: DE, published: "$1,100–1,500/cow (2012) → ≈€0.7–0.95M", low: 0.7e6, high: 0.95e6, quality: "academic", note: "AgSTAR via Cornell; US CPI ≈ +40 %" },
  { id: "de-510kw-bmwk", route: "chp", name: "DE 510 kW rated NawaRo + slurry, flexible (1 135 kWe installed)", input: nawaro510(), country: DE, published: "7 521 €/kW rated (2023) = €3.84M; 8 517 €/kW (2026 est.) = €4.34M, incl. 8 % planning and flexibilisation", low: 3.84e6, high: 4.34e6, quality: "official", note: "BMWK/IEE/DBFZ 2024 Tab. 4-1; model plant has no flexibility engine (≈ +€0.7M at its own CHP curve) and the report does not say whether silo and digestate storage are included" },
];

export interface CapexReferenceRow {
  id: string;
  quality: CostQuality;
  counted: boolean;
  /** Published cost, EUR (midpoint of a published range). */
  publishedEur: number;
  /** Model CAPEX of the same route: base, optimistic (low) and conservative (high), EUR. */
  modelEur: number;
  lowEur: number;
  highEur: number;
  source: string;
}

/** Every published plant cost next to the model's CAPEX for the same route and size (≈ 20 s: bisection sizing). */
export function capexReferenceRows(): CapexReferenceRow[] {
  const row = (id: string, quality: CostQuality, publishedEur: number, m: Assessment["routeMatrix"][RouteId], source: string): CapexReferenceRow => ({
    id, quality, counted: COUNTED_QUALITY.includes(quality), publishedEur,
    modelEur: m.base.capex.totalEur, lowEur: m.optimistic.capex.totalEur, highEur: m.conservative.capex.totalEur, source,
  });
  const cases = PLANT_COST_CASES.map((c) => {
    const a = assess(c.input, c.country, { uncertainty: false });
    return row(c.id, c.quality, (c.low + c.high) / 2, a.routeMatrix[c.route ?? a.bestRoute], c.note);
  });
  const points = BENCHMARKS.map((b) => row(b.id, b.quality, b.capexEur, sizeFor(b).a.routeMatrix[b.route], b.source));
  return [...cases, ...points];
}

/**
 * CAPEX calibration per country. For every published plant cost in src/countries/data/capex-benchmarks.json the script
 * sizes a model input to the published capacity (bisection on the model's own output), reads the model's CAPEX at
 * route factor = 1. Reconstructed inputs are not independently validated designs. Costs remain nominal
 * in their stated year; unknown dates/scopes never qualify as current engineering validation.
 * Usage: npx tsx scripts/calibrate-capex.ts [--write] (read-only by default).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assess } from "../src/core";
import type { Assessment, ProjectInput, RouteId } from "../src/core/types";
import { getCountry } from "../src/countries";
import { ENGINEERING_MAP } from "../src/core/engineeringParams";

interface Benchmark {
  id: string;
  country: string;
  route: "chp" | "biomethane";
  /** kWel for chp, Nm³/h biomethane for biomethane */
  size: number;
  capexEur: number;
  year: number;
  quality: "project" | "company" | "academic" | "press" | "aggregate";
  source: string;
  build: "agri_chp" | "agri_biomethane" | "food_waste_chp";
  publishedOn?: string;
  costStatus?: "budget" | "realised";
  sourceGroup?: string;
  role?: "fit" | "check";
  url?: string;
}

const DIR = resolve(import.meta.dirname ?? ".", "../src/countries/data");
const bench = JSON.parse(readFileSync(resolve(DIR, "capex-benchmarks.json"), "utf-8")) as { benchmarks: Benchmark[] };

function input(b: Benchmark, q: number): ProjectInput {
  const code = b.country;
  const regionId = getCountry(code).regions[0].id;
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
      countryCode: code, regionId, businessType: "dairy_farm",
      feedstocks: [{ id: "a", type: "maize_silage", quantity: Math.round(q), delivered: true, distanceKm: 5 }],
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

const metric = (a: Assessment, b: Benchmark) => (b.route === "chp" ? a.routesBase.chp.energy.chpKwEl : a.routesBase.biomethane.energy.biomethaneNm3 / ENGINEERING_MAP["eng.chp_design_hours"].value);

/** Bisection on the model's own output: smallest input whose output reaches the target. */
function sizeFor(b: Benchmark): { q: number; a: Assessment } {
  const f = (q: number) => assess(input(b, q), getCountry(b.country));
  let lo = 1, hi = 1000;
  while (metric(f(hi), b) < b.size && hi < 5e6) { lo = hi; hi *= 2; }
  for (let i = 0; i < 40 && hi - lo > 1; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (metric(f(mid), b) < b.size) lo = mid; else hi = mid;
  }
  return { q: hi, a: f(hi) };
}

const strength = (b: Benchmark) => (!b.publishedOn || !b.costStatus || b.year < 2024 ? "weak" : b.costStatus === "budget" ? "budget" : "documented");

const rows: Array<Record<string, unknown>> = [];
for (const b of bench.benchmarks) {
  const { q, a } = sizeFor(b);
  const c = getCountry(b.country);
  const current = c.params.find((p) => p.id === `econ.capex_factor_${b.route}`)?.value ?? c.params.find((p) => p.id === "econ.capex_factor")!.value;
  const modelAt1 = a.routesBase[b.route as RouteId].capex.totalEur / current;
  const achieved = metric(a, b);
  rows.push({
    id: b.id, country: b.country, route: b.route, size: b.size, achievedSize: Math.round(achieved), input: Math.round(q),
    capexEur: b.capexEur, modelAt1: Math.round(modelAt1), factor: +(b.capexEur / modelAt1).toFixed(4), strength: strength(b), year: b.year, quality: b.quality, source: b.source,
    costStatus: b.costStatus ?? "unverified", publishedOn: b.publishedOn, sourceGroup: b.sourceGroup, role: b.role, url: b.url,
    reconstruction: "Feedstock, site and grid connection reconstructed; no as-built scope or inflation index supplied",
  });
}

const median = (xs: number[]) => {
  const ordered = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
};
const byCountry: Record<string, Array<Record<string, unknown>>> = {};
for (const r of rows) (byCountry[r.country as string] ??= []).push(r);
/** Diagnostic candidates only: point count alone cannot establish independent validation or matching scope. */
const countries: Record<string, { factor: number; n: number; confidence: "LOW"; applied: false; ids: string[]; biomethane?: { factor: number; n: number; note: string } }> = {};
for (const [code, list] of Object.entries(byCountry)) {
  const chp = list.filter((r) => r.route === "chp" && r.strength === "documented" && r.role !== "check");
  const bm = list.filter((r) => r.route === "biomethane" && r.strength !== "weak");
  const entry: (typeof countries)[string] = {
    factor: chp.length ? +median(chp.map((r) => r.factor as number)).toFixed(4) : NaN,
    n: chp.length,
    confidence: "LOW",
    applied: false,
    ids: list.map((r) => r.id as string),
  };
  if (bm.length) entry.biomethane = { factor: +median(bm.map((r) => r.factor as number)).toFixed(4), n: bm.length, note: "Budget comparisons, not realised construction costs or independent validation. Not applied as a universal country/route factor; use for scoped sensitivity and obtain matching supplier quotations." };
  if (Number.isNaN(entry.factor)) delete (entry as { factor?: number }).factor;
  countries[code] = entry;
}

const comparisons = rows.filter((r) => r.role === "check").map((r) => {
  const fit = rows.find((f) => f.role === "fit" && f.country === r.country && f.route === r.route);
  if (!fit) return { id: r.id, status: "no separate fit point" };
  const predictedEur = (r.modelAt1 as number) * (fit.factor as number);
  return { id: r.id, fitId: fit.id, predictedEur: Math.round(predictedEur), statedBudgetEur: r.capexEur, errorPct: +((predictedEur / (r.capexEur as number) - 1) * 100).toFixed(2), independent: fit.sourceGroup !== r.sourceGroup, note: "Withheld budget comparison only; same developer, reconstructed inputs, not as-built accuracy" };
});
const result = { generatedOn: new Date().toISOString().slice(0, 10), method: "Nominal stated cost / route-specific model at factor 1; diagnostic median, unknown dates/scopes excluded. No automatic promotion by sample count, no unsupported inflation adjustment, budgets separate from realised costs.", benchmarks: rows, countries, comparisons };
if (process.argv.includes("--write")) writeFileSync(resolve(DIR, "capex-calibration.json"), JSON.stringify(result, null, 2) + "\n", "utf-8");
else console.log("Read-only audit; pass --write to update the calibration dataset.");
for (const r of rows) console.log(`${String(r.id).padEnd(16)} ${r.country} ${String(r.route).padEnd(10)} size ${String(r.size).padStart(5)} → achieved ${String(r.achievedSize).padStart(5)} | input ${String(r.input).padStart(7)} | published €${(Number(r.capexEur) / 1e6).toFixed(2)} M | model@1 €${(Number(r.modelAt1) / 1e6).toFixed(2)} M | factor ${r.factor} (${r.strength})`);
console.log(countries);
console.log(comparisons);

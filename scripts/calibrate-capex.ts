/**
 * CAPEX calibration per country. For every published plant cost in src/countries/data/capex-benchmarks.json the script
 * sizes a model input to the published capacity (bisection on the model's own output), reads the model's CAPEX at
 * capex_factor = 1, and derives the factor that would reproduce the published total. Results are written to
 * src/countries/data/capex-calibration.json and read by src/countries/sources.ts.
 * Usage: npx tsx scripts/calibrate-capex.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assess } from "../src/core";
import type { Assessment, ProjectInput, RouteId } from "../src/core/types";
import { getCountry } from "../src/countries";

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

const metric = (a: Assessment, b: Benchmark) => (b.route === "chp" ? a.routesBase.chp.energy.chpKwEl : a.routesBase.biomethane.energy.biomethaneNm3 / 8000);

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

const strength = (b: Benchmark) => (b.year >= 2024 && (b.quality === "project" || b.quality === "company" || b.quality === "academic") ? "strong" : b.year >= 2023 && b.quality !== "aggregate" ? "medium" : "weak");

const rows: Array<Record<string, unknown>> = [];
for (const b of bench.benchmarks) {
  const { q, a } = sizeFor(b);
  const c = getCountry(b.country);
  const current = c.params.find((p) => p.id === "econ.capex_factor")!.value;
  const modelAt1 = a.routesBase[b.route as RouteId].capex.totalEur / current;
  const achieved = b.route === "chp" ? a.routesBase.chp.energy.chpKwEl : a.routesBase.biomethane.energy.biomethaneNm3 / 8000;
  rows.push({
    id: b.id, country: b.country, route: b.route, size: b.size, achievedSize: Math.round(achieved), input: Math.round(q),
    capexEur: b.capexEur, modelAt1: Math.round(modelAt1), factor: +(b.capexEur / modelAt1).toFixed(2), strength: strength(b), year: b.year, quality: b.quality, source: b.source,
  });
}

const mean = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
const byCountry: Record<string, Array<Record<string, unknown>>> = {};
for (const r of rows) (byCountry[r.country as string] ??= []).push(r);
/** Country factor = mean of CHP-route benchmarks that are not weak (the common route, comparable config). Biomethane points are reported separately. */
const countries: Record<string, { factor: number; n: number; confidence: "MEDIUM" | "LOW"; ids: string[]; biomethane?: { factor: number; n: number; note: string } }> = {};
for (const [code, list] of Object.entries(byCountry)) {
  const chp = list.filter((r) => r.route === "chp" && r.strength !== "weak");
  const bm = list.filter((r) => r.route === "biomethane" && r.strength !== "weak");
  const entry: (typeof countries)[string] = {
    factor: chp.length ? +mean(chp.map((r) => r.factor as number)).toFixed(2) : NaN,
    n: chp.length,
    confidence: chp.length >= 2 ? "MEDIUM" : "LOW",
    ids: list.map((r) => r.id as string),
  };
  if (bm.length) entry.biomethane = { factor: +mean(bm.map((r) => r.factor as number)).toFixed(2), n: bm.length, note: "Biomethane points show the model's upgrading/injection CAPEX is lower than published projects; not applied to the country factor (it applies to all routes)." };
  if (Number.isNaN(entry.factor)) delete (entry as { factor?: number }).factor;
  countries[code] = entry;
}

writeFileSync(resolve(DIR, "capex-calibration.json"), JSON.stringify({ generatedOn: "2026-10-26", method: "published plant cost ÷ model CAPEX at capex_factor 1, median per country; weak points reported but not used", benchmarks: rows, countries }, null, 2), "utf-8");
for (const r of rows) console.log(`${String(r.id).padEnd(16)} ${r.country} ${String(r.route).padEnd(10)} size ${String(r.size).padStart(5)} → achieved ${String(r.achievedSize).padStart(5)} | input ${String(r.input).padStart(7)} | published €${(Number(r.capexEur) / 1e6).toFixed(2)} M | model@1 €${(Number(r.modelAt1) / 1e6).toFixed(2)} M | factor ${r.factor} (${r.strength})`);
console.log(countries);

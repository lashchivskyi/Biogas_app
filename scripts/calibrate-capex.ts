/**
 * CAPEX calibration per country. For every published plant cost in src/countries/data/capex-benchmarks.json the script
 * sizes a model input to the published capacity (bisection on the model's own output), reads the model's CAPEX at
 * route factor = 1. Reconstructed inputs are not independently validated designs. Costs remain nominal
 * in their stated year; unknown dates/scopes never qualify as current engineering validation.
 * Usage: npx tsx scripts/calibrate-capex.ts [--write] (read-only by default).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RouteId } from "../src/core/types";
import { getCountry } from "../src/countries";
import { BENCHMARKS, capexMetric, sizeFor, type Benchmark } from "./capex-references";

const DIR = resolve(import.meta.dirname ?? ".", "../src/countries/data");
const bench = { benchmarks: BENCHMARKS };

const strength = (b: Benchmark) => (!b.publishedOn || !b.costStatus || b.year < 2024 ? "weak" : b.costStatus === "budget" ? "budget" : "documented");

const rows: Array<Record<string, unknown>> = [];
for (const b of bench.benchmarks) {
  const { q, a } = sizeFor(b);
  const c = getCountry(b.country);
  const current = c.params.find((p) => p.id === `econ.capex_factor_${b.route}`)?.value ?? c.params.find((p) => p.id === "econ.capex_factor")!.value;
  const modelAt1 = a.routesBase[b.route as RouteId].capex.totalEur / current;
  const achieved = capexMetric(a, b);
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

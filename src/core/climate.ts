import type { Region } from "./country";
import { CLIMATE_BENCHMARKS } from "./climateBenchmarks";

export const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const HOURS_IN_MONTH = DAYS_IN_MONTH.map((d) => d * 24);
export const HOURS_PER_YEAR = HOURS_IN_MONTH.reduce((sum, hours) => sum + hours, 0);

export function meanTemp(t: number[]): number {
  return t.reduce((a, b) => a + b, 0) / t.length;
}

/** Heating degree days, base 18 °C (monthly-mean approximation — underestimates true HDD by ~5–10 %). */
export function hdd18(t: number[]): number {
  return t.reduce((acc, tm, i) => acc + Math.max(0, 18 - tm) * DAYS_IN_MONTH[i], 0);
}

/**
 * Temperature of substrate arriving at the digester. Slurry kept under barns/in tanks stays
 * well above ambient in winter. ESTIMATE: floor 10 °C, 0.5 K per K of ambient above that.
 */
export function substrateTempC(ambient: number): number {
  return Math.max(10, 0.5 * ambient + 8);
}

/** Monthly weights (sum = 1) for a customer heat demand. */
export function heatDemandProfile(
  need: "none" | "seasonal_buildings" | "year_round_process" | "greenhouse",
  monthlyTempC: number[],
): number[] {
  if (need === "none") return new Array(12).fill(0);
  const days = DAYS_IN_MONTH;
  const hdd = monthlyTempC.map((tm, i) => Math.max(0, 18 - tm) * days[i]);
  const hddSum = hdd.reduce((a, b) => a + b, 0) || 1;
  const flatSum = days.reduce((a, b) => a + b, 0);
  let w: number[];
  if (need === "seasonal_buildings") w = hdd.map((h) => h / hddSum);
  else if (need === "year_round_process") w = days.map((d) => d / flatSum);
  else w = hdd.map((h, i) => 0.7 * (h / hddSum) + 0.3 * (days[i] / flatSum));
  const s = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((x) => x / s);
}

/** RMS monthly difference — the "climate distance" to a benchmark city. */
export function climateDistance(a: number[], b: number[]): number {
  const n = a.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / n);
}

export function climateSummary(region: Region) {
  const analogues = CLIMATE_BENCHMARKS.map((b) => ({
    name: b.name,
    distance: climateDistance(region.monthlyTempC, b.monthlyTempC),
    meanTempC: meanTemp(b.monthlyTempC),
  }))
    .sort((x, y) => x.distance - y.distance)
    .slice(0, 3);
  return {
    regionName: region.name,
    meanTempC: meanTemp(region.monthlyTempC),
    hdd: hdd18(region.monthlyTempC),
    analogues,
  };
}

/** Months (0-based) in which a stream is active. */
export function activeMonths(months: number, startMonth1: number): boolean[] {
  const m = Math.max(0, Math.min(12, Math.round(months)));
  const start = Math.max(1, Math.min(12, Math.round(startMonth1))) - 1;
  const out = new Array(12).fill(false);
  for (let i = 0; i < m; i++) out[(start + i) % 12] = true;
  return out;
}

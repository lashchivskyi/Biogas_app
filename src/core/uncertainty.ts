import { SCENARIOS, type ScenarioDef } from "./scenarios";

/**
 * Uncertainty tools on top of the three scenarios:
 * - Monte Carlo: every scenario quantity drawn independently from a triangular distribution
 *   (conservative / base / optimistic as min / mode / max), Latin hypercube, fixed seed (reproducible).
 *   Independent draws do not stack all bad cases at once, so P10–P90 is narrower than conservative–optimistic.
 * - Value of information: what knowing one input exactly is worth before deciding to build (EVPI).
 */

/** Inverse CDF of a triangular distribution with min a, mode c, max b. */
export function triangular(u: number, a: number, c: number, b: number): number {
  if (b <= a) return c;
  const f = (c - a) / (b - a);
  return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

/** Small seeded PRNG (mulberry32): deterministic reports, no Math.random. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Latin hypercube: n stratified uniforms per dimension, independently shuffled. */
export function latinHypercube(n: number, dims: number, seed = 20261031): number[][] {
  const r = rng(seed);
  const cols = Array.from({ length: dims }, () => {
    const c = Array.from({ length: n }, (_, i) => (i + r()) / n);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  });
  return Array.from({ length: n }, (_, i) => cols.map((c) => c[i]));
}

/** Numeric scenario fields that are sampled; the order is the hypercube dimension order. */
export const SAMPLED_FIELDS = ["yieldBlend", "processRealisation", "capexMult", "opexMult", "energyPriceMult", "heatUtilisation", "chpHours", "leakShare", "digestateValueFactor", "disposalRealisation", "feedstockAvailability"] as const;

/** One sampled scenario plus the quantile for the biomethane price (cons / base / opt reference prices). */
export function sampleScenario(u: number[]): { scenario: ScenarioDef; biomethaneU: number } {
  const { conservative: lo, base, optimistic: hi } = SCENARIOS;
  const s: ScenarioDef = { ...base };
  SAMPLED_FIELDS.forEach((k, i) => {
    const a = Math.min(lo[k], hi[k]);
    const b = Math.max(lo[k], hi[k]);
    // Orient each draw so that u < 0.5 tends to the conservative side, as in the scenarios.
    const uu = lo[k] <= hi[k] ? u[i] : 1 - u[i];
    (s as unknown as Record<string, number>)[k] = triangular(uu, a, base[k], b);
  });
  return { scenario: s, biomethaneU: u[SAMPLED_FIELDS.length] };
}

export function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

/**
 * Expected value of perfect information for a build / do-not-build decision when one input is uncertain:
 * EVPI = E[max(NPV, 0)] − max(E[NPV], 0). The input follows a triangular distribution (low, base, high) and NPV is
 * interpolated linearly through the three model runs.
 */
export function evpi(points: { low: [number, number]; base: [number, number]; high: [number, number] }): { evpi: number; expected: number } {
  const [xl, nl] = points.low;
  const [xb, nb] = points.base;
  const [xh, nh] = points.high;
  const a = Math.min(xl, xh), b = Math.max(xl, xh);
  const at = (x: number) => {
    const [x0, n0, x1, n1] = x <= xb ? (xl <= xh ? [xl, nl, xb, nb] : [xh, nh, xb, nb]) : (xl <= xh ? [xb, nb, xh, nh] : [xb, nb, xl, nl]);
    return x1 === x0 ? n0 : n0 + ((x - x0) * (n1 - n0)) / (x1 - x0);
  };
  const K = 400;
  let pos = 0, mean = 0;
  for (let k = 0; k < K; k++) {
    const n = at(triangular((k + 0.5) / K, a, Math.min(Math.max(xb, a), b), b));
    pos += Math.max(n, 0) / K;
    mean += n / K;
  }
  return { evpi: Math.max(0, pos - Math.max(mean, 0)), expected: mean };
}

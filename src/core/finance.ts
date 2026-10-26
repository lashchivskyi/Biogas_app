import type { FinancialResult } from "./types";

export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

/** Unique conventional-project IRR by bisection; non-conventional flows may have multiple roots. */
export function irr(flows: number[]): number | null {
  if (flows.some((v) => !Number.isFinite(v))) return null;
  const signs = flows.filter((v) => v !== 0).map((v) => Math.sign(v));
  const changes = signs.slice(1).filter((s, i) => s !== signs[i]).length;
  if (changes !== 1) return null;
  let lo = -0.9;
  let hi = 5;
  const f = (r: number) => npv(r, flows);
  const flo = f(lo);
  const fhi = f(hi);
  if (flo === 0) return lo;
  if (fhi === 0) return hi;
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-6) return mid;
    if (flo * fm < 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface CashFlowInput {
  capexEur: number;
  /** Year-1-basis amounts (EUR) */
  energyRevenue: number; // escalates with energy prices
  otherRevenue: number; // escalates with opex inflation (disposal savings, digestate)
  /** Fixed nominal revenue, e.g. a feed-in tariff (not escalated). */
  fixedRevenue?: number;
  opexEur: number;
  horizon: number;
  discount: number;
  energyEsc: number;
  opexEsc: number;
  rampYear1: number;
  debtShare: number;
  debtRate: number;
  debtTenor: number;
}

export function buildFinancials(i: CashFlowInput): FinancialResult {
  const flows: number[] = [-i.capexEur];
  const ebitda: number[] = [];
  for (let t = 1; t <= i.horizon; t++) {
    const eEsc = Math.pow(1 + i.energyEsc, t - 1);
    const oEsc = Math.pow(1 + i.opexEsc, t - 1);
    const ramp = t === 1 ? i.rampYear1 : 1;
    const rev = (i.energyRevenue * eEsc + i.otherRevenue * oEsc + (i.fixedRevenue ?? 0)) * ramp;
    const opex = i.opexEur * oEsc;
    const e = rev - opex;
    ebitda.push(e);
    flows.push(e);
  }

  const steadyEbitda = i.energyRevenue + i.otherRevenue + (i.fixedRevenue ?? 0) - i.opexEur;
  const simple = steadyEbitda > 0 ? i.capexEur / steadyEbitda : null;

  const cumulative: number[] = [];
  let acc = 0;
  let dyn: number | null = null;
  flows.forEach((cf, t) => {
    const prev = acc;
    acc += cf;
    cumulative.push(acc);
    if (dyn === null && t > 0 && acc >= 0) {
      const frac = cf !== 0 ? (0 - prev) / cf : 0;
      dyn = t - 1 + Math.min(1, Math.max(0, frac));
    }
  });

  const debt = i.capexEur * i.debtShare;
  const r = i.debtRate;
  const n = i.debtTenor;
  const annuity = debt > 0 && n > 0 ? (r > 0 ? (debt * r) / (1 - Math.pow(1 + r, -n)) : debt / n) : 0;
  let dscrMin: number | null = null;
  let dscrSum = 0;
  let dscrN = 0;
  if (annuity > 0) {
    for (let t = 1; t <= Math.min(n, i.horizon); t++) {
      const d = ebitda[t - 1] / annuity;
      dscrMin = dscrMin === null ? d : Math.min(dscrMin, d);
      dscrSum += d;
      dscrN++;
    }
  }

  return {
    capexEur: i.capexEur,
    opexEurYear: i.opexEur,
    revenueEurYear: i.energyRevenue + i.otherRevenue + (i.fixedRevenue ?? 0),
    ebitdaEurYear: steadyEbitda,
    simplePaybackYears: simple,
    dynamicPaybackYears: dyn,
    npvEur: npv(i.discount, flows),
    irr: irr(flows),
    dscrMin,
    dscrAvg: dscrN ? dscrSum / dscrN : null,
    cashFlows: flows,
    cumulative,
    debtEur: debt,
    annualDebtServiceEur: annuity,
  };
}

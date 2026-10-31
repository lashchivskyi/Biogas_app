import { assess } from "@/core";
import type { ProjectInput } from "@/core/types";
import agstar from "./data/agstar-backtest.json";
import summary from "./data/backtest-summary.json";
import { getCountry } from "./index";

/**
 * Production back-test against the EPA AgSTAR Livestock Anaerobic Digester Database.
 * Each digester is entered as a client would (herd, state, grid connection, no heat buyer) and the model's base-case
 * output is compared with what AgSTAR lists. AgSTAR values are compiled from voluntary sources and not metered, so the
 * spread measures model + reporting differences together; it is an external plausibility check, not a calibration.
 */
export interface AgstarRow {
  name: string;
  state: string;
  animal: "dairy" | "swine";
  head: number;
  digester: string | null;
  year: number | null;
  endUse: string;
  electricityKwhYear?: number;
  biogasM3Day?: number;
}

/** Nearest US climate region of the model for each state (the model has 11 US climate regions). */
const STATE_REGION: Record<string, string> = {
  WI: "wisconsin", MN: "minnesota", MI: "michigan", NY: "new-york", PA: "pennsylvania", IA: "iowa", NC: "north-carolina",
  TX: "texas", ID: "idaho", WA: "washington", CA: "california",
  VT: "new-york", NH: "new-york", ME: "new-york", MA: "new-york", CT: "new-york", NJ: "pennsylvania", MD: "pennsylvania", OH: "pennsylvania",
  IN: "iowa", IL: "iowa", MO: "iowa", NE: "iowa", KS: "iowa", SD: "minnesota", ND: "minnesota", MT: "idaho", WY: "idaho", UT: "idaho", CO: "idaho",
  OR: "washington", AZ: "california", NV: "california", NM: "texas", OK: "texas", LA: "texas", MS: "texas", AL: "north-carolina",
  GA: "north-carolina", SC: "north-carolina", VA: "north-carolina", TN: "north-carolina", KY: "north-carolina", AR: "north-carolina", FL: "texas",
};

export function agstarInput(row: AgstarRow): ProjectInput {
  return {
    countryCode: "US",
    regionId: STATE_REGION[row.state] ?? "iowa",
    businessType: row.animal === "dairy" ? "dairy_farm" : "pig_farm",
    feedstocks: [{ id: "herd", animal: row.animal === "dairy" ? "dairy_cow" : "pig_finisher", quantity: row.head, ...(row.animal === "dairy" ? { housing: "year_round" as const } : {}) }],
    energy: { heatNeed: "none", hasGridConnection: true },
    site: {},
  };
}

export interface BacktestStat {
  n: number;
  /** model ÷ reported */
  median: number;
  p10: number;
  p90: number;
  /** Share of digesters where the model is within ±30 % of the reported value. */
  within30: number;
}

export interface BacktestSummary {
  modelVersion: string;
  dataThrough: string;
  retrievedOn: string;
  source: string;
  /** Model gross electricity ÷ AgSTAR electricity generated (CHP/electricity digesters). */
  electricity: BacktestStat;
}

function stat(ratios: number[]): BacktestStat {
  const s = [...ratios].sort((a, b) => a - b);
  const q = (p: number) => {
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);
    return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
  };
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return { n: s.length, median: r3(q(0.5)), p10: r3(q(0.1)), p90: r3(q(0.9)), within30: r3(s.filter((x) => x >= 0.7 && x <= 1.3).length / s.length) };
}

export function runAgstarBacktest(): BacktestSummary & { rows: { row: AgstarRow; electricityRatio?: number; biogasRatio?: number }[] } {
  const country = getCountry("US");
  const rows = (agstar.rows as AgstarRow[]).map((row) => {
    const a = assess(agstarInput(row), country, { uncertainty: false });
    const chp = a.routesBase.chp;
    return {
      row,
      // AgSTAR lists generated electricity, i.e. gross generator output.
      ...(row.electricityKwhYear ? { electricityRatio: chp.energy.elGrossKwh / row.electricityKwhYear } : {}),
      // AgSTAR's biogas column is its own per-head rule of thumb (constant ratio across farms), so it is shown by the script only.
      ...(row.biogasM3Day ? { biogasRatio: chp.feed.biogasM3Year / 365 / row.biogasM3Day } : {}),
    };
  });
  const country0 = assess(agstarInput(agstar.rows[0] as AgstarRow), country, { uncertainty: false });
  return {
    modelVersion: country0.dataAudit?.modelVersion ?? "",
    dataThrough: agstar.dataThrough,
    retrievedOn: agstar.retrievedOn,
    source: agstar.source,
    electricity: stat(rows.flatMap((r) => (r.electricityRatio === undefined ? [] : [r.electricityRatio]))),
    rows,
  };
}

/** Stored result shown on the methodology page; `backtest.test.ts` fails when the model drifts from it. */
export const BACKTEST: BacktestSummary = summary as BacktestSummary;

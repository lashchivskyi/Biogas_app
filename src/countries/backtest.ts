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

/** Electricity a confined dairy uses, kWh per cow and year: barn-based farms, Mohsenimanesh et al., Applied Engineering in
 * Agriculture 37(5) 977–990 (2021), doi 10.13031/aea.14621 (global review; pasture-based 475). A client enters the bill; AgSTAR does
 * not list it, and without it every kWh would be valued as export. Swine: no reviewed figure, left out. */
export const BARN_DAIRY_KWH_COW = 769;

export function agstarInput(row: AgstarRow): ProjectInput {
  return {
    countryCode: "US",
    regionId: STATE_REGION[row.state] ?? "iowa",
    businessType: row.animal === "dairy" ? "dairy_farm" : "pig_farm",
    feedstocks: [{ id: "herd", animal: row.animal === "dairy" ? "dairy_cow" : "pig_finisher", quantity: row.head, ...(row.animal === "dairy" ? { housing: "year_round" as const } : {}) }],
    energy: { ...(row.animal === "dairy" ? { electricityKwhYear: Math.round(row.head * BARN_DAIRY_KWH_COW) } : {}), heatNeed: "none", hasGridConnection: true },
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
  /** Model gross electricity ÷ AgSTAR electricity generated (CHP/electricity digesters), read values only. */
  electricity: BacktestStat;
  /** Rows left out because the listed output is nameplate kW × 8 760 h, not a reading. */
  nameplateRows: number;
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

/** An "output" that is an exact multiple of 8 760 h is nameplate kW × a full year, not a reading (38 of 79 AgSTAR rows). */
export const isNameplate = (row: AgstarRow) => !!row.electricityKwhYear && row.electricityKwhYear % 8760 === 0;

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
    electricity: stat(rows.flatMap((r) => (r.electricityRatio === undefined || isNameplate(r.row) ? [] : [r.electricityRatio]))),
    nameplateRows: rows.filter((r) => isNameplate(r.row)).length,
    rows,
  };
}

/** Stored result shown on the methodology page; `backtest.test.ts` fails when the model drifts from it. */
export const BACKTEST: BacktestSummary = summary as BacktestSummary;

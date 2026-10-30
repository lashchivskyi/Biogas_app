import { prov } from "./params";
import type { Provenance, ScenarioId } from "./types";

/**
 * Conservative / Base / Optimistic parameter sets. They bundle the *uncertain* quantities so that
 * the three scenarios are internally consistent (a pessimistic yield comes with a pessimistic CAPEX).
 * Every value is an ASSUMPTION — the spread is wider than the expected error on purpose.
 */
export interface ScenarioDef {
  id: ScenarioId;
  label: string;
  /** Position on the catalogue yield range: -1 = low end, 0 = typical, +1 = high end. */
  yieldBlend: number;
  processRealisation: number;
  capexMult: number;
  opexMult: number;
  energyPriceMult: number;
  /** Share of net surplus heat that actually finds a user when there is demand (timing, distance, failures). */
  heatUtilisation: number;
  chpHours: number;
  leakShare: number;
  digestateValueFactor: number;
  disposalRealisation: number;
  feedstockAvailability: number;
  biomethanePriceKey: "cons" | "base" | "opt";
}

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  conservative: {
    id: "conservative", label: "Консервативний", yieldBlend: -0.5, processRealisation: 0.85, capexMult: 1.2, opexMult: 1.15,
    energyPriceMult: 0.85, heatUtilisation: 0.6, chpHours: 7200, leakShare: 0.03, digestateValueFactor: 0.5,
    disposalRealisation: 0.8, feedstockAvailability: 0.9, biomethanePriceKey: "cons",
  },
  base: {
    id: "base", label: "Базовий", yieldBlend: 0, processRealisation: 0.9, capexMult: 1.0, opexMult: 1.0,
    energyPriceMult: 1.0, heatUtilisation: 0.8, chpHours: 7800, leakShare: 0.015, digestateValueFactor: 0.7,
    disposalRealisation: 0.95, feedstockAvailability: 1.0, biomethanePriceKey: "base",
  },
  optimistic: {
    id: "optimistic", label: "Оптимістичний", yieldBlend: 0.5, processRealisation: 0.95, capexMult: 0.9, opexMult: 0.95,
    energyPriceMult: 1.1, heatUtilisation: 0.95, chpHours: 8200, leakShare: 0.005, digestateValueFactor: 0.85,
    disposalRealisation: 1.0, feedstockAvailability: 1.0, biomethanePriceKey: "opt",
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ["conservative", "base", "optimistic"];

/** Registry entries so the scenario spread appears on /[lang]/methodology. */
export function scenarioProvenance(reviewedOn: string): Provenance[] {
  const out: Provenance[] = [];
  const src = "Project-team scenario design; spread intentionally wider than expected error";
  const u: Record<string, string> = {
    yieldBlend: "—", processRealisation: "—", capexMult: "×", opexMult: "×", energyPriceMult: "×", heatUtilisation: "—",
    chpHours: "h/a", leakShare: "of CH₄ production", digestateValueFactor: "—", disposalRealisation: "—", feedstockAvailability: "—",
  };
  for (const id of Object.keys(SCENARIOS) as ScenarioId[]) {
    const s = SCENARIOS[id];
    for (const k of Object.keys(u)) {
      out.push(prov(`scn.${id}.${k}`, `${s.label}: ${k}`, (s as unknown as Record<string, number>)[k], u[k], "ASSUMPTION", src, "LOW", { date: reviewedOn }));
    }
  }
  return out;
}

import { assess, type Assessment, type VerdictId } from "@/core";
import { EXAMPLES, type ExampleCase } from "@/core/examples";
import { getCountry } from "@/countries";
import type { Dict } from "@/i18n";

export function exampleTitle(e: ExampleCase, d: Pick<Dict, "examples" | "labels">) {
  return d.examples[e.id as keyof typeof d.examples] ?? e.title;
}

const VERDICT_ORDER: Record<VerdictId, number> = {
  STRONG_CANDIDATE: 0, POSSIBLE_WITH_CONDITIONS: 1, WEAK_ECONOMICS: 2, NOT_RECOMMENDED_AT_SCALE: 3, INSUFFICIENT_DATA: 4,
};

/** Quality of the economics first, then return per invested euro (avoids favouring large plants). */
export function compareExampleEconomics(left: { e: ExampleCase; a: Assessment }, right: { e: ExampleCase; a: Assessment }) {
  const order = VERDICT_ORDER[left.a.verdict.id] - VERDICT_ORDER[right.a.verdict.id];
  if (order) return order;
  const roi = (a: Assessment) => a.scenarios.base.fin.npvEur / Math.max(1, a.scenarios.base.capex.totalEur);
  return roi(right.a) - roi(left.a)
    || (left.a.scenarios.base.fin.simplePaybackYears ?? Infinity) - (right.a.scenarios.base.fin.simplePaybackYears ?? Infinity)
    || left.e.id.localeCompare(right.e.id);
}

export function rankedExamples() {
  return EXAMPLES.map((e) => ({ e, a: assess(e.input, getCountry(e.input.countryCode)) })).sort(compareExampleEconomics);
}

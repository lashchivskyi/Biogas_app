import { assess, type Assessment, type VerdictId } from "@/core";
import { EXAMPLES, type ExampleCase } from "@/core/examples";
import { getCountry } from "@/countries";
import { INTL_TAG, type Dict, type Locale } from "@/i18n";

export function exampleTitle(e: ExampleCase, d: Pick<Dict, "examples" | "labels">, locale: Locale = "en") {
  const known = d.examples[e.id as keyof typeof d.examples];
  // The historical name included a capacity that was not a calculated result.
  if (known && e.id !== "de_guelle") return known;
  const n = new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 1 }).format;
  return [d.labels.business[e.input.businessType].label, ...e.input.feedstocks.map((f) => f.animal
    ? `${d.labels.animal[f.animal].label}: ${n(f.quantity)}`
    : `${d.labels.feedstock[f.type!]}: ${n(f.quantity)} ${d.labels.units.tYear}`)].join(" · ");
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

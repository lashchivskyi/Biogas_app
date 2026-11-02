import type { Assessment, CoreLang, ProjectInput } from "@/core";
import { fmtInt, tr } from "@/core/i18n";

/**
 * "What would make it work?" levers shown under a result. Each lever is a concrete, realistic
 * change to the customer's own input — not a magic multiplier — so the user can apply it and keep editing.
 */
export interface Lever {
  id: "cosubstrate" | "heat" | "cluster";
  apply: (i: ProjectInput, fx: number) => ProjectInput;
}

const clone = (i: ProjectInput): ProjectInput => JSON.parse(JSON.stringify(i));

/** Gate fee assumed for the co-substrate lever, EUR/t (converted to the project currency). */
export const COSUBSTRATE_GATE_FEE_EUR = 6;

export const LEVERS: Lever[] = [
  {
    id: "cosubstrate",
    apply: (i, fx) => {
      const n = clone(i);
      n.feedstocks.push({ id: "whatif-food", type: "food_waste", quantity: 3000, delivered: true, distanceKm: 15, purchasePricePerTonneLocal: -Math.round(COSUBSTRATE_GATE_FEE_EUR * fx), handling: "paid_disposal" });
      return n;
    },
  },
  {
    id: "heat",
    apply: (i) => {
      const n = clone(i);
      n.energy.heatNeed = "year_round_process";
      n.energy.heatKwhYear = Math.max(n.energy.heatKwhYear ?? 0, 1_000_000);
      return n;
    },
  },
  {
    id: "cluster",
    apply: (i) => {
      const n = clone(i);
      n.feedstocks = n.feedstocks.map((f) => ({ ...f, quantity: f.quantity * 3 }));
      if (n.energy.electricityKwhYear) n.energy.electricityKwhYear *= 2;
      return n;
    },
  },
];

/** Plain-language "why" behind the verdict: the single most important driver (model language). */
export function keyDriver(a: Assessment, lang: CoreLang = a.lang): string {
  const T = tr(lang);
  const b = a.scenarios.base;
  const kw = Math.max(1, b.kwElEquivalent);
  const perKw = b.capex.totalEur / kw;
  const rev = b.opexRev.revenue;
  const total = Math.max(1, b.opexRev.revenueEur);
  const top = [...rev].sort((x, y) => y.eur - x.eur)[0];
  const heatUnused = b.energy.heatNetAvailableKwh > 0 ? 1 - b.energy.heatUsefulKwh / b.energy.heatNetAvailableKwh : 0;
  const fmt = fmtInt(lang);

  if (a.verdict.id === "WEAK_ECONOMICS" || a.verdict.id === "NOT_RECOMMENDED_AT_SCALE") {
    if (kw < 150 && perKw > 7000)
      return T("Main reason — small scale: the feedstock supports only ≈ {kw} kW, while the plant costs ≈ €{perKw} per kW. Digester, storage and CHP are expensive even at small capacity.", { kw: fmt(kw), perKw: fmt(perKw) });
    if (heatUnused > 0.6 && b.energy.heatNetAvailableKwh > 200_000)
      return T("Main reason — ≈ {share} % of the heat has no user, so half of the plant's energy earns nothing.", { share: Math.round(heatUnused * 100) });
    if (b.feed.energyDensityKwhPerTonne < 200)
      return T("Main reason — low feedstock energy (≈ {density} kWh per tonne): mostly water, little organic matter.", { density: fmt(b.feed.energyDensityKwhPerTonne) });
    return T("Operating margin (≈ €{ebitda}/year) is too small for an investment of ≈ €{capex}.", { ebitda: fmt(b.fin.ebitdaEurYear), capex: fmt(b.capex.totalEur) });
  }
  if (top) return T("Largest benefit — “{label}”: ≈ {share} % of all revenue and savings.", { label: T.lang === "de" ? top.label : top.label.toLowerCase(), share: Math.round((top.eur / total) * 100) });
  return "";
}

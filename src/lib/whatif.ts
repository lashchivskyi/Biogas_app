import type { Assessment, CoreLang, ProjectInput } from "@/core";

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
  const uk = lang === "uk";
  const b = a.scenarios.base;
  const kw = Math.max(1, b.kwElEquivalent);
  const perKw = b.capex.totalEur / kw;
  const rev = b.opexRev.revenue;
  const total = Math.max(1, b.opexRev.revenueEur);
  const top = [...rev].sort((x, y) => y.eur - x.eur)[0];
  const heatUnused = b.energy.heatNetAvailableKwh > 0 ? 1 - b.energy.heatUsefulKwh / b.energy.heatNetAvailableKwh : 0;
  const fmt = (n: number) => new Intl.NumberFormat(uk ? "uk-UA" : "en-GB", { maximumFractionDigits: 0 }).format(n);

  if (a.verdict.id === "WEAK_ECONOMICS" || a.verdict.id === "NOT_RECOMMENDED_AT_SCALE") {
    if (kw < 150 && perKw > 7000)
      return uk
        ? `Головна причина — малий масштаб: сировина дає лише ≈ ${fmt(kw)} кВт, а установка коштує ≈ ${fmt(perKw)} € за кожен кВт. Реактор, сховище й когенерація дорогі навіть для малої потужності.`
        : `Main reason — small scale: the feedstock supports only ≈ ${fmt(kw)} kW, while the plant costs ≈ €${fmt(perKw)} per kW. Digester, storage and CHP are expensive even at small capacity.`;
    if (heatUnused > 0.6 && b.energy.heatNetAvailableKwh > 200_000)
      return uk
        ? `Головна причина — ≈ ${Math.round(heatUnused * 100)} % тепла не має споживача, тож половина енергії установки не приносить грошей.`
        : `Main reason — ≈ ${Math.round(heatUnused * 100)} % of the heat has no user, so half of the plant's energy earns nothing.`;
    if (b.feed.energyDensityKwhPerTonne < 200)
      return uk
        ? `Головна причина — низька енергія сировини (≈ ${fmt(b.feed.energyDensityKwhPerTonne)} кВт·год на тонну): переважно вода, мало органіки.`
        : `Main reason — low feedstock energy (≈ ${fmt(b.feed.energyDensityKwhPerTonne)} kWh per tonne): mostly water, little organic matter.`;
    return uk
      ? `Операційний прибуток (≈ ${fmt(b.fin.ebitdaEurYear)} €/рік) замалий відносно інвестицій ≈ ${fmt(b.capex.totalEur)} €.`
      : `Operating margin (≈ €${fmt(b.fin.ebitdaEurYear)}/year) is too small for an investment of ≈ €${fmt(b.capex.totalEur)}.`;
  }
  if (top) return uk ? `Найбільша вигода — «${top.label.toLowerCase()}»: ≈ ${Math.round((top.eur / total) * 100)} % усіх доходів і економії.` : `Largest benefit — “${top.label.toLowerCase()}”: ≈ ${Math.round((top.eur / total) * 100)} % of all revenue and savings.`;
  return "";
}

import type { RunContext } from "./context";
import { FEEDSTOCKS } from "./feedstockData";
import { MANURE_RETURN_HAUL } from "./feedstock";
import type { FeedstockSummary, LogisticsAssessment } from "./types";

/**
 * "Transport can destroy economics." For each stream: what does one tonne earn in energy, what does
 * it cost to haul it, and at what distance does hauling eat half of that energy value.
 */
export function assessLogistics(feed: FeedstockSummary, ctx: RunContext, energyValueEurPerKwh: number): LogisticsAssessment {
  const p = ctx.params;
  const lhv = p.get("eng.ch4_lhv_kwh_m3");
  const rate = p.get("econ.transport_eur_tkm") * ctx.mods.transport;
  const fixed = p.get("econ.transport_fixed_eur_t") * ctx.mods.transport;
  const warnings: string[] = [];
  const T = ctx.t;

  const perLine = feed.lines.map((l) => {
    const ch4PerT = l.tonnesYear > 0 ? l.ch4M3Year / l.tonnesYear : 0;
    const value = ch4PerT * lhv * energyValueEurPerKwh; // gross energy value per tonne, before conversion losses
    // Same per-tonne cost as charged in feedstock.ts.
    const returnFactor = l.delivered && l.category === "manure" ? MANURE_RETURN_HAUL : 1;
    const dist = l.distanceKm;
    const cost = l.delivered ? (fixed + dist * rate) * returnFactor : 0;
    const share = value > 0 ? cost / value : 0;
    const breakEven = value > 0 ? Math.max(0, (0.5 * value / returnFactor - fixed) / rate) : 0;
    let level: "OK" | "WARNING" | "CRITICAL" = "OK";
    if (l.delivered) {
      if (share >= 0.5) level = "CRITICAL";
      else if (share >= 0.25) level = "WARNING";
    }
    const sh = Math.round(share * 100);
    const be = Math.round(breakEven);
    if (level === "CRITICAL") warnings.push(T(`"${l.label}": hauling ${dist} km eats ≈${sh} % of its energy value — build the plant at the source (rule of thumb: ≤ ${be} km).`, `«${l.label}»: перевезення ${dist} км з'їдає ≈${sh} % енергетичної вартості — установку слід будувати біля джерела (орієнтир: ≤ ${be} км).`));
    else if (level === "WARNING") warnings.push(T(`"${l.label}": logistics take ${sh} % of its energy value — borderline.`, `«${l.label}»: логістика ${sh} % від енергетичної вартості — на межі економічної доцільності.`));
    return {
      id: l.id,
      label: FEEDSTOCKS[l.typeId].name[ctx.lang],
      distanceKm: dist,
      transportCostEurPerTonne: cost,
      energyValueEurPerTonne: value,
      transportShareOfEnergyValue: share,
      breakEvenDistanceKm: breakEven,
      level,
    };
  });
  return { perLine, warnings };
}

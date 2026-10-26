import type { Params } from "./params";
import type { FeedstockSummary } from "./types";

/** Dry-gas approximation at 0 °C and 1 atm. Non-CH₄ gas is treated as CO₂ for mass accounting. */
export function dryBiogasMassKg(feed: FeedstockSummary, p: Params): number {
  const methane = feed.ch4M3Year * p.get("eng.ch4_density_kg_m3");
  const other = Math.max(0, feed.biogasM3Year - feed.ch4M3Year) * p.get("eng.co2_density_kg_m3");
  return methane + other;
}

/** Screening balance; absorbed/released reaction water and trace gases need a lab elemental balance. */
export function digestateTonnes(feed: FeedstockSummary, p: Params): number {
  return Math.max(0, feed.tonnesYear - dryBiogasMassKg(feed, p) / 1000);
}

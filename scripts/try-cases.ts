/** Scratch evaluator for candidate example cases: npx tsx scripts/try-cases.ts */
import { assess } from "../src/core";
import type { ProjectInput } from "../src/core/types";
import { getCountry } from "../src/countries";

const cases: Record<string, ProjectInput> = {
  de_meat: {
    countryCode: "DE", regionId: "niedersachsen", businessType: "slaughterhouse",
    feedstocks: [
      { id: "a", type: "slaughter_residues", quantity: 15000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 55 },
      { id: "b", type: "dairy_fat_sludge", quantity: 2500, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 70 },
    ],
    energy: { electricityKwhYear: 14_000_000, heatNeed: "year_round_process", gasM3Year: 2_400_000, hasGridConnection: true },
    site: { landHa: 300, gasGridKm: 2 },
  },
  it_whey: {
    countryCode: "IT", regionId: "lombardia", businessType: "dairy_processor",
    feedstocks: [
      { id: "a", type: "dairy_whey", quantity: 40000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 12 },
      { id: "b", type: "dairy_fat_sludge", quantity: 3000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 60 },
    ],
    energy: { electricityKwhYear: 9_000_000, heatNeed: "year_round_process", gasM3Year: 1_800_000, hasGridConnection: true },
    site: { landHa: 200, gasGridKm: 1 },
  },
  gb_food: {
    countryCode: "GB", regionId: "midlands", businessType: "municipal_biowaste",
    feedstocks: [{ id: "a", type: "food_waste", quantity: 50000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 30 }],
    energy: { electricityKwhYear: 1_500_000, heatNeed: "none", hasGridConnection: true },
    site: { landHa: 2000, gasGridKm: 1 },
  },
  ua_sugar: {
    countryCode: "UA", regionId: "vinnytsia", businessType: "sugar_ethanol",
    feedstocks: [{ id: "a", type: "sugar_beet_pulp", quantity: 90000, dryMatterPct: 22, monthsActive: 12, handling: "sold_as_feed", opportunityValuePerTonneLocal: 100 }],
    energy: { electricityKwhYear: 20_000_000, heatNeed: "seasonal_buildings", gasM3Year: 9_000_000, hasGridConnection: true },
    site: { landHa: 8000, gasGridKm: 1 },
  },
  pl_poultry_proc: {
    countryCode: "PL", regionId: "wielkopolskie", businessType: "slaughterhouse",
    feedstocks: [
      { id: "a", type: "slaughter_residues", quantity: 12000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 250 },
      { id: "b", type: "dairy_fat_sludge", quantity: 2000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 300 },
    ],
    energy: { electricityKwhYear: 18_000_000, heatNeed: "year_round_process", gasM3Year: 2_000_000, hasGridConnection: true },
    site: { landHa: 400, gasGridKm: 3 },
  },
};

for (const [id, input] of Object.entries(cases)) {
  const a = assess(input, getCountry(input.countryCode));
  const b = a.scenarios.base;
  console.log(id.padEnd(16), a.bestRoute.padEnd(10), `kW ${Math.round(b.kwElEquivalent)}`, `capex ${(b.capex.totalEur / 1e6).toFixed(2)}M`, `ebitda ${(b.fin.ebitdaEurYear / 1e3).toFixed(0)}k`, `pb ${b.fin.simplePaybackYears?.toFixed(1)}`, `npv ${(b.fin.npvEur / 1e6).toFixed(2)}M`, `consNpv ${(a.scenarios.conservative.fin.npvEur / 1e6).toFixed(2)}M`, a.verdict.id);
  console.log("   ", a.verdict.reasons.slice(0, 3).join(" | "));
}

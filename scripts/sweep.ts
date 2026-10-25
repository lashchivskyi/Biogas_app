import { assess } from "../src/core";
import { getCountry } from "../src/countries";
import type { ProjectInput } from "../src/core/types";

const country = getCountry("UA");
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

function run(label: string, mk: (q: number) => ProjectInput, sizes: number[]) {
  console.log(`\n# ${label}`);
  for (const q of sizes) {
    const a = assess(mk(q), country);
    const b = a.scenarios.base;
    console.log(
      `${String(q).padStart(7)} -> ${a.bestRoute.padEnd(10)} ${String(Math.round(b.kwElEquivalent)).padStart(5)} kW capex ${fmt(b.capex.totalEur).padStart(10)} payback ${(b.fin.simplePaybackYears ?? NaN).toFixed(1).padStart(5)} npv(c/b/o) ${fmt(a.scenarios.conservative.fin.npvEur)}/${fmt(b.fin.npvEur)}/${fmt(a.scenarios.optimistic.fin.npvEur)} dscr ${(b.fin.dscrMin ?? NaN).toFixed(2)} ${a.verdict.id}`,
    );
  }
}

run("Slaughterhouse residues, disposal 700 UAH/t, big electricity+heat demand", (q) => ({
  countryCode: "UA", regionId: "lviv", businessType: "slaughterhouse",
  feedstocks: [{ id: "a", type: "slaughter_residues", quantity: q, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 700 }],
  energy: { electricityKwhYear: q * 900, electricityPriceLocalPerKwh: 8.8, heatNeed: "year_round_process", gasM3Year: q * 200, gasPriceLocalPerM3: 21, hasGridConnection: true },
  site: { landHa: 100, gasGridKm: 1 },
}), [1500, 3000, 6000, 10000, 20000, 40000]);

run("Pig finishers (no co-substrate), elec 140 kWh/place, heat", (q) => ({
  countryCode: "UA", regionId: "lviv", businessType: "pig_farm",
  feedstocks: [{ id: "a", animal: "pig_finisher", quantity: q }],
  energy: { electricityKwhYear: q * 140, electricityPriceLocalPerKwh: 8.3, heatNeed: "seasonal_buildings", heatKwhYear: q * 90, hasGridConnection: true },
  site: { landHa: q / 4, existingStorageM3: q * 0.9, gasGridKm: 5 },
}), [5000, 15000, 30000, 60000, 120000]);

run("Dairy cows (no co-substrate)", (q) => ({
  countryCode: "UA", regionId: "lviv", businessType: "dairy_farm",
  feedstocks: [{ id: "a", animal: "dairy_cow", quantity: q }],
  energy: { electricityKwhYear: q * 1000, electricityPriceLocalPerKwh: 8.3, heatNeed: "year_round_process", heatKwhYear: q * 400, hasGridConnection: true },
  site: { landHa: q * 2, existingStorageM3: q * 12, gasGridKm: 5 },
}), [400, 1000, 2000, 4000, 8000]);

run("Dairy whey + fat sludge", (q) => ({
  countryCode: "UA", regionId: "lviv", businessType: "dairy_processor",
  feedstocks: [
    { id: "a", type: "dairy_whey", quantity: q, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 250 },
    { id: "b", type: "dairy_fat_sludge", quantity: q / 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 600 },
  ],
  energy: { electricityKwhYear: q * 500, electricityPriceLocalPerKwh: 8.8, heatNeed: "year_round_process", gasM3Year: q * 120, gasPriceLocalPerM3: 21, hasGridConnection: true },
  site: { landHa: 200, gasGridKm: 0.5 },
}), [6000, 15000, 30000, 60000]);

run("Manure + co-substrate: 1000 cows + food waste", (q) => ({
  countryCode: "UA", regionId: "lviv", businessType: "dairy_farm",
  feedstocks: [
    { id: "a", animal: "dairy_cow", quantity: 1000 },
    { id: "b", type: "food_waste", quantity: q, delivered: true, distanceKm: 20, purchasePricePerTonneLocal: -300, handling: "paid_disposal" },
  ],
  energy: { electricityKwhYear: 1000000, electricityPriceLocalPerKwh: 8.3, heatNeed: "year_round_process", heatKwhYear: 600000, hasGridConnection: true },
  site: { landHa: 2500, existingStorageM3: 12000, gasGridKm: 5 },
}), [0, 1000, 3000, 6000, 12000]);

/**
 * Scale thresholds behind the claims in segment pages: smallest annual tonnage at which the base NPV
 * turns positive (no subsidies), per country. Usage: npx tsx scripts/thresholds.ts
 */
import { assess } from "../src/core";
import type { ProjectInput } from "../src/core/types";
import { getCountry } from "../src/countries";

type Make = (t: number, cc: string) => ProjectInput;
const region = (cc: string) => getCountry(cc).regions[0].id;
const proc = (type: "slaughter_residues" | "dairy_whey" | "food_waste" | "sugar_beet_pulp_pressed", disposalEur: number): Make => (t, cc) => {
  const fx = getCountry(cc).params.find((p) => p.id === "econ.fx_local_per_eur")!.value;
  return {
    countryCode: cc, regionId: region(cc), businessType: "slaughterhouse",
    feedstocks: [{ id: "a", type, quantity: t, handling: disposalEur > 0 ? "paid_disposal" : "sold_as_feed", currentDisposalCostPerTonneLocal: disposalEur * fx }],
    energy: { electricityKwhYear: t * 600, heatNeed: "year_round_process", heatKwhYear: t * 400, hasGridConnection: true },
    site: { landHa: t / 20 },
  };
};
const dairy: Make = (cows, cc) => ({
  countryCode: cc, regionId: region(cc), businessType: "dairy_farm",
  feedstocks: [{ id: "a", animal: "dairy_cow", quantity: cows }],
  energy: { electricityKwhYear: cows * 1000, heatNeed: "year_round_process", heatKwhYear: cows * 300, hasGridConnection: true },
  site: { landHa: cows * 2 },
});

function threshold(make: Make, cc: string, grid: number[]) {
  for (const q of grid) if (assess(make(q, cc), getCountry(cc)).scenarios.base.fin.npvEur > 0) return q;
  return null;
}

const countries = ["UA", "PL", "DE", "IT", "FR", "GB", "TR", "US", "BR", "IN"];
const tons = [500, 1000, 2000, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 80000, 120000];
const herd = [200, 400, 700, 1000, 1500, 2000, 3000, 5000, 8000, 12000];
console.log("country  slaughter(€40/t)  whey(€8/t)  foodwaste(€35/t)  dairy cows");
for (const cc of countries) {
  console.log(cc.padEnd(8), String(threshold(proc("slaughter_residues", 40), cc, tons)).padEnd(17), String(threshold(proc("dairy_whey", 8), cc, tons)).padEnd(11), String(threshold(proc("food_waste", 35), cc, tons)).padEnd(17), threshold(dairy, cc, herd));
}

import type { ProjectInput } from "./types";

/**
 * Reference customers used by tests, the demo buttons in the calculator and docs/economics.md.
 * Quantities are illustrative archetypes, not real companies.
 */
export interface ExampleCase {
  id: string;
  title: string;
  description: string;
  input: ProjectInput;
}

const base = {
  countryCode: "UA",
  site: {} as ProjectInput["site"],
};

export const EXAMPLES: ExampleCase[] = [
  {
    id: "dairy_400",
    title: "Молочна ферма, 400 корів",
    description: "Гноївка, власні поля, є потреба в гарячій воді та охолодженні молока",
    input: {
      ...base, regionId: "lviv", businessType: "dairy_farm",
      feedstocks: [
        { id: "a", animal: "dairy_cow", quantity: 400, housing: "year_round" },
        { id: "b", animal: "cattle_other", quantity: 250, housing: "year_round" },
      ],
      energy: { electricityKwhYear: 420000, electricityPriceLocalPerKwh: 8.3, heatNeed: "year_round_process", heatKwhYear: 160000, hasGridConnection: true },
      site: { landHa: 900, existingStorageM3: 5000, gasGridKm: 6 },
    },
  },
  {
    id: "pig_5000",
    title: "Свинокомплекс, 5 000 місць відгодівлі",
    description: "Гноївка свиней, взимку опалення приміщень",
    input: {
      ...base, regionId: "ternopil", businessType: "pig_farm",
      feedstocks: [{ id: "a", animal: "pig_finisher", quantity: 5000 }],
      energy: { electricityKwhYear: 700000, electricityPriceLocalPerKwh: 8.3, heatNeed: "seasonal_buildings", heatKwhYear: 450000, hasGridConnection: true },
      site: { landHa: 1200, existingStorageM3: 4000, gasGridKm: 8 },
    },
  },
  {
    id: "layers_200k",
    title: "Птахофабрика, 200 000 несучок",
    description: "Послід несучок, є ризик аміачного інгібування",
    input: {
      ...base, regionId: "ivano-frankivsk", businessType: "poultry_farm",
      feedstocks: [{ id: "a", animal: "layer_hen", quantity: 200000 }],
      energy: { electricityKwhYear: 2200000, electricityPriceLocalPerKwh: 8.5, heatNeed: "seasonal_buildings", heatKwhYear: 600000, hasGridConnection: true },
      site: { landHa: 500, gasGridKm: 4 },
    },
  },
  {
    id: "dairy_processor",
    title: "Молокозавод, 15 000 т сироватки на рік",
    description: "Сироватка + жиро-осад, постійна потреба в парі/гарячій воді",
    input: {
      ...base, regionId: "lviv", businessType: "dairy_processor",
      feedstocks: [
        { id: "a", type: "dairy_whey", quantity: 15000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 250 },
        { id: "b", type: "dairy_fat_sludge", quantity: 1200, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 600 },
      ],
      energy: { electricityKwhYear: 5000000, electricityPriceLocalPerKwh: 8.8, heatNeed: "year_round_process", gasM3Year: 1800000, gasPriceLocalPerM3: 21, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 0.5 },
    },
  },
  {
    id: "slaughter_5000",
    title: "М'ясокомбінат, 5 000 т відходів забою",
    description: "Рубець, кров, флотат; потрібна пастеризація",
    input: {
      ...base, regionId: "volyn", businessType: "slaughterhouse",
      feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 5000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 700 }],
      energy: { electricityKwhYear: 3800000, electricityPriceLocalPerKwh: 8.8, heatNeed: "year_round_process", gasM3Year: 900000, gasPriceLocalPerM3: 21, hasGridConnection: true },
      site: { landHa: 60, gasGridKm: 1.5 },
    },
  },
  {
    id: "mixed_80",
    title: "Змішане господарство, 80 корів",
    description: "Мала ферма: типова причина, чому калькулятор каже «ні»",
    input: {
      ...base, regionId: "zakarpattia", businessType: "cattle_farm",
      feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 80, housing: "seasonal" }],
      energy: { electricityKwhYear: 60000, electricityPriceLocalPerKwh: 8.3, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 150 },
    },
  },
  {
    id: "brewery",
    title: "Пивоварня, 2 000 т дробини",
    description: "Дробина йде на корм: враховуємо втрачений дохід",
    input: {
      ...base, regionId: "lviv", businessType: "brewery",
      feedstocks: [{ id: "a", type: "brewery_spent_grain", quantity: 2000, handling: "sold_as_feed", opportunityValuePerTonneLocal: 450 }],
      energy: { electricityKwhYear: 1800000, electricityPriceLocalPerKwh: 8.8, heatNeed: "year_round_process", gasM3Year: 500000, gasPriceLocalPerM3: 21, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 1 },
    },
  },
  // ---------------- international archetypes (prices from the national profile) ----------------
  {
    id: "de_guelle", title: "German dairy, 150 kW manure plant", description: "EEG Güllekleinanlage case: manure-only, tariff vs no-tariff",
    input: {
      countryCode: "DE", regionId: "bayern", businessType: "dairy_farm",
      feedstocks: [
        { id: "a", animal: "dairy_cow", quantity: 650, housing: "year_round" },
        { id: "b", animal: "cattle_other", quantity: 300, housing: "year_round" },
      ],
      energy: { electricityKwhYear: 550000, heatNeed: "year_round_process", heatKwhYear: 250000, hasGridConnection: true },
      site: { landHa: 450, existingStorageM3: 7000, gasGridKm: 5 },
    },
  },
  {
    id: "dk_cluster", title: "Danish-style farm cluster, biomethane", description: "Developer pooling slurry from several farms + food waste with gate fee",
    input: {
      countryCode: "DK", regionId: "jutland", businessType: "biogas_developer",
      feedstocks: [
        { id: "a", animal: "dairy_cow", quantity: 6000, delivered: true, distanceKm: 8 },
        { id: "b", animal: "sow", quantity: 3000, delivered: true, distanceKm: 10 },
        { id: "c", type: "food_waste", quantity: 15000, delivered: true, distanceKm: 30, purchasePricePerTonneLocal: -220, handling: "paid_disposal" },
      ],
      energy: { electricityKwhYear: 1500000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 6000, gasGridKm: 2 },
    },
  },
  {
    id: "us_dairy_rng", title: "US dairy, 3 000 cows, RNG", description: "Wisconsin dairy: power savings vs renewable natural gas with RINs",
    input: {
      countryCode: "US", regionId: "wisconsin", businessType: "dairy_farm",
      feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 3000, housing: "year_round" }, { id: "b", animal: "cattle_other", quantity: 1500, housing: "year_round" }],
      energy: { electricityKwhYear: 2500000, heatNeed: "year_round_process", heatKwhYear: 800000, hasGridConnection: true },
      site: { landHa: 2500, existingStorageM3: 40000, gasGridKm: 3 },
    },
  },
  {
    id: "br_vinasse", title: "Brazilian ethanol mill, vinasse", description: "Sugar-ethanol mill in São Paulo: vinasse + press mud during the harvest",
    input: {
      countryCode: "BR", regionId: "sao-paulo", businessType: "sugar_ethanol",
      feedstocks: [{ id: "a", type: "vinasse", quantity: 400000, monthsActive: 8, startMonth: 4 }, { id: "b", type: "press_mud", quantity: 40000, monthsActive: 8, startMonth: 4 }],
      energy: { electricityKwhYear: 6000000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 20000, gasGridKm: 15 },
    },
  },
  {
    id: "th_pome", title: "Thai palm-oil mill, POME", description: "POME in a covered lagoon, power for the mill",
    input: {
      countryCode: "TH", regionId: "south", businessType: "palm_oil_mill",
      feedstocks: [{ id: "a", type: "pome", quantity: 250000 }],
      energy: { electricityKwhYear: 4000000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 3000 },
    },
  },
  {
    id: "in_cbg", title: "Indian CBG plant, cattle dung", description: "Dung collected from village herds + press mud, compressed biogas for transport",
    input: {
      countryCode: "IN", regionId: "punjab", businessType: "biogas_developer",
      feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 8000, delivered: true, distanceKm: 12 }, { id: "b", type: "press_mud", quantity: 20000, delivered: true, distanceKm: 25 }],
      energy: { electricityKwhYear: 800000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 3000, gasGridKm: 30 },
    },
  },
  {
    id: "fr_biowaste", title: "French municipal biowaste, 25 kt", description: "Source-separated biowaste with a gate fee, grid injection",
    input: {
      countryCode: "FR", regionId: "grand-est", businessType: "municipal_biowaste",
      feedstocks: [{ id: "a", type: "municipal_biowaste", quantity: 25000, delivered: true, distanceKm: 20, purchasePricePerTonneLocal: -60, handling: "paid_disposal" }],
      energy: { electricityKwhYear: 900000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 1500, gasGridKm: 1 },
    },
  },
];

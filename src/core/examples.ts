import type { ProjectInput } from "./types";

/**
 * Reference customers used by tests, the demo buttons in the calculator and docs/economics.md.
 * Each is an anonymised archetype built from the scale of plants of that type in that country (not a named company).
 * The verdict is whatever the unchanged model returns; the set is curated for realism and coverage, not for a verdict mix.
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
  // ---------------- STRONG: high-value residues or gate fees, year-round heat and power use ----------------
  {
    id: "it_whey", title: "Italian cheese dairy, 40 kt whey", description: "Whey and fat sludge with paid disposal; steam and power used around the clock",
    input: {
      countryCode: "IT", regionId: "lombardia", businessType: "dairy_processor",
      feedstocks: [
        { id: "a", type: "dairy_whey", quantity: 40000, dryMatterPct: 5.5, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 12 },
        { id: "b", type: "dairy_fat_sludge", quantity: 3000, dryMatterPct: 15, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 60 },
      ],
      energy: { electricityKwhYear: 9000000, heatNeed: "year_round_process", gasM3Year: 1800000, hasGridConnection: true },
      site: { landHa: 200, gasGridKm: 1 },
    },
  },
  {
    id: "fr_food_35k", title: "Breton dairy cooperative, whey and flotation sludge", description: "Only low-value whey rejected by feed buyers enters the model; ordinary saleable whey is excluded.",
    input: {
      countryCode: "FR", regionId: "bretagne", businessType: "dairy_processor",
      feedstocks: [
        { id: "off-spec-whey", type: "dairy_whey", quantity: 45000, dryMatterPct: 5.5, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 18 },
        { id: "dairy-daf", type: "dairy_fat_sludge", quantity: 1500, dryMatterPct: 15, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 55 },
      ],
      energy: { electricityKwhYear: 5500000, heatNeed: "year_round_process", gasM3Year: 850000, hasGridConnection: true },
      site: { landHa: 1200, gasGridKm: 0.6, neighboursWithin300m: true },
    },
  },
  {
    id: "it_slaughter", title: "Italian slaughterhouse, 20 kt category 3 residues", description: "Emilia-Romagna pork plant: paid disposal of eligible category 3 animal by-products, steam and cooling all year",
    input: {
      countryCode: "IT", regionId: "emilia", businessType: "slaughterhouse",
      feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 20000, dryMatterPct: 18, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 180 }],
      energy: { electricityKwhYear: 12000000, electricityPriceLocalPerKwh: 0.225, heatNeed: "year_round_process", gasPriceLocalPerM3: 0.559, gasM3Year: 2000000, hasGridConnection: true },
      site: { landHa: 80, gasGridKm: 1 },
    },
  },
  {
    id: "de_biowaste", title: "German biowaste plant, 40 kt with gate fee", description: "Source-separated biowaste under a municipal contract; CHP heat to a district network; gate fee is the main revenue",
    input: {
      countryCode: "DE", regionId: "niedersachsen", businessType: "municipal_biowaste",
      feedstocks: [{ id: "a", type: "municipal_biowaste", quantity: 40000, dryMatterPct: 25, monthsActive: 12, delivered: true, distanceKm: 25, purchasePricePerTonneLocal: -85, handling: "other" }],
      energy: { electricityKwhYear: 2000000, electricityPriceLocalPerKwh: 0.206, heatNeed: "year_round_process", heatKwhYear: 3000000, hasGridConnection: true },
      site: { landHa: 1000, gasGridKm: 2 },
    },
  },
  {
    id: "it_forsu", title: "Italian FORSU plant, 40 kt organic municipal waste", description: "Lazio-type merchant plant: municipal organic waste with a high gate fee; biomethane or CHP",
    input: {
      countryCode: "IT", regionId: "lazio", businessType: "municipal_biowaste",
      feedstocks: [{ id: "a", type: "municipal_biowaste", quantity: 40000, dryMatterPct: 25, monthsActive: 12, delivered: true, distanceKm: 30, purchasePricePerTonneLocal: -110, handling: "other" }],
      energy: { electricityKwhYear: 1800000, electricityPriceLocalPerKwh: 0.225, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 1200, gasGridKm: 1 },
    },
  },
  {
    id: "at_dairy", title: "Austrian cheese dairy, 30 kt whey", description: "Upper Austria: whey and fat sludge with paid disposal; process heat year-round",
    input: {
      countryCode: "AT", regionId: "oberoesterreich", businessType: "dairy_processor",
      feedstocks: [
        { id: "a", type: "dairy_whey", quantity: 30000, dryMatterPct: 5.5, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 15 },
        { id: "b", type: "dairy_fat_sludge", quantity: 2000, dryMatterPct: 15, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 60 },
      ],
      energy: { electricityKwhYear: 6000000, electricityPriceLocalPerKwh: 0.192, heatNeed: "year_round_process", gasPriceLocalPerM3: 0.652, gasM3Year: 1200000, hasGridConnection: true },
      site: { landHa: 150, gasGridKm: 0.8 },
    },
  },
  {
    id: "se_slaughter", title: "Swedish meat plant, 15 kt residues", description: "Skåne: category 3 residues with paid disposal; high gas price makes process heat valuable",
    input: {
      countryCode: "SE", regionId: "skane", businessType: "slaughterhouse",
      feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 15000, dryMatterPct: 18, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 1600 }],
      energy: { electricityKwhYear: 8000000, electricityPriceLocalPerKwh: 1.303, heatNeed: "year_round_process", gasPriceLocalPerM3: 11.754, gasM3Year: 500000, hasGridConnection: true },
      site: { landHa: 120, gasGridKm: 1 },
    },
  },
  {
    id: "dk_slaughter", title: "Danish meat plant, 25 kt category 3 residues", description: "Jutland: category 3 residues and fat with paid disposal; year-round steam and cooling",
    input: {
      countryCode: "DK", regionId: "jutland", businessType: "slaughterhouse",
      feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 25000, dryMatterPct: 18, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 500 }],
      energy: { electricityKwhYear: 12000000, electricityPriceLocalPerKwh: 0.972, heatNeed: "year_round_process", gasPriceLocalPerM3: 4.914, gasM3Year: 2500000, hasGridConnection: true },
      site: { landHa: 200, gasGridKm: 1 },
    },
  },
  {
    id: "de_bakery", title: "German bakery group, 12 kt residues", description: "Dough, bread and confectionery rejects with paid disposal; process heat for ovens and cleaning",
    input: {
      countryCode: "DE", regionId: "nrw", businessType: "other_industry",
      feedstocks: [{ id: "a", type: "food_waste", quantity: 12000, dryMatterPct: 30, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 120 }],
      energy: { electricityKwhYear: 3000000, electricityPriceLocalPerKwh: 0.206, heatNeed: "year_round_process", gasPriceLocalPerM3: 0.648, gasM3Year: 1500000, hasGridConnection: true },
      site: { landHa: 50, gasGridKm: 0.5 },
    },
  },

  {
    id: "gb_slaughter", title: "UK poultry plant, 20 kt category 3 residues", description: "Midlands: category 3 residues and DAF fat with paid disposal; high UK power prices; steam and cooling all year",
    input: {
      countryCode: "GB", regionId: "midlands", businessType: "slaughterhouse",
      feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 20000, dryMatterPct: 18, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 120 }],
      energy: { electricityKwhYear: 15000000, electricityPriceLocalPerKwh: 0.245, heatNeed: "year_round_process", gasPriceLocalPerM3: 0.38, gasM3Year: 2500000, hasGridConnection: true },
      site: { landHa: 150, gasGridKm: 1 },
    },
  },
  {
    id: "fr_slaughter", title: "French abattoir, 15 kt category 3 residues", description: "Brittany red-meat abattoir: category 3 residues with paid disposal; year-round steam for scalding and cleaning",
    input: {
      countryCode: "FR", regionId: "bretagne", businessType: "slaughterhouse",
      feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 15000, dryMatterPct: 18, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 150 }],
      energy: { electricityKwhYear: 9000000, electricityPriceLocalPerKwh: 0.155, heatNeed: "year_round_process", gasPriceLocalPerM3: 0.59, gasM3Year: 1800000, hasGridConnection: true },
      site: { landHa: 300, gasGridKm: 1 },
    },
  },
  {
    id: "dk_dairy", title: "Danish dairy, 30 kt whey and fat sludge", description: "Jutland dairy: whey treatment with paid disposal; process heat and power used year-round",
    input: {
      countryCode: "DK", regionId: "jutland", businessType: "dairy_processor",
      feedstocks: [
        { id: "a", type: "dairy_whey", quantity: 30000, dryMatterPct: 5.5, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 120 },
        { id: "b", type: "dairy_fat_sludge", quantity: 1500, dryMatterPct: 15, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 500 },
      ],
      energy: { electricityKwhYear: 6000000, electricityPriceLocalPerKwh: 0.972, heatNeed: "year_round_process", gasPriceLocalPerM3: 4.9, gasM3Year: 1200000, hasGridConnection: true },
      site: { landHa: 400, gasGridKm: 1 },
    },
  },

  // ---------------- POSSIBLE: economics depend on conditions (gate fee, price, seasonality, robustness) ----------------
  {
    id: "de_meat", title: "German meat processor, 17.5 kt residues", description: "Slaughter residues + DAF fat; high power and gas prices, disposal costs avoided",
    input: {
      countryCode: "DE", regionId: "niedersachsen", businessType: "slaughterhouse",
      feedstocks: [
        { id: "a", type: "slaughter_residues", quantity: 15000, dryMatterPct: 18, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 55 },
        { id: "b", type: "grease_trap_fat", quantity: 2500, dryMatterPct: 15, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 70 },
      ],
      energy: { electricityKwhYear: 14000000, heatNeed: "year_round_process", gasM3Year: 2400000, hasGridConnection: true },
      site: { landHa: 300, gasGridKm: 2 },
    },
  },
  {
    id: "gb_food", title: "UK food-waste AD, 50 kt", description: "Merchant plant: commercial food waste with gate fees, biomethane to the grid",
    input: {
      countryCode: "GB", regionId: "midlands", businessType: "municipal_biowaste",
      feedstocks: [{ id: "a", type: "food_waste", quantity: 50000, dryMatterPct: 24, monthsActive: 12, startMonth: 1, delivered: true, distanceKm: 25, purchasePricePerTonneLocal: -30, handling: "other" }],
      energy: { electricityKwhYear: 1500000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 2000, gasGridKm: 1 },
    },
  },
  {
    id: "ua_sugar", title: "Sugar factory, 90 kt pressed beet pulp", description: "Ensiled pulp digested all year; power and heat replace grid electricity and factory gas",
    input: {
      ...base, regionId: "vinnytsia", businessType: "sugar_beet_factory",
      feedstocks: [{ id: "a", type: "sugar_beet_pulp_pressed", quantity: 90000, dryMatterPct: 23, monthsActive: 12, startMonth: 1, handling: "sold_as_feed", opportunityValuePerTonneLocal: 200 }],
      energy: { electricityKwhYear: 20000000, electricityPriceLocalPerKwh: 8.6, heatNeed: "seasonal_buildings", gasM3Year: 9000000, gasPriceLocalPerM3: 22, hasGridConnection: true },
      site: { landHa: 8000, gasGridKm: 1 },
    },
  },
  {
    id: "dairy_processor",
    title: "Молокозавод, 15 000 т сироватки на рік",
    description: "Сироватка + жиро-осад, постійна потреба в парі/гарячій воді",
    input: {
      ...base, regionId: "lviv", businessType: "dairy_processor",
      feedstocks: [
        { id: "a", type: "dairy_whey", quantity: 15000, dryMatterPct: 5.5, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 600 },
        { id: "b", type: "dairy_fat_sludge", quantity: 1200, dryMatterPct: 15, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 1200 },
      ],
      energy: { electricityKwhYear: 5000000, electricityPriceLocalPerKwh: 8.8, heatNeed: "year_round_process", gasM3Year: 1800000, gasPriceLocalPerM3: 21, hasGridConnection: true },
      site: { landHa: 450, gasGridKm: 0.5, neighboursWithin300m: false },
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
    id: "it_food_30k", title: "Italian cannery, seasonal vegetable residues", description: "Emilia-Romagna: tomato-season residues plus a smaller continuous vegetable line; no year-round supply assumption for the tomato stream.",
    input: {
      countryCode: "IT", regionId: "emilia", businessType: "fruit_veg_processor",
      feedstocks: [
        { id: "tomato-campaign", type: "fruit_veg_residues", quantity: 18000, dryMatterPct: 12, monthsActive: 4, startMonth: 7, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 12 },
        { id: "vegetable-line", type: "fruit_veg_residues", quantity: 5000, dryMatterPct: 8, monthsActive: 12, startMonth: 1, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 8 },
      ],
      energy: { electricityKwhYear: 3800000, heatNeed: "year_round_process", gasM3Year: 1100000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 1.5, neighboursWithin300m: true },
    },
  },
  {
    id: "br_food_40k", title: "Brazilian poultry processor, residues and grease", description: "Southern Brazil: segregated non-saleable residues, daily collection and energy for cooling and sanitation.",
    input: {
      countryCode: "BR", regionId: "santa-catarina", businessType: "slaughterhouse",
      feedstocks: [
        { id: "non-saleable-residues", type: "slaughter_residues", quantity: 6000, dryMatterPct: 18, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 150 },
        { id: "grease", type: "grease_trap_fat", quantity: 1000, dryMatterPct: 12, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 200 },
      ],
      energy: { electricityKwhYear: 8000000, heatNeed: "year_round_process", gasM3Year: 1500000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 7, neighboursWithin300m: false },
    },
  },

  // ---------------- WEAK: a real feed exists, but the economics do not close without a stronger lever ----------------
  {
    id: "de_food_30k", title: "German regional brewery, 7 kt spent grain", description: "Spent grain has a feed market; diverting it has an opportunity cost. Steam and hot water are used at the brewery.",
    input: {
      countryCode: "DE", regionId: "niedersachsen", businessType: "brewery",
      feedstocks: [{ id: "spent-grain", type: "brewery_spent_grain", quantity: 7000, monthsActive: 12, handling: "sold_as_feed", opportunityValuePerTonneLocal: 38 }],
      energy: { electricityKwhYear: 3200000, heatNeed: "year_round_process", gasM3Year: 1100000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 0.4, neighboursWithin300m: true },
    },
  },
  {
    id: "es_food_35k", title: "Spanish pig farm, 12 000 finishing places and 1 800 sows", description: "Catalonia: own slurry only, nursery heating, existing storage and a long gas-grid connection.",
    input: {
      countryCode: "ES", regionId: "cataluna", businessType: "pig_farm",
      feedstocks: [{ id: "finishers", animal: "pig_finisher", quantity: 12000 }, { id: "sows", animal: "sow", quantity: 1800 }],
      energy: { electricityKwhYear: 1600000, heatNeed: "year_round_process", heatKwhYear: 2400000, hasGridConnection: true },
      site: { landHa: 1800, existingStorageM3: 8000, gasGridKm: 12, neighboursWithin300m: true },
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

  // ---------------- NOT RECOMMENDED: too small for a stand-alone plant; screening prevents an unsuitable investment ----------------
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
    id: "pl_cows_60", title: "Polish family dairy, 60 cows", description: "Seasonal housing; manure only; no heat customer",
    input: {
      countryCode: "PL", regionId: "wielkopolskie", businessType: "cattle_farm",
      feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 60, housing: "seasonal" }],
      energy: { electricityKwhYear: 60000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 90 },
    },
  },
  {
    id: "gb_farm_60", title: "English dairy, 60 cows", description: "Year-round housing; manure only; no year-round heat demand",
    input: {
      countryCode: "GB", regionId: "south-west", businessType: "cattle_farm",
      feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 60, housing: "year_round" }],
      energy: { electricityKwhYear: 60000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 100 },
    },
  },
  {
    id: "ro_pigs_300", title: "Romanian family pig unit, 300 places", description: "Finishing unit; manure only; seasonal heating",
    input: {
      countryCode: "RO", regionId: "transilvania", businessType: "pig_farm",
      feedstocks: [{ id: "a", animal: "pig_finisher", quantity: 300 }],
      energy: { electricityKwhYear: 15000, heatNeed: "seasonal_buildings", heatKwhYear: 20000, hasGridConnection: true },
      site: { landHa: 30 },
    },
  },
  {
    id: "kz_cows_150", title: "Kazakh dairy farm, 150 cows", description: "Akmola: seasonal grazing and housing; manure only",
    input: {
      countryCode: "KZ", regionId: "akmola", businessType: "cattle_farm",
      feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 150, housing: "seasonal" }],
      energy: { electricityKwhYear: 80000, electricityPriceLocalPerKwh: 31.85, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 300 },
    },
  },
  {
    id: "tr_cows_100", title: "Turkish dairy farm, 100 cows", description: "Konya: housed herd, manure only; no heat customer",
    input: {
      countryCode: "TR", regionId: "konya", businessType: "cattle_farm",
      feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 100, housing: "year_round" }],
      energy: { electricityKwhYear: 90000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 120 },
    },
  },

  // ---------------- INSUFFICIENT DATA: the first inquiry lacks what the verdict needs ----------------
  {
    id: "in_food_40k", title: "Indian biogas cooperative, cattle dung and press mud", description: "Punjab: short-haul purchased dung, seasonal sugar press mud and contracted digestate land; no guaranteed CBG premium.",
    input: {
      countryCode: "IN", regionId: "punjab", businessType: "biogas_developer",
      feedstocks: [
        { id: "collected-dung", type: "cattle_solid_manure", quantity: 15000, dryMatterPct: 16, monthsActive: 12, delivered: true, distanceKm: 5, purchasePricePerTonneLocal: 200, handling: "field_spreading" },
        { id: "sugar-filter-cake", type: "press_mud", quantity: 8000, dryMatterPct: 25, monthsActive: 5, startMonth: 11, delivered: true, distanceKm: 18, purchasePricePerTonneLocal: 600, handling: "field_spreading" },
      ],
      energy: { electricityKwhYear: 350000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 400, gasGridKm: 8, neighboursWithin300m: true },
    },
  },
  {
    id: "br_vinasse", title: "Brazilian ethanol mill, vinasse", description: "Sugar-ethanol mill in São Paulo: vinasse + press mud during the harvest",
    input: {
      countryCode: "BR", regionId: "sao-paulo", businessType: "sugar_ethanol",
      feedstocks: [{ id: "a", type: "vinasse", quantity: 400000, monthsActive: 8, startMonth: 4, handling: "field_spreading" }, { id: "b", type: "press_mud", quantity: 40000, monthsActive: 8, startMonth: 4, handling: "field_spreading" }],
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
];

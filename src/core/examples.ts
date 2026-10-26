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
  // Stable IDs retain existing sample links. Each is now a separate operating scenario;
  // assumptions and industry references are documented in content/sample-cases.ts.
  {
    id: "de_food_30k", title: "German regional brewery, 7 kt spent grain",
    description: "Spent grain has a feed market; diverting it has an opportunity cost. Steam and hot water are used at the brewery.",
    input: {
      countryCode: "DE", regionId: "niedersachsen", businessType: "brewery",
      feedstocks: [{ id: "spent-grain", type: "brewery_spent_grain", quantity: 7000, monthsActive: 12, handling: "sold_as_feed", opportunityValuePerTonneLocal: 38 }],
      energy: { electricityKwhYear: 3200000, heatNeed: "year_round_process", gasM3Year: 1100000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 0.4, neighboursWithin300m: true },
    },
  },
  {
    id: "it_food_30k", title: "Italian cannery, seasonal vegetable residues",
    description: "Emilia-Romagna: tomato-season residues plus a smaller continuous vegetable line; no year-round supply assumption for the tomato stream.",
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
    id: "fr_food_35k", title: "Breton dairy cooperative, whey and flotation sludge",
    description: "Only low-value whey rejected by feed buyers enters the model; ordinary saleable whey is excluded.",
    input: {
      countryCode: "FR", regionId: "bretagne", businessType: "dairy_processor",
      feedstocks: [
        { id: "off-spec-whey", type: "dairy_whey", quantity: 45000, dryMatterPct: 5.5, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 6 },
        { id: "dairy-daf", type: "dairy_fat_sludge", quantity: 1500, dryMatterPct: 15, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 55 },
      ],
      energy: { electricityKwhYear: 5500000, heatNeed: "year_round_process", gasM3Year: 850000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 0.6, neighboursWithin300m: true },
    },
  },
  {
    id: "nl_food_30k", title: "Dutch potato processor, peel and wet pulp",
    description: "Separate peel and thin-pulp streams, with lost feed sales and no assumed land for digestate spreading.",
    input: {
      countryCode: "NL", regionId: "brabant", businessType: "potato_processor",
      feedstocks: [
        { id: "peelings", type: "potato_processing", quantity: 18000, dryMatterPct: 16, monthsActive: 12, handling: "sold_as_feed", opportunityValuePerTonneLocal: 28 },
        { id: "thin-pulp", type: "potato_processing", quantity: 8000, dryMatterPct: 8, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 7 },
      ],
      energy: { electricityKwhYear: 8000000, heatNeed: "year_round_process", gasM3Year: 1800000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 0.3, neighboursWithin300m: true },
    },
  },
  {
    id: "pl_food_30k", title: "Polish sugar factory, ensiled beet pulp",
    description: "Year-round feeding from existing silage clamps; the pulp's feed-sale value remains a cost.",
    input: {
      countryCode: "PL", regionId: "wielkopolskie", businessType: "sugar_beet_factory",
      feedstocks: [{ id: "ensiled-pulp", type: "sugar_beet_pulp_pressed", quantity: 100000, dryMatterPct: 23, monthsActive: 12, handling: "sold_as_feed", opportunityValuePerTonneLocal: 160 }],
      energy: { electricityKwhYear: 8000000, heatNeed: "year_round_process", gasM3Year: 2400000, hasGridConnection: true },
      site: { landHa: 700, gasGridKm: 1.2, neighboursWithin300m: false },
    },
  },
  {
    id: "gb_food_onsite", title: "English grain distillery, 30 kt stillage",
    description: "Wet stillage is currently sold as feed. Biogas would offset process steam without an assumed waste gate fee.",
    input: {
      countryCode: "GB", regionId: "east-anglia", businessType: "distillery",
      feedstocks: [{ id: "wet-stillage", type: "grain_stillage", quantity: 30000, dryMatterPct: 8, monthsActive: 12, handling: "sold_as_feed", opportunityValuePerTonneLocal: 14 }],
      energy: { electricityKwhYear: 2700000, heatNeed: "year_round_process", gasM3Year: 2000000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 0.2, neighboursWithin300m: true },
    },
  },
  {
    id: "es_food_35k", title: "Spanish pig farm, 12 000 finishing places and 1 800 sows",
    description: "Catalonia: own slurry only, nursery heating, existing storage and a long gas-grid connection.",
    input: {
      countryCode: "ES", regionId: "cataluna", businessType: "pig_farm",
      feedstocks: [{ id: "finishers", animal: "pig_finisher", quantity: 12000 }, { id: "sows", animal: "sow", quantity: 1800 }],
      energy: { electricityKwhYear: 1600000, heatNeed: "year_round_process", heatKwhYear: 2400000, hasGridConnection: true },
      site: { landHa: 1800, existingStorageM3: 8000, gasGridKm: 12, neighboursWithin300m: true },
    },
  },
  {
    id: "br_food_40k", title: "Brazilian poultry processor, residues and grease",
    description: "Southern Brazil: segregated non-saleable residues, daily collection and energy for cooling and sanitation.",
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
  {
    id: "us_food_40k", title: "US wastewater works, sludge and collected grease",
    description: "Wisconsin: wet sludge treatment with limited grease co-digestion; no credit for eliminating all sludge disposal.",
    input: {
      countryCode: "US", regionId: "wisconsin", businessType: "wastewater_treatment",
      feedstocks: [
        { id: "thickened-sludge", type: "sewage_sludge", quantity: 70000, dryMatterPct: 4.5, monthsActive: 12, handling: "other" },
        { id: "collected-fog", type: "grease_trap_fat", quantity: 2500, dryMatterPct: 18, monthsActive: 12, delivered: true, distanceKm: 8, purchasePricePerTonneLocal: -35, handling: "other" },
      ],
      energy: { electricityKwhYear: 6500000, heatNeed: "year_round_process", heatKwhYear: 900000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 4, neighboursWithin300m: false },
    },
  },
  {
    id: "in_food_40k", title: "Indian biogas cooperative, cattle dung and press mud",
    description: "Punjab: short-haul purchased dung, seasonal sugar press mud and contracted digestate land; no guaranteed CBG premium.",
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
  // ---------------- strong-economics archetypes (large, steady, paid-for waste + on-site energy use) ----------------
  {
    id: "ua_sugar", title: "Sugar factory, 90 kt pressed beet pulp", description: "Ensiled pulp digested all year; power and heat replace grid electricity and factory gas",
    input: {
      ...base, regionId: "vinnytsia", businessType: "sugar_beet_factory",
      feedstocks: [{ id: "a", type: "sugar_beet_pulp_pressed", quantity: 90000, handling: "sold_as_feed", opportunityValuePerTonneLocal: 200 }],
      energy: { electricityKwhYear: 20000000, electricityPriceLocalPerKwh: 8.6, heatNeed: "seasonal_buildings", gasM3Year: 9000000, gasPriceLocalPerM3: 22, hasGridConnection: true },
      site: { landHa: 8000, gasGridKm: 1 },
    },
  },
  {
    id: "de_meat", title: "German meat processor, 17.5 kt residues", description: "Slaughter residues + DAF fat; high power and gas prices, disposal costs avoided",
    input: {
      countryCode: "DE", regionId: "niedersachsen", businessType: "slaughterhouse",
      feedstocks: [
        { id: "a", type: "slaughter_residues", quantity: 15000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 55 },
        { id: "b", type: "dairy_fat_sludge", quantity: 2500, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 70 },
      ],
      energy: { electricityKwhYear: 14000000, heatNeed: "year_round_process", gasM3Year: 2400000, hasGridConnection: true },
      site: { landHa: 300, gasGridKm: 2 },
    },
  },
  {
    id: "it_whey", title: "Italian cheese dairy, 40 kt whey", description: "Whey and fat sludge with paid disposal; steam and power used around the clock",
    input: {
      countryCode: "IT", regionId: "lombardia", businessType: "dairy_processor",
      feedstocks: [
        { id: "a", type: "dairy_whey", quantity: 40000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 12 },
        { id: "b", type: "dairy_fat_sludge", quantity: 3000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 60 },
      ],
      energy: { electricityKwhYear: 9000000, heatNeed: "year_round_process", gasM3Year: 1800000, hasGridConnection: true },
      site: { landHa: 200, gasGridKm: 1 },
    },
  },
  {
    id: "pl_poultry_proc", title: "Polish poultry processor, 14 kt residues", description: "Poultry slaughter residues + DAF fat, Category 3 pasteurisation, power for cooling",
    input: {
      countryCode: "PL", regionId: "wielkopolskie", businessType: "slaughterhouse",
      feedstocks: [
        { id: "a", type: "slaughter_residues", quantity: 12000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 250 },
        { id: "b", type: "dairy_fat_sludge", quantity: 2000, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 300 },
      ],
      energy: { electricityKwhYear: 18000000, heatNeed: "year_round_process", gasM3Year: 2000000, hasGridConnection: true },
      site: { landHa: 400, gasGridKm: 3 },
    },
  },
  {
    id: "gb_food", title: "UK food-waste AD, 50 kt", description: "Merchant plant: commercial food waste with gate fees, biomethane to the grid",
    input: {
      countryCode: "GB", regionId: "midlands", businessType: "municipal_biowaste",
      feedstocks: [{ id: "a", type: "food_waste", quantity: 50000, delivered: true, distanceKm: 25, purchasePricePerTonneLocal: -30, handling: "paid_disposal" }],
      energy: { electricityKwhYear: 1500000, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 2000, gasGridKm: 1 },
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

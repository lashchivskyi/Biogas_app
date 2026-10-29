import type { ProjectInput } from "./types";

/**
 * Reference customers used by tests and the demo buttons in the calculator.
 * One case per distinct business model (feedstock, process, scale or way of earning money), each placed in the market where
 * that model is characteristic. Anonymised archetypes sized like real plants of the type, not named companies.
 * Verdicts are whatever the model returns; the set is curated for coverage and realism, not for a verdict mix.
 */
export interface ExampleCase {
  id: string;
  title: string;
  description: string;
  input: ProjectInput;
  /** A reference is evidence for listed observations only, not for the entire modelled project. */
  reference?: {
    title: string; url: string; period: string; geography: string; checkedOn: string;
    stage: "operating_reference" | "historical_reference" | "research";
    observations: { label: string; value: number; unit: string; inputPath?: string; qualifier: "reported" | "capacity" | "derived"; basis?: string }[];
  };
}

const base = {
  countryCode: "UA",
  site: {} as ProjectInput["site"],
};

export const EXAMPLES: ExampleCase[] = [
  // ---------------- Strong: high-value residues or gate fees and a year-round energy use ----------------
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
    id: "pl_poultry", title: "Polish poultry processor, 14 kt residues", description: "Wielkopolska: category 3 residues and DAF fat with paid disposal; CHP covers cooling and process heat all year",
    input: {
      countryCode: "PL", regionId: "wielkopolskie", businessType: "slaughterhouse",
      feedstocks: [
        { id: "residues", type: "slaughter_residues", quantity: 12000, dryMatterPct: 18, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 250 },
        { id: "daf-fat", type: "grease_trap_fat", quantity: 2000, dryMatterPct: 15, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 300 },
      ],
      energy: { electricityKwhYear: 18000000, electricityPriceLocalPerKwh: 0.85, heatNeed: "year_round_process", gasM3Year: 2000000, hasGridConnection: true },
      site: { landHa: 400, gasGridKm: 3 },
    },
  },
  {
    id: "pl_frozen_veg", title: "Polish frozen-vegetable plant, 25 kt seasonal residues", description: "Mazovia: trimmings and rejects from a June–November freezing campaign, paid disposal; cold stores run all year",
    input: {
      countryCode: "PL", regionId: "mazowieckie", businessType: "fruit_veg_processor",
      feedstocks: [{ id: "trimmings", type: "fruit_veg_residues", quantity: 25000, dryMatterPct: 12, monthsActive: 6, startMonth: 6, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 120 }],
      energy: { electricityKwhYear: 15000000, electricityPriceLocalPerKwh: 0.85, heatNeed: "year_round_process", gasM3Year: 1500000, hasGridConnection: true },
      site: { landHa: 300, gasGridKm: 2 },
    },
  },
  {
    id: "es_wholesale_market", title: "Barcelona-type wholesale food market, 12 kt organic waste", description: "The market company digests unsold produce and organic waste on site instead of paying for off-site treatment; power for cold stores",
    input: {
      countryCode: "ES", regionId: "cataluna", businessType: "food_business",
      feedstocks: [{ id: "market-organics", type: "food_waste", quantity: 12000, dryMatterPct: 14, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 55 }],
      energy: { electricityKwhYear: 9000000, electricityPriceLocalPerKwh: 0.133, heatNeed: "year_round_process", heatKwhYear: 2500000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 0.5, neighboursWithin300m: true },
    },
  },
  {
    id: "gb_food", title: "UK food-waste AD, 50 kt", description: "Merchant plant: commercial food waste with gate fees, biomethane to the grid",
    input: {
      countryCode: "GB", regionId: "midlands", businessType: "municipal_biowaste",
      feedstocks: [{ id: "a", type: "food_waste", quantity: 50000, dryMatterPct: 24, monthsActive: 12, startMonth: 1, delivered: true, distanceKm: 25, purchasePricePerTonneLocal: -30, handling: "other" }],
      energy: { electricityKwhYear: 1500000, electricityPriceLocalPerKwh: 0.245, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 2000, gasGridKm: 1 },
    },
  },
  {
    id: "it_forsu", title: "Italian FORSU plant, 40 kt municipal organic waste", description: "Lazio: municipal organic fraction under a long contract with a high gate fee; CHP power exported",
    input: {
      countryCode: "IT", regionId: "lazio", businessType: "municipal_biowaste",
      feedstocks: [{ id: "forsu", type: "municipal_biowaste", quantity: 40000, dryMatterPct: 28, monthsActive: 12, delivered: true, distanceKm: 30, purchasePricePerTonneLocal: -110, handling: "other" }],
      energy: { electricityKwhYear: 1800000, electricityPriceLocalPerKwh: 0.22, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 1200, gasGridKm: 1 },
    },
  },
  // ---------------- Possible: the answer depends on prices, contracts or the conservative case ----------------
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
    id: "ua_sugar", title: "Sugar factory, 90 kt pressed beet pulp", description: "Ensiled pulp digested all year; power and heat replace grid electricity and factory gas",
    input: {
      ...base, regionId: "vinnytsia", businessType: "sugar_beet_factory",
      feedstocks: [{ id: "a", type: "sugar_beet_pulp_pressed", quantity: 90000, dryMatterPct: 23, monthsActive: 12, startMonth: 1, handling: "sold_as_feed", opportunityValuePerTonneLocal: 200 }],
      energy: { electricityKwhYear: 20000000, electricityPriceLocalPerKwh: 8.6, heatNeed: "seasonal_buildings", gasM3Year: 9000000, gasPriceLocalPerM3: 22, hasGridConnection: true },
      site: { landHa: 8000, gasGridKm: 1 },
    },
  },
  {
    id: "de_starch", title: "German potato-starch factory, 80 kt pulp", description: "Lower Saxony: potato pulp from an August–January campaign has only a low feed value; starch drying uses large amounts of steam",
    input: {
      countryCode: "DE", regionId: "niedersachsen", businessType: "potato_processor",
      feedstocks: [{ id: "pulp", type: "potato_processing", quantity: 80000, dryMatterPct: 13, monthsActive: 6, startMonth: 8, handling: "sold_as_feed", opportunityValuePerTonneLocal: 5 }],
      energy: { electricityKwhYear: 30000000, electricityPriceLocalPerKwh: 0.21, heatNeed: "year_round_process", gasM3Year: 10000000, hasGridConnection: true },
      site: { landHa: 3000, gasGridKm: 1 },
    },
  },
  {
    id: "gb_whisky", title: "Scotch malt distillery, pot ale to steam", description: "Speyside: pot ale and spent lees digested on site; biogas replaces part of the gas for distillation steam; draff stays a cattle-feed sale",
    input: {
      countryCode: "GB", regionId: "scotland", businessType: "distillery",
      feedstocks: [{ id: "pot-ale", type: "grain_stillage", quantity: 35000, dryMatterPct: 4.5, monthsActive: 11, startMonth: 9, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 6 }],
      energy: { electricityKwhYear: 2500000, electricityPriceLocalPerKwh: 0.245, heatNeed: "year_round_process", gasM3Year: 3500000, hasGridConnection: true },
      site: { landHa: 0, gasGridKm: 3, neighboursWithin300m: false },
    },
  },
  {
    id: "es_olive", title: "Andalusian olive-pomace plant, biomethane", description: "Córdoba: two-phase pomace (alperujo) from cooperative mills, stored in ponds and digested year-round; biomethane injected into the grid",
    input: {
      countryCode: "ES", regionId: "andalucia", businessType: "olive_oil_mill",
      feedstocks: [{ id: "alperujo", type: "olive_pomace", quantity: 120000, dryMatterPct: 30, monthsActive: 12, delivered: true, distanceKm: 25, purchasePricePerTonneLocal: 0, handling: "other" }],
      energy: { electricityKwhYear: 1500000, electricityPriceLocalPerKwh: 0.133, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 2500, gasGridKm: 3 },
    },
  },
  {
    id: "se_biowaste_fuel", title: "Swedish municipal biowaste to vehicle fuel", description: "Uppsala-type plant: separately collected food waste with a treatment fee; biogas upgraded and sold as bio-CNG for buses and refuse trucks",
    input: {
      countryCode: "SE", regionId: "uppsala", businessType: "municipal_biowaste",
      feedstocks: [{ id: "a", type: "municipal_biowaste", quantity: 30000, dryMatterPct: 28, monthsActive: 12, delivered: true, distanceKm: 20, purchasePricePerTonneLocal: -500, handling: "other" }],
      energy: { electricityKwhYear: 1200000, electricityPriceLocalPerKwh: 1.2, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 800, gasGridKm: 15 },
    },
  },
  {
    id: "dk_cluster", title: "Danish centralised plant, slurry + food waste, biomethane", description: "Jutland: a developer collects slurry from partner farms and food waste with a gate fee; biomethane to the gas grid, digestate returned to the farms",
    input: {
      countryCode: "DK", regionId: "jutland", businessType: "central_biogas_plant", projectRole: "developer",
      feedstocks: [
        { id: "a", animal: "dairy_cow", quantity: 6000, housing: "year_round", delivered: true, distanceKm: 8, purchasePricePerTonneLocal: 0, handling: "field_spreading" },
        { id: "b", animal: "sow", quantity: 3000, delivered: true, distanceKm: 10, purchasePricePerTonneLocal: 0, handling: "field_spreading" },
        { id: "c", type: "food_waste", quantity: 30000, dryMatterPct: 24, monthsActive: 12, delivered: true, distanceKm: 30, purchasePricePerTonneLocal: -220, handling: "other" },
      ],
      energy: { electricityKwhYear: 1500000, electricityPriceLocalPerKwh: 0.97, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 6000, gasGridKm: 2 },
    },
  },
  {
    id: "th_pome", title: "Thai palm-oil mill, POME", description: "POME in a covered lagoon, power for the mill",
    input: {
      countryCode: "TH", regionId: "south", businessType: "palm_oil_mill",
      feedstocks: [{ id: "a", type: "pome", quantity: 250000 }],
      energy: { electricityKwhYear: 4000000, electricityPriceLocalPerKwh: 3.95, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 3000 },
    },
  },
  {
    id: "mx_pig_lagoon", title: "Yucatán pig integrator, covered lagoon + genset", description: "25 000 finishing places and 2 500 sows; an unheated covered lagoon feeds generators that replace CFE power",
    input: {
      countryCode: "MX", regionId: "yucatan", businessType: "pig_farm",
      feedstocks: [{ id: "finishers", animal: "pig_finisher", quantity: 25000 }, { id: "sows", animal: "sow", quantity: 2500 }],
      energy: { electricityKwhYear: 3000000, electricityPriceLocalPerKwh: 2.4, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 200 },
    },
  },
  // ---------------- Weak: a real feedstock, but the economics do not close without support or a stronger lever ----------------
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
    id: "ro_pig_complex", title: "Romanian pig complex, 30 000 places", description: "Timiș: large integrated pig unit with own land; slurry digested in heated tanks, heat for farrowing houses",
    input: {
      countryCode: "RO", regionId: "timis", businessType: "pig_farm",
      feedstocks: [{ id: "finishers", animal: "pig_finisher", quantity: 30000 }, { id: "sows", animal: "sow", quantity: 3000 }],
      energy: { electricityKwhYear: 4000000, electricityPriceLocalPerKwh: 0.94, heatNeed: "seasonal_buildings", heatKwhYear: 3000000, hasGridConnection: true },
      site: { landHa: 3000, gasGridKm: 5 },
    },
  },
  {
    id: "de_nawaro", title: "German farm plant, maize silage + slurry, heat to a village network", description: "Lower Saxony NawaRo-type plant: purchased maize silage co-digested with own cattle slurry; power exported, CHP heat sold to a local heat network",
    input: {
      countryCode: "DE", regionId: "niedersachsen", businessType: "crop_farm",
      feedstocks: [
        { id: "a", type: "maize_silage", quantity: 9000, dryMatterPct: 33, monthsActive: 12, delivered: true, distanceKm: 4, purchasePricePerTonneLocal: 42, handling: "other" },
        { id: "b", animal: "dairy_cow", quantity: 250, housing: "year_round" },
      ],
      energy: { electricityKwhYear: 250000, electricityPriceLocalPerKwh: 0.22, heatNeed: "year_round_process", heatKwhYear: 1800000, hasGridConnection: true },
      site: { landHa: 450, existingStorageM3: 4000, gasGridKm: 6 },
    },
  },
  {
    id: "fr_farm_injection", title: "French farm méthanisation, injection into the gas grid", description: "Pays de la Loire: a livestock farm co-digests manure with intermediate-crop silage and injects biomethane under a purchase tariff",
    input: {
      countryCode: "FR", regionId: "pays-de-la-loire", businessType: "cattle_farm",
      feedstocks: [
        { id: "a", animal: "dairy_cow", quantity: 220, housing: "year_round" },
        { id: "b", animal: "cattle_other", quantity: 180, housing: "year_round" },
        { id: "c", type: "maize_silage", quantity: 4500, dryMatterPct: 30, monthsActive: 12, delivered: true, distanceKm: 3, purchasePricePerTonneLocal: 35, handling: "other" },
      ],
      energy: { electricityKwhYear: 180000, electricityPriceLocalPerKwh: 0.155, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 380, existingStorageM3: 3000, gasGridKm: 2 },
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
    id: "ca_ontario", title: "Ontario dairy with off-farm organics", description: "400 cows co-digesting trucked-in FOG and food-processing residues for tipping fees (≤ 50 % off-farm by rule); no feed-in tariff",
    input: {
      countryCode: "CA", regionId: "ontario", businessType: "dairy_farm",
      feedstocks: [
        { id: "cows", animal: "dairy_cow", quantity: 400, housing: "year_round" },
        { id: "fog", type: "grease_trap_fat", quantity: 3000, dryMatterPct: 15, monthsActive: 12, delivered: true, distanceKm: 60, purchasePricePerTonneLocal: -50, handling: "other" },
        { id: "food-processing", type: "fruit_veg_residues", quantity: 6000, dryMatterPct: 12, monthsActive: 12, delivered: true, distanceKm: 40, purchasePricePerTonneLocal: -25, handling: "other" },
      ],
      energy: { electricityKwhYear: 600000, electricityPriceLocalPerKwh: 0.17, heatNeed: "year_round_process", heatKwhYear: 400000, hasGridConnection: true },
      site: { landHa: 500, existingStorageM3: 8000, gasGridKm: 5 },
    },
  },
  // ---------------- Not recommended at this scale: the inquiry is real, the volume is too small for an own plant ----------------
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
    id: "gr_feta_small", title: "Greek feta dairy, 1.5 kt whey", description: "Thessaly: a family cheese dairy paying to dispose of sheep and goat whey; asks whether its own digester pays",
    input: {
      countryCode: "GR", regionId: "thessaly", businessType: "dairy_processor",
      feedstocks: [{ id: "whey", type: "dairy_whey", quantity: 1500, dryMatterPct: 6, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 15 }],
      energy: { electricityKwhYear: 400000, electricityPriceLocalPerKwh: 0.17, heatNeed: "year_round_process", gasM3Year: 60000, hasGridConnection: true },
      site: { landHa: 20 },
    },
  },
  {
    id: "md_winery", title: "Moldovan winery, 400 t grape marc", description: "Cahul: a mid-size winery with a September–October pomace peak that is landfilled today",
    input: {
      countryCode: "MD", regionId: "cahul", businessType: "fruit_veg_processor",
      feedstocks: [{ id: "marc", type: "fruit_veg_residues", quantity: 400, dryMatterPct: 35, monthsActive: 2, startMonth: 9, handling: "field_spreading" }],
      energy: { electricityKwhYear: 250000, electricityPriceLocalPerKwh: 3.0, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 120 },
    },
  },
  {
    id: "nl_greenhouse", title: "Dutch tomato greenhouse, crop clearance residues", description: "A greenhouse grower with a winter crop change pays to remove plant residues and wants heat for the glasshouse",
    input: {
      countryCode: "NL", regionId: "brabant", businessType: "fruit_veg_processor",
      feedstocks: [{ id: "haulm", type: "fruit_veg_residues", quantity: 600, dryMatterPct: 12, monthsActive: 3, startMonth: 11, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 30 }],
      energy: { electricityKwhYear: 900000, electricityPriceLocalPerKwh: 0.2, heatNeed: "greenhouse", gasM3Year: 300000, hasGridConnection: true },
      site: { landHa: 0 },
    },
  },
  {
    id: "lv_town_small", title: "Latvian small town, 600 t separately collected biowaste", description: "Latgale: a municipality starting separate biowaste collection (mandatory in the EU since 2024) asks about its own digester",
    input: {
      countryCode: "LV", regionId: "latgale", businessType: "municipal_biowaste",
      feedstocks: [{ id: "biowaste", type: "municipal_biowaste", quantity: 600, dryMatterPct: 30, monthsActive: 12, delivered: true, distanceKm: 10, purchasePricePerTonneLocal: -40, handling: "other" }],
      energy: { electricityKwhYear: 40000, electricityPriceLocalPerKwh: 0.14, heatNeed: "none", hasGridConnection: true },
      site: { landHa: 30 },
    },
  },
  {
    id: "cz_craft_brewery", title: "Czech craft brewery, 300 t spent grain", description: "South Moravia: a minibrewery whose spent grain already goes to local farmers as feed",
    input: {
      countryCode: "CZ", regionId: "jihomoravsky", businessType: "brewery",
      feedstocks: [{ id: "spent-grain", type: "brewery_spent_grain", quantity: 300, monthsActive: 12, handling: "sold_as_feed", opportunityValuePerTonneLocal: 400 }],
      energy: { electricityKwhYear: 150000, electricityPriceLocalPerKwh: 4.3, heatNeed: "year_round_process", gasM3Year: 40000, hasGridConnection: true },
      site: { landHa: 0 },
    },
  },
  // ---------------- Insufficient data: a first inquiry before bills, land and laboratory data are known ----------------
  {
    id: "in_food_40k", title: "Indian biogas cooperative, cattle dung and press mud", description: "Punjab: short-haul purchased dung, seasonal sugar press mud and contracted digestate land; no guaranteed CBG premium.",
    input: {
      countryCode: "IN", regionId: "punjab", businessType: "central_biogas_plant", projectRole: "developer",
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
    id: "ar_feedlot", title: "Argentine feedlot, first inquiry", description: "Córdoba: a 4 000-head feedlot asks about biogas from pen manure; price, land and laboratory data are not yet known",
    input: {
      countryCode: "AR", regionId: "cordoba", businessType: "cattle_farm",
      feedstocks: [{ id: "pen-manure", type: "cattle_solid_manure", quantity: 45000, monthsActive: 12, handling: "field_spreading" }],
      energy: { electricityKwhYear: 900000, heatNeed: "none", hasGridConnection: true },
      site: {},
    },
  },
  // Model demonstrations, not disclosed accounts or quotations from the reference operators.
  {
    id: "ca_brewery_cod", title: "Canadian brewery wastewater", description: "COD treatment with energy recovery; technical scale informed by Sleeman, budgets illustrative",
    input: { countryCode: "CA", regionId: "ontario", businessType: "brewery", feedstocks: [],
      process: { basisOrigin: "ENGINEERING_ASSUMPTION", basisDate: "2026-10-28", basisReference: "Illustrative project assumptions, not an operator account or supplier quotation", kind: "wastewater", operatingDays: 330, monthsActive: 12, startMonth: 1, processCapexLocal: 3800000, processOpexLocalYear: 150000, residualCostLocalT: 45, auxiliaryKwhYear: 180000, auxiliaryHeatKwhYear: 0, uncertaintyPct: 30,
        flowM3Day: 1800, codMgL: 4600, removalPct: 82, methanePct: 65, methaneRecoveryPct: 95, biomassCodPct: 8, sludgeTsPct: 5, sludgeVsPct: 80, hrtDays: 0.25, olr: 19.8, inletTempC: 25, heatRecoveryPct: 60, avoidedTreatmentLocalM3: 0.65 },
      energy: { electricityKwhYear: 5000000, heatNeed: "year_round_process", heatKwhYear: 8000000, hasGridConnection: true }, site: { gasGridKm: 1 } },
  },
  {
    id: "us_closed_landfill", title: "Closed US municipal landfill", description: "Twenty annual waste cohorts; declining gas with no RIN or LCFS credits assumed",
    input: { countryCode: "US", regionId: "wisconsin", businessType: "landfill_operator", feedstocks: [],
      process: { basisOrigin: "ENGINEERING_ASSUMPTION", basisDate: "2026-10-28", basisReference: "Illustrative project assumptions, not an operator account or supplier quotation", kind: "landfill", operatingDays: 350, monthsActive: 12, startMonth: 1, processCapexLocal: 2500000, processOpexLocalYear: 220000, residualCostLocalT: 0, auxiliaryKwhYear: 250000, auxiliaryHeatKwhYear: 0, uncertaintyPct: 35,
        annualWasteTonnes: 100000, depositionYears: 20, yearsSinceClosure: 3, decayPerYear: 0.05, potentialNm3T: 100, collectionPct: 70, methanePct: 50,
        nitrogenPct: 6, oxygenPct: 1, h2sPpm: 500, upgradingCapexLocal: 4000000, upgradingRecoveryPct: 96, upgradingKwhNm3: 0.4, productMethanePct: 97 },
      energy: { electricityKwhYear: 200000, heatNeed: "none", hasGridConnection: true }, site: { gasGridKm: 3 } },
  },
  {
    id: "de_existing_biogas", title: "Existing German sludge biogas", description: "Incremental gas-use investment; no new digester and no duplicated sludge processing cost",
    input: { countryCode: "DE", regionId: "bayern", businessType: "wastewater_treatment", feedstocks: [],
      process: { basisOrigin: "ENGINEERING_ASSUMPTION", basisDate: "2026-10-28", basisReference: "Illustrative project assumptions, not an operator account or supplier quotation", kind: "gas", operatingDays: 365, monthsActive: 12, startMonth: 1, processCapexLocal: 350000, processOpexLocalYear: 25000, residualCostLocalT: 0, auxiliaryKwhYear: 80000, auxiliaryHeatKwhYear: 0, uncertaintyPct: 25,
        rawGasNm3Hour: 300, methanePct: 62, availabilityPct: 95, declinePctYear: 0, gasPriceLocalNm3: 0.06,
        nitrogenPct: 1, oxygenPct: 0.2, h2sPpm: 1500, upgradingCapexLocal: 1900000, upgradingRecoveryPct: 98, upgradingKwhNm3: 0.3, productMethanePct: 97 },
      energy: { electricityKwhYear: 6000000, heatNeed: "year_round_process", heatKwhYear: 4000000, hasGridConnection: true }, site: { gasGridKm: 2 } },
  },
  {
    id: "se_ras_sludge", title: "Collected sludge from Swedish land-based aquaculture", description: "Characterised organic sludge; a resource-potential scenario, not a verified commercial plant",
    input: { countryCode: "SE", regionId: "skane", businessType: "aquaculture", feedstocks: [],
      process: { basisOrigin: "ENGINEERING_ASSUMPTION", basisDate: "2026-10-28", basisReference: "Illustrative project assumptions, not an operator account or supplier quotation", kind: "residue", operatingDays: 350, monthsActive: 12, startMonth: 1, processCapexLocal: 12000000, processOpexLocalYear: 800000, residualCostLocalT: 150, auxiliaryKwhYear: 150000, auxiliaryHeatKwhYear: 0, uncertaintyPct: 40,
        tonnesYear: 5000, densityKgM3: 1000, dmPct: 6, vsPct: 75, bmp: 280, methanePct: 60, nKgT: 4, hrtDays: 40, olr: 2 },
      energy: { electricityKwhYear: 3000000, heatNeed: "year_round_process", heatKwhYear: 500000, hasGridConnection: true }, site: { gasGridKm: 10 } },
  },
  ...([
  {
    "id": "th_starch_cod",
    "title": "Cassava starch wastewater: published Thai technical reference",
    "description": "Covered lagoon; published gas/COD data, inconsistent HRT disclosed; current budgets unknown",
    "input": {
      "countryCode": "TH",
      "regionId": "northeast",
      "businessType": "starch_processor",
      "feedstocks": [],
      "process": {
        "kind": "wastewater",
        "basisOrigin": "ENGINEERING_ASSUMPTION",
        "basisDate": "2026-10-29",
        "basisReference": "Published technical observations; unreported inputs are engineering assumptions. No current installed budget or upstream operating accounts disclosed.",
        "operatingDays": 330,
        "monthsActive": 12,
        "startMonth": 1,
        "uncertaintyPct": 50,
        "methaneRecoveryPct": 95,
        "biomassCodPct": 8,
        "sludgeTsPct": 5,
        "sludgeVsPct": 80,
        "heatRecoveryPct": 0,
        "avoidedTreatmentLocalM3": 0,
        "reactorTechnology": "covered_lagoon",
        "flowM3Day": 6560,
        "codMgL": 12200,
        "removalPct": 92,
        "methanePct": 55,
        "hrtDays": 25.30030487804878,
        "olr": 0.48220762788455745,
        "inletTempC": 28
      },
      "energy": {
        "heatNeed": "year_round_process",
        "hasGridConnection": true
      },
      "site": {}
    },
    "reference": {
      "title": "Lerdlattaporn et al. — cassava starch circular economy, 2021",
      "url": "https://link.springer.com/article/10.1186/s42834-021-00093-9",
      "period": "2021",
      "geography": "TH",
      "checkedOn": "2026-10-29",
      "stage": "historical_reference",
      "observations": [
        {
          "label": "Q",
          "value": 6560,
          "unit": "m³/d",
          "inputPath": "process.flowM3Day",
          "qualifier": "reported"
        },
        {
          "label": "COD",
          "value": 12200,
          "unit": "mg/L",
          "inputPath": "process.codMgL",
          "qualifier": "reported"
        },
        {
          "label": "COD removal",
          "value": 92,
          "unit": "%",
          "inputPath": "process.removalPct",
          "qualifier": "reported"
        },
        {
          "label": "CH₄",
          "value": 55,
          "unit": "% vol",
          "inputPath": "process.methanePct",
          "qualifier": "reported"
        },
        {
          "label": "V",
          "value": 165970,
          "unit": "m³",
          "qualifier": "reported"
        },
        {
          "label": "Biogas",
          "value": 41000,
          "unit": "m³/d",
          "qualifier": "reported"
        },
        {
          "label": "HRT",
          "value": 15,
          "unit": "d",
          "qualifier": "reported",
          "basis": "Source inconsistency: V/Q = 25.3 d, not 15 d. Model uses V/Q."
        }
      ]
    }
  },
  {
    "id": "us_paper_cod",
    "title": "Recycled-paper wastewater: a US design-capacity reference",
    "description": "US anonymous Veolia reference; design limits, not measured simultaneous flow; current costs unknown",
    "input": {
      "countryCode": "US",
      "regionId": "wisconsin",
      "businessType": "pulp_paper",
      "feedstocks": [],
      "process": {
        "kind": "wastewater",
        "basisOrigin": "ENGINEERING_ASSUMPTION",
        "basisDate": "2026-10-29",
        "basisReference": "Published technical observations; unreported inputs are engineering assumptions. No current installed budget or upstream operating accounts disclosed.",
        "operatingDays": 330,
        "monthsActive": 12,
        "startMonth": 1,
        "uncertaintyPct": 50,
        "methaneRecoveryPct": 95,
        "biomassCodPct": 8,
        "sludgeTsPct": 5,
        "sludgeVsPct": 80,
        "heatRecoveryPct": 0,
        "avoidedTreatmentLocalM3": 0,
        "reactorTechnology": "high_rate",
        "flowM3Day": 3785.411784,
        "codMgL": 11887.742356116678,
        "removalPct": 80,
        "methanePct": 65,
        "hrtDays": 0.25,
        "olr": 20,
        "inletTempC": 35
      },
      "energy": {
        "heatNeed": "year_round_process",
        "hasGridConnection": true
      },
      "site": {}
    },
    "reference": {
      "title": "Veolia — recycled-paper wastewater, USA; publication date unspecified",
      "url": "https://www.veoliawatertech.com/en/case-studies/robust-biological-wastewater-system-treats-challenging-wastewater-recycled-paper",
      "period": "undated",
      "geography": "US; site undisclosed",
      "checkedOn": "2026-10-29",
      "stage": "historical_reference",
      "observations": [
        {
          "label": "Q",
          "value": 1,
          "unit": "US MGD",
          "qualifier": "capacity"
        },
        {
          "label": "COD load",
          "value": 45000,
          "unit": "kg/d",
          "qualifier": "capacity"
        },
        {
          "label": "Q",
          "value": 3785.411784,
          "unit": "m³/d",
          "inputPath": "process.flowM3Day",
          "qualifier": "derived",
          "basis": "1 US gallon = 0.003785411784 m³; capacity, not measured flow."
        }
      ]
    }
  },
  {
    "id": "gb_confectionery_gas",
    "title": "Confectionery biogas: a historical Fawdon gas-use reference",
    "description": "Uses the 2014 supplier gas reference only, not later operating figures or historical subsidies",
    "input": {
      "countryCode": "GB",
      "regionId": "yorkshire",
      "businessType": "food_manufacturer",
      "feedstocks": [],
      "process": {
        "kind": "gas",
        "basisOrigin": "ENGINEERING_ASSUMPTION",
        "basisDate": "2026-10-29",
        "basisReference": "Published technical observations; unreported inputs are engineering assumptions. No current installed budget or upstream operating accounts disclosed.",
        "operatingDays": 330,
        "monthsActive": 12,
        "startMonth": 1,
        "uncertaintyPct": 50,
        "rawGasNm3Hour": 167,
        "methanePct": 50,
        "availabilityPct": 95,
        "declinePctYear": 0,
        "gasPriceLocalNm3": 0,
        "nitrogenPct": 1,
        "oxygenPct": 0.2,
        "h2sPpm": 500,
        "upgradingRecoveryPct": 98,
        "upgradingKwhNm3": 0.3,
        "productMethanePct": 97
      },
      "energy": {
        "heatNeed": "year_round_process",
        "hasGridConnection": true
      },
      "site": {}
    },
    "reference": {
      "title": "Clearfleau — Fawdon reference, conference presentation, December 2014",
      "url": "https://conferences.aquaenviro.co.uk/proceedings/clearfleau-three-case-studies-converting-food-production-residues-into-energy/richard-gueterbock-2/",
      "period": "2014-12",
      "geography": "GB; Fawdon (model climate profile is not the original site)",
      "checkedOn": "2026-10-29",
      "stage": "historical_reference",
      "observations": [
        {
          "label": "Q (biogas)",
          "value": 167,
          "unit": "Nm³/h",
          "inputPath": "process.rawGasNm3Hour",
          "qualifier": "reported"
        },
        {
          "label": "CH₄",
          "value": 50,
          "unit": "% vol",
          "inputPath": "process.methanePct",
          "qualifier": "reported"
        },
        {
          "label": "CHP",
          "value": 305,
          "unit": "kWe",
          "qualifier": "capacity"
        }
      ]
    }
  },
  {
    "id": "gb_fish_residues",
    "title": "Small fish-residue supplier: regional co-digestion reference",
    "description": "Creed IWMF is a co-digestion reference, not a dedicated fish-waste plant; annual quantity is an explicit scenario assumption",
    "input": {
      "countryCode": "GB",
      "regionId": "scotland",
      "businessType": "fish_processor",
      "feedstocks": [
        {
          "id": "salmon",
          "type": "fish_waste",
          "quantity": 140,
          "handling": "other"
        }
      ],
      "energy": {
        "heatNeed": "none",
        "hasGridConnection": true
      },
      "site": {}
    },
    "reference": {
      "title": "Food Nation / Landia — salmon residues at Creed IWMF",
      "url": "https://foodnationdenmark.com/cases/salmon-waste-powers-biogas-production/",
      "period": "2017–2022",
      "geography": "GB; Isle of Lewis",
      "checkedOn": "2026-10-29",
      "stage": "historical_reference",
      "observations": [
        {
          "label": "FM per batch",
          "value": 7,
          "unit": "t/shift",
          "qualifier": "reported"
        },
        {
          "label": "FM total",
          "value": 835.66,
          "unit": "t (2017–2022)",
          "qualifier": "reported",
          "basis": "140 t/a is a modelled rounded annual quantity; not a reported operating year."
        }
      ]
    }
  }
] satisfies ExampleCase[]),
];

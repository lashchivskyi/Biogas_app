import type { CoreLang } from "./i18n";
import type { AnimalKind, Confidence, FeedstockTypeId, HandlingId } from "./types";

/**
 * Feedstock catalogue. Yields are given per kg of volatile solids (VS) so that the model
 * computes gas from the customer's own dry matter instead of looking up a per-tonne table.
 *
 * Source note (applies to every row): ranges are typical published BMP / full-scale values
 * (FNR Handreichung, KTBL Faustzahlen, IEA Bioenergy Task 37 literature, IPCC B0 defaults) rounded
 * by the project team. NONE of them is a measurement of the customer's substrate. They are
 * ESTIMATEs until laboratory BMP tests are done.
 *
 * UI labels live in the i18n dictionaries; `name` here is used inside the model's own sentences.
 */
export interface FeedstockType {
  id: FeedstockTypeId;
  name: { en: string; uk: string };
  category: "manure" | "processing" | "other";
  dryMatterPct: number; // % of fresh matter
  vsPctOfDm: number; // % of dry matter
  /** L CH4 per kg VS: low / typical / high */
  yieldLow: number;
  yieldTyp: number;
  yieldHigh: number;
  ch4Fraction: number;
  /** kg per tonne fresh matter */
  nKgT: number;
  p2o5KgT: number;
  k2oKgT: number;
  confidence: Confidence;
  /** Animal by-product category under EU 1069/2009 or national equivalent; drives pasteurisation. */
  abp: "none" | "cat3" | "cat2";
  flags: Array<"poultry" | "fat" | "contaminants" | "competing_use" | "seasonal" | "pretreatment" | "dilute" | "energy_crop">;
  defaultMonths: number;
  defaultStartMonth: number;
  defaultHandling: HandlingId;
}

const F = (o: FeedstockType) => o;

export const FEEDSTOCKS: Record<FeedstockTypeId, FeedstockType> = {
  dairy_slurry: F({ id: "dairy_slurry", name: { en: "dairy cattle slurry", uk: "гноївка ВРХ (молочна ферма)" }, category: "manure", dryMatterPct: 8.5, vsPctOfDm: 80, yieldLow: 150, yieldTyp: 200, yieldHigh: 250, ch4Fraction: 0.55, nKgT: 4.0, p2o5KgT: 1.6, k2oKgT: 4.2, confidence: "MEDIUM", abp: "none", flags: [], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "lagoon" }),
  cattle_other_slurry: F({ id: "cattle_other_slurry", name: { en: "beef / young cattle slurry", uk: "гноївка ВРХ (молодняк, м'ясне)" }, category: "manure", dryMatterPct: 8.0, vsPctOfDm: 80, yieldLow: 140, yieldTyp: 190, yieldHigh: 240, ch4Fraction: 0.55, nKgT: 3.8, p2o5KgT: 1.5, k2oKgT: 4.0, confidence: "MEDIUM", abp: "none", flags: [], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "lagoon" }),
  cattle_solid_manure: F({ id: "cattle_solid_manure", name: { en: "cattle solid manure with bedding", uk: "твердий гній ВРХ з підстилкою" }, category: "manure", dryMatterPct: 22, vsPctOfDm: 82, yieldLow: 110, yieldTyp: 165, yieldHigh: 220, ch4Fraction: 0.55, nKgT: 5.5, p2o5KgT: 2.8, k2oKgT: 7.5, confidence: "LOW", abp: "none", flags: ["contaminants"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "field_spreading" }),
  pig_slurry: F({ id: "pig_slurry", name: { en: "pig slurry", uk: "гноївка свиней" }, category: "manure", dryMatterPct: 5.5, vsPctOfDm: 77, yieldLow: 220, yieldTyp: 290, yieldHigh: 340, ch4Fraction: 0.62, nKgT: 5.0, p2o5KgT: 2.2, k2oKgT: 2.4, confidence: "MEDIUM", abp: "none", flags: [], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "lagoon" }),
  poultry_layer_manure: F({ id: "poultry_layer_manure", name: { en: "laying-hen manure", uk: "послід курей-несучок" }, category: "manure", dryMatterPct: 27, vsPctOfDm: 70, yieldLow: 170, yieldTyp: 220, yieldHigh: 280, ch4Fraction: 0.6, nKgT: 15, p2o5KgT: 11, k2oKgT: 7, confidence: "LOW", abp: "none", flags: ["poultry", "contaminants"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "field_spreading" }),
  poultry_broiler_litter: F({ id: "poultry_broiler_litter", name: { en: "broiler litter", uk: "підстилковий послід бройлерів" }, category: "manure", dryMatterPct: 65, vsPctOfDm: 75, yieldLow: 140, yieldTyp: 200, yieldHigh: 250, ch4Fraction: 0.58, nKgT: 28, p2o5KgT: 20, k2oKgT: 18, confidence: "LOW", abp: "none", flags: ["poultry", "contaminants"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "field_spreading" }),
  slaughter_residues: F({ id: "slaughter_residues", name: { en: "slaughterhouse residues", uk: "відходи забою" }, category: "processing", dryMatterPct: 18, vsPctOfDm: 88, yieldLow: 250, yieldTyp: 380, yieldHigh: 520, ch4Fraction: 0.65, nKgT: 8, p2o5KgT: 3, k2oKgT: 2, confidence: "LOW", abp: "cat3", flags: ["fat"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
  dairy_whey: F({ id: "dairy_whey", name: { en: "whey / dairy effluent", uk: "сироватка / молочні стоки" }, category: "processing", dryMatterPct: 6, vsPctOfDm: 92, yieldLow: 280, yieldTyp: 340, yieldHigh: 380, ch4Fraction: 0.6, nKgT: 1.0, p2o5KgT: 0.5, k2oKgT: 1.5, confidence: "MEDIUM", abp: "cat3", flags: ["competing_use"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
  dairy_fat_sludge: F({ id: "dairy_fat_sludge", name: { en: "dairy fat / DAF sludge", uk: "жиро-флотаційний осад" }, category: "processing", dryMatterPct: 15, vsPctOfDm: 90, yieldLow: 400, yieldTyp: 550, yieldHigh: 700, ch4Fraction: 0.68, nKgT: 3, p2o5KgT: 1.5, k2oKgT: 0.5, confidence: "LOW", abp: "cat3", flags: ["fat"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
  brewery_spent_grain: F({ id: "brewery_spent_grain", name: { en: "brewer's spent grain", uk: "пивна дробина" }, category: "processing", dryMatterPct: 23, vsPctOfDm: 94, yieldLow: 220, yieldTyp: 280, yieldHigh: 320, ch4Fraction: 0.58, nKgT: 8, p2o5KgT: 3, k2oKgT: 0.7, confidence: "MEDIUM", abp: "none", flags: ["competing_use"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "sold_as_feed" }),
  fruit_veg_residues: F({ id: "fruit_veg_residues", name: { en: "fruit & vegetable residues", uk: "відходи переробки плодів/овочів" }, category: "processing", dryMatterPct: 15, vsPctOfDm: 92, yieldLow: 250, yieldTyp: 320, yieldHigh: 400, ch4Fraction: 0.56, nKgT: 2.5, p2o5KgT: 0.8, k2oKgT: 3.0, confidence: "MEDIUM", abp: "none", flags: ["seasonal"], defaultMonths: 5, defaultStartMonth: 7, defaultHandling: "paid_disposal" }),
  food_waste: F({ id: "food_waste", name: { en: "source-separated food waste", uk: "харчові відходи" }, category: "processing", dryMatterPct: 22, vsPctOfDm: 88, yieldLow: 340, yieldTyp: 430, yieldHigh: 550, ch4Fraction: 0.6, nKgT: 7, p2o5KgT: 2.5, k2oKgT: 3, confidence: "MEDIUM", abp: "cat3", flags: ["contaminants"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
  sugar_beet_pulp: F({ id: "sugar_beet_pulp", name: { en: "wet sugar-beet pulp", uk: "жом цукрових буряків" }, category: "processing", dryMatterPct: 11, vsPctOfDm: 93, yieldLow: 280, yieldTyp: 340, yieldHigh: 380, ch4Fraction: 0.55, nKgT: 1.8, p2o5KgT: 0.6, k2oKgT: 1.0, confidence: "MEDIUM", abp: "none", flags: ["seasonal", "competing_use"], defaultMonths: 4, defaultStartMonth: 9, defaultHandling: "sold_as_feed" }),
  grease_trap_fat: F({ id: "grease_trap_fat", name: { en: "grease-trap fat", uk: "жир із жироуловлювачів" }, category: "processing", dryMatterPct: 20, vsPctOfDm: 90, yieldLow: 600, yieldTyp: 750, yieldHigh: 900, ch4Fraction: 0.68, nKgT: 0.5, p2o5KgT: 0.2, k2oKgT: 0.1, confidence: "LOW", abp: "cat3", flags: ["fat", "contaminants"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
  crop_straw: F({ id: "crop_straw", name: { en: "straw (pretreated)", uk: "солома (з попередньою обробкою)" }, category: "other", dryMatterPct: 85, vsPctOfDm: 90, yieldLow: 110, yieldTyp: 160, yieldHigh: 200, ch4Fraction: 0.53, nKgT: 5, p2o5KgT: 1.5, k2oKgT: 12, confidence: "LOW", abp: "none", flags: ["pretreatment"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "other" }),
  // --- industrial residues added for the international scope (LOW confidence: literature ranges, wide variability) ---
  vinasse: F({ id: "vinasse", name: { en: "sugarcane / ethanol vinasse", uk: "барда (вінас) етанолового заводу" }, category: "processing", dryMatterPct: 3.5, vsPctOfDm: 70, yieldLow: 220, yieldTyp: 300, yieldHigh: 360, ch4Fraction: 0.6, nKgT: 0.4, p2o5KgT: 0.1, k2oKgT: 2.5, confidence: "LOW", abp: "none", flags: ["dilute", "seasonal"], defaultMonths: 8, defaultStartMonth: 4, defaultHandling: "field_spreading" }),
  press_mud: F({ id: "press_mud", name: { en: "sugar press mud / filter cake", uk: "фільтраційний осад цукрового виробництва" }, category: "processing", dryMatterPct: 25, vsPctOfDm: 75, yieldLow: 180, yieldTyp: 250, yieldHigh: 320, ch4Fraction: 0.58, nKgT: 3.5, p2o5KgT: 4, k2oKgT: 1, confidence: "LOW", abp: "none", flags: ["seasonal"], defaultMonths: 8, defaultStartMonth: 4, defaultHandling: "field_spreading" }),
  pome: F({ id: "pome", name: { en: "palm oil mill effluent (POME)", uk: "стоки пальмоолійного заводу (POME)" }, category: "processing", dryMatterPct: 5, vsPctOfDm: 80, yieldLow: 280, yieldTyp: 350, yieldHigh: 420, ch4Fraction: 0.62, nKgT: 0.7, p2o5KgT: 0.2, k2oKgT: 2.0, confidence: "LOW", abp: "none", flags: ["dilute"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "lagoon" }),
  sugar_beet_pulp_pressed: F({ id: "sugar_beet_pulp_pressed", name: { en: "pressed sugar-beet pulp (ensiled)", uk: "жом цукрових буряків пресований (силосований)" }, category: "processing", dryMatterPct: 23, vsPctOfDm: 92, yieldLow: 290, yieldTyp: 335, yieldHigh: 375, ch4Fraction: 0.52, nKgT: 2.5, p2o5KgT: 0.9, k2oKgT: 1.5, confidence: "MEDIUM", abp: "none", flags: ["competing_use"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "sold_as_feed" }),
  potato_processing: F({ id: "potato_processing", name: { en: "potato processing residues (peel, pulp)", uk: "відходи переробки картоплі (лушпиння, мезга)" }, category: "processing", dryMatterPct: 14, vsPctOfDm: 90, yieldLow: 300, yieldTyp: 350, yieldHigh: 400, ch4Fraction: 0.53, nKgT: 2.2, p2o5KgT: 0.7, k2oKgT: 3.5, confidence: "MEDIUM", abp: "none", flags: ["competing_use"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "sold_as_feed" }),
  olive_pomace: F({ id: "olive_pomace", name: { en: "two-phase olive pomace (alperujo)", uk: "оливкова вичавка (двофазна)" }, category: "processing", dryMatterPct: 30, vsPctOfDm: 88, yieldLow: 170, yieldTyp: 240, yieldHigh: 310, ch4Fraction: 0.6, nKgT: 3.5, p2o5KgT: 1.0, k2oKgT: 6.0, confidence: "LOW", abp: "none", flags: ["seasonal", "fat"], defaultMonths: 4, defaultStartMonth: 11, defaultHandling: "paid_disposal" }),
  sewage_sludge: F({ id: "sewage_sludge", name: { en: "municipal sewage sludge (primary + surplus, thickened)", uk: "осад міських очисних споруд (згущений)" }, category: "other", dryMatterPct: 5, vsPctOfDm: 70, yieldLow: 200, yieldTyp: 270, yieldHigh: 320, ch4Fraction: 0.63, nKgT: 2.5, p2o5KgT: 2.0, k2oKgT: 0.3, confidence: "MEDIUM", abp: "none", flags: ["contaminants"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
  grain_stillage: F({ id: "grain_stillage", name: { en: "grain distillery stillage", uk: "зернова барда спиртзаводу" }, category: "processing", dryMatterPct: 8, vsPctOfDm: 92, yieldLow: 300, yieldTyp: 360, yieldHigh: 410, ch4Fraction: 0.6, nKgT: 3.0, p2o5KgT: 1.5, k2oKgT: 1.2, confidence: "MEDIUM", abp: "none", flags: ["competing_use"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
  fish_waste: F({ id: "fish_waste", name: { en: "fish processing residues", uk: "відходи переробки риби" }, category: "processing", dryMatterPct: 25, vsPctOfDm: 85, yieldLow: 330, yieldTyp: 430, yieldHigh: 530, ch4Fraction: 0.66, nKgT: 18, p2o5KgT: 8, k2oKgT: 1.5, confidence: "LOW", abp: "cat3", flags: ["fat", "competing_use"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
  maize_silage: F({ id: "maize_silage", name: { en: "maize silage (energy crop)", uk: "кукурудзяний силос (енергетична культура)" }, category: "other", dryMatterPct: 33, vsPctOfDm: 95, yieldLow: 310, yieldTyp: 340, yieldHigh: 370, ch4Fraction: 0.52, nKgT: 4.5, p2o5KgT: 1.8, k2oKgT: 5.0, confidence: "MEDIUM", abp: "none", flags: ["competing_use", "energy_crop"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "other" }),
  municipal_biowaste: F({ id: "municipal_biowaste", name: { en: "municipal biowaste (food + garden)", uk: "муніципальні біовідходи" }, category: "processing", dryMatterPct: 30, vsPctOfDm: 70, yieldLow: 220, yieldTyp: 300, yieldHigh: 380, ch4Fraction: 0.58, nKgT: 6, p2o5KgT: 2.5, k2oKgT: 4, confidence: "LOW", abp: "cat3", flags: ["contaminants"], defaultMonths: 12, defaultStartMonth: 1, defaultHandling: "paid_disposal" }),
};

export interface AnimalType {
  id: AnimalKind;
  name: { en: string; uk: string };
  feedstock: FeedstockTypeId;
  /** tonnes of fresh manure per head (place) per year */
  tonnesPerHeadYear: number;
  rangeLow: number;
  rangeHigh: number;
  collectYearRound: number;
  collectSeasonal: number;
  confidence: Confidence;
}

export const ANIMALS: Record<AnimalKind, AnimalType> = {
  dairy_cow: { id: "dairy_cow", name: { en: "dairy cows", uk: "дійні корови" }, feedstock: "dairy_slurry", tonnesPerHeadYear: 20, rangeLow: 16, rangeHigh: 26, collectYearRound: 0.9, collectSeasonal: 0.55, confidence: "MEDIUM" },
  cattle_other: { id: "cattle_other", name: { en: "young / beef cattle", uk: "молодняк та м'ясна ВРХ" }, feedstock: "cattle_other_slurry", tonnesPerHeadYear: 9, rangeLow: 6, rangeHigh: 13, collectYearRound: 0.9, collectSeasonal: 0.55, confidence: "MEDIUM" },
  pig_finisher: { id: "pig_finisher", name: { en: "finishing pigs (places)", uk: "свині на відгодівлі (місць)" }, feedstock: "pig_slurry", tonnesPerHeadYear: 1.4, rangeLow: 1.1, rangeHigh: 1.8, collectYearRound: 0.95, collectSeasonal: 0.95, confidence: "MEDIUM" },
  sow: { id: "sow", name: { en: "sows with piglets", uk: "свиноматки з приплодом" }, feedstock: "pig_slurry", tonnesPerHeadYear: 5, rangeLow: 4, rangeHigh: 6.5, collectYearRound: 0.95, collectSeasonal: 0.95, confidence: "MEDIUM" },
  layer_hen: { id: "layer_hen", name: { en: "laying hens", uk: "курки-несучки" }, feedstock: "poultry_layer_manure", tonnesPerHeadYear: 0.04, rangeLow: 0.03, rangeHigh: 0.05, collectYearRound: 0.97, collectSeasonal: 0.97, confidence: "MEDIUM" },
  broiler: { id: "broiler", name: { en: "broilers (places)", uk: "бройлери (птахомісць)" }, feedstock: "poultry_broiler_litter", tonnesPerHeadYear: 0.011, rangeLow: 0.008, rangeHigh: 0.014, collectYearRound: 0.97, collectSeasonal: 0.97, confidence: "LOW" },
};

export { BUSINESS_TYPES, type BusinessType } from "./businesses";

export const HANDLING_IDS: HandlingId[] = ["field_spreading", "lagoon", "paid_disposal", "sold_as_feed", "landfill", "other"];

/** Handling modes where the customer currently pays third parties and the stream stops costing once it is digested. */
export const PAID_HANDLING: HandlingId[] = ["paid_disposal", "landfill"];

export const feedName = (id: FeedstockTypeId, lang: CoreLang) => FEEDSTOCKS[id].name[lang];

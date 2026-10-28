import type { AnimalKind, FeedstockTypeId } from "./types";
export const BUSINESS_TAXONOMY_VERSION = "1.0.0";

/** Stable sector IDs are shared by navigation, forms, reports and analytics. Scale is not a sector. */
export type BusinessAudience = "farm" | "food" | "municipal" | "developer";
export type BusinessRole = "feedstock_owner" | "waste_operator" | "developer" | "offtaker";
export type BusinessScope = "screening" | "specialist" | "outside_model";
interface Definition {
  audience: BusinessAudience;
  role: BusinessRole;
  scope: BusinessScope;
  suggested: Array<{ animal?: AnimalKind; type?: FeedstockTypeId; quantity: number }>;
  /** Engineering screening envelope, not a bankability threshold or a surveyed market average. */
  scaleTonnesYear?: readonly [number, number];
  guideSlug?: string;
}
const definitions = {
  dairy_farm: { audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [{ animal: "dairy_cow", quantity: 400 }, { animal: "cattle_other", quantity: 200 }], scaleTonnesYear: [5000, 150000], guideSlug: "dairy-farms" },
  cattle_farm: { audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [{ animal: "cattle_other", quantity: 300 }], scaleTonnesYear: [5000, 150000] },
  pig_farm: { audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [{ animal: "pig_finisher", quantity: 3000 }], scaleTonnesYear: [5000, 200000], guideSlug: "pig-farms" },
  poultry_farm: { audience: "farm", role: "feedstock_owner", scope: "specialist", suggested: [{ animal: "layer_hen", quantity: 150000 }], scaleTonnesYear: [3000, 80000], guideSlug: "poultry" },
  crop_farm: { audience: "farm", role: "feedstock_owner", scope: "specialist", suggested: [{ type: "crop_straw", quantity: 2000 }], scaleTonnesYear: [10000, 150000] },
  other_livestock: { audience: "farm", role: "feedstock_owner", scope: "outside_model", suggested: [] },
  dairy_processor: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "dairy_whey", quantity: 6000 }], scaleTonnesYear: [10000, 200000], guideSlug: "dairy-processing" },
  slaughterhouse: { audience: "food", role: "feedstock_owner", scope: "specialist", suggested: [{ type: "slaughter_residues", quantity: 2000 }], scaleTonnesYear: [2000, 50000], guideSlug: "meat-processing" },
  fish_processor: { audience: "food", role: "feedstock_owner", scope: "specialist", suggested: [{ type: "fish_waste", quantity: 3000 }], scaleTonnesYear: [3000, 50000] },
  fruit_veg_processor: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "fruit_veg_residues", quantity: 1500 }], scaleTonnesYear: [5000, 100000] },
  potato_processor: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "potato_processing", quantity: 25000 }], scaleTonnesYear: [10000, 150000] },
  starch_processor: { audience: "food", role: "feedstock_owner", scope: "outside_model", suggested: [] },
  food_manufacturer: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "food_waste", quantity: 10000 }], scaleTonnesYear: [5000, 100000] },
  sugar_beet_factory: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "sugar_beet_pulp_pressed", quantity: 80000 }], scaleTonnesYear: [30000, 200000], guideSlug: "sugar-industry" },
  sugar_ethanol: { audience: "food", role: "feedstock_owner", scope: "specialist", suggested: [{ type: "vinasse", quantity: 300000 }, { type: "press_mud", quantity: 30000 }], scaleTonnesYear: [100000, 2000000] },
  brewery: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "brewery_spent_grain", quantity: 1500 }], scaleTonnesYear: [5000, 100000], guideSlug: "breweries" },
  distillery: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "grain_stillage", quantity: 120000 }], scaleTonnesYear: [20000, 300000] },
  olive_oil_mill: { audience: "food", role: "feedstock_owner", scope: "specialist", suggested: [{ type: "olive_pomace", quantity: 15000 }], scaleTonnesYear: [5000, 100000] },
  palm_oil_mill: { audience: "food", role: "feedstock_owner", scope: "specialist", suggested: [{ type: "pome", quantity: 200000 }], scaleTonnesYear: [50000, 1000000] },
  pulp_paper: { audience: "food", role: "feedstock_owner", scope: "outside_model", suggested: [] },
  aquaculture: { audience: "food", role: "feedstock_owner", scope: "outside_model", suggested: [] },
  other_industry: { audience: "food", role: "feedstock_owner", scope: "specialist", suggested: [] },
  food_business: { audience: "municipal", role: "feedstock_owner", scope: "screening", suggested: [{ type: "food_waste", quantity: 8000 }], scaleTonnesYear: [10000, 150000] },
  municipal_biowaste: { audience: "municipal", role: "waste_operator", scope: "screening", suggested: [{ type: "municipal_biowaste", quantity: 25000 }], scaleTonnesYear: [15000, 200000], guideSlug: "food-waste" },
  wastewater_treatment: { audience: "municipal", role: "waste_operator", scope: "specialist", suggested: [{ type: "sewage_sludge", quantity: 60000 }], scaleTonnesYear: [20000, 500000] },
  wastewater_organic: { audience: "municipal", role: "feedstock_owner", scope: "specialist", suggested: [{ type: "dairy_fat_sludge", quantity: 800 }] },
  landfill_operator: { audience: "municipal", role: "waste_operator", scope: "outside_model", suggested: [] },
  biogas_developer: { audience: "developer", role: "developer", scope: "screening", suggested: [{ animal: "dairy_cow", quantity: 3000 }, { type: "food_waste", quantity: 10000 }], scaleTonnesYear: [30000, 700000] },
  energy_offtaker: { audience: "developer", role: "offtaker", scope: "outside_model", suggested: [] },
} satisfies Record<string, Definition>;

export type BusinessTypeId = keyof typeof definitions;
export interface BusinessType extends Definition { id: BusinessTypeId }
export const BUSINESS_TYPES = Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, { id, ...definition }])) as Record<BusinessTypeId, BusinessType>;
export const BUSINESS_IDS = Object.keys(BUSINESS_TYPES) as BusinessTypeId[];
/** The four existing audience translations also label the canonical hierarchy. */
export const BUSINESS_GROUPS: readonly { id: BusinessAudience; copyIndex: number }[] = [
  { id: "farm", copyIndex: 0 }, { id: "food", copyIndex: 1 }, { id: "municipal", copyIndex: 3 }, { id: "developer", copyIndex: 2 },
];
export const businessHref = (id: BusinessTypeId, base: string) => BUSINESS_TYPES[id].guideSlug
  ? `${base}/biogas/${BUSINESS_TYPES[id].guideSlug}` : `${base}/biogas#business-${id}`;

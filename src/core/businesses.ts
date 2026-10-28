import type { ProcessKind } from "./processes";
import type { AnimalKind, FeedstockTypeId } from "./types";
export const BUSINESS_TAXONOMY_VERSION = "2.0.0";

/** Stable sector IDs are shared by navigation, forms, reports and analytics. Scale is not a sector. */
export type BusinessAudience = "farm" | "food" | "municipal" | "developer";
export type BusinessRole = "feedstock_owner" | "waste_operator" | "developer" | "offtaker";
export type BusinessScope = "screening" | "specialist" | "outside_model";
interface Definition {
  audience: BusinessAudience;
  role: BusinessRole;
  scope: BusinessScope;
  models?: readonly ("ad" | ProcessKind)[];
  suggested: Array<{ animal?: AnimalKind; type?: FeedstockTypeId; quantity: number }>;
  /** Engineering screening envelope, not a bankability threshold or a surveyed market average. */
  scaleTonnesYear?: readonly [number, number];
  guideSlug?: string;
}
const definitions = {
  central_biogas_plant: { audience: "municipal", role: "waste_operator", scope: "screening", suggested: [{ type: "dairy_slurry", quantity: 50000 }, { type: "food_waste", quantity: 10000 }], models: ["ad", "residue", "gas"], scaleTonnesYear: [30000, 700000] },
  dairy_farm: { audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [{ animal: "dairy_cow", quantity: 400 }, { animal: "cattle_other", quantity: 200 }], scaleTonnesYear: [5000, 150000], guideSlug: "dairy-farms" },
  cattle_farm: { audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [{ animal: "cattle_other", quantity: 300 }], scaleTonnesYear: [5000, 150000] },
  pig_farm: { audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [{ animal: "pig_finisher", quantity: 3000 }], scaleTonnesYear: [5000, 200000], guideSlug: "pig-farms" },
  poultry_farm: { audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [{ animal: "layer_hen", quantity: 150000 }], scaleTonnesYear: [3000, 80000], guideSlug: "poultry" },
  crop_farm: { audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [{ type: "crop_straw", quantity: 2000 }], scaleTonnesYear: [10000, 150000] },
  other_livestock: { models: ["residue"], audience: "farm", role: "feedstock_owner", scope: "screening", suggested: [] },
  dairy_processor: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "dairy_whey", quantity: 6000 }], scaleTonnesYear: [10000, 200000], guideSlug: "dairy-processing" },
  slaughterhouse: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "slaughter_residues", quantity: 2000 }], scaleTonnesYear: [2000, 50000], guideSlug: "meat-processing" },
  fish_processor: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "fish_waste", quantity: 3000 }], scaleTonnesYear: [3000, 50000] },
  fruit_veg_processor: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "fruit_veg_residues", quantity: 1500 }], scaleTonnesYear: [5000, 100000] },
  potato_processor: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "potato_processing", quantity: 25000 }], scaleTonnesYear: [10000, 150000] },
  starch_processor: { models: ["wastewater","residue"], audience: "food", role: "feedstock_owner", scope: "screening", suggested: [] },
  food_manufacturer: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "food_waste", quantity: 10000 }], scaleTonnesYear: [5000, 100000] },
  sugar_beet_factory: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "sugar_beet_pulp_pressed", quantity: 80000 }], scaleTonnesYear: [30000, 200000], guideSlug: "sugar-industry" },
  sugar_ethanol: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "vinasse", quantity: 300000 }, { type: "press_mud", quantity: 30000 }], scaleTonnesYear: [100000, 2000000] },
  brewery: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "brewery_spent_grain", quantity: 1500 }], scaleTonnesYear: [5000, 100000], guideSlug: "breweries" },
  distillery: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "grain_stillage", quantity: 120000 }], scaleTonnesYear: [20000, 300000] },
  olive_oil_mill: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "olive_pomace", quantity: 15000 }], scaleTonnesYear: [5000, 100000] },
  palm_oil_mill: { audience: "food", role: "feedstock_owner", scope: "screening", suggested: [{ type: "pome", quantity: 200000 }], scaleTonnesYear: [50000, 1000000] },
  pulp_paper: { models: ["wastewater","residue"], audience: "food", role: "feedstock_owner", scope: "screening", suggested: [] },
  aquaculture: { models: ["residue"], audience: "food", role: "feedstock_owner", scope: "screening", suggested: [] },
  other_industry: { models: ["residue","wastewater","gas","ad"], audience: "food", role: "feedstock_owner", scope: "screening", suggested: [] },
  food_business: { audience: "municipal", role: "feedstock_owner", scope: "screening", suggested: [{ type: "food_waste", quantity: 8000 }], scaleTonnesYear: [10000, 150000] },
  municipal_biowaste: { audience: "municipal", role: "waste_operator", scope: "screening", suggested: [{ type: "municipal_biowaste", quantity: 25000 }], scaleTonnesYear: [15000, 200000], guideSlug: "food-waste" },
  wastewater_treatment: { models: ["ad","residue","gas"], audience: "municipal", role: "waste_operator", scope: "screening", suggested: [{ type: "sewage_sludge", quantity: 60000 }], scaleTonnesYear: [20000, 500000] },
  wastewater_organic: { models: ["ad","residue","wastewater","gas"], audience: "municipal", role: "feedstock_owner", scope: "screening", suggested: [{ type: "dairy_fat_sludge", quantity: 800 }] },
  landfill_operator: { models: ["landfill","gas"], audience: "municipal", role: "waste_operator", scope: "screening", suggested: [] },
  biogas_developer: { audience: "developer", role: "developer", scope: "screening", suggested: [{ animal: "dairy_cow", quantity: 3000 }, { type: "food_waste", quantity: 10000 }], scaleTonnesYear: [30000, 700000] },
  energy_offtaker: { models: ["gas"], audience: "developer", role: "offtaker", scope: "screening", suggested: [] },
} satisfies Record<string, Definition>;

export type BusinessTypeId = keyof typeof definitions;
export interface BusinessType extends Definition { id: BusinessTypeId }
export const BUSINESS_TYPES = Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, { id, ...definition }])) as unknown as Record<BusinessTypeId, BusinessType>;
export const BUSINESS_IDS = Object.keys(BUSINESS_TYPES) as BusinessTypeId[];
/** Sectors and project roles are separate dimensions; legacy role IDs remain readable. */
export const BUSINESS_GROUPS: readonly { id: BusinessAudience; copyIndex: number }[] = [
  { id: "farm", copyIndex: 0 }, { id: "food", copyIndex: 1 }, { id: "municipal", copyIndex: 3 },
];
export const businessHref = (id: BusinessTypeId, base: string) => !SECTOR_IDS.includes(id) ? `${base}/calculator?b=${id}` : BUSINESS_TYPES[id].guideSlug
  ? `${base}/biogas/${BUSINESS_TYPES[id].guideSlug}` : `${base}/biogas#business-${id}`;

/** Roles are independent of sectors. Legacy IDs remain readable for saved reports. */
export function modelsForBusiness(id: BusinessTypeId): readonly ("ad" | ProcessKind)[] {
  return BUSINESS_TYPES[id].models ?? (BUSINESS_TYPES[id].audience === "food" ? ["ad", "wastewater", "residue", "gas"] : ["ad", "residue", "gas"]);
}
export const SECTOR_IDS = BUSINESS_IDS.filter(id => BUSINESS_TYPES[id].audience !== "developer" && id !== "wastewater_organic");
export function canonicalBusiness(id: BusinessTypeId): BusinessTypeId { return id === "biogas_developer" ? "central_biogas_plant" : SECTOR_IDS.includes(id) ? id : "other_industry"; }
export function defaultProcess(id: BusinessTypeId): "ad" | ProcessKind { return modelsForBusiness(id)[0]; }

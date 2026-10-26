/**
 * Domain types of the country-independent engineering/economic core.
 * Nothing in src/core may import from src/countries or src/app.
 */

export type DataKind = "FACT" | "ASSUMPTION" | "CALCULATION" | "ESTIMATE";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";

/** Every numeric parameter used by the model carries its origin. */
export interface Provenance {
  id: string;
  label: string;
  value: number;
  unit: string;
  kind: DataKind;
  source: string;
  country: string; // ISO code, "EU", or "GLOBAL"
  date: string; // ISO date of the source / of the assumption
  confidence: Confidence;
  note?: string;
}

export type ScenarioId = "conservative" | "base" | "optimistic";
export type RouteId = "chp" | "boiler" | "biomethane";

export type BusinessTypeId =
  | "dairy_farm"
  | "cattle_farm"
  | "pig_farm"
  | "poultry_farm"
  | "dairy_processor"
  | "brewery"
  | "slaughterhouse"
  | "fruit_veg_processor"
  | "food_business"
  | "other_industry"
  | "wastewater_organic"
  | "biogas_developer"
  | "municipal_biowaste"
  | "sugar_ethanol"
  | "palm_oil_mill"
  | "sugar_beet_factory"
  | "potato_processor"
  | "olive_oil_mill"
  | "wastewater_treatment"
  | "distillery";

export type AnimalKind =
  | "dairy_cow"
  | "cattle_other"
  | "pig_finisher"
  | "sow"
  | "layer_hen"
  | "broiler";

export type FeedstockTypeId =
  | "dairy_slurry"
  | "cattle_other_slurry"
  | "cattle_solid_manure"
  | "pig_slurry"
  | "poultry_layer_manure"
  | "poultry_broiler_litter"
  | "slaughter_residues"
  | "dairy_whey"
  | "dairy_fat_sludge"
  | "brewery_spent_grain"
  | "fruit_veg_residues"
  | "food_waste"
  | "sugar_beet_pulp"
  | "grease_trap_fat"
  | "crop_straw"
  | "vinasse"
  | "press_mud"
  | "pome"
  | "municipal_biowaste"
  | "sugar_beet_pulp_pressed"
  | "potato_processing"
  | "olive_pomace"
  | "sewage_sludge"
  | "grain_stillage"
  | "fish_waste"
  | "maize_silage";

export type HandlingId =
  | "field_spreading"
  | "lagoon"
  | "paid_disposal"
  | "sold_as_feed"
  | "landfill"
  | "other";

export type HeatNeed = "none" | "seasonal_buildings" | "year_round_process" | "greenhouse";
export type Housing = "year_round" | "seasonal";

/** One line of what the customer produces. Either an animal herd (heads) or a waste stream (tonnes). */
export interface FeedstockLineInput {
  id: string;
  /** Exactly one of animal / type must be set. */
  animal?: AnimalKind;
  type?: FeedstockTypeId;
  /** heads for animals, tonnes/year for waste streams. */
  quantity: number;
  housing?: Housing; // cattle only
  /** Overrides catalogue default dry matter (% of fresh matter). */
  dryMatterPct?: number;
  /** Laboratory VS as percent of dry matter; overrides the feedstock catalogue. */
  vsPctOfDm?: number;
  /** Laboratory BMP in litres CH4 per kg VS; process realisation still applies. */
  methaneYieldLPerKgVs?: number;
  /** How many months per year the stream exists (waste streams). Default from catalogue. */
  monthsActive?: number;
  startMonth?: number; // 1..12
  /** Stream is brought in from other sites (not generated on the plant site). */
  delivered?: boolean;
  distanceKm?: number; // one-way, only for delivered
  /** Price the plant pays for the stream, local currency per tonne (>0 cost, <0 gate fee received). */
  purchasePricePerTonneLocal?: number;
  handling?: HandlingId;
  /** What the customer pays today to dispose of this stream, local currency/tonne. */
  currentDisposalCostPerTonneLocal?: number;
  /** Revenue the customer loses if the stream is diverted (e.g. spent grain sold as feed), local/tonne. */
  opportunityValuePerTonneLocal?: number;
}

export interface EnergyInput {
  electricityKwhYear?: number;
  electricityPriceLocalPerKwh?: number;
  gasM3Year?: number;
  gasPriceLocalPerM3?: number;
  heatNeed: HeatNeed;
  heatKwhYear?: number;
  hasGridConnection: boolean;
}

export interface SiteInput {
  landHa?: number;
  /** Existing lagoon/tank volume that could be covered gas-tight, m3. */
  existingStorageM3?: number;
  /** Straight-line distance to a gas distribution/transmission main, km. */
  gasGridKm?: number;
  neighboursWithin300m?: boolean;
  nearProtectedOrWaterArea?: boolean;
}

export interface FinanceInput {
  /** Share of CAPEX financed by debt; default from country adapter. */
  debtShare?: number;
}

export interface ProjectInput {
  countryCode: string;
  regionId: string;
  businessType: BusinessTypeId;
  feedstocks: FeedstockLineInput[];
  energy: EnergyInput;
  site: SiteInput;
  finance?: FinanceInput;
  /** True only if laboratory analysis of the feedstock is available (not collected in MVP). */
  labAnalysisAvailable?: boolean;
  /**
   * Optional support payment, local currency per kWh of electricity, NOT guaranteed.
   * Defaults to 0. Only used when explicitly set, and always flagged in output.
   */
  assumedSupportEurPerKwh?: number;
  /** Language of the model's explanatory text. Default "en". */
  lang?: "en" | "uk";
}

/* ---------------- results ---------------- */

export interface FeedstockLineResult {
  id: string;
  label: string;
  typeId: FeedstockTypeId;
  tonnesYear: number;
  monthlyTonnes: number[];
  dryMatterPct: number;
  vsPctOfDm: number;
  methaneYieldLPerKgVs: number;
  vsTonnesYear: number;
  ch4M3Year: number; // gross, at the scenario's yield point, before process realisation
  ch4Fraction: number;
  nKgYear: number;
  p2o5KgYear: number;
  k2oKgYear: number;
  delivered: boolean;
  distanceKm: number;
  transportCostEurYear: number;
  purchaseCostEurYear: number; // negative = income (gate fee)
  disposalSavingEurYear: number;
  opportunityCostEurYear: number;
  category: "manure" | "processing" | "other";
  warnings: string[];
}

export interface FeedstockSummary {
  lines: FeedstockLineResult[];
  tonnesYear: number;
  vsTonnesYear: number;
  dryMatterPct: number; // mass-weighted
  ch4M3Year: number; // after ammonia/fat inhibition penalties
  biogasM3Year: number;
  monthlyCh4M3: number[];
  monthlyTonnes: number[];
  monthlyVsTonnes: number[];
  energyDensityKwhPerTonne: number; // CH4 LHV per tonne FM
  nKgYear: number;
  p2o5KgYear: number;
  k2oKgYear: number;
  manureShareVs: number;
  poultryShareVs: number;
  fatShareVs: number;
  abpTonnesYear: number;
  inhibitionFactor: number;
  warnings: string[];
}

export interface TechnologyRecommendation {
  primary: string;
  digestion: "wet" | "high_solids" | "wet_with_solids_feeding" | "high_rate" | "covered_lagoon";
  temperature: "mesophilic" | "thermophilic";
  stages: "single" | "two_stage";
  mode: "continuous" | "batch";
  reactor: string;
  hrtDays: number;
  reasons: string[];
  warnings: string[];
  alternatives: string[];
}

export interface DigesterDesign {
  workingVolumeM3: number;
  totalVolumeM3: number;
  hrtDays: number;
  olrKgVsM3Day: number;
  monthlyHeatDemandKwh: number[];
  heatDemandKwhYear: number;
  pasteurisationHeatKwhYear: number; // incremental heat above ordinary substrate heating
  storageVolumeM3: number;
  storageCovered: number;
  storageNew: number;
  surfaceAreaM2: number;
  tech: TechnologyRecommendation;
}

export interface EnergyBalance {
  route: RouteId;
  ch4ProducedM3: number;
  ch4LeakedM3: number;
  ch4ToChpM3: number;
  ch4ToBoilerM3: number;
  ch4ToUpgraderM3: number;
  ch4FlaredM3: number;
  gasEnergyKwh: number; // usable gas energy after leakage
  flaredKwh: number;
  chpKwEl: number;
  chpEtaEl: number;
  chpEtaTh: number;
  elGrossKwh: number;
  elParasiticKwh: number;
  cngCompressionKwh: number;
  elNetKwh: number;
  elSelfConsumedKwh: number;
  elExportedKwh: number;
  elPurchasedKwh: number;
  heatProducedKwh: number; // gross heat from CHP/boiler
  heatDigesterKwh: number;
  heatExternalPurchasedKwh: number; // shortfall to run digester
  heatNetAvailableKwh: number;
  heatUsefulKwh: number; // economically useful (matched to a real demand)
  biomethaneNm3: number;
  rawBiogasNm3PerHour: number;
  rawBiogasDesignNm3PerHour: number; // seasonal peak or annual flow / design operating hours, whichever is larger
  upgradingSlipM3: number;
  methaneLossShare: number; // of production: leaks + CHP slip + upgrading slip + flare (unburned)
  monthly: {
    gasKwh: number[];
    heatDigesterKwh: number[];
    heatUsefulKwh: number[];
    elNetKwh: number[];
  };
}

export interface CapexBreakdown {
  lines: { id: string; label: string; eur: number }[];
  totalEur: number;
}

export interface OpexAndRevenue {
  opex: { id: string; label: string; eur: number }[];
  opexEur: number;
  revenue: { id: string; label: string; eur: number }[];
  revenueEur: number;
  ebitdaEur: number;
}

export interface FinancialResult {
  capexEur: number;
  opexEurYear: number;
  revenueEurYear: number;
  ebitdaEurYear: number;
  simplePaybackYears: number | null;
  dynamicPaybackYears: number | null;
  npvEur: number;
  irr: number | null;
  dscrMin: number | null;
  dscrAvg: number | null;
  cashFlows: number[]; // year 0..N
  cumulative: number[];
  debtEur: number;
  annualDebtServiceEur: number;
}

export interface ScenarioResult {
  scenario: ScenarioId;
  route: RouteId;
  feed: FeedstockSummary;
  design: DigesterDesign;
  energy: EnergyBalance;
  capex: CapexBreakdown;
  opexRev: OpexAndRevenue;
  fin: FinancialResult;
  plantClass: PlantClass;
  kwElEquivalent: number;
  usedParams: string[];
}

export type PlantClass = "micro" | "small" | "medium" | "large" | "industrial";

export interface SensitivityItem {
  id: string;
  label: string;
  npvEur: number;
  deltaNpvEur: number;
  paybackYears: number | null;
  breaks: boolean; // flips NPV sign
}

export type VerdictId =
  | "STRONG_CANDIDATE"
  | "POSSIBLE_WITH_CONDITIONS"
  | "WEAK_ECONOMICS"
  | "INSUFFICIENT_DATA"
  | "NOT_RECOMMENDED_AT_SCALE";

export interface Score {
  id: "feedstock" | "energy" | "location" | "technical" | "economics" | "regulatory" | "environmental";
  label: string;
  /** 0..100. For regulatory/environmental, higher = MORE risk. */
  value: number;
  isRisk: boolean;
  explanation: string[];
}

export interface Assessment {
  input: ProjectInput;
  countryCode: string;
  fx: number;
  scenarios: Record<ScenarioId, ScenarioResult>;
  routesBase: Record<RouteId, ScenarioResult>;
  routeMatrix: Record<RouteId, Record<ScenarioId, ScenarioResult>>;
  bestRoute: RouteId;
  sensitivity: SensitivityItem[];
  breakEven: {
    capexReductionPct: number | null;
    energyPriceIncreasePct: number | null;
  };
  scores: Score[];
  overall: { value: number; explanation: string[] };
  verdict: { id: VerdictId; reasons: string[]; whatWouldChange: string[] };
  /**
   * Whether the answer survives the scenario range: positive NPV even in the conservative case (clear_go),
   * negative even in the optimistic case (clear_no), or the sign flips between them (grey).
   */
  robustness: "clear_go" | "grey" | "clear_no" | "insufficient";
  /** Sensitivity ids that hurt NPV most — what to verify first. */
  drivers: string[];
  confidence: { level: Confidence; score: number; reasons: string[] };
  missingData: string[];
  warnings: string[];
  safety: SafetyItem[];
  regulatory: { items: RegulatoryItem[]; complexity: "LOW" | "MEDIUM" | "HIGH" };
  methane: { lossShare: number; lossShareRange: [number, number]; co2eTonnesYear: number; displacedCo2eTonnesYear: number; ratio: number; advice: string[] };
  digestate: DigestateAssessment;
  logistics: LogisticsAssessment;
  climate: { regionName: string; meanTempC: number; hdd: number; analogues: { name: string; distance: number; meanTempC: number }[] };
  ranges: {
    feedstockTonnes: number;
    biogasM3: [number, number, number];
    kwEl: [number, number, number];
    electricityMwh: [number, number, number];
    heatUsefulMwh: [number, number, number];
    biomethaneNm3: [number, number, number];
    capexEur: [number, number, number];
    paybackYears: [number | null, number | null, number | null];
    npvEur: [number, number, number];
  };
  assumptionsUsed: string[];
  supportIncluded: boolean;
  /** Economics under each national support scheme the project could apply for — never in the verdict. */
  supportCases: SupportCase[];
  notes: string[];
  lang: "en" | "uk";
}

export interface SafetyItem {
  id: string;
  hazard: string;
  relevance: "ALWAYS" | "CONDITIONAL";
  severity: "HIGH" | "MEDIUM";
  controls: string[];
  trigger?: string;
}

export interface RegulatoryItem {
  id: string;
  title: string;
  appliesBecause: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
  status: "CONFIRMED" | "TO_VERIFY";
}

export interface DigestateAssessment {
  tonnesYear: number;
  nKgYear: number;
  landRequiredHa: number;
  landAvailableHa: number | null;
  adequacy: "OK" | "SHORT" | "UNKNOWN";
  excessShare: number;
  fertiliserValueEurYear: number;
  handlingCostEurYear: number;
  netValueEurYear: number;
  storageMonthsRequired: number;
  advice: string[];
  status: "ASSET" | "NEUTRAL" | "LIABILITY";
}

export interface LogisticsAssessment {
  perLine: {
    id: string;
    label: string;
    distanceKm: number;
    transportCostEurPerTonne: number;
    energyValueEurPerTonne: number;
    transportShareOfEnergyValue: number;
    breakEvenDistanceKm: number;
    level: "OK" | "WARNING" | "CRITICAL";
  }[];
  warnings: string[];
}

export interface SupportCase {
  schemeId: string;
  name: string;
  status: "open" | "competitive" | "closing" | "closed" | "uncertain";
  eligible: boolean;
  reason: string;
  npvEur: number;
  paybackYears: number | null;
  irr: number | null;
  deltaNpvEur: number;
  note: string;
  source: string;
  confidence: Confidence;
}

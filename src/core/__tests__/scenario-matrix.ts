import { assess, buildParams } from "../assess";
import type { Assessment, ProjectInput, FeedstockLineInput } from "../types";
import type { ProcessInput } from "../processes";
import { COUNTRIES, getCountry } from "@/countries";

/**
 * MECE scenario matrix for the robustness sweep: segment × size × feedstock mix × data completeness × country × climate.
 * Route (CHP / boiler / biomethane) is not a matrix axis: assess() always evaluates all three, and every test walks all of them.
 */
export const SEGMENTS = ["farm", "food", "industrial_heat", "wastewater", "landfill", "existing_gas", "developer"] as const;
export type Segment = (typeof SEGMENTS)[number];
export const SIZES = ["tiny", "small", "medium", "large", "huge", "giant"] as const;
export type Size = (typeof SIZES)[number];
/** Multiplier on the segment's reference quantity (heads, tonnes/year, m³/day or Nm³/h). */
export const SIZE_FACTOR: Record<Size, number> = { tiny: 0.01, small: 0.1, medium: 1, large: 10, huge: 100, giant: 1000 };
/** full = every optional input the form can collect; minimal = only what the form requires; */
export const DATA_LEVELS = ["full", "minimal"] as const;
export type DataLevel = (typeof DATA_LEVELS)[number];

export interface MatrixCell { segment: Segment; size: Size; mix: string; data: DataLevel; country: string; regionId: string; input: ProjectInput }

const fxOf = (country: string) => buildParams(getCountry(country)).get("econ.fx_local_per_eur");
const scale = (n: number, f: number, int = false) => (int ? Math.max(1, Math.round(n * f)) : n * f);

interface Mix { id: string; lines: (f: number, local: (eur: number) => number) => FeedstockLineInput[] }
const mixes: Record<Exclude<Segment, "wastewater" | "landfill" | "existing_gas">, { business: ProjectInput["businessType"]; mixes: Mix[]; elKwhPerUnit: number; heatKwhPerUnit: number }> = {
  farm: {
    business: "dairy_farm", elKwhPerUnit: 1000, heatKwhPerUnit: 400,
    mixes: [
      { id: "dairy", lines: (f) => [{ id: "a", animal: "dairy_cow", quantity: scale(400, f, true) }] },
      { id: "pig", lines: (f) => [{ id: "a", animal: "pig_finisher", quantity: scale(3000, f, true) }] },
      { id: "poultry+maize", lines: (f, L) => [{ id: "a", animal: "layer_hen", quantity: scale(150000, f, true) }, { id: "b", type: "maize_silage", quantity: scale(2000, f), delivered: true, distanceKm: 15, purchasePricePerTonneLocal: L(40) }] },
    ],
  },
  food: {
    business: "food_manufacturer", elKwhPerUnit: 500, heatKwhPerUnit: 300,
    mixes: [
      { id: "slaughter", lines: (f, L) => [{ id: "a", type: "slaughter_residues", quantity: scale(2000, f), handling: "paid_disposal", currentDisposalCostPerTonneLocal: L(40) }] },
      { id: "whey+fat", lines: (f, L) => [{ id: "a", type: "dairy_whey", quantity: scale(6000, f), handling: "paid_disposal", currentDisposalCostPerTonneLocal: L(15) }, { id: "b", type: "dairy_fat_sludge", quantity: scale(500, f), handling: "paid_disposal", currentDisposalCostPerTonneLocal: L(35) }] },
      { id: "food_waste_gate_fee", lines: (f, L) => [{ id: "a", type: "food_waste", quantity: scale(10000, f), delivered: true, distanceKm: 30, purchasePricePerTonneLocal: L(-30), handling: "paid_disposal" }] },
      { id: "sugar_beet_pulp", lines: (f) => [{ id: "a", type: "sugar_beet_pulp_pressed", quantity: scale(80000, f), monthsActive: 4, startMonth: 9 }] },
    ],
  },
  industrial_heat: {
    business: "brewery", elKwhPerUnit: 400, heatKwhPerUnit: 2500,
    mixes: [
      { id: "spent_grain", lines: (f, L) => [{ id: "a", type: "brewery_spent_grain", quantity: scale(1500, f), opportunityValuePerTonneLocal: L(20) }] },
      { id: "fruit_veg+straw", lines: (f) => [{ id: "a", type: "fruit_veg_residues", quantity: scale(1500, f) }, { id: "b", type: "crop_straw", quantity: scale(500, f) }] },
    ],
  },
  developer: {
    business: "biogas_developer", elKwhPerUnit: 0, heatKwhPerUnit: 0,
    mixes: [
      { id: "cows+food_waste", lines: (f, L) => [{ id: "a", animal: "dairy_cow", quantity: scale(3000, f, true) }, { id: "b", type: "food_waste", quantity: scale(20000, f), delivered: true, distanceKm: 25, purchasePricePerTonneLocal: L(-25), handling: "paid_disposal" }] },
      { id: "biowaste_only", lines: (f, L) => [{ id: "a", type: "municipal_biowaste", quantity: scale(25000, f), delivered: true, distanceKm: 20, purchasePricePerTonneLocal: L(-60) }] },
    ],
  },
};

const processBase = (kind: ProcessInput["kind"], f: number, L: (eur: number) => number, full: boolean) => ({
  basisOrigin: "ENGINEERING_ASSUMPTION" as const, basisDate: "2026-10-28", kind,
  operatingDays: 350, monthsActive: 12, startMonth: 1, uncertaintyPct: 30,
  ...(full ? { processCapexLocal: L(2_000_000 * Math.sqrt(f)), processOpexLocalYear: L(150_000 * Math.sqrt(f)), residualCostLocalT: L(30), auxiliaryKwhYear: 100_000 * f, auxiliaryHeatKwhYear: 0 } : {}),
});
const gasTreatment = (L: (eur: number) => number, full: boolean) => ({ nitrogenPct: 4, oxygenPct: 0.5, h2sPpm: 800, upgradingRecoveryPct: 97, upgradingKwhNm3: 0.35, productMethanePct: 97, ...(full ? { upgradingCapexLocal: L(3_000_000) } : {}) });

/** Process-based segments carry their own physical basis; the schema caps the quantities that still make physical sense. */
function processFor(segment: "wastewater" | "landfill" | "existing_gas", mix: string, f: number, L: (eur: number) => number, full: boolean): ProcessInput {
  if (segment === "wastewater") {
    const strong = mix === "strong_cod";
    return { ...processBase("wastewater", f, L, full), kind: "wastewater", flowM3Day: Math.min(1e6, Math.max(1, 1500 * f)), codMgL: strong ? 12000 : 3000, removalPct: 80, methanePct: 65, methaneRecoveryPct: 95, biomassCodPct: 8, sludgeTsPct: 5, sludgeVsPct: 80, hrtDays: 0.5, olr: 15, inletTempC: 25, heatRecoveryPct: 50, avoidedTreatmentLocalM3: L(1.2) } as ProcessInput;
  }
  if (segment === "landfill") {
    const young = mix === "open_landfill";
    return { ...processBase("landfill", f, L, full), ...gasTreatment(L, full), kind: "landfill", annualWasteTonnes: Math.max(1, 100_000 * f), depositionYears: young ? 10 : 25, yearsSinceClosure: young ? 0 : 5, decayPerYear: 0.05, potentialNm3T: 100, collectionPct: 70, methanePct: 50 } as ProcessInput;
  }
  const chp = mix === "gas_with_chp";
  return { ...processBase("gas", f, L, full), ...gasTreatment(L, full), kind: "gas", rawGasNm3Hour: Math.max(1, 300 * f), methanePct: 62, availabilityPct: 95, declinePctYear: 2, gasPriceLocalNm3: L(0.06),
    ...(chp ? { existingChpKwEl: Math.min(1e5, Math.max(1, 600 * f)), ...(full ? { chpOverhaulLocal: L(200_000 * Math.sqrt(f)) } : {}) } : {}) } as ProcessInput;
}

const PROCESS_MIXES = { wastewater: ["strong_cod", "weak_cod"], landfill: ["open_landfill", "closed_landfill"], existing_gas: ["gas_with_chp", "gas_only"] } as const;
const BUSINESS_OF = { wastewater: "wastewater_organic", landfill: "landfill_operator", existing_gas: "wastewater_treatment" } as const;

export function buildInput(segment: Segment, size: Size, mix: string, data: DataLevel, country: string, regionId: string): ProjectInput {
  const f = SIZE_FACTOR[size];
  const fx = fxOf(country);
  const L = (eur: number) => eur * fx;
  const full = data === "full";
  if (segment === "wastewater" || segment === "landfill" || segment === "existing_gas") {
    const process = processFor(segment, mix, f, L, full);
    const gasKwh = segment === "existing_gas" ? 4_000_000 * f : 0;
    return { countryCode: country, regionId, businessType: BUSINESS_OF[segment], feedstocks: [], process,
      energy: { heatNeed: segment === "landfill" ? "none" : "year_round_process", hasGridConnection: true,
        ...(full ? { electricityKwhYear: 3_000_000 * f, electricityPriceLocalPerKwh: L(0.15), heatKwhYear: gasKwh, gasM3Year: gasKwh / 10 } : {}) },
      site: full ? { gasGridKm: 2, landHa: 5 } : {} };
  }
  const spec = mixes[segment];
  const m = spec.mixes.find((x) => x.id === mix)!;
  const lines = m.lines(f, L);
  const units = f * 100;
  return { countryCode: country, regionId, businessType: spec.business, feedstocks: lines,
    energy: { heatNeed: spec.heatKwhPerUnit > 0 ? "year_round_process" : "seasonal_buildings", hasGridConnection: true,
      ...(full ? { electricityKwhYear: units * spec.elKwhPerUnit, electricityPriceLocalPerKwh: L(0.14), heatKwhYear: units * spec.heatKwhPerUnit, gasM3Year: units * spec.heatKwhPerUnit / 10, gasPriceLocalPerM3: L(0.5) } : {}) },
    site: full ? { landHa: 50 * f, existingStorageM3: 5000 * f, gasGridKm: 3 } : {} };
}

export const mixesOf = (segment: Segment): string[] => segment in PROCESS_MIXES ? [...PROCESS_MIXES[segment as keyof typeof PROCESS_MIXES]] : mixes[segment as keyof typeof mixes].mixes.map((m) => m.id);

/** Climate axis: coldest-latitude and warmest-latitude region of the country are approximated by first and last registered region. */
export const climateRegions = (country: string): string[] => { const r = COUNTRIES[country].regions; return r.length > 1 ? [r[0].id, r[r.length - 1].id] : [r[0].id]; };

export function* matrix(opts: { countries?: string[]; sizes?: readonly Size[]; segments?: readonly Segment[]; data?: readonly DataLevel[]; firstClimateOnly?: boolean; firstMixOnly?: boolean } = {}): Generator<MatrixCell> {
  for (const country of opts.countries ?? Object.keys(COUNTRIES))
    for (const regionId of opts.firstClimateOnly ? climateRegions(country).slice(0, 1) : climateRegions(country))
      for (const segment of opts.segments ?? SEGMENTS)
        for (const mix of opts.firstMixOnly ? mixesOf(segment).slice(0, 1) : mixesOf(segment))
          for (const size of opts.sizes ?? SIZES)
            for (const data of opts.data ?? DATA_LEVELS)
              yield { segment, size, mix, data, country, regionId, input: buildInput(segment, size, mix, data, country, regionId) };
}

/* ---------------- physical-sanity helpers ---------------- */

/** Paths of every non-finite number in a result tree (NaN, ±Infinity). */
export function nonFinitePaths(value: unknown, path = "$", seen = new WeakSet<object>(), out: string[] = []): string[] {
  if (typeof value === "number") { if (!Number.isFinite(value)) out.push(`${path}=${value}`); return out; }
  if (!value || typeof value !== "object" || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) value.forEach((v, i) => nonFinitePaths(v, `${path}[${i}]`, seen, out));
  else for (const [k, v] of Object.entries(value)) nonFinitePaths(v, `${path}.${k}`, seen, out);
  return out;
}

export type Outcome = { ok: true; a: Assessment } | { ok: false; error: string };
export function run(input: ProjectInput, uncertainty = false): Outcome {
  try { return { ok: true, a: assess(input, getCountry(input.countryCode), { uncertainty }) }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

const num = (n: number) => Number.isFinite(n);
/** Physical/accounting invariants that hold for every route of every assessment. Returns human-readable violations. */
export function physicalViolations(a: Assessment): string[] {
  const bad: string[] = nonFinitePaths(a).slice(0, 5).map((p) => `non-finite ${p}`);
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  const near = (x: number, y: number, rel = 1e-6, abs = 1e-6) => Math.abs(x - y) <= Math.max(abs, rel * Math.max(Math.abs(x), Math.abs(y)));
  for (const route of ["chp", "boiler", "biomethane"] as const) for (const scn of ["conservative", "base", "optimistic"] as const) {
    const r = a.routeMatrix[route][scn]; const t = `${route}/${scn}`;
    const { feed, energy, capex, opexRev, fin } = r;
    const nonNeg: [string, number][] = [["feed.tonnes", feed.tonnesYear], ["feed.ch4", feed.ch4M3Year], ["capex", capex.totalEur], ["ch4Produced", energy.ch4ProducedM3], ["elGross", energy.elGrossKwh], ["elNet", energy.elNetKwh], ["heatUseful", energy.heatUsefulKwh], ["biomethane", energy.biomethaneNm3], ["ch4Flared", energy.ch4FlaredM3], ["ch4Leaked", energy.ch4LeakedM3]];
    for (const [n, v] of nonNeg) if (num(v) && v < -1e-9) bad.push(`${t}: negative ${n}=${v}`);
    if (!near(sum(feed.monthlyTonnes), feed.tonnesYear)) bad.push(`${t}: monthly mass ≠ annual`);
    if (!near(sum(feed.monthlyCh4M3), feed.ch4M3Year)) bad.push(`${t}: monthly CH4 ≠ annual`);
    const alloc = energy.ch4LeakedM3 + energy.ch4ToChpM3 + energy.ch4ToBoilerM3 + energy.ch4ToUpgraderM3 + energy.ch4FlaredM3;
    if (!near(alloc, energy.ch4ProducedM3, 1e-6, 1e-3)) bad.push(`${t}: CH4 allocation ${alloc} ≠ produced ${energy.ch4ProducedM3}`);
    if (energy.ch4ProducedM3 > feed.ch4M3Year * (1 + 1e-9) + 1e-6 && !r.process) bad.push(`${t}: methane produced exceeds gross potential`);
    if (energy.elSelfConsumedKwh + energy.elExportedKwh > energy.elNetKwh + 1e-3) bad.push(`${t}: power allocation exceeds net`);
    // economics.ts hides revenue lines under €0.5 from the table but keeps them in the total (at most 9 lines).
    if (!near(sum(opexRev.revenue.map((l) => l.eur)), opexRev.revenueEur, 1e-6, 5)) bad.push(`${t}: revenue lines ≠ total`);
    if (!near(sum(opexRev.opex.map((l) => l.eur)), opexRev.opexEur, 1e-6, 1e-3)) bad.push(`${t}: opex lines ≠ total`);
    if (!near(opexRev.revenueEur - opexRev.opexEur, fin.ebitdaEurYear, 1e-6, 1e-3)) bad.push(`${t}: EBITDA ≠ revenue − opex`);
    if (!near(fin.cashFlows[0], -fin.capexEur, 1e-9, 1e-3)) bad.push(`${t}: year-0 cash ≠ −CAPEX`);
    if (fin.irr != null && (!num(fin.irr) || fin.irr < -1 || fin.irr > 100)) bad.push(`${t}: IRR ${fin.irr} outside [−100 %, 10 000 %]`);
    if (fin.simplePaybackYears != null && (!num(fin.simplePaybackYears) || fin.simplePaybackYears < 0)) bad.push(`${t}: payback ${fin.simplePaybackYears}`);
  }
  return bad;
}

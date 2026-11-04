import { existingPlant, processBounds, processSchema } from "./processes";
import { modelsForBusiness } from "./businesses";
import { climateSummary, lagoonEligible, meanTemp } from "./climate";
import { projectRegion, type CityClimate } from "./location";
import { biomethaneOfftake } from "./capex";
import { NO_MODS, type Modifiers, type RunContext } from "./context";
import type { CountryAdapter, SupportScheme } from "./country";
import { fmtDec, fmtSig, locText, locList, tr, type CoreLang } from "./i18n";
import { customerDemand } from "./demand";
import { assessDigestate } from "./digestate";
import { classifyPlant, runScenarioRoute } from "./economics";
import { ENGINEERING_MAP } from "./engineeringParams";
import { PLAUSIBLE_DISPOSAL_EUR_T, PLAUSIBLE_GATE_FEE_EUR_T, PLAUSIBLE_PURCHASE_EUR_T } from "./feedstock";
import { assessLogistics } from "./logistics";
import { methaneCheck } from "./methane";
import { ghgCase } from "./ghg";
import { evpi, latinHypercube, MC_DIMS, percentile, sampleScenario, triangular } from "./uncertainty";
import { ANIMALS, FEEDSTOCKS } from "./feedstockData";
import { Params, prov, toMap } from "./params";
import { CATALOG_VERSION, checkEvidence, DATA_REVIEW_AS_OF, fingerprint, isoDate, MODEL_VERSION } from "./modelAudit";
import { ADVISORY_CLIENT_FACTORS, assessQuality, capQuality } from "./quality";
import { safetyRegister } from "./safety";
import { SCENARIOS, SCENARIO_ORDER, scenarioProvenance } from "./scenarios";
import { computeScores } from "./scoring";
import type { Assessment, MeasureItem, MeasureKind, MonteCarloResult, ProductBreakEven, QuoteCheck, RouteId, ScalePoint, ScenarioId, ScenarioResult, SensitivityItem, SupportCase } from "./types";
import { decideVerdict } from "./verdict";
import { BUSINESS_TYPES } from "./businesses";

export const ROUTES: RouteId[] = ["chp", "boiler", "biomethane"];

export function buildParams(country: CountryAdapter, regionId?: string, energy?: Assessment["input"]["energy"], city?: CityClimate): Params {
  // A city selects its state/province market data through its admin1 code; older snapshots without one use national data.
  const marketRegion = regionId?.startsWith("city:") ? city?.adminCode : regionId;
  const overrides = energy && country.paramsForProject ? country.paramsForProject({ regionId: marketRegion ?? "", energy }) : marketRegion && country.paramsForRegion ? country.paramsForRegion(marketRegion) : [];
  const map = { ...ENGINEERING_MAP, ...toMap(country.params), ...toMap(overrides) };
  const offer = energy?.biomethanePriceLocalPerMwhHhv ?? 0;
  if (offer > 0) {
    // Buyer's offer per MWh HHV → EUR per Nm³ of product (LHV × purity × HHV/LHV); scenarios move it like a contracted power price.
    const fx = map["econ.fx_local_per_eur"].value;
    const kwhHhvNm3 = map["eng.ch4_lhv_kwh_m3"].value * map["eng.biomethane_ch4_purity"].value * map["eng.gas_hhv_lhv_ratio"].value;
    const eurNm3 = offer / fx / 1000 * kwhHhvNm3;
    const source = `USER_INPUT ${offer} ${country.currency}/MWh HHV × ${kwhHhvNm3.toFixed(2)} kWh HHV/Nm³ / FX ${fx}. Buyer offer without support; not independently verified (no contract date supplied).`;
    const keys = [["cons", SCENARIOS.conservative.energyPriceMult], ["base", 1], ["opt", SCENARIOS.optimistic.energyPriceMult]] as const;
    for (const [k, m] of keys) {
      const id = `econ.biomethane_price_${k}_eur_nm3`;
      map[id] = prov(id, `${map[id].label} (buyer offer${m === 1 ? "" : ` × ${m}`})`, +(eurNm3 * m).toFixed(4), "EUR/Nm³", "CALCULATION", source, "MEDIUM", { country: country.code, date: "undated", origin: "USER_INPUT" });
    }
  }
  return new Params(map);
}

/** Every parameter, engineering + scenario + country, for the registry document and the methodology page. */
export function allProvenance(country: CountryAdapter, regionId?: string, energy?: Assessment["input"]["energy"], city?: CityClimate) {
  return [...buildParams(country, regionId, energy, city).all(), ...scenarioProvenance(DATA_REVIEW_AS_OF)];
}

function makeCtx(input: Assessment["input"], country: CountryAdapter, params: Params, scenario: ScenarioId, mods: Modifiers, lang: CoreLang, support?: SupportScheme): RunContext {
  const region = projectRegion(input, country);
  return { input, country, params, scenario: SCENARIOS[scenario], mods, region, fx: params.get("econ.fx_local_per_eur"), lang, t: tr(lang), support };
}

function bisect(f: (x: number) => number, lo: number, hi: number): number | null {
  const flo = f(lo);
  const fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  let a = lo;
  let b = hi;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (flo * fm <= 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
}

/** Root of a straight line through (x1, n1) and (x2, n2); null when the line is flat. */
function zeroAt(x1: number, n1: number, x2: number, n2: number): number | null {
  if (!Number.isFinite(n1) || !Number.isFinite(n2) || Math.abs(n2 - n1) < 1e-6) return null;
  return x1 - (n1 * (x2 - x1)) / (n2 - n1);
}

/** Average realised value of the route's main product in a result; null when the route sells none of it. */
function productValue(r: ScenarioResult, params: Params): { product: ProductBreakEven["product"]; unit: ProductBreakEven["unit"]; unitEur: number; lhvKwhNm3?: number } | null {
  const line = (...ids: string[]) => r.opexRev.revenue.filter((x) => ids.includes(x.id)).reduce((a, x) => a + x.eur, 0);
  const e = r.energy;
  if (r.route === "chp") {
    const kwh = e.elSelfConsumedKwh + e.elExportedKwh;
    const eur = line("el_self", "el_export");
    return kwh > 0 && eur > 0 ? { product: "electricity", unit: "EUR/kWh", unitEur: eur / kwh } : null;
  }
  if (r.route === "boiler") {
    const eur = line("heat");
    return e.heatUsefulKwh > 0 && eur > 0 ? { product: "heat", unit: "EUR/kWh th", unitEur: eur / e.heatUsefulKwh } : null;
  }
  const eur = line("biomethane");
  const lhv = params.get("eng.ch4_lhv_kwh_m3") * (e.biomethaneCh4Share ?? params.get("eng.biomethane_ch4_purity"));
  return e.biomethaneNm3 > 0 && eur > 0 ? { product: "biomethane", unit: "EUR/Nm3", unitEur: eur / e.biomethaneNm3, lhvKwhNm3: lhv } : null;
}

/** Monte Carlo draws (Latin hypercube): stratified, so 160 draws give stable P10–P90 for display. */
export const MC_DRAWS = 160;

/** Plant sizes shown in the scale comparison, as multiples of the entered feedstock. */
const SCALE_STEPS = [0.5, 0.75, 1, 1.5, 2, 3];

/** Customer energy prices more than this factor above the national business price (or below it, for gas) are flagged as likely unit slips (judgement). */
const PRICE_BAND = 3;
/** A supplier CAPEX quote more than this factor above or below the model's own estimate is flagged (judgement). */
const QUOTE_BAND = 2.5;

/** First path of a NaN/±Infinity number in the input, so garbage fails loudly instead of surfacing as NaN in a report. */
function nonFiniteInputPath(value: unknown, path = "input"): string | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? undefined : path;
  if (!value || typeof value !== "object") return undefined;
  for (const [k, v] of Object.entries(value)) { const bad = nonFiniteInputPath(v, `${path}.${k}`); if (bad) return bad; }
  return undefined;
}

/**
 * `uncertainty: false` skips the value-of-information runs and the Monte Carlo (about 300 extra runs) for bulk or what-if use.
 * `lite: true` keeps only what a scenario preview shows — verdict, robustness, ranges, routes, data confidence (≈ 13 runs):
 * no stress tests, parameter sensitivity, break-even search, plant-size table, quote check, support cases, EVPI or Monte
 * Carlo. Those fields come back empty; `lite.test.ts` proves the verdict, ranges and confidence equal the full run.
 */
type AssessOptions = { lang?: CoreLang; asOfDate?: string; uncertainty?: boolean; lite?: boolean; reactor?: "tank" | "lagoon" };

/**
 * Where a covered lagoon is eligible (liquid feed, warm enough: `lagoonEligible`), both digester types are assessed and the
 * other one is reported as `technologyAlternative`. From a 20 °C annual mean the higher base NPV is the headline; between
 * `eng.lagoon_min_mean_c` and 20 °C the lagoon yield rests on 7 US plants (LOW), so it is shown but never the headline.
 */
export function assess(input: Assessment["input"], country: CountryAdapter, opts: AssessOptions = {}): Assessment {
  // Invalid input goes straight to the single run, which raises the proper error.
  if (opts.reactor || input.process || !input.feedstocks.length || input.countryCode !== country.code || nonFiniteInputPath(input) || !BUSINESS_TYPES[input.businessType]) return assessOne(input, country, opts);
  const region = projectRegion(input, country);
  const params = buildParams(country, input.regionId, input.energy, input.city);
  const warm = meanTemp(region.monthlyTempC) >= 20;
  if (meanTemp(region.monthlyTempC) < params.get("eng.lagoon_min_mean_c")) return assessOne(input, country, opts);
  // A supplier quote is for one technology: keep the climate default (lagoon from 20 °C) instead of re-choosing.
  if ((input.finance?.capexQuoteLocal ?? 0) > 0) return assessOne(input, country, { ...opts, reactor: warm ? "lagoon" : "tank" });
  const quick = { ...opts, lite: true, uncertainty: false };
  const tank = assessOne(input, country, { ...quick, reactor: "tank" });
  const dm = tank.routesBase[tank.bestRoute].feed.dryMatterPct;
  if (!lagoonEligible(dm, { input, region, params })) return assessOne(input, country, { ...opts, reactor: "tank" });
  const lagoon = assessOne(input, country, { ...quick, reactor: "lagoon" });
  const npv = (a: Assessment) => a.routesBase[a.bestRoute].fin.npvEur;
  const pick = warm && npv(lagoon) >= npv(tank) ? "lagoon" : "tank";
  const other = pick === "lagoon" ? tank : lagoon;
  const out = assessOne(input, country, { ...opts, reactor: pick });
  const o = other.routesBase[other.bestRoute], c = out.routesBase[out.bestRoute];
  const T = tr(opts.lang ?? input.lang ?? "en"), D = fmtDec(opts.lang ?? input.lang ?? "en");
  out.technologyAlternative = { digestion: o.design.tech.digestion, label: o.design.tech.primary, npvEur: o.fin.npvEur, capexEur: o.capex.totalEur, ch4M3Year: o.feed.ch4M3Year };
  out.warnings.push(T("Both digester types were assessed for this liquid feed and climate. Chosen: {chosen} (NPV €{npvChosen}); alternative: {other} (NPV €{npvOther}, CAPEX €{capexOther}). A covered lagoon is cheaper but gives ≈ {lagoonPct} % of a heated tank's gas (EPA AgSTAR) and needs land.", {
    chosen: c.design.tech.primary, npvChosen: D(Math.round(c.fin.npvEur)), other: o.design.tech.primary, npvOther: D(Math.round(o.fin.npvEur)), capexOther: D(Math.round(o.capex.totalEur)),
    lagoonPct: meanTemp(region.monthlyTempC) < 20 ? Math.round(params.get("eng.lagoon_yield_factor") * 100) : 100 }));
  return out;
}

function assessOne(input: Assessment["input"], country: CountryAdapter, opts: AssessOptions = {}): Assessment {
  const badPath = nonFiniteInputPath(input);
  if (badPath) throw new Error(`Input contains a non-finite number at ${badPath}`);
  if (!BUSINESS_TYPES[input.businessType]) throw new Error("Unknown business");
  if (input.process) { processSchema.parse(input.process); if (input.feedstocks.length) throw new Error("Use one physical input basis, not simultaneous AD feedstocks and process data"); }
  if (!modelsForBusiness(input.businessType).includes(input.process?.kind ?? "ad")) throw new Error("Select the appropriate process and supply its input data");
  if (input.countryCode !== country.code) throw new Error("Project country does not match the country adapter");
  projectRegion(input, country);
  const asOfDate = opts.asOfDate ?? DATA_REVIEW_AS_OF;
  if (!isoDate(asOfDate)) throw new Error("Invalid assessment date");
  const lang: CoreLang = opts.lang ?? input.lang ?? "en";
  const T = tr(lang);
  const routeWord: Record<RouteId, string> = { chp: T("CHP"), boiler: T("boiler"), biomethane: T("biomethane") };
  const D = fmtDec(lang);
  const params = buildParams(country, input.regionId, input.energy, input.city);
  const ctxOf = (...a: Parameters<typeof makeCtx>): RunContext => ({ ...makeCtx(...a), reactor: opts.reactor });
  const fx = params.get("econ.fx_local_per_eur");
  const run = (route: RouteId, scn: ScenarioId, mods: Modifiers = NO_MODS, support?: SupportScheme) =>
    runScenarioRoute(ctxOf(input, country, params, scn, mods, lang, support), route);

  // ---- full route × scenario matrix ----
  const matrix = {} as Assessment["routeMatrix"];
  for (const r of ROUTES) {
    matrix[r] = {} as Record<ScenarioId, ScenarioResult>;
    for (const s of SCENARIO_ORDER) matrix[r][s] = run(r, s);
  }

  // ---- choose route on base NPV among technically sensible routes ----
  const minChp = params.get("eng.chp_min_kw");
  const minBio = params.get("eng.upgrade_min_nm3h");
  const eligible = ROUTES.filter((r) => {
    const b = matrix[r].base;
    if (r === "chp") return b.energy.chpKwEl >= minChp;
    if (r === "biomethane") return b.energy.rawBiogasNm3PerHour >= minBio;
    return true;
  });
  const pool = eligible.length ? eligible : ROUTES;
  const bestRoute = [...pool].sort((a, b) => matrix[b].base.fin.npvEur - matrix[a].base.fin.npvEur)[0];

  const base = matrix[bestRoute].base;
  const cons = matrix[bestRoute].conservative;
  const opt = matrix[bestRoute].optimistic;
  const ctxBase = ctxOf(input, country, params, "base", NO_MODS, lang);
  const demand = customerDemand(ctxBase);
  // Isolate evidence for the selected base route; the main usage log also includes alternatives and what-if runs.
  const selectedParams = params.fork();
  runScenarioRoute(ctxOf(input, country, selectedParams, "base", NO_MODS, lang), bestRoute);
  const usedMarket = selectedParams.usedIds().filter((id) => id.startsWith("econ.") || id === "eng.invoice_variable_share");
  const marketEvidence = usedMarket.filter((id) => id !== "econ.electricity_retail_eur_kwh" || !demand.electricityPriceKnown).map((id) => params.prov(id));
  if (demand.electricityPriceKnown) marketEvidence.push(prov(
    "econ.electricity_retail_eur_kwh", "Customer electricity price (invoice split not verified)", demand.electricityPriceEurKwh, "EUR/kWh", "CALCULATION",
    `USER_INPUT ${input.energy.electricityPriceLocalPerKwh} ${country.currency}/kWh / FX ${fx}; ${params.prov("econ.fx_local_per_eur").source}. Invoice date not supplied; energy/demand split assumed separately.`, "MEDIUM",
    { country: country.code, date: "undated", origin: "USER_INPUT" },
  ));
  const userEvidence = (id: string, label: string, valueEur: number, unit: string, source: string) =>
    marketEvidence.push(prov(id, label, valueEur, unit, "CALCULATION", `USER_INPUT ${source} / FX ${fx}. Not independently verified (no contract or invoice date supplied).`, "MEDIUM", { country: country.code, date: "undated", origin: "USER_INPUT" }));
  if (demand.heatValueKnown) {
    const direct = (input.energy.heatPriceLocalPerKwh ?? 0) > 0;
    userEvidence("econ.heat_value_eur_kwh_th", direct ? "Heat price agreed with the buyer" : "Useful heat displaced at customer gas price", demand.heatValueEurKwh, "EUR/kWh th",
      direct ? `${input.energy.heatPriceLocalPerKwh} ${country.currency}/kWh th` : `${input.energy.gasPriceLocalPerM3} ${country.currency}/m3 / assumed natural-gas LHV / boiler efficiency`);
  }
  if ((input.energy.exportPriceLocalPerKwh ?? 0) > 0 && base.energy.elExportedKwh > 0) userEvidence("econ.electricity_spot_eur_kwh", "Customer export price (PPA / tariff)", input.energy.exportPriceLocalPerKwh! / fx, "EUR/kWh", `${input.energy.exportPriceLocalPerKwh} ${country.currency}/kWh`);
  if ((input.finance?.operatorWageLocalPerHour ?? 0) > 0) userEvidence("econ.operator_wage_eur_h", "Customer operator cost per hour", input.finance!.operatorWageLocalPerHour! / fx, "EUR/h", `${input.finance!.operatorWageLocalPerHour} ${country.currency}/h`);
  const quoteApplies = base.capex.modelledEur !== undefined;
  if (quoteApplies) userEvidence("econ.capex_quote_eur", `Supplier quote for the ${bestRoute} route (replaces the modelled CAPEX)`, base.capex.totalEur, "EUR", `${input.finance!.capexQuoteLocal} ${country.currency} installed, scenario multiplier 1.0 in base case`);
  if (input.finance?.debtRate !== undefined) userEvidence("econ.debt_interest", "Customer loan interest rate", input.finance.debtRate, "—", `${fmtDec("en")(input.finance.debtRate * 100, 1)} %`);
  const actualEvidence = new Map(selectedParams.usedIds().map((id) => [id, params.prov(id)]));
  for (const p of [...marketEvidence, ...(base.process?.provenance ?? [])]) actualEvidence.set(p.id, p);
  const dataAudit: NonNullable<Assessment["dataAudit"]> = {
    modelVersion: MODEL_VERSION,
    dataVersion: fingerprint({ catalog: CATALOG_VERSION, parameters: params.all(), process: base.process?.provenance, region: ctxBase.region, support: country.support }),
    inputVersion: fingerprint(input),
    asOfDate,
    checks: [...actualEvidence.values()].map((p) => checkEvidence(p, asOfDate)),
  };
  const lite = opts.lite === true;
  const rangeIds = lite ? [] : usedMarket.filter((id) => {
    if (!params.prov(id).range) return false;
    if (id === "econ.electricity_retail_eur_kwh") return !demand.electricityPriceKnown;
    if ((id === "eng.invoice_variable_share" || id === "econ.self_consumption_variable_share") && base.energy.elSelfConsumedKwh <= 0) return false;
    if (id.startsWith("econ.fert_")) return base.opexRev.revenue.some((line) => line.id === "digestate" && line.eur > 0);
    return (id.startsWith("econ.capex_factor_") && !quoteApplies) || id === "eng.invoice_variable_share" || id === "econ.self_consumption_variable_share" || id === "econ.discount_rate";
  });
  const parameterSensitivity = rangeIds.map((id) => {
    const { low, high, basis } = params.prov(id).range!;
    const npvAt = (value: number) => {
      const overrides: Record<string, number> = { [id]: value };
      if (id === "econ.electricity_retail_eur_kwh" && value > 0) {
        // Keep the same fixed charges when varying the energy rate; avoid inventing a demand-charge saving.
        const fixed = params.get(id) * (1 - params.get("econ.self_consumption_variable_share"));
        overrides["econ.self_consumption_variable_share"] = Math.max(0, Math.min(1, (value - fixed) / value));
      }
      return runScenarioRoute(ctxOf(input, country, params.with(overrides), "base", NO_MODS, lang), bestRoute).fin.npvEur;
    };
    return { parameterId: id, lowInput: low, highInput: high, lowNpvEur: npvAt(low), highNpvEur: npvAt(high), basis };
  });
  if (input.process && !lite) {
    const process = input.process;
    const keys = process.kind === "landfill" ? ["decayPerYear", "potentialNm3T", "collectionPct"]
      : process.kind === "wastewater" ? ["codMgL", "removalPct", "avoidedTreatmentLocalM3"]
      : process.kind === "gas" ? ["rawGasNm3Hour", "declinePctYear", "gasPriceLocalNm3"] : ["bmp", "tonnesYear", "hrtDays"];
    for (const key of [...keys, "processOpexLocalYear", "residualCostLocalT"]) {
      const value = Number((process as unknown as Record<string, unknown>)[key]);
      if (!(value > 0)) continue;
      const bounds = processBounds(process.kind,key);
      const low = Math.max(bounds.low,value * (1 - process.uncertaintyPct / 100)), high = Math.min(bounds.high,value * (1 + process.uncertaintyPct / 100));
      const lower = processSchema.safeParse({ ...process, [key]: low });
      const upper = processSchema.safeParse({ ...process, [key]: high });
      // A bounded physical parameter is never extended beyond its schema to fabricate a range.
      if (!lower.success || !upper.success) continue;
      const at = (next: typeof process) => runScenarioRoute(ctxOf({ ...input, process: next }, country, params.fork(), "base", NO_MODS, lang), bestRoute).fin.npvEur;
      parameterSensitivity.push({ parameterId: `process.${key}`, lowInput: low, highInput: high, lowNpvEur: at(lower.data), highNpvEur: at(upper.data), basis: "engineering" });
    }
  }

  // ---- sensitivity (best route, base scenario) ----
  const tests: Array<[string, string, Partial<Modifiers>]> = [
    ["yield", T("Methane yield −20 %"), { methaneYield: 0.8 }],
    ["capex", "CAPEX +20 %", { capex: 1.2 }],
    ["maintenance", T("Maintenance +30 %"), { maintenance: 1.3 }],
    ["energy_price", T("Energy prices −20 %"), { energyPrice: 0.8 }],
    ["heat_use", T("Heat use −50 %"), { heatUse: 0.5 }],
    ["feedstock", T("Loss of 20 % of feedstock"), { feedstock: 0.8 }],
    input.process ? ["process_opex", "OPEX +30 %", { opex: 1.3 }] : ["transport", T("Logistics +50 %"), { transport: 1.5 }],
    ["downtime", T("CHP downtime +10 pp"), { extraDowntimePp: 10 }],
  ];
  const sensitivity: SensitivityItem[] = lite ? [] : tests.map(([id, label, m]) => {
    let r = run(bestRoute, "base", { ...NO_MODS, ...m });
    // Feedstock or yield shortfall shows up after construction: the plant was built for the base case, so CAPEX stays as built.
    if ((m.feedstock !== undefined || m.methaneYield !== undefined) && r.capex.totalEur > 0) r = run(bestRoute, "base", { ...NO_MODS, ...m, capex: base.capex.totalEur / r.capex.totalEur });
    return {
      id,
      label,
      npvEur: r.fin.npvEur,
      deltaNpvEur: r.fin.npvEur - base.fin.npvEur,
      paybackYears: r.fin.simplePaybackYears,
      breaks: base.fin.npvEur >= 0 && r.fin.npvEur < 0,
    };
  }).sort((a, b) => a.deltaNpvEur - b.deltaNpvEur);

  // ---- break-even ----
  let capexRed: number | null = null;
  let priceInc: number | null = null;
  // Absolute break-even values. NPV is linear in CAPEX, in the product price and in a per-tonne feedstock cost, so two
  // runs give the exact root (no search tolerance).
  const npv0 = base.fin.npvEur;
  const capexK = zeroAt(1, npv0, 2, run(bestRoute, "base", { ...NO_MODS, capex: 2 }).fin.npvEur);
  if (base.fin.npvEur >= 0) {
    capexRed = 0;
    priceInc = 0;
  } else if (lite) {
    // Same root as the bisection below (NPV is linear in the CAPEX multiplier); the energy-price search is skipped.
    capexRed = capexK !== null && capexK >= 0.05 && capexK <= 1 ? (1 - capexK) * 100 : null;
  } else {
    const x = bisect((c) => run(bestRoute, "base", { ...NO_MODS, capex: c }).fin.npvEur, 0.05, 1);
    capexRed = x === null ? null : (1 - x) * 100;
    const y = bisect((k) => run(bestRoute, "base", { ...NO_MODS, energyPrice: k }).fin.npvEur, 1, 4);
    priceInc = y === null ? null : (y - 1) * 100;
  }
  const product = productValue(base, params);
  const productK = product ? zeroAt(1, npv0, 2, run(bestRoute, "base", { ...NO_MODS, productPrice: 2 }).fin.npvEur) : null;
  const feedT = !input.process && base.feed.tonnesYear > 0 ? zeroAt(0, npv0, 10, run(bestRoute, "base", { ...NO_MODS, feedstockEurT: 10 }).fin.npvEur) : null;
  const breakEven: Assessment["breakEven"] = {
    capexReductionPct: capexRed,
    energyPriceIncreasePct: priceInc,
    maxCapexEur: capexK !== null && capexK > 0 ? base.capex.totalEur * capexK : null,
    product: product && productK !== null ? {
      product: product.product,
      unit: product.unit,
      currentEur: product.unitEur,
      breakEvenEur: product.unitEur * productK,
      ...(product.lhvKwhNm3 ? { currentEurMwh: (product.unitEur / product.lhvKwhNm3) * 1000, breakEvenEurMwh: (product.unitEur * productK / product.lhvKwhNm3) * 1000 } : {}),
    } : null,
    feedstockEurT: feedT,
  };

  // ---- cross-cutting assessments ----
  const gasKwh = base.energy.gasEnergyKwh || 1;
  const energyRev = base.opexRev.revenue.filter((r) => ["el_self", "el_export", "heat", "biomethane"].includes(r.id)).reduce((a, r) => a + r.eur, 0);
  const energyValuePerKwh = energyRev / gasKwh;
  const logistics = assessLogistics(base.feed, ctxBase, energyValuePerKwh > 0 ? energyValuePerKwh : 0.04);
  const digestate = assessDigestate(base.feed, ctxBase);
  const methane = methaneCheck(base, cons, opt, params, T);
  const safety = safetyRegister(input, base.feed, lang);

  let regItems = country.regulatory({
    route: bestRoute,
    kwElEquivalent: base.kwElEquivalent,
    tonnesYear: input.process && input.process.kind !== "residue" ? 0 : base.feed.tonnesYear,
    abpTonnesYear: base.feed.abpTonnesYear,
    digestateTonnesYear: digestate.tonnesYear,
    neighboursWithin300m: !!input.site.neighboursWithin300m,
    nearProtectedOrWaterArea: !!input.site.nearProtectedOrWaterArea,
    exportsElectricity: base.energy.elExportedKwh > 0,
    gasGridInjection: bestRoute === "biomethane" && biomethaneOfftake(ctxBase, base.energy).mode === "grid",
    lang,
  });
  if (input.process) {
    // A wastewater flow is not a solid-waste throughput; land spreading is not assumed.
    regItems = regItems.filter(r => !["eu.nitrates","uk.nvz","ca.nutrient","ua.digestate"].includes(r.id));
    regItems.push({ id: "process.basis", status: "TO_VERIFY", effort: "HIGH",
      title: input.process.kind === "wastewater"
        ? T("Confirm discharge limits, final polishing and sludge disposal authorisations")
        : input.process.kind === "landfill"
          ? T("Confirm landfill permit, gas collection obligations and aftercare responsibilities")
          : input.process.kind === "gas"
            ? T("Confirm gas transfer contract, inlet quality and approvals for the new gas-use equipment")
            : T("Confirm material classification, pretreatment requirements and lawful residuals disposal"),
      appliesBecause: T("Process-specific site conditions; no automatic legal eligibility") });
  }
  const pointsOf = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
  const regPoints = regItems.reduce((a, i) => a + pointsOf[i.effort], 0);
  const regComplexity = regPoints >= 17 ? "HIGH" : regPoints >= 13 ? "MEDIUM" : "LOW";

  const priceIds: string[] = [];
  if (!demand.electricityPriceKnown && (base.energy.elSelfConsumedKwh > 0 || base.energy.elPurchasedKwh > 0)) priceIds.push("econ.electricity_retail_eur_kwh");
  if (base.energy.elExportedKwh > 0 && !((input.energy.exportPriceLocalPerKwh ?? 0) > 0)) priceIds.push("econ.electricity_spot_eur_kwh");
  // Heat value is a client-answerable proxy only where the form shows a heat or gas price (heat sold or used on site).
  if (!demand.heatValueKnown && base.energy.heatUsefulKwh > 0) priceIds.push("econ.heat_value_eur_kwh_th");
  const bmOffer = (input.energy.biomethanePriceLocalPerMwhHhv ?? 0) > 0;
  if (bestRoute === "biomethane" && !bmOffer) priceIds.push("econ.biomethane_price_base_eur_nm3");
  const capexId = params.has(`econ.capex_factor_${bestRoute}`) ? `econ.capex_factor_${bestRoute}` : "econ.capex_factor";
  // Entered prices far from the market usually mean a unit slip (ct vs €, € vs local currency, per MWh vs per kWh).
  // Electricity: large consumers on wholesale contracts pay well below the business tariff, so the floor is half the spot price.
  const local = (eur: number) => fmtSig(lang)(eur * fx);
  const priceSlips: string[] = [];
  const elLow = params.get("econ.electricity_spot_eur_kwh") / 2, elHigh = params.get("econ.electricity_retail_eur_kwh") * PRICE_BAND;
  if (demand.electricityPriceKnown && (demand.electricityPriceEurKwh < elLow || demand.electricityPriceEurKwh > elHigh)) priceSlips.push(T("The entered electricity price ({electricityPriceLocalPerKwh} {currency}/kWh) is outside the plausible range for this country ({elLow}–{elHigh} {currency}/kWh): check the unit (per kWh, {currency}, not cents or MWh).", { electricityPriceLocalPerKwh: input.energy.electricityPriceLocalPerKwh!, currency: country.currency, elLow: local(elLow), elHigh: local(elHigh) }));
  const heatMarket = params.get("econ.heat_value_eur_kwh_th");
  if (demand.heatValueKnown && (demand.heatValueEurKwh < heatMarket / PRICE_BAND || demand.heatValueEurKwh > heatMarket * PRICE_BAND)) priceSlips.push(T("The entered gas or heat price differs more than {PRICE_BAND}× from the national business level ({heatMarket} {currency}/kWh of heat): check the unit (gas per m³, heat per kWh, in {currency}).", { PRICE_BAND, heatMarket: local(heatMarket), currency: country.currency }));
  const exportEur = (input.energy.exportPriceLocalPerKwh ?? 0) / fx;
  if (exportEur > 0 && (exportEur < elLow || exportEur > elHigh)) priceSlips.push(T("The entered export price ({exportPriceLocalPerKwh} {currency}/kWh) is outside the plausible range for this country ({elLow}–{elHigh} {currency}/kWh): check the unit (per kWh, {currency}, not cents or MWh).", { exportPriceLocalPerKwh: input.energy.exportPriceLocalPerKwh!, currency: country.currency, elLow: local(elLow), elHigh: local(elHigh) }));
  if (bmOffer) {
    const market = buildParams(country, input.regionId, { ...input.energy, biomethanePriceLocalPerMwhHhv: undefined }, input.city).get("econ.biomethane_price_base_eur_nm3");
    const offer = params.get("econ.biomethane_price_base_eur_nm3");
    if (offer < market / PRICE_BAND || offer > market * PRICE_BAND) priceSlips.push(T("The entered biomethane price ({biomethanePriceLocalPerMwhHhv} {currency}/MWh HHV) differs more than {PRICE_BAND}× from the national estimate ({fx} {currency}/MWh HHV): check the unit (per MWh, not per kWh or Nm³, in {currency}) and that it excludes state tariffs or premiums.", { biomethanePriceLocalPerMwhHhv: input.energy.biomethanePriceLocalPerMwhHhv!, currency: country.currency, PRICE_BAND, fx: local(market / offer * input.energy.biomethanePriceLocalPerMwhHhv! / fx) }));
  }
  const wageMarket = params.get("econ.labour_official_eur_h") * params.get("econ.operator_wage_ratio");
  const wageEur = (input.finance?.operatorWageLocalPerHour ?? 0) / fx;
  if (wageEur > 0 && (wageEur < wageMarket / PRICE_BAND || wageEur > wageMarket * PRICE_BAND)) priceSlips.push(T("The entered operator cost ({operatorWageLocalPerHour} {currency}/h) differs more than {PRICE_BAND}× from the national estimate ({wageMarket} {currency}/h): check that it is per hour, fully loaded, in {currency}.", { operatorWageLocalPerHour: input.finance!.operatorWageLocalPerHour!, currency: country.currency, PRICE_BAND, wageMarket: local(wageMarket) }));
  // A supplier quote is checked against the model for the same route: far outside, it is more likely a unit or scope slip.
  const quoteInfo: string[] = [];
  const qIn = input.finance;
  if (!input.process && qIn?.capexQuoteRoute && (qIn.capexQuoteLocal ?? 0) > 0) {
    const qc = matrix[qIn.capexQuoteRoute].base.capex;
    const ratio = qc.modelledEur ? qc.totalEur / qc.modelledEur : 1;
    const routeName = routeWord[qIn.capexQuoteRoute];
    if (ratio < 1 / QUOTE_BAND || ratio > QUOTE_BAND) priceSlips.push(T("The supplier quote ({capexQuoteLocal} {currency}) is {ratio}× the model's own {routeName} estimate ({modelledEur} {currency}): check the currency, the scope (digester, gas use, grid connection, engineering) and whether it is for the same capacity.", { capexQuoteLocal: input.finance!.capexQuoteLocal!, currency: country.currency, ratio: D(ratio, 1), routeName, modelledEur: local(qc.modelledEur ?? 0) }));
    if (qIn.capexQuoteRoute !== bestRoute) quoteInfo.push(T("Your supplier quote is for the {routeName} route, but the model finds the {bestRoute} route more profitable, so the quote is not used in the headline result. It is used in the route comparison.", { routeName, bestRoute: routeWord[bestRoute] }));
  }
  // ---- what to verify first (value of information) ----
  // Each input's plausible range, three runs (low / base / high), EVPI for the build decision. Inputs the client already
  // supplied (lab yield, supplier quote, own prices) have no range left and do not appear.
  let measureFirst: MeasureItem[] | undefined;
  const uncertainty = !lite && opts.uncertainty !== false && !input.process;
  if (uncertainty) {
    const items: MeasureItem[] = [];
    const add = (kind: MeasureKind, x: [number, number, number], n: [number, number], parameterId?: string) => {
      const { evpi: value } = evpi({ low: [x[0], n[0]], base: [x[1], npv0], high: [x[2], n[1]] });
      items.push({ kind, ...(parameterId ? { parameterId } : {}), lowNpvEur: n[0], highNpvEur: n[1], evpiEur: value, flips: Math.min(n[0], n[1], npv0) < 0 && Math.max(n[0], n[1], npv0) > 0 });
    };
    const npvWith = (m: Partial<Modifiers>) => run(bestRoute, "base", { ...NO_MODS, ...m }).fin.npvEur;
    // Methane yield: catalogue low–high for streams without a lab value, weighted by their methane.
    const lines = base.feed.lines.filter((l) => l.ch4M3Year > 0);
    const lab = (l: (typeof lines)[number]) => input.feedstocks.find((f) => f.id === l.id)?.methaneYieldLPerKgVs !== undefined;
    const ch4 = lines.reduce((a, l) => a + l.ch4M3Year, 0);
    if (ch4 > 0 && lines.some((l) => !lab(l))) {
      const ratio = (end: "yieldLow" | "yieldHigh") => lines.reduce((a, l) => a + l.ch4M3Year * (lab(l) ? 1 : FEEDSTOCKS[l.typeId][end] / FEEDSTOCKS[l.typeId].yieldTyp), 0) / ch4;
      const lo = ratio("yieldLow"), hi = ratio("yieldHigh");
      add("yield", [lo, 1, hi], [npvWith({ methaneYield: lo }), npvWith({ methaneYield: hi })]);
    }
    // Manure quantity per head: the catalogue range for herds (waste streams are entered as tonnes).
    // Measured manure tonnes have no per-head range left.
    const perHead = (f: (typeof input.feedstocks)[number] | undefined) => Boolean(f?.animal && !((f.measuredTonnesYear ?? 0) > 0));
    const herd = input.feedstocks.filter((f) => perHead(f) && f.quantity > 0);
    if (herd.length) {
      const share = (end: "rangeLow" | "rangeHigh") => {
        let w = 0, t = 0;
        for (const l of lines) {
          const f = input.feedstocks.find((x) => x.id === l.id);
          const a = perHead(f) ? ANIMALS[f!.animal!] : undefined;
          w += l.ch4M3Year * (a ? a[end] / a.tonnesPerHeadYear : 1);
          t += l.ch4M3Year;
        }
        return t > 0 ? w / t : 1;
      };
      const lo = share("rangeLow"), hi = share("rangeHigh");
      add("quantity", [lo, 1, hi], [npvWith({ feedstock: lo }), npvWith({ feedstock: hi })]);
    }
    // Third-party streams: promised tonnage may not arrive (contracts, competition, seasons). Experts list supply security first.
    if (input.feedstocks.some((f) => f.delivered && f.quantity > 0)) {
      const lo = params.get("eng.supply_shortfall_low");
      add("supply", [lo, 1, 1], [npvWith({ deliveredFeedstock: lo }), npv0]);
    }
    // Purchased streams and gate fees move over the loan period even when today's price is known.
    if (base.feed.lines.some((l) => Math.abs(l.purchaseCostEurYear) > 0)) {
      const s = params.get("eng.feed_price_shift");
      add("feed_price", [-s, 0, s], [npvWith({ tradedPriceShift: -s }), npvWith({ tradedPriceShift: s })]);
    }
    // Market evidence ranges already run per parameter; CAPEX without a quote is the supplier-quote item.
    const kindOf = (id: string): MeasureKind => id.startsWith("econ.capex_factor") ? "capex" : id === "econ.electricity_retail_eur_kwh" ? "electricity_price" : id === "econ.electricity_spot_eur_kwh" ? "export_price"
      : id === "econ.heat_value_eur_kwh_th" ? "heat_price" : id.startsWith("econ.fert_") ? "fertiliser" : id.includes("variable_share") ? "bill_structure" : "market";
    for (const ps of parameterSensitivity) add(kindOf(ps.parameterId), [ps.lowInput, params.get(ps.parameterId), ps.highInput], [ps.lowNpvEur, ps.highNpvEur], ps.parameterId);
    if (!quoteApplies && !parameterSensitivity.some((ps) => ps.parameterId.startsWith("econ.capex_factor"))) {
      const { conservative: c, optimistic: o } = SCENARIOS;
      add("capex", [o.capexMult, 1, c.capexMult], [npvWith({ capex: o.capexMult }), npvWith({ capex: c.capexMult })]);
    }
    if (base.energy.heatUsefulKwh > 0 && !(input.energy.heatPriceLocalPerKwh && input.energy.heatPriceLocalPerKwh > 0)) {
      const { conservative: c, base: b, optimistic: o } = SCENARIOS;
      add("heat_buyer", [c.heatUtilisation / b.heatUtilisation, 1, o.heatUtilisation / b.heatUtilisation], [npvWith({ heatUse: c.heatUtilisation / b.heatUtilisation }), npvWith({ heatUse: o.heatUtilisation / b.heatUtilisation })]);
    }
    if (bestRoute === "biomethane" && !bmOffer) {
      const bm = (k: string) => params.get(`econ.biomethane_price_${k}_eur_nm3`);
      const lo = bm("cons") / bm("base"), hi = bm("opt") / bm("base");
      add("offtake", [lo, 1, hi], [npvWith({ productPrice: lo }), npvWith({ productPrice: hi })]);
    }
    // One line per action (N, P and K prices are one fertiliser check): keep the strongest item of each kind.
    measureFirst = items.sort((x, y) => y.evpiEur - x.evpiEur || Math.abs(y.highNpvEur - y.lowNpvEur) - Math.abs(x.highNpvEur - x.lowNpvEur))
      .filter((m, i, all) => all.findIndex((o) => o.kind === m.kind) === i);
  }

  // ---- Monte Carlo over the scenario quantities (chosen route) ----
  let monteCarlo: MonteCarloResult | undefined;
  if (uncertainty) {
    // Catalogue DM × VS (unless the client measured both) and lab BMP values carry their own bands; one methane factor
    // per draw, weighted by each stream's base methane. Catalogue BMP is already covered by the scenario yield range.
    const solidsBand = params.get("eng.unc_catalogue_solids"), labBand = params.get("eng.unc_lab_bmp");
    const streams = base.feed.lines.filter((l) => l.ch4M3Year > 0).map((l) => {
      const f = input.feedstocks.find((x) => x.id === l.id);
      return { ch4: l.ch4M3Year, measured: f?.dryMatterPct !== undefined && f?.vsPctOfDm !== undefined, lab: f?.methaneYieldLPerKgVs !== undefined };
    });
    const ch4Total = streams.reduce((a, s) => a + s.ch4, 0);
    const methaneFactor = (solidsU: number, labU: number) => ch4Total > 0
      ? streams.reduce((a, s) => a + s.ch4 * (s.measured ? 1 : triangular(solidsU, 1 - solidsBand, 1, 1 + solidsBand)) * (s.lab ? triangular(labU, 1 - labBand, 1, 1 + labBand) : 1), 0) / ch4Total
      : 1;
    const draws = latinHypercube(MC_DRAWS, MC_DIMS).map((u) => {
      const { scenario, biomethaneU, solidsU, labU } = sampleScenario(u);
      const bm = (k: string) => params.get(`econ.biomethane_price_${k}_eur_nm3`);
      const priced = params.with({ "econ.biomethane_price_base_eur_nm3": triangular(biomethaneU, Math.min(bm("cons"), bm("opt")), bm("base"), Math.max(bm("cons"), bm("opt"))) });
      const ctx = { ...ctxOf(input, country, priced, "base", { ...NO_MODS, methaneYield: methaneFactor(solidsU, labU) }, lang), scenario };
      return runScenarioRoute(ctx, bestRoute).fin;
    });
    const npvs = draws.map((f) => f.npvEur).sort((x, y) => x - y);
    const paybacks = draws.map((f) => f.simplePaybackYears ?? Infinity).sort((x, y) => x - y);
    const p50pb = percentile(paybacks, 0.5);
    monteCarlo = {
      n: MC_DRAWS,
      p10NpvEur: percentile(npvs, 0.1), p50NpvEur: percentile(npvs, 0.5), p90NpvEur: percentile(npvs, 0.9),
      probPositive: npvs.filter((v) => v > 0).length / npvs.length,
      p50PaybackYears: Number.isFinite(p50pb) ? p50pb : null,
    };
  }

  // Scale: the same mix at other sizes, re-sized from scratch (no quote, since a quote is for one size).
  const scale: ScalePoint[] | undefined = input.process || lite ? undefined : SCALE_STEPS.map((m) => {
    // Delivered streams come from a supply area that grows with the quantity: haul distance × √size (uniform density).
    const scaled = { ...input, feedstocks: input.feedstocks.map((f) => ({ ...f, quantity: f.quantity * m, ...(f.delivered && f.distanceKm ? { distanceKm: f.distanceKm * Math.sqrt(m) } : {}) })), finance: input.finance && { ...input.finance, capexQuoteLocal: undefined, capexQuoteRoute: undefined } };
    const routes = {} as ScalePoint["routes"];
    for (const rt of ROUTES) {
      const x = runScenarioRoute(ctxOf(scaled, country, params.fork(), "base", NO_MODS, lang), rt);
      routes[rt] = { npvEur: x.fin.npvEur, capexEur: x.capex.totalEur, kwEl: x.kwElEquivalent, irr: x.fin.irr };
    }
    return { multiplier: m, tonnesYear: base.feed.tonnesYear * m, routes };
  });

  // The quote is compared with the model's own component estimate for the same route, without the quote, so the client
  // sees whether it sits inside the model's optimistic–conservative range and which items a complete scope contains.
  let quoteCheck: QuoteCheck | undefined;
  if (!input.process && !lite && qIn?.capexQuoteRoute && (qIn.capexQuoteLocal ?? 0) > 0) {
    const qr = qIn.capexQuoteRoute;
    const quoted = matrix[qr].base;
    const noQuote = { ...input, finance: { ...qIn, capexQuoteLocal: undefined, capexQuoteRoute: undefined } };
    const modelled = (scn: ScenarioId) => runScenarioRoute(ctxOf(noQuote, country, params.fork(), scn, NO_MODS, lang), qr).capex;
    const [mOpt, mBase, mCons] = (["optimistic", "base", "conservative"] as const).map(modelled);
    const k = zeroAt(1, quoted.fin.npvEur, 2, run(qr, "base", { ...NO_MODS, capex: 2 }).fin.npvEur);
    quoteCheck = {
      route: qr,
      quoteEur: quoted.capex.totalEur,
      modelledEur: mBase.totalEur,
      modelRangeEur: [mOpt.totalEur, mCons.totalEur],
      position: quoted.capex.totalEur < mOpt.totalEur ? "below" : quoted.capex.totalEur > mCons.totalEur ? "above" : "within",
      capacity: qr === "chp" ? { value: quoted.energy.chpKwEl, unit: "kWe" } : qr === "biomethane" ? { value: quoted.energy.rawBiogasDesignNm3PerHour, unit: "Nm3/h" } : null,
      maxCapexEur: k !== null && k > 0 ? quoted.capex.totalEur * k : null,
      scope: mBase.lines,
    };
  }
  const feedSlips = input.feedstocks.some((f) => (f.currentDisposalCostPerTonneLocal ?? 0) / fx > PLAUSIBLE_DISPOSAL_EUR_T || -(f.purchasePricePerTonneLocal ?? 0) / fx > PLAUSIBLE_GATE_FEE_EUR_T || (f.purchasePricePerTonneLocal ?? 0) / fx > PLAUSIBLE_PURCHASE_EUR_T);
  const quality = assessQuality(input, base, demand, T, { currency: country.currency, priceSlips: priceSlips.length + (feedSlips ? 1 : 0), profileOnly: priceIds.some((id) => params.prov(id).confidence === "LOW"), unvalidatedCapital: !quoteApplies && params.prov(capexId).confidence === "LOW" });
  if (input.process?.basisDate && input.process.basisDate > asOfDate) {
    const text = T("The supplied process basis is dated after the assessment; it cannot substantiate a current conclusion.");
    capQuality(quality, 34, { id: "process_basis_date", owner: "client", text });
    quality.reasons.push(text);
  }
  const expiredPrices = dataAudit.checks.filter((check) => (priceIds.includes(check.parameterId) && check.status === "EXPIRED") || (check.observedThrough && check.observedThrough > asOfDate) || (check.publishedOn && check.publishedOn > asOfDate));
  if (expiredPrices.length) {
    const text = T("A price affecting this route is expired or unavailable as of the assessment date; current applicable evidence is required before a verdict");
    capQuality(quality, 34, { id: "price_expired", owner: "model", text });
    quality.level = "LOW";
    quality.reasons.push(text);
  }
  const { scores, overall } = computeScores({
    input, base, cons, opt, demand, logistics, digestate,
    regulatoryPoints: regPoints,
    methaneLossShare: methane.lossShare,
    methaneLossGood: params.get("eng.methane_loss_good"),
    minChpKw: minChp,
    T,
  });
  // Model-side evidence gaps lower the displayed confidence and still block STRONG through the level, but they cannot
  // turn a complete client form into "insufficient data". Caps that exist to withhold a verdict (expired price,
  // future-dated or missing process basis) keep the full score.
  const blocking = quality.factors.some((f) => ["price_expired", "process_basis_date", "process_inputs"].includes(f.id));
  const advisoryPoints = blocking ? 0 : quality.factors.filter((f) => f.owner === "model" || ADVISORY_CLIENT_FACTORS.includes(f.id)).reduce((a, f) => a + f.points, 0);
  const verdict = decideVerdict({
    base, cons, opt, confidence: { level: quality.level, score: quality.score, clientScore: quality.score + advisoryPoints, labDone: !input.process && !quality.missingCodes.includes("lab") }, minKwEl: minChp, breakEven, lang,
  });
  if (input.process) verdict.whatWouldChange = [
    T("Verify the inlet analysis and operating history, seasonal availability, and a supplier guarantee for the proposed treatment train."),
    T("Confirm complete installed-cost quotations, residuals disposal, final effluent treatment and the energy offtake contract. Check the downside case before investment."),
    T("Obtain site-specific permits and grid gas-quality requirements; extend this pre-tax screening to tax, working capital and lender cash-flow modelling."),
  ];

  // ---- national support: separate cases, never in the verdict ----
  const manureMass = base.feed.tonnesYear > 0 ? base.feed.lines.filter((l) => l.category === "manure").reduce((a, l) => a + l.tonnesYear, 0) / base.feed.tonnesYear : 0;
  // Scheme rules are written for digesters fed with farm or organic-waste feedstock. For an existing gas source the
  // case is computed as "if eligible", never shown as eligible: the scheme's own gas-source category must confirm it.
  const gasSource = input.process && input.process.kind !== "residue" ? input.process.kind : undefined;
  const gasSourceName = gasSource === "wastewater" ? T("wastewater (sewage) gas") : gasSource === "landfill" ? T("landfill gas") : T("an existing biogas stream");
  const supportCases: SupportCase[] = lite ? [] : country.support.schemes.map((sc) => {
    const route = sc.routes.includes(bestRoute) ? bestRoute : sc.routes[0];
    const ref = matrix[route].base;
    const kw = ref.kwElEquivalent;
    let reason = "";
    if (sc.maxKwEl !== undefined && kw > sc.maxKwEl) reason = T("Plant ≈ {kw} kWe exceeds the {maxKwEl} kW limit.", { kw: Math.round(kw), maxKwEl: sc.maxKwEl });
    if (sc.minKwEl !== undefined && kw < sc.minKwEl) reason = T("Plant ≈ {kw} kWe is below the {minKwEl} kW minimum.", { kw: Math.round(kw), minKwEl: sc.minKwEl });
    if (sc.minManureShareMass !== undefined && manureMass < sc.minManureShareMass) reason = T("Manure is {manureMass} % of the mass; the scheme requires ≥ {minManureShareMass} %.", { manureMass: Math.round(manureMass * 100), minManureShareMass: Math.round(sc.minManureShareMass * 100) });
    if (route === "chp" && ref.energy.chpKwEl < minChp && sc.electricityTariffEurKwh) reason = T("Too small for a CHP plant.");
    if (route === "biomethane" && ref.energy.rawBiogasNm3PerHour < minBio) reason = T("Raw biogas ≈ {rawBiogasNm3PerHour} Nm³/h is below the practical upgrading minimum ({minBio} Nm³/h) — consider a cluster.", { rawBiogasNm3PerHour: Math.round(ref.energy.rawBiogasNm3PerHour), minBio });
    if (sc.status === "closed" && reason === "") reason = T("Call closed — shown for reference only.");
    const unconfirmed = gasSource !== undefined && reason === "";
    if (unconfirmed) reason = T("Eligibility of {gasSourceName} is not modelled: shown \"if eligible\". Confirm the gas-source category, tariff and any existing support with the scheme operator.", { gasSourceName });
    const computable = reason === "" || sc.status === "closed" || unconfirmed;
    const r = computable ? run(route, "base", NO_MODS, sc) : ref;
    return {
      schemeId: sc.id,
      name: sc.name,
      status: sc.status,
      eligible: reason === "",
      ...(unconfirmed ? { unconfirmed } : {}),
      reason,
      npvEur: r.fin.npvEur,
      paybackYears: r.fin.simplePaybackYears,
      irr: r.fin.irr,
      deltaNpvEur: r.fin.npvEur - base.fin.npvEur,
      note: locText(sc.note, lang),
      source: sc.source,
      confidence: sc.confidence,
    };
  });

  // ---- ranges ----
  const tri = <T,>(f: (r: ScenarioResult) => T): [T, T, T] => [f(cons), f(base), f(opt)];
  const ranges: Assessment["ranges"] = {
    feedstockTonnes: base.feed.tonnesYear,
    biogasM3: tri((r) => r.feed.biogasM3Year),
    kwEl: tri((r) => r.kwElEquivalent),
    electricityMwh: tri((r) => r.energy.elNetKwh / 1000),
    heatUsefulMwh: tri((r) => r.energy.heatUsefulKwh / 1000),
    biomethaneNm3: tri((r) => r.energy.biomethaneNm3),
    capexEur: tri((r) => r.capex.totalEur),
    paybackYears: tri((r) => r.fin.simplePaybackYears),
    npvEur: tri((r) => r.fin.npvEur),
  };

  // ---- robustness: does the answer survive the scenario range? ----
  const robustness: Assessment["robustness"] =
    verdict.id === "INSUFFICIENT_DATA"
      ? "insufficient"
      : ranges.npvEur[0] > 0
        ? "clear_go"
        : ranges.npvEur[2] <= 0
          ? "clear_no"
          : "grey";
  const drivers = [...sensitivity].filter((s) => s.deltaNpvEur < 0).sort((x, y) => x.deltaNpvEur - y.deltaNpvEur).slice(0, 3).map((s) => s.id);

  // ---- warnings ----
  const warnings = [
    ...new Set([
      ...base.feed.warnings,
      ...base.feed.lines.flatMap((l) => l.warnings),
      ...base.design.tech.warnings,
      ...logistics.warnings,
      ...priceSlips,
      ...quoteInfo,
    ]),
  ];
  if (input.process) warnings.push(T("Upstream budgets must include pretreatment, logistics, storage and final treatment; they are not independently verified installed quotations."));
  if (input.process?.kind === "residue" || input.process?.kind === "wastewater") warnings.push(T("BMP/COD and retention time alone do not verify salinity, ammonia inhibition, toxic contaminants or treatment stability; confirm with representative analysis and continuous pilot/vendor data."));
  if (existingPlant(input.process)) warnings.push(T("The CHP option keeps the existing engine: its overhaul budget must carry it through the whole 15-year horizon. A second overhaul, a shorter remaining life or a lost feed-in tariff is not modelled; enter it in the budget."));
  if (input.process?.kind === "gas" || input.process?.kind === "landfill") warnings.push(T("The treatment quotation and recovery must cover the actual H2S, siloxanes, moisture, N2 and O2. Entered product purity is a design requirement, not demonstrated gas-grid compliance."));
  if (base.energy.heatExternalPurchasedKwh > 0) warnings.push(T("Own biogas is not enough to heat the digester in the coldest months — external heat is needed."));
  const flareShare = Math.round((base.energy.flaredKwh / gasKwh) * 100);
  if (base.energy.flaredKwh / gasKwh > 0.1) warnings.push(T("≈{flareShare} % of the biogas finds no use (flared): review CHP size or seasonality.", { flareShare }));
  if (digestate.status === "LIABILITY") warnings.push(T("In this configuration the digestate is a cost rather than an asset."));
  if (bestRoute === "biomethane" && !country.biomethaneInjection) warnings.push(T("Grid injection of biomethane is not yet an established pathway in this country: plan for local use (bio-CNG/LNG) or a pioneer connection."));
  if (bestRoute === "boiler" && base.energy.heatUsefulKwh < 0.05 * base.energy.gasEnergyKwh) warnings.push(T("No heat buyer was quantified, so the boiler route earns almost nothing: it is only the cheapest of routes that all lose money. This is not a recommendation to build it — find a heat or power buyer, or add energy-dense feedstock."));
  const unsoldEl = base.energy.elNetKwh - base.energy.elSelfConsumedKwh - base.energy.elExportedKwh;
  if (bestRoute === "chp" && base.energy.elNetKwh > 0 && unsoldEl / base.energy.elNetKwh > 0.1) warnings.push(T("≈{elNetKwh} % of the CHP electricity has no buyer without a grid connection and earns nothing; the engine must run in island mode.", { elNetKwh: Math.round(unsoldEl / base.energy.elNetKwh * 100) }));
  if (bestRoute === "chp") {
    warnings.push(T("CHP performance uses a 50 Hz biogas full-load catalogue reference (03/2025), interpolated between ratings; part-load, ambient derating and 60 Hz equipment require supplier confirmation."));
    if (base.energy.chpKwEl < 20 || base.energy.chpKwEl > 2300) warnings.push(T("CHP rating is outside the 20–2300 kW reference curve; endpoint efficiency is only a proxy. Obtain a multi-engine or equipment-specific design."));
  }
  // The client's own prices replace market data: they are listed as unverified customer inputs in the evidence, but
  // they are not "market data" to review, and warning about them would penalise the better-documented path.
  const clientIds = new Set([...actualEvidence.values()].filter((p) => p.origin === "USER_INPUT").map((p) => p.id));
  const reviewChecks = dataAudit.checks.filter((check) => ["EXPIRED", "REVIEW_REQUIRED", "UNDATED"].includes(check.status) && check.parameterId.startsWith("econ.") && !clientIds.has(check.parameterId));
  if (reviewChecks.length) warnings.push(T("Market data require review ({join}). Observation dates and validity are shown in the evidence; these are not verified current customer quotations.", { join: reviewChecks.map((check) => check.parameterId).join(", ") }));

  const supportIncluded = false;
  const notes = [
    T("Support: {summary}", { summary: locText(country.support.summary, lang) }),
    ...locList(country.approachNotes, lang),
    supportIncluded ? T("WARNING: an assumed, non-guaranteed support payment is included.") : T("The verdict excludes subsidies; national support is shown as separate cases."),
    T("This is a preliminary (screening) assessment — not a detailed engineering design and not a commercial offer."),
    T("Financial results are pre-tax project cash flows. Depreciation, income taxes, working capital, financing fees and detailed debt covenants are not modelled; DSCR is an EBITDA-based screening ratio, not lender CFADS."),
    ...(parameterSensitivity.length ? [T("Parameter bounds are tested individually using the applicable market/CAPEX evidence. These engineering or tariff ranges are not statistical confidence intervals and do not replace supplier quotations or customer bills.")] : []),
  ];

  const used = params.usedIds();
  return {
    dataAudit,
    input,
    countryCode: country.code,
    fx,
    scenarios: { conservative: cons, base, optimistic: opt },
    routesBase: { chp: matrix.chp.base, boiler: matrix.boiler.base, biomethane: matrix.biomethane.base },
    routeMatrix: matrix,
    bestRoute,
    sensitivity,
    parameterSensitivity,
    financialsAvailable: !base.process?.missingInputs?.length,
    marketEvidence,
    breakEven,
    ...(quoteCheck ? { quoteCheck } : {}),
    ...(scale ? { scale } : {}),
    ...(measureFirst ? { measureFirst } : {}),
    ...(monteCarlo ? { monteCarlo } : {}),
    ...(input.process ? {} : { ghg: ghgCase(base, params) }),
    scores,
    overall,
    verdict,
    robustness,
    drivers,
    confidence: { level: quality.level, score: quality.score, clientScore: quality.score + advisoryPoints, reasons: quality.reasons, factors: quality.factors },
    missingData: quality.missing,
    missingDataCodes: quality.missingCodes,
    warnings,
    safety,
    regulatory: { items: regItems, complexity: regComplexity },
    methane,
    digestate,
    logistics,
    climate: climateSummary(ctxBase.region, lang),
    ranges,
    assumptionsUsed: used,
    supportIncluded,
    supportCases,
    notes,
    lang,
  };
}

export { classifyPlant };

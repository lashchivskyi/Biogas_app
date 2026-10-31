import { processBounds, processSchema } from "./processes";
import { modelsForBusiness } from "./businesses";
import { climateSummary } from "./climate";
import { projectRegion, type CityClimate } from "./location";
import { biomethaneOfftake } from "./capex";
import { NO_MODS, type Modifiers, type RunContext } from "./context";
import type { CountryAdapter, SupportScheme } from "./country";
import { tr, type CoreLang } from "./i18n";
import { customerDemand } from "./demand";
import { assessDigestate } from "./digestate";
import { classifyPlant, runScenarioRoute } from "./economics";
import { ENGINEERING_MAP } from "./engineeringParams";
import { PLAUSIBLE_DISPOSAL_EUR_T, PLAUSIBLE_GATE_FEE_EUR_T, PLAUSIBLE_PURCHASE_EUR_T } from "./feedstock";
import { assessLogistics } from "./logistics";
import { methaneCheck } from "./methane";
import { Params, prov, toMap } from "./params";
import { CATALOG_VERSION, checkEvidence, DATA_REVIEW_AS_OF, fingerprint, isoDate, MODEL_VERSION } from "./modelAudit";
import { assessQuality, capQuality } from "./quality";
import { safetyRegister } from "./safety";
import { SCENARIOS, SCENARIO_ORDER, scenarioProvenance } from "./scenarios";
import { computeScores } from "./scoring";
import type { Assessment, RouteId, ScenarioId, ScenarioResult, SensitivityItem, SupportCase } from "./types";
import { decideVerdict } from "./verdict";
import { BUSINESS_TYPES } from "./businesses";

export const ROUTES: RouteId[] = ["chp", "boiler", "biomethane"];

export function buildParams(country: CountryAdapter, regionId?: string, energy?: Assessment["input"]["energy"], city?: CityClimate): Params {
  // A city selects its state/province market data through its admin1 code; older snapshots without one use national data.
  const marketRegion = regionId?.startsWith("city:") ? city?.adminCode : regionId;
  const overrides = energy && country.paramsForProject ? country.paramsForProject({ regionId: marketRegion ?? "", energy }) : marketRegion && country.paramsForRegion ? country.paramsForRegion(marketRegion) : [];
  const map = { ...ENGINEERING_MAP, ...toMap(country.params), ...toMap(overrides) };
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

/** Customer energy prices more than this factor above the national business price (or below it, for gas) are flagged as likely unit slips (judgement). */
const PRICE_BAND = 3;
/** A supplier CAPEX quote more than this factor above or below the model's own estimate is flagged (judgement). */
const QUOTE_BAND = 2.5;

export function assess(input: Assessment["input"], country: CountryAdapter, opts: { lang?: CoreLang; asOfDate?: string } = {}): Assessment {
  if (!BUSINESS_TYPES[input.businessType]) throw new Error("Unknown business");
  if (input.process) { processSchema.parse(input.process); if (input.feedstocks.length) throw new Error("Use one physical input basis, not simultaneous AD feedstocks and process data"); }
  if (!modelsForBusiness(input.businessType).includes(input.process?.kind ?? "ad")) throw new Error("Select the appropriate process and supply its input data");
  if (input.countryCode !== country.code) throw new Error("Project country does not match the country adapter");
  projectRegion(input, country);
  const asOfDate = opts.asOfDate ?? DATA_REVIEW_AS_OF;
  if (!isoDate(asOfDate)) throw new Error("Invalid assessment date");
  const lang: CoreLang = opts.lang ?? input.lang ?? "en";
  const T = tr(lang);
  const params = buildParams(country, input.regionId, input.energy, input.city);
  const fx = params.get("econ.fx_local_per_eur");
  const run = (route: RouteId, scn: ScenarioId, mods: Modifiers = NO_MODS, support?: SupportScheme) =>
    runScenarioRoute(makeCtx(input, country, params, scn, mods, lang, support), route);

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
  const ctxBase = makeCtx(input, country, params, "base", NO_MODS, lang);
  const demand = customerDemand(ctxBase);
  // Isolate evidence for the selected base route; the main usage log also includes alternatives and what-if runs.
  const selectedParams = params.fork();
  runScenarioRoute(makeCtx(input, country, selectedParams, "base", NO_MODS, lang), bestRoute);
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
  if (input.finance?.debtRate !== undefined) userEvidence("econ.debt_interest", "Customer loan interest rate", input.finance.debtRate, "—", `${(input.finance.debtRate * 100).toFixed(1)} %`);
  const actualEvidence = new Map(selectedParams.usedIds().map((id) => [id, params.prov(id)]));
  for (const p of [...marketEvidence, ...(base.process?.provenance ?? [])]) actualEvidence.set(p.id, p);
  const dataAudit: NonNullable<Assessment["dataAudit"]> = {
    modelVersion: MODEL_VERSION,
    dataVersion: fingerprint({ catalog: CATALOG_VERSION, parameters: params.all(), process: base.process?.provenance, region: ctxBase.region, support: country.support }),
    inputVersion: fingerprint(input),
    asOfDate,
    checks: [...actualEvidence.values()].map((p) => checkEvidence(p, asOfDate)),
  };
  const rangeIds = usedMarket.filter((id) => {
    if (!params.prov(id).range) return false;
    if (id === "econ.electricity_retail_eur_kwh") return !demand.electricityPriceKnown;
    if ((id === "eng.invoice_variable_share" || id === "econ.self_consumption_variable_share") && base.energy.elSelfConsumedKwh <= 0) return false;
    if (id.startsWith("econ.fert_")) return base.opexRev.revenue.some((line) => line.id === "digestate" && line.eur > 0);
    return (id.startsWith("econ.capex_factor_") && !quoteApplies) || id === "eng.invoice_variable_share" || id === "econ.self_consumption_variable_share";
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
      return runScenarioRoute(makeCtx(input, country, params.with(overrides), "base", NO_MODS, lang), bestRoute).fin.npvEur;
    };
    return { parameterId: id, lowInput: low, highInput: high, lowNpvEur: npvAt(low), highNpvEur: npvAt(high), basis };
  });
  if (input.process) {
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
      const at = (next: typeof process) => runScenarioRoute(makeCtx({ ...input, process: next }, country, params.fork(), "base", NO_MODS, lang), bestRoute).fin.npvEur;
      parameterSensitivity.push({ parameterId: `process.${key}`, lowInput: low, highInput: high, lowNpvEur: at(lower.data), highNpvEur: at(upper.data), basis: "engineering" });
    }
  }

  // ---- sensitivity (best route, base scenario) ----
  const tests: Array<[string, string, Partial<Modifiers>]> = [
    ["yield", T("Methane yield −20 %", "Вихід метану −20 %"), { methaneYield: 0.8 }],
    ["capex", "CAPEX +20 %", { capex: 1.2 }],
    ["maintenance", T("Maintenance +30 %", "Обслуговування +30 %"), { maintenance: 1.3 }],
    ["energy_price", T("Energy prices −20 %", "Ціни на енергію −20 %"), { energyPrice: 0.8 }],
    ["heat_use", T("Heat use −50 %", "Використання тепла −50 %"), { heatUse: 0.5 }],
    ["feedstock", T("Loss of 20 % of feedstock", "Втрата 20 % сировини"), { feedstock: 0.8 }],
    input.process ? ["process_opex", "OPEX +30 %", { opex: 1.3 }] : ["transport", T("Logistics +50 %", "Логістика +50 %"), { transport: 1.5 }],
    ["downtime", T("CHP downtime +10 pp", "Простої КГУ +10 п.п."), { extraDowntimePp: 10 }],
  ];
  const sensitivity: SensitivityItem[] = tests.map(([id, label, m]) => {
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
  if (base.fin.npvEur >= 0) {
    capexRed = 0;
    priceInc = 0;
  } else {
    const x = bisect((c) => run(bestRoute, "base", { ...NO_MODS, capex: c }).fin.npvEur, 0.05, 1);
    capexRed = x === null ? null : (1 - x) * 100;
    const y = bisect((k) => run(bestRoute, "base", { ...NO_MODS, energyPrice: k }).fin.npvEur, 1, 4);
    priceInc = y === null ? null : (y - 1) * 100;
  }
  const breakEven = { capexReductionPct: capexRed, energyPriceIncreasePct: priceInc };

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
        ? T("Confirm discharge limits, final polishing and sludge disposal authorisations", "Підтвердити нормативи скиду, доочищення та дозволений шлях утилізації осаду")
        : input.process.kind === "landfill"
          ? T("Confirm landfill permit, gas collection obligations and aftercare responsibilities", "Перевірити дозвіл полігона, обов’язки зі збору газу та післяексплуатаційного догляду")
          : input.process.kind === "gas"
            ? T("Confirm gas transfer contract, inlet quality and approvals for the new gas-use equipment", "Перевірити договір постачання, якість газу та дозволи на нове газовикористовувальне обладнання")
            : T("Confirm material classification, pretreatment requirements and lawful residuals disposal", "Перевірити класифікацію матеріалу, вимоги до підготовки та законний шлях утилізації залишків"),
      appliesBecause: T("Process-specific site conditions; no automatic legal eligibility", "Умови конкретного процесу та майданчика; автоматичного підтвердження законності немає") });
  }
  const pointsOf = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
  const regPoints = regItems.reduce((a, i) => a + pointsOf[i.effort], 0);
  const regComplexity = regPoints >= 17 ? "HIGH" : regPoints >= 13 ? "MEDIUM" : "LOW";

  const priceIds: string[] = [];
  if (!demand.electricityPriceKnown && (base.energy.elSelfConsumedKwh > 0 || base.energy.elPurchasedKwh > 0)) priceIds.push("econ.electricity_retail_eur_kwh");
  if (base.energy.elExportedKwh > 0 && !((input.energy.exportPriceLocalPerKwh ?? 0) > 0)) priceIds.push("econ.electricity_spot_eur_kwh");
  if (!demand.heatValueKnown && (base.energy.heatUsefulKwh > 0 || base.energy.heatExternalPurchasedKwh > 0)) priceIds.push("econ.heat_value_eur_kwh_th");
  if (bestRoute === "biomethane") priceIds.push("econ.biomethane_price_base_eur_nm3");
  const capexId = params.has(`econ.capex_factor_${bestRoute}`) ? `econ.capex_factor_${bestRoute}` : "econ.capex_factor";
  // Entered prices far from the market usually mean a unit slip (ct vs €, € vs local currency, per MWh vs per kWh).
  // Electricity: large consumers on wholesale contracts pay well below the business tariff, so the floor is half the spot price.
  const local = (eur: number) => (eur * fx).toPrecision(3);
  const priceSlips: string[] = [];
  const elLow = params.get("econ.electricity_spot_eur_kwh") / 2, elHigh = params.get("econ.electricity_retail_eur_kwh") * PRICE_BAND;
  if (demand.electricityPriceKnown && (demand.electricityPriceEurKwh < elLow || demand.electricityPriceEurKwh > elHigh)) priceSlips.push(T(`The entered electricity price (${input.energy.electricityPriceLocalPerKwh} ${country.currency}/kWh) is outside the plausible range for this country (${local(elLow)}–${local(elHigh)} ${country.currency}/kWh): check the unit (per kWh, ${country.currency}, not cents or MWh).`, `Введена ціна електроенергії (${input.energy.electricityPriceLocalPerKwh} ${country.currency}/кВт·год) поза правдоподібним діапазоном для країни (${local(elLow)}–${local(elHigh)} ${country.currency}/кВт·год): перевірте одиниці (за кВт·год, у ${country.currency}, не копійки чи МВт·год).`));
  const heatMarket = params.get("econ.heat_value_eur_kwh_th");
  if (demand.heatValueKnown && (demand.heatValueEurKwh < heatMarket / PRICE_BAND || demand.heatValueEurKwh > heatMarket * PRICE_BAND)) priceSlips.push(T(`The entered gas or heat price differs more than ${PRICE_BAND}× from the national business level (${local(heatMarket)} ${country.currency}/kWh of heat): check the unit (gas per m³, heat per kWh, in ${country.currency}).`, `Введена ціна газу чи тепла відрізняється більш ніж у ${PRICE_BAND} рази від національного рівня (${local(heatMarket)} ${country.currency}/кВт·год тепла): перевірте одиниці (газ — за м³, тепло — за кВт·год, у ${country.currency}).`));
  const exportEur = (input.energy.exportPriceLocalPerKwh ?? 0) / fx;
  if (exportEur > 0 && (exportEur < elLow || exportEur > elHigh)) priceSlips.push(T(`The entered export price (${input.energy.exportPriceLocalPerKwh} ${country.currency}/kWh) is outside the plausible range for this country (${local(elLow)}–${local(elHigh)} ${country.currency}/kWh): check the unit (per kWh, ${country.currency}, not cents or MWh).`, `Введена ціна продажу електроенергії (${input.energy.exportPriceLocalPerKwh} ${country.currency}/кВт·год) поза правдоподібним діапазоном для країни (${local(elLow)}–${local(elHigh)} ${country.currency}/кВт·год): перевірте одиниці (за кВт·год, у ${country.currency}, не копійки чи МВт·год).`));
  const wageMarket = params.get("econ.labour_official_eur_h") * params.get("econ.operator_wage_ratio");
  const wageEur = (input.finance?.operatorWageLocalPerHour ?? 0) / fx;
  if (wageEur > 0 && (wageEur < wageMarket / PRICE_BAND || wageEur > wageMarket * PRICE_BAND)) priceSlips.push(T(`The entered operator cost (${input.finance!.operatorWageLocalPerHour} ${country.currency}/h) differs more than ${PRICE_BAND}× from the national estimate (${local(wageMarket)} ${country.currency}/h): check that it is per hour, fully loaded, in ${country.currency}.`, `Введена вартість години оператора (${input.finance!.operatorWageLocalPerHour} ${country.currency}/год) відрізняється більш ніж у ${PRICE_BAND} рази від національної оцінки (${local(wageMarket)} ${country.currency}/год): перевірте, що це вартість години з нарахуваннями, у ${country.currency}.`));
  // A supplier quote is checked against the model for the same route: far outside, it is more likely a unit or scope slip.
  const quoteInfo: string[] = [];
  const qIn = input.finance;
  if (!input.process && qIn?.capexQuoteRoute && (qIn.capexQuoteLocal ?? 0) > 0) {
    const qc = matrix[qIn.capexQuoteRoute].base.capex;
    const ratio = qc.modelledEur ? qc.totalEur / qc.modelledEur : 1;
    const routeName = { chp: "CHP", boiler: "boiler", biomethane: "biomethane" }[qIn.capexQuoteRoute];
    if (ratio < 1 / QUOTE_BAND || ratio > QUOTE_BAND) priceSlips.push(T(`The supplier quote (${input.finance!.capexQuoteLocal} ${country.currency}) is ${ratio.toFixed(1)}× the model's own ${routeName} estimate (${local(qc.modelledEur ?? 0)} ${country.currency}): check the currency, the scope (digester, gas use, grid connection, engineering) and whether it is for the same capacity.`, `Пропозиція постачальника (${input.finance!.capexQuoteLocal} ${country.currency}) у ${ratio.toFixed(1)} раза відрізняється від власної оцінки моделі для варіанта «${routeName}» (${local(qc.modelledEur ?? 0)} ${country.currency}): перевірте валюту, обсяг поставки (реактор, використання газу, приєднання, проєктування) і чи це та сама потужність.`));
    if (qIn.capexQuoteRoute !== bestRoute) quoteInfo.push(T(`Your supplier quote is for the ${routeName} route, but the model finds the ${bestRoute} route more profitable, so the quote is not used in the headline result. It is used in the route comparison.`, `Пропозиція постачальника стосується варіанта «${routeName}», але модель вважає вигіднішим «${bestRoute}», тому в основному результаті пропозицію не використано. Вона враховується в порівнянні варіантів.`));
  }
  const feedSlips = input.feedstocks.some((f) => (f.currentDisposalCostPerTonneLocal ?? 0) / fx > PLAUSIBLE_DISPOSAL_EUR_T || -(f.purchasePricePerTonneLocal ?? 0) / fx > PLAUSIBLE_GATE_FEE_EUR_T || (f.purchasePricePerTonneLocal ?? 0) / fx > PLAUSIBLE_PURCHASE_EUR_T);
  const quality = assessQuality(input, base, demand, T, { currency: country.currency, priceSlips: priceSlips.length + (feedSlips ? 1 : 0), profileOnly: priceIds.some((id) => params.prov(id).confidence === "LOW"), unvalidatedCapital: !quoteApplies && params.prov(capexId).confidence === "LOW" });
  if (input.process?.basisDate && input.process.basisDate > asOfDate) {
    const text = T("The supplied process basis is dated after the assessment; it cannot substantiate a current conclusion.", "Дата вихідних даних процесу пізніша за дату оцінки; ці дані не підтверджують поточний висновок.");
    capQuality(quality, 34, { id: "process_basis_date", owner: "client", text });
    quality.reasons.push(text);
  }
  const expiredPrices = dataAudit.checks.filter((check) => (priceIds.includes(check.parameterId) && check.status === "EXPIRED") || (check.observedThrough && check.observedThrough > asOfDate) || (check.publishedOn && check.publishedOn > asOfDate));
  if (expiredPrices.length) {
    const text = T("A price affecting this route is expired or unavailable as of the assessment date; current applicable evidence is required before a verdict", "Ціна, що впливає на цей маршрут, втратила чинність або ще не була доступна на дату оцінки; для висновку потрібні чинні застосовні дані");
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
  const advisoryPoints = blocking ? 0 : quality.factors.filter((f) => f.owner === "model").reduce((a, f) => a + f.points, 0);
  const verdict = decideVerdict({
    base, cons, opt, confidence: { level: quality.level, score: quality.score, clientScore: quality.score + advisoryPoints }, minKwEl: minChp, breakEven, lang,
  });
  if (input.process) verdict.whatWouldChange = [
    T("Verify the inlet analysis and operating history, seasonal availability, and a supplier guarantee for the proposed treatment train.", "Перевірити аналіз потоку, історію роботи, сезонність і гарантії постачальника для запропонованої технології."),
    T("Confirm complete installed-cost quotations, residuals disposal, final effluent treatment and the energy offtake contract. Check the downside case before investment.", "Підтвердити повні кошториси монтажу, утилізацію залишків, доочищення стоків та договір збуту енергії. Перед інвестуванням перевірити несприятливий сценарій."),
    T("Obtain site-specific permits and grid gas-quality requirements; extend this pre-tax screening to tax, working capital and lender cash-flow modelling.", "Уточнити дозволи й вимоги мережі до якості газу; доповнити попередню оцінку податками, оборотним капіталом і моделлю грошових потоків для кредитора."),
  ];

  // ---- national support: separate cases, never in the verdict ----
  const manureMass = base.feed.tonnesYear > 0 ? base.feed.lines.filter((l) => l.category === "manure").reduce((a, l) => a + l.tonnesYear, 0) / base.feed.tonnesYear : 0;
  const supportCases: SupportCase[] = (input.process ? [] : country.support.schemes).map((sc) => {
    const route = sc.routes.includes(bestRoute) ? bestRoute : sc.routes[0];
    const ref = matrix[route].base;
    const kw = ref.kwElEquivalent;
    let reason = "";
    if (sc.maxKwEl !== undefined && kw > sc.maxKwEl) reason = T(`Plant ≈ ${Math.round(kw)} kWe exceeds the ${sc.maxKwEl} kW limit.`, `Установка ≈ ${Math.round(kw)} кВт ел. перевищує ліміт ${sc.maxKwEl} кВт.`);
    if (sc.minKwEl !== undefined && kw < sc.minKwEl) reason = T(`Plant ≈ ${Math.round(kw)} kWe is below the ${sc.minKwEl} kW minimum.`, `Установка ≈ ${Math.round(kw)} кВт ел. менша за мінімум ${sc.minKwEl} кВт.`);
    if (sc.minManureShareMass !== undefined && manureMass < sc.minManureShareMass) reason = T(`Manure is ${Math.round(manureMass * 100)} % of the mass; the scheme requires ≥ ${Math.round(sc.minManureShareMass * 100)} %.`, `Гній становить ${Math.round(manureMass * 100)} % маси; схема вимагає ≥ ${Math.round(sc.minManureShareMass * 100)} %.`);
    if (route === "chp" && ref.energy.chpKwEl < minChp && sc.electricityTariffEurKwh) reason = T("Too small for a CHP plant.", "Замало для когенерації.");
    if (route === "biomethane" && ref.energy.rawBiogasNm3PerHour < minBio) reason = T(`Raw biogas ≈ ${Math.round(ref.energy.rawBiogasNm3PerHour)} Nm³/h is below the practical upgrading minimum (${minBio} Nm³/h) — consider a cluster.`, `Сирого біогазу ≈ ${Math.round(ref.energy.rawBiogasNm3PerHour)} Нм³/год — менше практичного мінімуму для очищення (${minBio} Нм³/год); розгляньте кластер.`);
    if (sc.status === "closed" && reason === "") reason = T("Call closed — shown for reference only.", "Прийом заявок закрито — лише для довідки.");
    const computable = reason === "" || sc.status === "closed";
    const r = computable ? run(route, "base", NO_MODS, sc) : ref;
    return {
      schemeId: sc.id,
      name: sc.name,
      status: sc.status,
      eligible: reason === "",
      reason,
      npvEur: r.fin.npvEur,
      paybackYears: r.fin.simplePaybackYears,
      irr: r.fin.irr,
      deltaNpvEur: r.fin.npvEur - base.fin.npvEur,
      note: sc.note[lang],
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
      ...(input.assumedSupportEurPerKwh ? [T("Legacy assumed support is excluded from the base assessment.", "Старе припущення про підтримку виключено з базової оцінки.")] : []),
      ...base.feed.warnings,
      ...base.feed.lines.flatMap((l) => l.warnings),
      ...base.design.tech.warnings,
      ...logistics.warnings,
      ...priceSlips,
      ...quoteInfo,
    ]),
  ];
  if (input.process) warnings.push(T("Upstream budgets must include pretreatment, logistics, storage and final treatment; they are not independently verified installed quotations.", "Бюджети мають включати підготовку, логістику, зберігання й кінцеву обробку; це не незалежно перевірені монтажні оферти."));
  if (input.process?.kind === "residue" || input.process?.kind === "wastewater") warnings.push(T("BMP/COD and retention time alone do not verify salinity, ammonia inhibition, toxic contaminants or treatment stability; confirm with representative analysis and continuous pilot/vendor data.", "BMP/COD і час утримання не підтверджують стійкість процесу за наявності солей, аміаку чи токсичних домішок; потрібні репрезентативні аналізи та дані безперервного пілота або виробника."));
  if (input.process?.kind === "gas" || input.process?.kind === "landfill") warnings.push(T("The treatment quotation and recovery must cover the actual H2S, siloxanes, moisture, N2 and O2. Entered product purity is a design requirement, not demonstrated gas-grid compliance.", "Оферта та recovery мають відповідати фактичним H2S, силоксанам, волозі, N2 та O2. Введена чистота продукту — проєктна вимога, а не доказ відповідності газовій мережі."));
  if (base.energy.heatExternalPurchasedKwh > 0) warnings.push(T("Own biogas is not enough to heat the digester in the coldest months — external heat is needed.", "Власного біогазу бракує для обігріву реактора в найхолодніші місяці — потрібне зовнішнє тепло."));
  const flareShare = Math.round((base.energy.flaredKwh / gasKwh) * 100);
  if (base.energy.flaredKwh / gasKwh > 0.1) warnings.push(T(`≈${flareShare} % of the biogas finds no use (flared): review CHP size or seasonality.`, `≈${flareShare} % біогазу не знаходить використання (факел): перегляньте розмір КГУ чи сезонність.`));
  if (digestate.status === "LIABILITY") warnings.push(T("In this configuration the digestate is a cost rather than an asset.", "Дигестат у цій конфігурації — скоріше витрата, ніж актив."));
  if (bestRoute === "biomethane" && !country.biomethaneInjection) warnings.push(T("Grid injection of biomethane is not yet an established pathway in this country: plan for local use (bio-CNG/LNG) or a pioneer connection.", "Ін'єкція біометану в мережу в цій країні ще не усталена: плануйте локальне використання (bio-CNG/LNG) або першопрохідне приєднання."));
  if (bestRoute === "boiler" && base.energy.heatUsefulKwh < 0.05 * base.energy.gasEnergyKwh) warnings.push(T("No heat buyer was quantified, so the boiler route earns almost nothing: it is only the cheapest of routes that all lose money. This is not a recommendation to build it — find a heat or power buyer, or add energy-dense feedstock.", "Споживача тепла не підтверджено, тому котельня майже нічого не заробляє: це лише найдешевший із маршрутів, які всі збиткові. Це не рекомендація будувати її — потрібен покупець тепла чи електрики або енергетично щільніша сировина."));
  const unsoldEl = base.energy.elNetKwh - base.energy.elSelfConsumedKwh - base.energy.elExportedKwh;
  if (bestRoute === "chp" && base.energy.elNetKwh > 0 && unsoldEl / base.energy.elNetKwh > 0.1) warnings.push(T(`≈${Math.round(unsoldEl / base.energy.elNetKwh * 100)} % of the CHP electricity has no buyer without a grid connection and earns nothing; the engine must run in island mode.`, `≈${Math.round(unsoldEl / base.energy.elNetKwh * 100)} % електроенергії КГУ без приєднання до мережі не має споживача й не приносить доходу; двигун працюватиме в острівному режимі.`));
  if (bestRoute === "chp") {
    warnings.push(T("CHP performance uses a 50 Hz biogas full-load catalogue reference (03/2025), interpolated between ratings; part-load, ambient derating and 60 Hz equipment require supplier confirmation.", "Показники CHP взято з каталогу біогазових установок 50 Hz за 03/2025 з інтерполяцією між типорозмірами. Часткове навантаження, вплив температури та обладнання 60 Hz потребують підтвердження виробника."));
    if (base.energy.chpKwEl < 20 || base.energy.chpKwEl > 2300) warnings.push(T("CHP rating is outside the 20–2300 kW reference curve; endpoint efficiency is only a proxy. Obtain a multi-engine or equipment-specific design.", "Потужність CHP виходить за діапазон референсної кривої 20–2300 kW; використано граничний ККД як наближення. Потрібен підбір конкретного обладнання або кількох двигунів."));
  }
  const reviewChecks = dataAudit.checks.filter((check) => ["EXPIRED", "REVIEW_REQUIRED", "UNDATED"].includes(check.status) && check.parameterId.startsWith("econ."));
  if (reviewChecks.length) warnings.push(T(`Market data require review (${reviewChecks.map((check) => check.parameterId).join(", ")}). Observation dates and validity are shown in the evidence; these are not verified current customer quotations.`, `Ринкові дані потребують перевірки (${reviewChecks.map((check) => check.parameterId).join(", ")}). Періоди й строки дії наведено в джерелах; це не підтверджені актуальні пропозиції для замовника.`));

  const supportIncluded = false;
  const notes = [
    T(`Support: ${country.support.summary.en}`, `Підтримка: ${country.support.summary.uk}`),
    ...country.approachNotes[lang],
    supportIncluded ? T("WARNING: an assumed, non-guaranteed support payment is included.", "УВАГА: у розрахунок включено припущену підтримку, яка не гарантована.") : T("The verdict excludes subsidies; national support is shown as separate cases.", "Вердикт не враховує субсидій; національна підтримка показана окремими сценаріями."),
    T("This is a preliminary (screening) assessment — not a detailed engineering design and not a commercial offer.", "Це попередня (скринінгова) оцінка: не детальний інженерний проєкт і не комерційна пропозиція."),
    T("Financial results are pre-tax project cash flows. Depreciation, income taxes, working capital, financing fees and detailed debt covenants are not modelled; DSCR is an EBITDA-based screening ratio, not lender CFADS.", "Фінансові результати розраховані за грошовими потоками проєкту до оподаткування. Амортизація, податок на прибуток, оборотний капітал, комісії за фінансування та детальні кредитні ковенанти не моделюються; DSCR — попередній показник на основі EBITDA, а не банківського CFADS."),
    ...(parameterSensitivity.length ? [T("Parameter bounds are tested individually using the applicable market/CAPEX evidence. These engineering or tariff ranges are not statistical confidence intervals and do not replace supplier quotations or customer bills.", "Межі параметрів перевірені окремо за доступними країновими даними й оцінками CAPEX. Інженерні та тарифні діапазони не є статистичними довірчими інтервалами й не замінюють комерційних пропозицій та рахунків споживача.")] : []),
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
    scores,
    overall,
    verdict,
    robustness,
    drivers,
    confidence: { level: quality.level, score: quality.score, reasons: quality.reasons, factors: quality.factors },
    missingData: quality.missing,
    missingDataCodes: quality.missingCodes,
    warnings,
    safety,
    regulatory: { items: regItems, complexity: regComplexity },
    methane,
    digestate,
    logistics,
    climate: climateSummary(ctxBase.region),
    ranges,
    assumptionsUsed: used,
    supportIncluded,
    supportCases,
    notes,
    lang,
  };
}

export { classifyPlant };

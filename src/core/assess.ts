import { climateSummary } from "./climate";
import { biomethaneOfftake } from "./capex";
import { NO_MODS, type Modifiers, type RunContext } from "./context";
import type { CountryAdapter, SupportScheme } from "./country";
import { tr, type CoreLang } from "./i18n";
import { customerDemand } from "./demand";
import { assessDigestate } from "./digestate";
import { classifyPlant, runScenarioRoute } from "./economics";
import { ENGINEERING_MAP } from "./engineeringParams";
import { assessLogistics } from "./logistics";
import { methaneCheck } from "./methane";
import { Params, prov, toMap } from "./params";
import { CATALOG_VERSION, checkEvidence, DATA_REVIEW_AS_OF, fingerprint, isoDate, MODEL_VERSION } from "./modelAudit";
import { assessQuality } from "./quality";
import { safetyRegister } from "./safety";
import { SCENARIOS, SCENARIO_ORDER, scenarioProvenance } from "./scenarios";
import { computeScores } from "./scoring";
import type { Assessment, RouteId, ScenarioId, ScenarioResult, SensitivityItem, SupportCase } from "./types";
import { decideVerdict } from "./verdict";

export const ROUTES: RouteId[] = ["chp", "boiler", "biomethane"];

export function buildParams(country: CountryAdapter, regionId?: string, energy?: Assessment["input"]["energy"]): Params {
  const overrides = regionId && energy && country.paramsForProject ? country.paramsForProject({ regionId, energy }) : regionId && country.paramsForRegion ? country.paramsForRegion(regionId) : [];
  const map = { ...ENGINEERING_MAP, ...toMap(country.params), ...toMap(overrides) };
  return new Params(map);
}

/** Every parameter, engineering + scenario + country, for the registry document and the methodology page. */
export function allProvenance(country: CountryAdapter, regionId?: string, energy?: Assessment["input"]["energy"]) {
  return [...buildParams(country, regionId, energy).all(), ...scenarioProvenance()];
}

function makeCtx(input: Assessment["input"], country: CountryAdapter, params: Params, scenario: ScenarioId, mods: Modifiers, lang: CoreLang, support?: SupportScheme): RunContext {
  const region = country.regions.find((r) => r.id === input.regionId);
  if (!region) throw new Error(`Region ${input.regionId} does not belong to ${country.code}`);
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

export function assess(input: Assessment["input"], country: CountryAdapter, opts: { lang?: CoreLang; asOfDate?: string } = {}): Assessment {
  if (input.countryCode !== country.code) throw new Error("Project country does not match the country adapter");
  if (!country.regions.some((r) => r.id === input.regionId)) throw new Error(`Region ${input.regionId} does not belong to ${country.code}`);
  const asOfDate = opts.asOfDate ?? DATA_REVIEW_AS_OF;
  if (!isoDate(asOfDate)) throw new Error("Invalid assessment date");
  const lang: CoreLang = opts.lang ?? input.lang ?? "en";
  const T = tr(lang);
  const params = buildParams(country, input.regionId, input.energy);
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
  if (demand.gasPriceKnown) marketEvidence.push(prov(
    "econ.heat_value_eur_kwh_th", "Useful heat displaced at customer gas price", demand.heatValueEurKwh, "EUR/kWh th", "CALCULATION",
    `USER_INPUT ${input.energy.gasPriceLocalPerM3} ${country.currency}/m3 / FX ${fx} / assumed natural-gas LHV / boiler efficiency. Invoice and calorific value not independently verified.`, "MEDIUM",
    { country: country.code, date: "undated", origin: "USER_INPUT" },
  ));
  const actualEvidence = new Map(selectedParams.usedIds().map((id) => [id, params.prov(id)]));
  for (const p of marketEvidence) actualEvidence.set(p.id, p);
  const dataAudit: NonNullable<Assessment["dataAudit"]> = {
    modelVersion: MODEL_VERSION,
    dataVersion: fingerprint({ catalog: CATALOG_VERSION, parameters: params.all(), region: ctxBase.region, support: country.support }),
    inputVersion: fingerprint(input),
    asOfDate,
    checks: [...actualEvidence.values()].map((p) => checkEvidence(p, asOfDate)),
  };
  const rangeIds = usedMarket.filter((id) => {
    if (!params.prov(id).range) return false;
    if (id === "econ.electricity_retail_eur_kwh") return !demand.electricityPriceKnown;
    if ((id === "eng.invoice_variable_share" || id === "econ.self_consumption_variable_share") && base.energy.elSelfConsumedKwh <= 0) return false;
    if (id.startsWith("econ.fert_")) return base.opexRev.revenue.some((line) => line.id === "digestate" && line.eur > 0);
    return id.startsWith("econ.capex_factor_") || id === "eng.invoice_variable_share" || id === "econ.self_consumption_variable_share";
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

  // ---- sensitivity (best route, base scenario) ----
  const tests: Array<[string, string, Partial<Modifiers>]> = [
    ["yield", T("Methane yield −20 %", "Вихід метану −20 %"), { methaneYield: 0.8 }],
    ["capex", "CAPEX +20 %", { capex: 1.2 }],
    ["maintenance", T("Maintenance +30 %", "Обслуговування +30 %"), { maintenance: 1.3 }],
    ["energy_price", T("Energy prices −20 %", "Ціни на енергію −20 %"), { energyPrice: 0.8 }],
    ["heat_use", T("Heat use −50 %", "Використання тепла −50 %"), { heatUse: 0.5 }],
    ["feedstock", T("Loss of 20 % of feedstock", "Втрата 20 % сировини"), { feedstock: 0.8 }],
    ["transport", T("Logistics +50 %", "Логістика +50 %"), { transport: 1.5 }],
    ["downtime", T("CHP downtime +10 pp", "Простої КГУ +10 п.п."), { extraDowntimePp: 10 }],
  ];
  const sensitivity: SensitivityItem[] = tests.map(([id, label, m]) => {
    const r = run(bestRoute, "base", { ...NO_MODS, ...m });
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

  const regItems = country.regulatory({
    route: bestRoute,
    kwElEquivalent: base.kwElEquivalent,
    tonnesYear: base.feed.tonnesYear,
    abpTonnesYear: base.feed.abpTonnesYear,
    digestateTonnesYear: digestate.tonnesYear,
    neighboursWithin300m: !!input.site.neighboursWithin300m,
    nearProtectedOrWaterArea: !!input.site.nearProtectedOrWaterArea,
    exportsElectricity: base.energy.elExportedKwh > 0,
    gasGridInjection: bestRoute === "biomethane" && biomethaneOfftake(ctxBase, base.energy).mode === "grid",
    lang,
  });
  const pointsOf = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
  const regPoints = regItems.reduce((a, i) => a + pointsOf[i.effort], 0);
  const regComplexity = regPoints >= 17 ? "HIGH" : regPoints >= 13 ? "MEDIUM" : "LOW";

  const priceIds: string[] = [];
  if (!demand.electricityPriceKnown && (base.energy.elSelfConsumedKwh > 0 || base.energy.elPurchasedKwh > 0)) priceIds.push("econ.electricity_retail_eur_kwh");
  if (base.energy.elExportedKwh > 0) priceIds.push("econ.electricity_spot_eur_kwh");
  if (!demand.gasPriceKnown && (base.energy.heatUsefulKwh > 0 || base.energy.heatExternalPurchasedKwh > 0)) priceIds.push("econ.heat_value_eur_kwh_th");
  if (bestRoute === "biomethane") priceIds.push("econ.biomethane_price_base_eur_nm3");
  const capexId = params.has(`econ.capex_factor_${bestRoute}`) ? `econ.capex_factor_${bestRoute}` : "econ.capex_factor";
  const quality = assessQuality(input, base, demand, T, { currency: country.currency, profileOnly: priceIds.some((id) => params.prov(id).confidence === "LOW"), unvalidatedCapital: params.prov(capexId).confidence === "LOW" });
  const expiredPrices = dataAudit.checks.filter((check) => (priceIds.includes(check.parameterId) && check.status === "EXPIRED") || (check.observedThrough && check.observedThrough > asOfDate) || (check.publishedOn && check.publishedOn > asOfDate));
  if (expiredPrices.length) {
    quality.level = "LOW";
    quality.score = Math.min(quality.score, 34);
    quality.reasons.push(T("A price affecting this route is expired or unavailable as of the assessment date; current applicable evidence is required before a verdict", "Ціна, що впливає на цей маршрут, втратила чинність або ще не була доступна на дату оцінки; для висновку потрібні чинні застосовні дані"));
  }
  const { scores, overall } = computeScores({
    input, base, cons, opt, demand, logistics, digestate,
    regulatoryPoints: regPoints,
    methaneLossShare: methane.lossShare,
    methaneLossGood: params.get("eng.methane_loss_good"),
    minChpKw: minChp,
    T,
  });
  const verdict = decideVerdict({
    base, cons, opt, confidence: { level: quality.level, score: quality.score }, minKwEl: minChp, breakEven, lang,
  });

  // ---- national support: separate cases, never in the verdict ----
  const manureMass = base.feed.tonnesYear > 0 ? base.feed.lines.filter((l) => l.category === "manure").reduce((a, l) => a + l.tonnesYear, 0) / base.feed.tonnesYear : 0;
  const supportCases: SupportCase[] = country.support.schemes.map((sc) => {
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
      ...base.feed.warnings,
      ...base.feed.lines.flatMap((l) => l.warnings),
      ...base.design.tech.warnings.slice(0, -1), // the last one is the static "no energy crops" note
      ...logistics.warnings,
    ]),
  ];
  if (base.energy.heatExternalPurchasedKwh > 0) warnings.push(T("Own biogas is not enough to heat the digester in the coldest months — external heat is needed.", "Власного біогазу бракує для обігріву реактора в найхолодніші місяці — потрібне зовнішнє тепло."));
  const flareShare = Math.round((base.energy.flaredKwh / gasKwh) * 100);
  if (base.energy.flaredKwh / gasKwh > 0.1) warnings.push(T(`≈${flareShare} % of the biogas finds no use (flared): review CHP size or seasonality.`, `≈${flareShare} % біогазу не знаходить використання (факел): перегляньте розмір КГУ чи сезонність.`));
  if (digestate.status === "LIABILITY") warnings.push(T("In this configuration the digestate is a cost rather than an asset.", "Дигестат у цій конфігурації — скоріше витрата, ніж актив."));
  if (bestRoute === "biomethane" && !country.biomethaneInjection) warnings.push(T("Grid injection of biomethane is not yet an established pathway in this country: plan for local use (bio-CNG/LNG) or a pioneer connection.", "Ін'єкція біометану в мережу в цій країні ще не усталена: плануйте локальне використання (bio-CNG/LNG) або першопрохідне приєднання."));
  if (bestRoute === "chp") {
    warnings.push(T("CHP performance uses a 50 Hz biogas full-load catalogue reference (03/2025), interpolated between ratings; part-load, ambient derating and 60 Hz equipment require supplier confirmation.", "Показники CHP взято з каталогу біогазових установок 50 Hz за 03/2025 з інтерполяцією між типорозмірами. Часткове навантаження, вплив температури та обладнання 60 Hz потребують підтвердження виробника."));
    if (base.energy.chpKwEl < 20 || base.energy.chpKwEl > 2300) warnings.push(T("CHP rating is outside the 20–2300 kW reference curve; endpoint efficiency is only a proxy. Obtain a multi-engine or equipment-specific design.", "Потужність CHP виходить за діапазон референсної кривої 20–2300 kW; використано граничний ККД як наближення. Потрібен підбір конкретного обладнання або кількох двигунів."));
  }
  const reviewChecks = dataAudit.checks.filter((check) => ["EXPIRED", "REVIEW_REQUIRED", "UNDATED"].includes(check.status) && check.parameterId.startsWith("econ."));
  if (reviewChecks.length) warnings.push(T(`Market data require review (${reviewChecks.map((check) => check.parameterId).join(", ")}). Observation dates and validity are shown in the evidence; these are not verified current customer quotations.`, `Ринкові дані потребують перевірки (${reviewChecks.map((check) => check.parameterId).join(", ")}). Періоди й строки дії наведено в джерелах; це не підтверджені актуальні пропозиції для замовника.`));

  const supportIncluded = (input.assumedSupportEurPerKwh ?? 0) > 0;
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
    marketEvidence,
    breakEven,
    scores,
    overall,
    verdict,
    robustness,
    drivers,
    confidence: { level: quality.level, score: quality.score, reasons: quality.reasons },
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

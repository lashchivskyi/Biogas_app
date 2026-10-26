import { climateSummary } from "./climate";
import { NO_MODS, type Modifiers, type RunContext } from "./context";
import type { CountryAdapter, SupportScheme } from "./country";
import { tr, type CoreLang } from "./i18n";
import { customerDemand } from "./demand";
import { assessDigestate } from "./digestate";
import { classifyPlant, runScenarioRoute } from "./economics";
import { ENGINEERING_MAP } from "./engineeringParams";
import { assessLogistics } from "./logistics";
import { methaneCheck } from "./methane";
import { Params, toMap } from "./params";
import { assessQuality } from "./quality";
import { safetyRegister } from "./safety";
import { SCENARIOS, SCENARIO_ORDER, scenarioProvenance } from "./scenarios";
import { computeScores } from "./scoring";
import type { Assessment, RouteId, ScenarioId, ScenarioResult, SensitivityItem, SupportCase } from "./types";
import { decideVerdict } from "./verdict";

export const ROUTES: RouteId[] = ["chp", "boiler", "biomethane"];

export function buildParams(country: CountryAdapter): Params {
  const map = { ...ENGINEERING_MAP, ...toMap(country.params) };
  return new Params(map);
}

/** Every parameter, engineering + scenario + country, for the registry document and the methodology page. */
export function allProvenance(country: CountryAdapter) {
  return [...Object.values(ENGINEERING_MAP), ...country.params, ...scenarioProvenance()];
}

function makeCtx(input: Assessment["input"], country: CountryAdapter, params: Params, scenario: ScenarioId, mods: Modifiers, lang: CoreLang, support?: SupportScheme): RunContext {
  const region = country.regions.find((r) => r.id === input.regionId) ?? country.regions[0];
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

export function assess(input: Assessment["input"], country: CountryAdapter, opts: { lang?: CoreLang } = {}): Assessment {
  const lang: CoreLang = opts.lang ?? input.lang ?? "en";
  const T = tr(lang);
  const params = buildParams(country);
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
    gasGridInjection: bestRoute === "biomethane",
    lang,
  });
  const pointsOf = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
  const regPoints = regItems.reduce((a, i) => a + pointsOf[i.effort], 0);
  const regComplexity = regPoints >= 17 ? "HIGH" : regPoints >= 13 ? "MEDIUM" : "LOW";

  const ownPrice = (input.energy.electricityPriceLocalPerKwh ?? 0) > 0;
  const quality = assessQuality(input, base, demand, T, { currency: country.currency, profileOnly: country.dataStatus === "estimated" && !ownPrice });
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

  const supportIncluded = (input.assumedSupportEurPerKwh ?? 0) > 0;
  const notes = [
    T(`Support: ${country.support.summary.en}`, `Підтримка: ${country.support.summary.uk}`),
    ...country.approachNotes[lang],
    supportIncluded ? T("WARNING: an assumed, non-guaranteed support payment is included.", "УВАГА: у розрахунок включено припущену підтримку, яка не гарантована.") : T("The verdict excludes subsidies; national support is shown as separate cases.", "Вердикт не враховує субсидій; національна підтримка показана окремими сценаріями."),
    T("This is a preliminary (screening) assessment — not a detailed engineering design and not a commercial offer.", "Це попередня (скринінгова) оцінка: не детальний інженерний проєкт і не комерційна пропозиція."),
  ];

  const used = params.usedIds();
  return {
    input,
    countryCode: country.code,
    fx,
    scenarios: { conservative: cons, base, optimistic: opt },
    routesBase: { chp: matrix.chp.base, boiler: matrix.boiler.base, biomethane: matrix.biomethane.base },
    routeMatrix: matrix,
    bestRoute,
    sensitivity,
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

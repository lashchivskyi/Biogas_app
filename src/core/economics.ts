import { biomethaneOfftake, buildCapex, peakMonthlyHeatKw } from "./capex";
import { HOURS_IN_MONTH } from "./climate";
import type { RunContext } from "./context";
import { customerDemand } from "./demand";
import { assessDigestate } from "./digestate";
import { designDigester } from "./digester";
import { runEnergy } from "./energy";
import { analyseFeedstock } from "./feedstock";
import { buildFinancials } from "./finance";
import type { CapexBreakdown, OpexAndRevenue, PlantClass, RouteId, ScenarioResult } from "./types";

/** Size classes span the whole industry: farm micro-plants to industrial biomethane. */
export function classifyPlant(kwEl: number): PlantClass {
  if (kwEl < 50) return "micro";
  if (kwEl < 250) return "small";
  if (kwEl < 1000) return "medium";
  if (kwEl < 5000) return "large";
  return "industrial";
}

export function runScenarioRoute(ctx: RunContext, route: RouteId): ScenarioResult {
  const p = ctx.params;
  const T = ctx.t;
  const { scenario, mods, input } = ctx;
  const sup = ctx.support;
  const feed = analyseFeedstock(ctx);
  const design = designDigester(feed, ctx);
  const demand = customerDemand(ctx);
  const energyBeforeOfftake = runEnergy(route, feed, design, demand, ctx);
  const energy = route === "biomethane" && biomethaneOfftake(ctx, energyBeforeOfftake).mode === "cng"
    ? runEnergy(route, feed, design, demand, ctx, true)
    : energyBeforeOfftake;
  const peakKw = peakMonthlyHeatKw(design, HOURS_IN_MONTH);
  const gross = buildCapex(route, feed, design, energy, ctx, peakKw);
  const dig = assessDigestate(feed, ctx);

  const kwEq = route === "chp" ? energy.chpKwEl : (energy.gasEnergyKwh * 0.36) / p.get("eng.chp_design_hours");

  const selfShare = p.get("econ.self_consumption_variable_share");
  const exportPrice = p.get("econ.electricity_spot_eur_kwh") * p.get("econ.export_haircut") * scenario.energyPriceMult * mods.energyPrice;
  const bmKey = scenario.biomethanePriceKey;
  const marketBm = p.get(`econ.biomethane_price_${bmKey}_eur_nm3`) * mods.energyPrice;
  const bmPrice = sup?.biomethaneEurNm3 !== undefined && route === "biomethane" ? sup.biomethaneEurNm3 : marketBm;
  const opexMult = scenario.opexMult * mods.opex;
  const maintMult = mods.maintenance;

  // ---------- revenue / savings ----------
  const revenue: { id: string; label: string; eur: number }[] = [];
  const rev = (id: string, label: string, eur: number) => {
    if (Math.abs(eur) > 0.5) revenue.push({ id, label, eur });
  };
  let selfEur = energy.elSelfConsumedKwh * demand.electricityPriceEurKwh * selfShare;
  let exportEur = energy.elExportedKwh * exportPrice;
  let tariffEur = 0;
  const tariff = route === "chp" && input.energy.hasGridConnection ? sup?.electricityTariffEurKwh : undefined;
  if (tariff !== undefined) {
    // Feed-in style support: if the tariff beats the avoided bill, everything is sold under the tariff.
    if (tariff >= demand.electricityPriceEurKwh * selfShare) {
      tariffEur = energy.elNetKwh * tariff;
      selfEur = 0;
      exportEur = 0;
    } else {
      tariffEur = energy.elExportedKwh * tariff;
      exportEur = 0;
    }
  }
  const heatEur = energy.heatUsefulKwh * demand.heatValueEurKwh;
  const bmEur = energy.biomethaneNm3 * bmPrice;
  const disposalEur = feed.lines.reduce((a, l) => a + l.disposalSavingEurYear, 0);
  const supportEur = (input.assumedSupportEurPerKwh ?? 0) * energy.elNetKwh;

  rev("el_self", T("Electricity savings (self-consumption)", "Економія на електроенергії (власне споживання)"), selfEur);
  rev("el_export", T("Surplus electricity sold", "Продаж надлишків електроенергії"), exportEur);
  rev("el_tariff", T(`Electricity under ${sup?.name ?? "support tariff"}`, `Електрика за ${sup?.name ?? "тарифом підтримки"}`), tariffEur);
  rev("heat", T("Useful heat (fuel displaced)", "Корисне тепло (заміщення палива)"), heatEur);
  rev("biomethane", sup?.biomethaneEurNm3 !== undefined && route === "biomethane" ? T(`Biomethane under ${sup.name}`, `Біометан за ${sup.name}`) : T("Biomethane sales", "Продаж біометану"), bmEur);
  rev("disposal", T("Avoided waste-disposal cost", "Економія на утилізації відходів"), disposalEur);
  rev("digestate", T("Digestate fertiliser value (incremental)", "Добривна цінність дигестату (інкрементальна)"), dig.fertiliserValueEurYear);
  rev("support", T("Assumed support (NOT guaranteed)", "Припущена підтримка (НЕ гарантована)"), supportEur);

  // ---------- opex ----------
  const opex: { id: string; label: string; eur: number }[] = [];
  const ox = (id: string, label: string, eur: number) => {
    if (Math.abs(eur) > 0.5) opex.push({ id, label, eur });
  };
  const labourHours = Math.max(p.get("eng.opex.labour_min_hours"), p.get("eng.opex.labour_hours_per_kw") * Math.max(kwEq, 0));
  ox("labour", T("Staff (operator, supervision)", "Персонал (оператор, нагляд)"), labourHours * p.get("econ.labour_official_eur_h") * p.get("econ.operator_wage_ratio") * opexMult);
  ox("chp_service", T("CHP service (oil, spares, overhaul reserve)", "Сервіс когенерації (мастило, запчастини, ремонт)"), energy.elGrossKwh * p.get("eng.opex.chp_service_eur_kwh") * opexMult * maintMult);
  const upgradingCapex = gross.lines.filter((l) => l.id === "upgrading").reduce((a, l) => a + l.eur, 0);
  const chpCapex = gross.lines.filter((l) => l.id === "chp").reduce((a, l) => a + l.eur, 0);
  const otherCapex = gross.totalEur - upgradingCapex - chpCapex;
  ox("maintenance", T("Plant maintenance", "Обслуговування обладнання"), otherCapex * p.get("eng.opex.maintenance_share") * opexMult * maintMult);
  ox("upgrading_maintenance", T("Upgrading unit maintenance", "Обслуговування установки очищення"), upgradingCapex * p.get("eng.opex.upgrade_maintenance_share") * opexMult * maintMult);
  ox("insurance", T("Insurance", "Страхування"), gross.totalEur * p.get("eng.opex.insurance_share"));
  ox("monitoring", T("Lab tests, safety inspections, leak monitoring", "Лабораторія, інспекції безпеки, моніторинг витоків"), p.get("eng.opex.monitoring_fixed") * opexMult);
  ox("feedstock", T("Feedstock purchase (net of gate fees)", "Закупівля сировини (за вирахуванням плати за прийом)"), feed.lines.reduce((a, l) => a + l.purchaseCostEurYear, 0));
  ox("opportunity", T("Lost revenue from alternative feedstock use", "Втрачений дохід від альтернативного використання сировини"), feed.lines.reduce((a, l) => a + l.opportunityCostEurYear, 0));
  ox("transport", T("Feedstock logistics (and digestate return)", "Логістика сировини (та повернення дигестату)"), feed.lines.reduce((a, l) => a + l.transportCostEurYear, 0));
  ox("digestate_handling", T("Digestate handling (incremental)", "Поводження з дигестатом (інкрементально)"), dig.handlingCostEurYear);
  ox("el_purchased", T("Electricity purchased", "Закупівля електроенергії"), energy.elPurchasedKwh * demand.electricityPriceEurKwh);
  ox("heat_external", T("External heat for the digester", "Зовнішнє тепло для обігріву реактора"), energy.heatExternalPurchasedKwh * demand.heatValueEurKwh);
  if (route === "biomethane" && biomethaneOfftake(ctx, energy).mode === "cng") ox("cng_haul", T("Bio-CNG road haulage to the offtaker", "Перевезення bio-CNG до покупця"), biomethaneOfftake(ctx, energy).haulEurYear * opexMult);
  if (route === "biomethane") ox("certification", T("Biomethane certification, trading, balancing", "Сертифікація, торгівля, балансування біометану"), energy.biomethaneNm3 * p.get("eng.opex.certification_eur_nm3") * opexMult);

  const revenueEur = revenue.reduce((a, l) => a + l.eur, 0);
  const opexEur = opex.reduce((a, l) => a + l.eur, 0);
  const opexRev: OpexAndRevenue = { opex, opexEur, revenue, revenueEur, ebitdaEur: revenueEur - opexEur };

  // ---------- grant (support case only) ----------
  let capex: CapexBreakdown = gross;
  const grantShare = sup?.capexGrantShare ?? 0;
  if (grantShare > 0) {
    const grant = -gross.totalEur * grantShare;
    capex = {
      lines: [...gross.lines, { id: "grant", label: T(`Grant / tax credit: ${sup!.name} (${Math.round(grantShare * 100)} %)`, `Грант / податковий кредит: ${sup!.name} (${Math.round(grantShare * 100)} %)`), eur: grant }],
      totalEur: gross.totalEur + grant,
    };
  }

  // ---------- cash flow ----------
  const energyRevenue = selfEur + exportEur + heatEur + bmEur + supportEur;
  const otherRevenue = disposalEur + dig.fertiliserValueEurYear;
  const horizon = Math.round(p.get("econ.horizon_years"));
  const debtShare = input.finance?.debtShare ?? p.get("econ.debt_share");
  const fin = buildFinancials({
    capexEur: capex.totalEur,
    energyRevenue,
    otherRevenue,
    fixedRevenue: tariffEur, // tariffs are fixed, not market-escalated
    opexEur,
    horizon,
    discount: p.get("econ.discount_rate"),
    energyEsc: p.get("econ.energy_escalation"),
    opexEsc: p.get("econ.opex_escalation"),
    rampYear1: p.get("eng.rampup_year1"),
    debtShare,
    debtRate: p.get("econ.debt_interest"),
    debtTenor: p.get("econ.debt_tenor_years"),
  });

  return {
    scenario: scenario.id,
    route,
    feed,
    design,
    energy,
    capex,
    opexRev,
    fin,
    plantClass: classifyPlant(kwEq),
    kwElEquivalent: kwEq,
    usedParams: p.usedIds(),
  };
}

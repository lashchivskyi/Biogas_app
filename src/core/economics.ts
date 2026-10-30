import { prepareProcess } from "./processes";
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

export function runScenarioRoute(ctx: RunContext, route: RouteId, operatingYear = 0, installed?: { gross: CapexBreakdown; kw: number }): ScenarioResult {
  const p = ctx.params;
  const T = ctx.t;
  const { scenario, mods, input } = ctx;
  const sup = ctx.support;
  const prepared = input.process ? prepareProcess(ctx, operatingYear) : undefined;
  const process = prepared?.process;
  const feed = prepared?.feed ?? analyseFeedstock(ctx);
  const design = prepared?.design ?? designDigester(feed, ctx);
  const demand = customerDemand(ctx);
  const energyBeforeOfftake = runEnergy(route, feed, design, demand, ctx, false, installed?.kw);
  const energy = route === "biomethane" && biomethaneOfftake(ctx, energyBeforeOfftake).mode === "cng"
    ? runEnergy(route, feed, design, demand, ctx, true, installed?.kw)
    : energyBeforeOfftake;
  const peakKw = peakMonthlyHeatKw(design, HOURS_IN_MONTH);
  const gross = installed?.gross ?? buildCapex(route, feed, design, energy, ctx, peakKw, process);
  const dig = assessDigestate(feed, ctx);

  const kwEq = route === "chp" ? energy.chpKwEl : (energy.gasEnergyKwh * 0.36) / p.get("eng.chp_design_hours");

  const selfShare = demand.electricityPriceKnown ? p.get("eng.invoice_variable_share") : p.get("econ.self_consumption_variable_share");
  const exportPrice = p.get("econ.electricity_spot_eur_kwh") * p.get("econ.export_haircut") * scenario.energyPriceMult * mods.energyPrice;
  const bmKey = scenario.biomethanePriceKey;
  // Preserve the registry energy price when a custom treatment train has a different product purity.
  const marketBm = p.get(`econ.biomethane_price_${bmKey}_eur_nm3`) * mods.energyPrice * (energy.biomethaneCh4Share ?? p.get("eng.biomethane_ch4_purity")) / p.get("eng.biomethane_ch4_purity");
  const bmPrice = sup?.biomethaneEurNm3 !== undefined && route === "biomethane" ? sup.biomethaneEurNm3 : marketBm;
  const opexMult = scenario.opexMult * mods.opex;
  const maintMult = mods.maintenance;

  // ---------- revenue / savings ----------
  const revenue: { id: string; label: string; eur: number }[] = [];
  // Lines under €0.5 are hidden from the table but still counted, so revenue, EBITDA and cash flow agree.
  let revenueAll = 0;
  const rev = (id: string, label: string, eur: number) => {
    revenueAll += eur;
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
  const supportEur = 0; // Uncontracted legacy subsidies must not change the base verdict.

  rev("el_self", T("Electricity savings (self-consumption)", "Економія на електроенергії (власне споживання)"), selfEur);
  rev("el_export", T("Surplus electricity sold", "Продаж надлишків електроенергії"), exportEur);
  rev("el_tariff", T(`Electricity under ${sup?.name ?? "support tariff"}`, `Електрика за ${sup?.name ?? "тарифом підтримки"}`), tariffEur);
  rev("heat", T("Useful heat (fuel displaced)", "Корисне тепло (заміщення палива)"), heatEur);
  rev("biomethane", sup?.biomethaneEurNm3 !== undefined && route === "biomethane" ? T(`Biomethane under ${sup.name}`, `Біометан за ${sup.name}`) : T("Biomethane sales", "Продаж біометану"), bmEur);
  rev("disposal", T("Avoided waste-disposal cost", "Економія на утилізації відходів"), disposalEur);
  rev("digestate", T("Digestate fertiliser value (incremental)", "Добривна цінність дигестату (інкрементальна)"), dig.fertiliserValueEurYear);
  if (process) rev("treatment", T("Avoided treatment charges (contract basis)", "Уникнені витрати очищення (за договором)"), process.avoidedTreatmentEurYear);
  rev("support", T("Assumed support (NOT guaranteed)", "Припущена підтримка (НЕ гарантована)"), supportEur);

  // ---------- opex ----------
  const opex: { id: string; label: string; eur: number }[] = [];
  const ox = (id: string, label: string, eur: number) => {
    if (Math.abs(eur) > 0.5) opex.push({ id, label, eur });
  };
  const labourHours = Math.max(p.get("eng.opex.labour_min_hours"), p.get("eng.opex.labour_hours_per_kw") * Math.max(kwEq, 0));
  ox("labour", T("Staff (operator, supervision)", "Персонал (оператор, нагляд)"), labourHours * p.get("econ.labour_official_eur_h") * p.get("econ.operator_wage_ratio") * opexMult);
  ox("chp_service", T("CHP service (oil, spares, overhaul reserve)", "Сервіс когенерації (мастило, запчастини, ремонт)"), energy.elGrossKwh * p.get("eng.opex.chp_service_eur_kwh") * Math.pow(Math.max(energy.chpKwEl, 1) / 100, p.get("eng.opex.chp_service_scale_exp")) * opexMult * maintMult);
  const upgradingCapex = gross.lines.filter((l) => l.id === "upgrading").reduce((a, l) => a + l.eur, 0);
  const chpCapex = gross.lines.filter((l) => l.id === "chp").reduce((a, l) => a + l.eur, 0);
  const otherCapex = gross.totalEur - upgradingCapex - chpCapex - (process?.capexEur ?? 0);
  ox("maintenance", T("Plant maintenance", "Обслуговування обладнання"), otherCapex * p.get("eng.opex.maintenance_share") * opexMult * maintMult);
  ox("upgrading_maintenance", T("Upgrading unit maintenance", "Обслуговування установки очищення"), upgradingCapex * p.get("eng.opex.upgrade_maintenance_share") * opexMult * maintMult);
  ox("insurance", T("Insurance", "Страхування"), gross.totalEur * p.get("eng.opex.insurance_share"));
  ox("monitoring", T("Lab tests, safety inspections, leak monitoring", "Лабораторія, інспекції безпеки, моніторинг витоків"), p.get("eng.opex.monitoring_fixed") * opexMult);
  ox("feedstock", T("Feedstock purchase (net of gate fees)", "Закупівля сировини (за вирахуванням плати за прийом)"), feed.lines.reduce((a, l) => a + l.purchaseCostEurYear, 0));
  ox("opportunity", T("Lost revenue from alternative feedstock use", "Втрачений дохід від альтернативного використання сировини"), feed.lines.reduce((a, l) => a + l.opportunityCostEurYear, 0));
  ox("transport", T("Feedstock logistics (and digestate return)", "Логістика сировини (та повернення дигестату)"), feed.lines.reduce((a, l) => a + l.transportCostEurYear, 0));
  // Packaging, plastics and grit screened out of food waste / biowaste must be incinerated or landfilled.
  const rejectT = feed.lines.reduce((a, l) => a + l.tonnesYear * (l.typeId === "food_waste" ? p.get("eng.opex.reject_share_food_waste") : l.typeId === "municipal_biowaste" ? p.get("eng.opex.reject_share_biowaste") : 0), 0);
  ox("rejects", T("Disposal of pre-treatment rejects (packaging, plastics, grit)", "Утилізація відходів сортування (упаковка, пластик, пісок)"), rejectT * p.get("eng.opex.reject_disposal_eur_t") * opexMult);
  ox("digestate_handling", T("Digestate handling (incremental)", "Поводження з дигестатом (інкрементально)"), dig.handlingCostEurYear);
  ox("el_purchased", T("Electricity purchased", "Закупівля електроенергії"), energy.elPurchasedKwh * demand.electricityPriceEurKwh);
  ox("heat_external", T("External heat for the digester", "Зовнішнє тепло для обігріву реактора"), energy.heatExternalPurchasedKwh * demand.heatValueEurKwh);
  if (route === "biomethane" && biomethaneOfftake(ctx, energy).mode === "cng") ox("cng_haul", T("Bio-CNG road haulage to the offtaker", "Перевезення bio-CNG до покупця"), biomethaneOfftake(ctx, energy).haulEurYear * opexMult);
  if (route === "biomethane") ox("certification", T("Biomethane certification, trading, balancing", "Сертифікація, торгівля, балансування біометану"), energy.biomethaneNm3 * p.get("eng.opex.certification_eur_nm3") * opexMult);

  if (process) {
    ox("process_operation", T("Upstream process operation (budget)", "Експлуатація технологічної частини (бюджет)"), process.opexEurYear);
    ox("residual_disposal", T("Residuals treatment and disposal", "Очищення й утилізація залишків"), process.residualTonnesYear * (input.process!.residualCostLocalT ?? 0) / ctx.fx * opexMult);
    ox("gas_supply", T("Purchased biogas", "Закупівля біогазу"), process.gasPurchaseEurYear);
  }
  const revenueEur = revenueAll;
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
  const otherRevenue = disposalEur + dig.fertiliserValueEurYear + (process?.avoidedTreatmentEurYear ?? 0);
  const horizon = Math.round(p.get("econ.horizon_years"));
  const debtShare = input.finance?.debtShare ?? p.get("econ.debt_share");
  const annualOperating = !installed && process && (process.kind === "landfill" || process.kind === "gas")
    ? Array.from({ length: horizon }, (_, y) => {
      const op = y === 0 ? opexRev : runScenarioRoute(ctx, route, y, { gross, kw: energy.chpKwEl }).opexRev;
      return { revenue: op.revenueEur, opex: op.opexEur };
    }) : undefined;
  const fin = buildFinancials({
    annualOperating,
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
    process,
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

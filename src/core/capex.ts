import { FEEDSTOCKS } from "./feedstockData";
import { DAYS_IN_MONTH } from "./climate";
import type { RunContext } from "./context";
import type { CapexBreakdown, DigesterDesign, EnergyBalance, FeedstockSummary, RouteId } from "./types";

/**
 * Component-based CAPEX (EU-baseline unit costs × country factor × scenario × sensitivity).
 * Built from physical sizing so that each line can be challenged and replaced by a supplier quote.
 */
/**
 * How biomethane leaves the site: a pipeline to the gas grid, or compressed bio-CNG by road ("virtual pipeline",
 * the SATAT / Brazilian / remote-site practice). Road transport is chosen where the country has no established
 * injection pathway, or where it is cheaper than the pipeline (CAPEX + 8 years of haulage as a simple comparison).
 */
export function biomethaneOfftake(ctx: RunContext, energy: EnergyBalance) {
  const p = ctx.params;
  const km = ctx.input.site.gasGridKm ?? 2;
  const purity = p.get("eng.biomethane_ch4_purity");
  const nm3h = Math.max(energy.rawBiogasDesignNm3PerHour * energy.rawBiogasCh4Share / purity, 5);
  const pipelineEur = km * p.get("eng.capex.pipeline_eur_km");
  const cngEur = p.get("eng.capex.cng_fixed") + p.get("eng.capex.cng_per_nm3h") * nm3h;
  const haulEurYear = energy.biomethaneNm3 * p.get("eng.opex.cng_haul_eur_nm3");
  const gridCost = p.get("eng.capex.injection_fixed") + pipelineEur;
  const mode: "grid" | "cng" = !ctx.country.biomethaneInjection || cngEur + 8 * haulEurYear < gridCost ? "cng" : "grid";
  return { mode, km, pipelineEur, cngEur, haulEurYear };
}

export function buildCapex(
  route: RouteId,
  feed: FeedstockSummary,
  design: DigesterDesign,
  energy: EnergyBalance,
  ctx: RunContext,
  peakHeatKw: number,
): CapexBreakdown {
  const p = ctx.params;
  const T = ctx.t;
  const lines: { id: string; label: string; eur: number }[] = [];
  const add = (id: string, label: string, eur: number) => {
    if (eur > 0) lines.push({ id, label, eur });
  };

  // Digester tank(s)
  const v = Math.max(design.workingVolumeM3, 50);
  const unit = p.get("eng.capex.digester_eur_m3_1000") * Math.pow(v / 1000, p.get("eng.capex.digester_scale_exp"));
  const techMult = design.tech.digestion === "high_solids" ? 1.15 : 1;
  const unitClamped = Math.min(Math.max(unit, 110), 450);
  const kind = design.tech.digestion;
  const digesterEur =
    kind === "covered_lagoon"
      ? design.totalVolumeM3 * p.get("eng.capex.lagoon_eur_m3")
      : kind === "high_rate"
        ? design.totalVolumeM3 * p.get("eng.capex.high_rate_eur_m3")
        : design.totalVolumeM3 * unitClamped * techMult;
  add(
    "digester",
    kind === "covered_lagoon"
      ? T("Covered anaerobic lagoon (liner, gas-tight cover, gas collection)", "Накрита анаеробна лагуна (геомембрана, газонепроникне накриття, збір газу)")
      : kind === "high_rate"
        ? T("High-rate anaerobic reactor with equalisation tank", "Високонавантажений анаеробний реактор з буферною ємністю")
        : T("Digester (tank, insulation, mixing, heating, membrane roof)", "Реактор (ємність, ізоляція, змішування, нагрів, мембранний дах)"),
    digesterEur,
  );

  // Storage
  add("storage_cover", T("Gas-tight cover on existing storage", "Газонепроникне накриття існуючого сховища"), design.storageCovered * p.get("eng.capex.cover_existing_eur_m3"));
  add("storage_new", T("New covered digestate storage", "Нове накрите сховище дигестату"), design.storageNew * p.get("eng.capex.storage_new_eur_m3"));

  // Feed & reception
  const hasSolids = feed.dryMatterPct >= p.get("eng.wet_solids_feeding_dm_pct") || feed.lines.some((l) => l.dryMatterPct >= 20);
  const hasWaste = feed.lines.some((l) => l.category === "processing");
  let feedEur = p.get("eng.capex.feed_slurry");
  if (hasSolids) feedEur += p.get("eng.capex.feed_solids");
  if (hasWaste) feedEur += p.get("eng.capex.reception_waste");
  // Contaminated / packaged wastes need a depackaging & sorting line and an enclosed reception hall, scaling with throughput.
  const dirtyTpa = feed.lines.filter((l) => FEEDSTOCKS[l.typeId].flags.includes("contaminants") && l.category === "processing").reduce((a, l) => a + l.tonnesYear, 0);
  if (dirtyTpa > 0) feedEur += p.get("eng.capex.pretreatment_eur_per_tpa") * dirtyTpa;
  add("feed", T("Feeding, reception and pre-treatment", "Подача, приймання, підготовка сировини"), feedEur);

  // Pasteurisation for ABP
  if (feed.abpTonnesYear > 0) {
    const peakAbpTDay = Math.max(...DAYS_IN_MONTH.map((days, i) =>
      feed.lines.filter((l) => FEEDSTOCKS[l.typeId].abp !== "none").reduce((total, l) => total + l.monthlyTonnes[i], 0) / days,
    ));
    add("pasteurisation", T("Pasteurisation 70 °C / 1 h (ABP Cat. 3)", "Пастеризація 70 °C / 1 год (ABP кат. 3)"), p.get("eng.capex.pasteurisation_fixed") + p.get("eng.capex.pasteurisation_per_tday") * peakAbpTDay);
  }

  // Gas system
  const rawNm3h = Math.max(energy.rawBiogasDesignNm3PerHour, 1);
  add("gas_system", T("Gas holder, flare, H₂S removal, gas lines", "Газгольдер, факел, очищення (H₂S), газові лінії"), p.get("eng.capex.gas_system_fixed") + p.get("eng.capex.gas_system_per_nm3h") * rawNm3h);

  // Conversion equipment
  let conversion = 0;
  if (route === "chp") {
    const kw = Math.max(energy.chpKwEl, 1);
    const unitChp = p.get("eng.capex.chp_eur_kw_100") * Math.pow(kw / 100, p.get("eng.capex.chp_scale_exp"));
    const chpEur = unitChp * kw;
    add("chp", T(`CHP unit ${Math.round(kw)} kWe`, `Когенераційна установка ${Math.round(kw)} кВт ел.`), chpEur);
    const thKw = (kw * energy.chpEtaTh) / Math.max(energy.chpEtaEl, 0.01);
    if (ctx.input.energy.heatNeed !== "none") add("heat_network", T("Heat exchangers and heat main to the consumer", "Теплообмінники та теплотраса до споживача"), p.get("eng.capex.heat_network_fixed") + p.get("eng.capex.heat_network_per_kw") * thKw);
    add("backup_boiler", T("Back-up biogas boiler", "Резервний котел на біогазі"), 0.5 * p.get("eng.capex.boiler_eur_kw") * peakHeatKw);
    conversion = chpEur;
  } else if (route === "boiler") {
    add("boiler", T("Biogas boiler", "Котел на біогазі"), p.get("eng.capex.boiler_eur_kw") * peakHeatKw * 1.2);
    if (ctx.input.energy.heatNeed !== "none") add("heat_network", T("Heat exchangers and heat main to the consumer", "Теплообмінники та теплотраса до споживача"), p.get("eng.capex.heat_network_fixed") + p.get("eng.capex.heat_network_per_kw") * peakHeatKw);
  } else {
    const q = Math.max(energy.rawBiogasDesignNm3PerHour, 10);
    add("upgrading", T("Biogas upgrading to biomethane (membranes) + compression", "Очищення біогазу до біометану (мембрани) + компресія"), p.get("eng.capex.upgrade_ref_eur") * Math.pow(q / 250, p.get("eng.capex.upgrade_scale_exp")));
    const off = biomethaneOfftake(ctx, energy);
    if (off.mode === "grid") {
      add("injection", T("Metering & grid-injection station", "Вузол обліку та ін'єкції"), p.get("eng.capex.injection_fixed"));
      add("pipeline", T(`Pipeline to gas grid (${off.km} km)`, `Газопровід до мережі (${off.km} км)`), off.pipelineEur);
    } else {
      add("cng", T("Bio-CNG: 250 bar compression, filling post, cascade trailers (no grid connection)", "Bio-CNG: компресія 250 бар, пост заправки, каскадні причепи (без приєднання до мережі)"), off.cngEur);
    }
    add("boiler", T("Boiler for digester heating", "Котел для обігріву реактора"), p.get("eng.capex.boiler_eur_kw") * peakHeatKw * 1.2);
  }
  void conversion;

  const equipment = lines.reduce((a, l) => a + l.eur, 0);
  add("electrical", T("Electrical, I&C and SCADA", "Електрика, КВП і автоматика (SCADA)"), equipment * p.get("eng.capex.electrical_share"));
  add("piping", T("Substrate and gas piping", "Трубопроводи субстрату та газу"), equipment * p.get("eng.capex.piping_share"));
  add("civil", T("Civil works, site, roads", "Будівельні роботи, майданчик, дороги"), equipment * p.get("eng.capex.civil_share"));
  if (route === "chp") {
    add("grid", T("Grid connection", "Приєднання до електромережі"), p.get("eng.capex.grid_connection_fixed") + p.get("eng.capex.grid_connection_per_kw") * energy.chpKwEl);
  } else {
    add("grid", T("Grid connection", "Приєднання до електромережі"), p.get("eng.capex.grid_connection_fixed") * 0.5);
  }
  const subtotal = lines.reduce((a, l) => a + l.eur, 0);
  add("engineering", T("Engineering, permits, EIA, commissioning", "Проєктування, дозволи, ОВД, пусконалагодження"), subtotal * p.get("eng.capex.engineering_share"));
  const subtotal2 = lines.reduce((a, l) => a + l.eur, 0);
  add("contingency", T("Contingency", "Непередбачені витрати"), subtotal2 * p.get("eng.capex.contingency_share"));

  // Country, scenario and sensitivity multipliers act on the whole stack (they are cost levels).
  const routeFactor = `econ.capex_factor_${route}`;
  const mult = p.get(p.has(routeFactor) ? routeFactor : "econ.capex_factor") * ctx.scenario.capexMult * ctx.mods.capex;
  const scaled = lines.map((l) => ({ ...l, eur: l.eur * mult }));
  return { lines: scaled, totalEur: scaled.reduce((a, l) => a + l.eur, 0) };
}

export function peakMonthlyHeatKw(design: DigesterDesign, hoursInMonth: number[]): number {
  let peak = 0;
  design.monthlyHeatDemandKwh.forEach((e, i) => {
    peak = Math.max(peak, e / hoursInMonth[i]);
  });
  return peak * 1.3; // installed boiler margin
}

import { HOURS_IN_MONTH } from "./climate";
import type { RunContext } from "./context";
import type { CustomerDemand } from "./demand";
import type { DigesterDesign, EnergyBalance, FeedstockSummary, RouteId } from "./types";

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Electrical efficiency of a gas engine as a function of rating (log-linear between data points). */
export function chpEtaEl(kw: number, get: (id: string) => number): number {
  const pts: Array<[number, number]> = [
    [25, get("eng.chp_eta_el_25")],
    [50, get("eng.chp_eta_el_50")],
    [100, get("eng.chp_eta_el_100")],
    [250, get("eng.chp_eta_el_250")],
    [500, get("eng.chp_eta_el_500")],
  ];
  if (kw <= pts[0][0]) return pts[0][1];
  if (kw >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (kw >= x0 && kw <= x1) {
      const f = (Math.log(kw) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
      return y0 + f * (y1 - y0);
    }
  }
  return pts[0][1];
}

const roundKw = (kw: number) => (kw < 100 ? Math.round(kw / 5) * 5 : Math.round(kw / 10) * 10);

export function runEnergy(
  route: RouteId,
  feed: FeedstockSummary,
  design: DigesterDesign,
  demand: CustomerDemand,
  ctx: RunContext,
  cngCompression = false,
): EnergyBalance {
  const { params: p, scenario, mods, input } = ctx;
  const lhv = p.get("eng.ch4_lhv_kwh_m3");
  const boilerEff = p.get("eng.boiler_efficiency");
  const etaTotal = p.get("eng.chp_eta_total");
  const recovery = p.get("eng.chp_heat_recovery");
  const designHours = p.get("eng.chp_design_hours");
  const slipChp = p.get("eng.chp_slip_share");
  const slipUp = p.get("eng.upgrade_slip_share");
  const purity = p.get("eng.biomethane_ch4_purity");
  const upKwh = p.get("eng.upgrade_kwh_per_nm3_raw");
  const coincidence = p.get("eng.self_consumption_coincidence");
  const parBase = p.get("eng.parasitic_base_kwh_t");
  const parDm = p.get("eng.parasitic_dm_kwh_t_per_pct");
  const leak = scenario.leakShare;

  const ch4Prod = feed.ch4M3Year;
  const ch4Leaked = ch4Prod * leak;
  const frac = feed.biogasM3Year > 0 ? feed.ch4M3Year / feed.biogasM3Year : 0.58;

  const gasM = feed.monthlyCh4M3.map((m3) => m3 * (1 - leak) * lhv); // kWh LHV, usable
  const gasYear = sum(gasM);
  const dig = design.monthlyHeatDemandKwh;

  const monthlyHeatUseful = new Array(12).fill(0) as number[];
  const monthlyElNet = new Array(12).fill(0) as number[];
  let elNet = 0;
  let elSelf = 0;
  let elExport = 0;
  const monthlyDigHeat = new Array(12).fill(0) as number[];

  let flared = 0;
  let gasToChp = 0;
  let gasToBoiler = 0;
  let gasToUpgrader = 0;
  let elGross = 0;
  let elPar = 0;
  let elPurchased = 0;
  let heatProduced = 0;
  let heatDigesterTotal = 0;
  let heatExternal = 0;
  let heatNet = 0;
  let heatUseful = 0;
  let bioNm3 = 0;
  let cngCompressionKwh = 0;
  let rawToUpgrade = 0;
  let slipUpgradeKwh = 0;
  let chpSlipKwh = 0;
  let chpKw = 0;
  let etaEl = 0;

  const parasiticMonth = (i: number) => feed.monthlyTonnes[i] * (parBase + parDm * feed.dryMatterPct);

  if (route === "chp") {
    // A monthly peak, rather than the annual average, sets the engine rating for seasonal feed.
    const qNom = Math.max(...gasM.map((g, i) => g / HOURS_IN_MONTH[i])) * (8760 / designHours);
    let eta = 0.36;
    let kw = qNom * eta;
    for (let k = 0; k < 4; k++) {
      eta = chpEtaEl(Math.max(kw, 1), (id) => p.get(id));
      kw = qNom * eta;
    }
    chpKw = kw < 1 ? 0 : roundKw(kw);
    etaEl = chpEtaEl(Math.max(chpKw, 1), (id) => p.get(id));
    const etaTh = Math.max(0, etaTotal - etaEl);
    const qInstalled = etaEl > 0 ? chpKw / etaEl : 0;
    const hoursEff = Math.max(0, scenario.chpHours - (mods.extraDowntimePp / 100) * 8760);
    const heatPerGas = recovery * etaTh;

    for (let i = 0; i < 12; i++) {
      const G = gasM[i];
      const D = dig[i];
      const cap = (qInstalled * HOURS_IN_MONTH[i] * hoursEff) / 8760;
      let gC = Math.min(G, cap);
      let gB = 0;
      let ext = 0;
      if (heatPerGas * gC < D) {
        // CHP heat alone does not cover digester heat: use leftover gas in a boiler first.
        const leftover = G - gC;
        if (heatPerGas * gC + boilerEff * leftover >= D) {
          gB = (D - heatPerGas * gC) / boilerEff;
        } else {
          // Divert CHP gas to the boiler until the digester is heated (or gas runs out).
          const gcSolve = (boilerEff * G - D) / (boilerEff - heatPerGas);
          if (gcSolve >= 0) {
            gC = Math.min(gC, gcSolve);
            gB = G - gC;
          } else {
            gC = 0;
            gB = G;
            ext = D - boilerEff * G;
          }
        }
      }
      const gFlare = Math.max(0, G - gC - gB);
      gasToChp += gC;
      gasToBoiler += gB;
      flared += gFlare;
      const gen = gC * etaEl;
      const par = parasiticMonth(i);
      elGross += gen;
      elPar += par;
      const net = gen - par;
      if (net < 0) elPurchased += -net;
      const usable = Math.max(0, net);
      monthlyElNet[i] = usable;
      elNet += usable;
      const coincident = demand.electricityKwhYear * (HOURS_IN_MONTH[i] / 8760) * coincidence;
      const self = Math.min(usable, coincident);
      elSelf += self;
      if (input.energy.hasGridConnection) elExport += usable - self;
      const chpHeat = gC * heatPerGas;
      const boilerHeat = gB * boilerEff;
      heatProduced += gC * recovery * etaTh + boilerHeat;
      heatDigesterTotal += D;
      monthlyDigHeat[i] = D;
      heatExternal += ext;
      const surplus = Math.max(0, chpHeat + boilerHeat - D);
      heatNet += surplus;
      const useful = usefulHeat(surplus, demand, i, scenario.heatUtilisation * mods.heatUse);
      monthlyHeatUseful[i] = useful;
      heatUseful += useful;
      chpSlipKwh += gC * slipChp;
    }
  } else if (route === "boiler") {
    for (let i = 0; i < 12; i++) {
      const G = gasM[i];
      const D = dig[i];
      const heat = boilerEff * G;
      gasToBoiler += G;
      heatProduced += heat;
      heatDigesterTotal += D;
      monthlyDigHeat[i] = D;
      const surplus = Math.max(0, heat - D);
      if (heat < D) heatExternal += D - heat;
      heatNet += surplus;
      const useful = usefulHeat(surplus, demand, i, scenario.heatUtilisation * mods.heatUse);
      monthlyHeatUseful[i] = useful;
      heatUseful += useful;
      const par = parasiticMonth(i);
      elPar += par;
      elPurchased += par;
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const G = gasM[i];
      const D = dig[i];
      const gB = Math.min(G, D / boilerEff);
      if (D > boilerEff * G) heatExternal += D - boilerEff * G;
      heatProduced += gB * boilerEff;
      heatDigesterTotal += D;
      monthlyDigHeat[i] = D;
      const raw = G - gB;
      gasToBoiler += gB;
      gasToUpgrader += raw;
      const outKwh = raw * (1 - slipUp);
      slipUpgradeKwh += raw * slipUp;
      bioNm3 += outKwh / (lhv * purity);
      rawToUpgrade += raw / lhv / frac; // Nm3 raw biogas
      const par = parasiticMonth(i) + ((raw / lhv / frac) * upKwh);
      elPar += par;
      elPurchased += par;
    }
  }

  if (route === "biomethane" && cngCompression) {
    cngCompressionKwh = bioNm3 * p.get("eng.cng_compression_kwh_nm3");
    elPar += cngCompressionKwh;
    elPurchased += cngCompressionKwh;
  }

  const lossCh4Kwh = ch4Leaked * lhv + chpSlipKwh + slipUpgradeKwh + flared * 0.02;
  const prodKwh = ch4Prod * lhv;

  return {
    route,
    ch4ProducedM3: ch4Prod,
    ch4LeakedM3: ch4Leaked,
    ch4ToChpM3: gasToChp / lhv,
    ch4ToBoilerM3: gasToBoiler / lhv,
    ch4ToUpgraderM3: gasToUpgrader / lhv,
    ch4FlaredM3: flared / lhv,
    gasEnergyKwh: gasYear,
    flaredKwh: flared,
    chpKwEl: chpKw,
    chpEtaEl: etaEl,
    chpEtaTh: route === "chp" ? Math.max(0, etaTotal - etaEl) : 0,
    elGrossKwh: elGross,
    elParasiticKwh: elPar,
    cngCompressionKwh,
    elNetKwh: elNet,
    elSelfConsumedKwh: elSelf,
    elExportedKwh: elExport,
    elPurchasedKwh: elPurchased,
    heatProducedKwh: heatProduced,
    heatDigesterKwh: heatDigesterTotal,
    heatExternalPurchasedKwh: heatExternal,
    heatNetAvailableKwh: heatNet,
    heatUsefulKwh: heatUseful,
    biomethaneNm3: bioNm3,
    rawBiogasNm3PerHour: route === "biomethane" ? rawToUpgrade / designHours : feed.biogasM3Year / designHours,
    rawBiogasDesignNm3PerHour: route === "biomethane"
      ? Math.max(rawToUpgrade / designHours, ...gasM.map((g, i) => (g - Math.min(g, dig[i] / boilerEff)) / lhv / frac / HOURS_IN_MONTH[i]))
      : Math.max(feed.biogasM3Year / designHours, ...feed.monthlyCh4M3.map((m3, i) => m3 / frac / HOURS_IN_MONTH[i])),
    upgradingSlipM3: slipUpgradeKwh / lhv,
    methaneLossShare: prodKwh > 0 ? lossCh4Kwh / prodKwh : 0,
    monthly: { gasKwh: gasM, heatDigesterKwh: monthlyDigHeat, heatUsefulKwh: monthlyHeatUseful, elNetKwh: monthlyElNet },
  };
}

/**
 * Heat that earns money: only as much as the customer can absorb in that month, discounted by
 * scenario utilisation (timing, distance, outages). Unquantified demand earns no heat credit.
 */
function usefulHeat(surplus: number, demand: CustomerDemand, month: number, util: number): number {
  if (!demand.heatWanted) return 0;
  if (!demand.heatKnown) return 0;
  return Math.min(surplus, demand.heatMonthlyKwh[month]) * util;
}

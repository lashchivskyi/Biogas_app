/**
 * Real-plant reference sets and the model's result for each reference, with the micro-level factors that explain a miss.
 * One source for `scorecard.ts` (contract rows), `accuracy.ts` (diagnosis + the summary on /methodology) and nothing else.
 * Every exclusion rule is fixed before looking at the model's ratio and is applied in both directions (a reference never
 * leaves a set because the model misses it): scope (the reported value covers only part of the gas), physics (more output than
 * the excreted VS can give at full methane potential), or the publisher's own flag.
 */
import { assess } from "../src/core";
import { chpEtaEl } from "../src/core/energy";
import { ENGINEERING_MAP } from "../src/core/engineeringParams";
import { FEEDSTOCKS } from "../src/core/feedstockData";
import { landfillMethane } from "../src/core/processes";
import { getCountry } from "../src/countries";
import agstar from "../src/countries/data/agstar-backtest.json";
import bmp3 from "../src/countries/data/bmp3-plants.json";
import lmop from "../src/countries/data/lmop-landfills.json";
import ispra from "../src/countries/data/ispra-biowaste.json";
import eiaGas from "../src/countries/data/eia-digester-gas.json";
import { agstarInput, isNameplate, type AgstarRow } from "../src/countries/backtest";

const get = (id: string) => ENGINEERING_MAP[id as keyof typeof ENGINEERING_MAP].value;
const LHV = 9.97; // kWh/Nm³ CH4

/* ---------- US farm digesters: EPA AgSTAR, reported electricity ---------- */

/** Physical ceiling per head and year at 100 % collection and the full methane potential, before any downtime. As-excreted VS:
 * USDA NRCS AWMFH ch. 4 (210-VI-AWMFH, March 2008, from ASAE D384.2): lactating cow at the table's highest yield, 125 lb milk/d: 20 lb VS/d (9.07 kg, Table 4-5(a)); grow-to-finish
 * pig 5.4 lb VS/d per 1 000 lb at 154 lb average (0.377 kg, Table 4-10(d)). Bo: IPCC 2006 GL Vol. 4 Tables 10A-4/10A-7, North
 * America: dairy 0.24, market swine 0.48 m³ CH4/kg VS. A reported output above this cannot come from the listed herd's manure alone. */
const CEILING = { dairy: { vsKgDay: 9.07, bo: 0.24 }, swine: { vsKgDay: 0.377, bo: 0.48 } } as const;
/** Reactors the model designs for a temperate US farm (heated, mixed or plug flow). Unheated lagoons and the liquid-fraction
 * reactors (induced blanket, fixed film) are other technologies: shown as their own group, not in the like-for-like set. */
const HEATED_TANKS = /complete mix|plug flow|sequencing batch/i;

export interface AgstarPlant {
  row: AgstarRow;
  ratio: number;
  nameplate: boolean;
  inside: boolean;
  below: boolean;
  verdict: string;
  /** Electricity is the only listed gas use (no CNG, pipeline, boiler fuel, refrigeration). */
  soleUse: boolean;
  /** Reported kWh above the manure-only physical ceiling. */
  aboveCeiling: boolean;
  heatedTank: boolean;
  realKwhHead: number;
  modelKwhHead: number;
  ceilingKwhHead: number;
}

export function agstarPlants(): AgstarPlant[] {
  const US = getCountry("US");
  return (agstar.rows as AgstarRow[]).filter((r) => r.electricityKwhYear).map((row) => {
    const a = assess(agstarInput(row), US, { uncertainty: false });
    const m = a.routeMatrix.chp, actual = row.electricityKwhYear!;
    const lo = Math.min(m.conservative.energy.elGrossKwh, m.optimistic.energy.elGrossKwh), hi = Math.max(m.conservative.energy.elGrossKwh, m.optimistic.energy.elGrossKwh);
    const c = CEILING[row.animal], kw = actual / 8760;
    const ceilingKwhHead = c.vsKgDay * 365 * c.bo * LHV * chpEtaEl(Math.max(kw, 20), get);
    return {
      row, ratio: m.base.energy.elGrossKwh / actual, nameplate: isNameplate(row), inside: actual >= lo && actual <= hi, below: actual < lo, verdict: a.verdict.id,
      soleUse: /^(electricity|cogeneration)$/i.test(row.endUse.trim()), aboveCeiling: actual / row.head > ceilingKwhHead, heatedTank: HEATED_TANKS.test(row.digester ?? ""),
      realKwhHead: actual / row.head, modelKwhHead: m.base.energy.elGrossKwh / row.head, ceilingKwhHead,
    };
  });
}
/** Like-for-like: a read value (not nameplate × 8 760 h), dairy (the swine head counts mix sows and places), electricity the only
 * gas use, a heated tank, physically possible. */
export const likeForLike = (p: AgstarPlant) => !p.nameplate && p.row.animal === "dairy" && p.soleUse && p.heatedTank && !p.aboveCeiling;

/* ---------- Europe: FNR Biogas-Messprogramm III, fed substrate and measured methane ---------- */

// Substrates the calculator can enter. A plant counts only when ≥ 98 % of its fed mass maps (water and additives map to nothing).
// Fed silage is converted back to harvested mass, because the model deducts the KTBL clamp loss from what is entered.
export const BMP3_TYPES: Record<string, string> = {
  "Rindergülle": "dairy_slurry", "Rindergülle fester Anteil": "cattle_solid_manure", "Schweinegülle": "pig_slurry", "Rindermist": "cattle_solid_manure",
  "Pferdemist": "cattle_solid_manure", "Schafmist": "cattle_solid_manure", "Schweinemist": "cattle_solid_manure", "Hühnertrockenkot": "poultry_layer_manure",
  "Putenmist": "poultry_broiler_litter", "Mais-Ganzpflanzensilage": "maize_silage", "Maissilage": "maize_silage", "Kartoffeln": "potato_processing",
  "Grassilage": "grass_silage", "Kleegrassilage": "grass_silage", "Kleegras": "grass_silage", "Anwelksilage": "grass_silage", "Mix Gras- und Grünroggensilage": "grass_silage",
  "Roggen-Ganzpflanzensilage": "whole_crop_silage", "Triticale-Ganzpflanzensilage": "whole_crop_silage", "Tricitale-Ganzpflanzensilage": "whole_crop_silage", "Roggen GPS": "whole_crop_silage",
  "Gerste-Ganzpflanzensilage": "whole_crop_silage", "Mischung Roggen und Gerste-Ganzpflanzensilage": "whole_crop_silage", "Grünroggensilage": "whole_crop_silage",
  "Grünroggen-Ganzpflanzensilage": "whole_crop_silage", "Grünhafersilage": "whole_crop_silage",
  "Getreideschrot": "cereal_grain", "Getreide und Getreidekorn": "cereal_grain", "Weizen Getreide und Getreidekorn": "cereal_grain", "Roggenschrot": "cereal_grain",
  "Roggen-Getreidekorn": "cereal_grain", "Gerste-Getreidekorn": "cereal_grain", "Zuckerrüben": "sugar_beet", "Zuckerrübe": "sugar_beet",
  "Wasser": "", "Wasser (Stallspühlwasser)": "", "Silosickersaft": "", "Eisenpräparate": "",
};
const CLAMP_LOSS = 0.093;
/** A methane yield above 450 L/kg VS is above what carbohydrate/protein mixes can give (Buswell: ≈ 415 for carbohydrates). */
export const BMP3_MAX_L_PER_KG_VS = 450;

export function bmp3Plants() {
  const DE = getCountry("DE");
  const implausible = bmp3.rows.filter((x) => (x.ch4M3PerTVs ?? 0) > BMP3_MAX_L_PER_KG_VS).map((x) => x.id);
  const rows = bmp3.rows.filter((x) => x.feedTonnesYear && x.ch4M3PerTFm && x.feed.length && !implausible.includes(x.id));
  const unmappable = rows.filter((x) => x.feed.filter((f) => !(f.name in BMP3_TYPES)).reduce((a, f) => a + f.pctFm, 0) > 2).length;
  const plants = rows.filter((x) => { const sum = x.feed.reduce((a, f) => a + f.pctFm, 0); return sum > 90 && sum < 110 && x.feed.filter((f) => f.name in BMP3_TYPES).reduce((a, f) => a + f.pctFm, 0) / sum >= 0.98; })
    .map((x) => {
      const sum = x.feed.reduce((a, f) => a + f.pctFm, 0);
      const feedstocks = x.feed.filter((f) => BMP3_TYPES[f.name]).map((f, i) => ({ id: String(i), type: BMP3_TYPES[f.name] as "maize_silage", monthsActive: 12,
        quantity: Math.round(x.feedTonnesYear! * f.pctFm / sum / (FEEDSTOCKS[BMP3_TYPES[f.name] as "maize_silage"].flags.includes("energy_crop") ? 1 - CLAMP_LOSS : 1)) }));
      const a = assess({ countryCode: "DE", regionId: DE.regions[0].id, businessType: "dairy_farm", feedstocks, energy: { heatNeed: "none", hasGridConnection: true }, site: { existingStorageM3: 1e6 } }, DE, { uncertainty: false });
      const f = a.routesBase.chp.feed;
      const manurePct = x.feed.filter((g) => BMP3_TYPES[g.name] && FEEDSTOCKS[BMP3_TYPES[g.name] as "maize_silage"].category === "manure").reduce((s, g) => s + g.pctFm, 0) / sum;
      return { id: x.id, ratio: a.routesBase.chp.energy.ch4ProducedM3 / (x.ch4M3PerTFm! * x.feedTonnesYear!), manureShareFm: manurePct,
        modelLPerKgVs: f.ch4M3Year / (f.vsTonnesYear * 1000) * 1000, measuredLPerKgVs: x.ch4M3PerTVs ?? NaN, hrtDays: a.routesBase.chp.design.hrtDays, olr: a.routesBase.chp.design.olrKgVsM3Day };
    });
  return { plants, implausible, unmappable };
}

/* ---------- Italy: biowaste plants, ISPRA 2024 (tonnage by fraction, measured biogas) ---------- */

/** Rules fixed before the first run (2026-11-04): food fraction → food_waste; green + other → municipal_biowaste; sludge →
 * sewage_sludge; AD-only plants report food + green as one organic fraction → food_waste. Measured biogas outside 50–250 Nm³ per
 * fresh tonne is left out as a scope or reporting mismatch (part of the tonnage bypasses the digester, or other inputs). */
const ISPRA_REGION: Record<string, string> = { LOMBARDIA: "lombardia", "EMILIA ROMAGNA": "emilia", VENETO: "veneto", PIEMONTE: "piemonte", LAZIO: "lazio", CAMPANIA: "campania",
  PUGLIA: "puglia", SICILIA: "sicilia", SARDEGNA: "sardegna", "TRENTINO ALTO ADIGE": "veneto", "FRIULI VENEZIA GIULIA": "veneto", LIGURIA: "piemonte", TOSCANA: "emilia",
  UMBRIA: "lazio", MARCHE: "emilia", ABRUZZO: "lazio", MOLISE: "puglia", CALABRIA: "campania", BASILICATA: "puglia" };
export function ispraPlants() {
  const IT = getCountry("IT");
  const all = ispra.plants.map((x) => ({ ...x, perT: x.biogasNm3 / x.totalT }));
  const kept = all.filter((x) => x.perT >= 50 && x.perT <= 250);
  const plants = kept.map((x) => {
    const lines = [
      { id: "f", type: "food_waste" as const, quantity: x.foodT },
      { id: "g", type: "municipal_biowaste" as const, quantity: x.greenT + x.otherT },
      { id: "s", type: "sewage_sludge" as const, quantity: x.sludgeT },
    ].filter((l) => l.quantity > 0).map((l) => ({ ...l, delivered: true, distanceKm: 15, monthsActive: 12 }));
    const a = assess({ countryCode: "IT", regionId: ISPRA_REGION[x.region] ?? "lazio", businessType: "municipal_biowaste", feedstocks: lines, energy: { heatNeed: "none", hasGridConnection: true }, site: {} }, IT, { uncertainty: false });
    return { id: `${x.comune} ${x.totalT}`, kind: x.kind, foodShare: x.foodT / x.totalT, perT: x.perT, ratio: a.routesBase.chp.feed.biogasM3Year / x.biogasNm3 };
  });
  return { plants, excluded: all.length - kept.length };
}

/* ---------- US digester-gas engines: EIA-923 + EIA-860 ---------- */

/** Rules fixed before the first run (2026-11-04): 0.15 < net η (HHV) < 0.45 (outside = fuel misallocated between power and heat);
 * wastewater plants by name (water, WPCP, WWTP, reclamation, treatment …). Ratio = net η (LHV) ÷ datasheet at the unit size. */
const WWTP = /water|wastewater|wpcp|wwtp|reclamation|wrf|awtf|treatment|pollution|wlwpcf|sewer|cogen plant/i;
export function eiaDigesterEngines() {
  const r = get("eng.gas_hhv_lhv_ratio");
  return eiaGas.plants.map((x) => ({ ...x, eta: x.netMwh * 3.412 / x.elecMmbtuHhv, unitKw: x.nameplateMw * 1000 / x.units, cf: x.netMwh / (x.nameplateMw * 8760) }))
    .filter((x) => x.eta > 0.15 && x.eta < 0.45)
    .map((x) => ({ name: x.name, wastewater: WWTP.test(x.name), cf: x.cf, ratio: x.eta * r / chpEtaEl(x.unitKw, get) }));
}

/* ---------- US landfills and engines: EPA LMOP 2022 ---------- */

const SCF_NM3 = 0.0283168 * 273.15 / 288.71; // standard cubic foot (60 °F) → Nm³ (0 °C)
/** AP-42 inventory defaults (k 0.04/a, L0 100 m³ CH4/t) with the collection a client types: AP-42's 75 % or our form guidance. */
export function lmopLandfills(collectionPct: number) {
  return lmop.landfills.map((x) => {
    const closed = x.status === "Closed" && !!x.closed && x.closed <= 2021;
    const end = closed ? x.closed! : 2022, years = Math.max(1, end - x.opened + 1), t = x.wipTons * 0.90718;
    const base = { kind: "landfill" as const, annualWasteTonnes: t / years, depositionYears: years, yearsSinceClosure: Math.max(0, 2022 - end), decayPerYear: 0.04, potentialNm3T: 100 };
    const actualCh4 = x.collectedMmscfd * 1e6 * 365 * SCF_NM3 * x.ch4Pct! / 100;
    // EPA's generation estimate is landfill gas at the LandGEM convention of 50 % CH4.
    const epaCh4 = x.generatedMmscfd ? x.generatedMmscfd * 1e6 * 365 * SCF_NM3 * 0.5 : NaN;
    return { id: x.id, closed, captured: landfillMethane({ ...base, collectionPct } as never).captured / actualCh4,
      method: landfillMethane({ ...base, collectionPct: 100 } as never).generated / epaCh4,
      /** By volume, as LMOP reports it. */
      collectedShare: x.generatedMmscfd ? x.collectedMmscfd / x.generatedMmscfd : NaN,
      /** Methane actually recovered ÷ methane EPA estimates is generated: collection and air dilution together. */
      methaneRecovery: actualCh4 / epaCh4, ch4Pct: x.ch4Pct! };
  });
}

/** Landfill-gas engines: electricity ÷ methane energy delivered to the project, against the datasheet at the unit size. */
export function lmopEngines() {
  const ch4 = new Map(lmop.landfills.map((x) => [x.id, x.ch4Pct!]));
  return lmop.projects.filter((x) => ch4.has(x.landfillId)).map((x, i) => {
    const eta = x.actualMw * 1000 / (x.flowMmscfd * 1e6 * SCF_NM3 / 24 * ch4.get(x.landfillId)! / 100 * LHV);
    const unitKw = x.ratedMw * 1000 / Math.max(1, Math.round(x.ratedMw / 1.6));
    return { i, load: x.actualMw / x.ratedMw, ratio: eta > 0.15 && eta < 0.6 ? eta / chpEtaEl(unitKw, get) : NaN };
  }).filter((x) => Number.isFinite(x.ratio));
}

/* ---------- statistics ---------- */

/** Fixed calibration / holdout split of every reference set, set on 2026-11-04 before any fitting to it: FNV-1a hash of the
 * reference id, odd = holdout. Parameters may be fitted on calibration rows only; contract figures are read on the holdout. */
export const isHoldout = (id: string) => {
  let h = 0x811c9dc5;
  for (const ch of id) h = Math.imul(h ^ ch.codePointAt(0)!, 0x01000193) >>> 0;
  return h % 2 === 1;
};

export const quantile = (xs: number[], p: number) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const i = (s.length - 1) * p, lo = Math.floor(i);
  return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
};
export const within = (xs: number[], tol: number) => xs.filter((x) => Math.abs(x - 1) <= tol).length;

/* ---------- summary for /methodology ("How accurate we are") ---------- */

/** Ratio bins (model ÷ real) for the distribution strip; edges on a log-like scale around 1. */
export const RATIO_BINS = [0.5, 0.75, 0.9, 1.1, 1.25, 1.5, 2] as const;

export interface AccuracySet {
  id: "us_farm_all" | "us_farm_like" | "de_farm_methane" | "us_landfill_engine" | "us_landfill_gas" | "capex";
  /** What is compared, model ÷ real. */
  quantity: "electricity" | "methane" | "engine" | "landfill_gas" | "capex";
  n: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  /** Share of references with the model within ±25 % (CAPEX: ±30 %). */
  withinShare: number;
  tolerance: number;
  /** Counts per bin: below 0.5, 0.5–0.75, …, above 2. */
  bins: number[];
  source: string;
  /** Empty when the set has several publishers (named in `source`). */
  url: string;
  period: string;
  /** reported = operator / voluntary report; measured = metered; published = budget or cost statement. */
  basis: "reported" | "measured" | "published";
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;
function set(id: AccuracySet["id"], quantity: AccuracySet["quantity"], ratios: number[], tolerance: number, meta: Pick<AccuracySet, "source" | "url" | "period" | "basis">): AccuracySet {
  const v = ratios.filter(Number.isFinite);
  const bins = new Array(RATIO_BINS.length + 1).fill(0) as number[];
  for (const x of v) bins[RATIO_BINS.filter((e) => x >= e).length]++;
  return { id, quantity, n: v.length, median: r3(quantile(v, 0.5)), p10: r3(quantile(v, 0.1)), p25: r3(quantile(v, 0.25)), p75: r3(quantile(v, 0.75)), p90: r3(quantile(v, 0.9)),
    withinShare: r3(within(v, tolerance) / v.length), tolerance, bins, ...meta };
}

export function accuracySummary(capexRatios: number[]): { sets: AccuracySet[] } {
  const ag = agstarPlants(), siteFactor = get("eng.chp_landfill_site_factor");
  const agMeta = { source: "EPA AgSTAR Livestock Anaerobic Digester Database", url: agstar.source, period: agstar.dataThrough, basis: "reported" as const };
  const lmopMeta = { source: "EPA LMOP Landfill and Project Database", url: lmop.source, period: String(lmop.dataYear), basis: "measured" as const };
  return { sets: [
    set("us_farm_all", "electricity", ag.filter((p) => !p.nameplate).map((p) => p.ratio), 0.25, agMeta),
    set("us_farm_like", "electricity", ag.filter(likeForLike).map((p) => p.ratio), 0.25, agMeta),
    set("de_farm_methane", "methane", bmp3Plants().plants.map((p) => p.ratio), 0.25, { source: "FNR Biogas-Messprogramm III", url: bmp3.url, period: "2016–2018", basis: "measured" }),
    set("us_landfill_engine", "engine", lmopEngines().map((x) => x.ratio / siteFactor), 0.25, lmopMeta),
    set("us_landfill_gas", "landfill_gas", lmopLandfills(50).filter((x) => x.closed).map((x) => x.captured), 0.25, lmopMeta),
    set("capex", "capex", capexRatios, 0.3, { source: "BMWK/IEE/DBFZ 2024, LWK Niedersachsen, AgSTAR via Cornell, issuer filings (FR), MME REIDI approvals (BR), Klimatklivet (SE)", url: "", period: "2014–2026", basis: "published" }),
  ] };
}

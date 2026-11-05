import { fmtDec, fmtTimes, fmtUnit, locText } from "./i18n";
import { activeMonths, DAYS_IN_MONTH, lagoonEligible, meanTemp } from "./climate";
import type { RunContext } from "./context";
import { ANIMALS, FEEDSTOCKS, isEffluentLike, PAID_HANDLING } from "./feedstockData";
import type { Params } from "./params";
import type { FeedstockLineInput, FeedstockLineResult, FeedstockSummary } from "./types";

/**
 * Feedstock-first sizing: everything downstream (digester, CHP, CAPEX) is derived from these numbers.
 * Gas is computed as  VS [t] × specific yield [L CH₄/kg VS] — so a customer's real dry matter matters.
 */
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
/**
 * Delivered manure: the truck takes the digestate back to the supplying farm on the otherwise empty return leg,
 * so hauling costs 1.5× a one-way load (second loading/unloading, longer turnaround). Judgement, LOW confidence.
 * Because of this return, that digestate is not a new burden for the plant (see digestate.ts).
 */
export const MANURE_RETURN_HAUL = 1.5;
/** Screening plausibility bounds, EUR/t (judgement): above them the entered value is more likely a unit slip than a market price. */
export const PLAUSIBLE_DISPOSAL_EUR_T = 400;
export const PLAUSIBLE_GATE_FEE_EUR_T = 250;
export const PLAUSIBLE_PURCHASE_EUR_T = 150;
const zeros = () => new Array(12).fill(0) as number[];

/** An own stream with an alternative use and no price in the form: its sale value is the missing cost. */
export function unpricedCompetingUse(flags: string[], delivered: boolean, purchasePriceLocal: number, handling: string): boolean {
  return flags.includes("competing_use") && !delivered && purchasePriceLocal === 0 && !(PAID_HANDLING as string[]).includes(handling);
}

/** National as-excreted manure (country params `eng.animal.<kind>.*`) replaces the catalogue default for that animal. */
function nationalManure(line: FeedstockLineInput, params?: Params) {
  const key = (k: string) => `eng.animal.${line.animal}.${k}`;
  if (!line.animal || !params?.has(key("t_head_year"))) return undefined;
  return { tonnes: params.get(key("t_head_year")), dm: params.get(key("dm_pct")), vs: params.get(key("vs_pct_dm")) };
}

export function resolveLine(line: FeedstockLineInput, params?: Params) {
  if (line.animal) {
    const a = ANIMALS[line.animal];
    const t = FEEDSTOCKS[a.feedstock];
    const collect = line.housing === "seasonal" ? a.collectSeasonal : a.collectYearRound;
    const national = nationalManure(line, params);
    const typeDef = national ? { ...t, dryMatterPct: national.dm, vsPctOfDm: national.vs } : t;
    const measured = (line.measuredTonnesYear ?? 0) > 0 ? line.measuredTonnesYear! : undefined;
    return { typeDef, nutrientDm: t.dryMatterPct, tonnesBase: measured ?? line.quantity * (national?.tonnes ?? a.tonnesPerHeadYear) * collect, isAnimal: true, animalLabel: a.name.en };
  }
  if (!line.type) throw new Error(`Feedstock line ${line.id} has neither animal nor type`);
  const t = FEEDSTOCKS[line.type];
  return { typeDef: t, nutrientDm: t.dryMatterPct, tonnesBase: line.quantity, isAnimal: false, animalLabel: undefined };
}

export function analyseFeedstock(ctx: RunContext): FeedstockSummary {
  const { input, params, scenario, mods, fx, t: T, lang } = ctx;
  const D = fmtDec(lang);
  const M = fmtUnit(lang);
  const lhv = params.get("eng.ch4_lhv_kwh_m3");
  const transportRate = params.get("econ.transport_eur_tkm") * mods.transport;
  const transportFixed = params.get("econ.transport_fixed_eur_t") * mods.transport;
  const thr = params.get("eng.poultry_inhib_threshold");
  const lossPer10 = params.get("eng.poultry_inhib_loss_per_10pct");
  const fatWarn = params.get("eng.fat_share_warning");

  const lines: FeedstockLineResult[] = [];
  const monthlyCh4 = zeros();
  const monthlyTonnes = zeros();
  const monthlyVs = zeros();
  let ch4Raw = 0;
  let biogasRaw = 0;
  let poultryVs = 0;
  let poultryNUnknown = false;
  let fatVs = 0;
  let fatDominantVs = 0;
  let manureVs = 0;
  let abpT = 0;
  const warnings: string[] = [];

  for (const line of input.feedstocks) {
    if (!(line.quantity > 0)) continue;
    const { typeDef: t, nutrientDm, tonnesBase, isAnimal } = resolveLine(line, params);
    const tonnes = tonnesBase * scenario.feedstockAvailability * mods.feedstock * (line.delivered ? mods.deliveredFeedstock : 1);
    // Ensiled crops lose dry matter in the clamp: purchase and haulage are paid on the harvested mass, gas comes from what is
    // left (nutrients stay in the silage). The digester is fed the remaining mass.
    const ensiled = t.flags.includes("energy_crop");
    const fed = ensiled ? tonnes * (1 - scenario.ensilingLoss) : tonnes;
    const dm = line.dryMatterPct ?? t.dryMatterPct;
    const months = isAnimal ? 12 : line.monthsActive ?? t.defaultMonths;
    const start = line.startMonth ?? t.defaultStartMonth;
    const act = activeMonths(months, start);
    const activeDays = act.reduce((acc, on, i) => acc + (on ? DAYS_IN_MONTH[i] : 0), 0) || 1;
    const mt = act.map((on, i) => (on ? (fed * DAYS_IN_MONTH[i]) / activeDays : 0));

    const vsPct = line.vsPctOfDm ?? t.vsPctOfDm;
    const vsT = (fed * dm * vsPct) / 10000;
    const blend = scenario.yieldBlend;
    // A laboratory BMP is one measurement, not the truth: the scenarios move it by the inter-laboratory spread (±1 RSD at
    // the conservative/optimistic blend of ±0.5), not by the much wider catalogue range.
    const yieldL = line.methaneYieldLPerKgVs !== undefined ? line.methaneYieldLPerKgVs * (1 + 2 * blend * params.get("eng.lab_bmp_rsd")) : (blend < 0 ? t.yieldTyp + -blend * (t.yieldLow - t.yieldTyp) : t.yieldTyp + blend * (t.yieldHigh - t.yieldTyp));
    // 1 L/kg VS × t VS ×1000 kg/t / 1000 L/m3 = t VS × yield  → m3 CH4
    const ch4 = vsT * yieldL * mods.methaneYield;
    const ch4Fraction = line.methanePct !== undefined ? line.methanePct / 100 : t.ch4Fraction;

    const nutrientScale = dm / nutrientDm; // catalogue nutrients are per tonne at catalogue dry matter; thinner slurry carries less
    const nKg = tonnes * (line.nKgT ?? t.nKgT * nutrientScale);
    // Packaging, plastics and grit screened out of food waste / biowaste go to incineration or landfill (OPEX).
    const rejectShare = line.rejectSharePct !== undefined ? line.rejectSharePct / 100
      : t.id === "food_waste" ? params.get("eng.opex.reject_share_food_waste") : t.id === "municipal_biowaste" ? params.get("eng.opex.reject_share_biowaste") : 0;
    const pKg = tonnes * t.p2o5KgT * nutrientScale;
    const kKg = tonnes * t.k2oKgT * nutrientScale;

    const delivered = !!line.delivered;
    const distance = delivered ? Math.max(0, line.distanceKm ?? 0) : 0;
    const returnFactor = delivered && t.category === "manure" ? MANURE_RETURN_HAUL : 1;
    const transportCost = delivered ? tonnes * (transportFixed + distance * transportRate) * returnFactor : 0;
    const purchasePrice = line.purchasePricePerTonneLocal ?? 0;
    const purchaseCost = (purchasePrice / fx) * tonnes;
    const handling = line.handling ?? t.defaultHandling;
    const disposalSaving =
      !delivered && purchasePrice >= 0 && PAID_HANDLING.includes(handling) && (line.currentDisposalCostPerTonneLocal ?? 0) > 0
        ? ((line.currentDisposalCostPerTonneLocal ?? 0) / fx) * tonnes * scenario.disposalRealisation
        : 0;
    // Purchase and foregone sale are alternative valuations of the same stream, not additive.
    const opportunity = delivered ? 0 : (Math.max(0, (line.opportunityValuePerTonneLocal ?? 0) - Math.max(0, purchasePrice)) / fx) * tonnes;

    const w: string[] = [];
    const nm = locText(t.name, lang);
    if (delivered && (line.currentDisposalCostPerTonneLocal ?? 0) > 0) w.push(T("Avoided disposal costs for delivered feedstock are excluded: prove the plant owner captures this saving in a supply agreement."));
    if (delivered && (line.opportunityValuePerTonneLocal ?? 0) > 0) w.push(T("Alternative sale value belongs to the external supplier and is not charged to this project."));
    if (!delivered && purchasePrice > 0 && (line.opportunityValuePerTonneLocal ?? 0) > 0) w.push(T("Purchase cost and foregone sale value overlap; the model uses the larger amount only."));
    // Entered lab values far from the type's range usually mean a basis mix-up (dry vs fresh, biogas vs CH₄, per kg FM).
    if (line.dryMatterPct !== undefined && (dm > 2 * t.dryMatterPct || dm < 0.4 * t.dryMatterPct)) w.push(T("Entered dry matter {dm} % is far from the typical {dryMatterPct} % for \"{nm}\": check that it is % of fresh mass.", { dm, dryMatterPct: t.dryMatterPct, nm }));
    if (line.nKgT !== undefined && (line.nKgT > 2.5 * t.nKgT * nutrientScale || line.nKgT < 0.4 * t.nKgT * nutrientScale)) w.push(T("Entered nitrogen {nKgT} kg/t is far from the typical {typical} kg/t for \"{nm}\": check that it is total N per tonne of fresh mass (not per tonne of dry matter).", { nKgT: line.nKgT, typical: D(t.nKgT * nutrientScale), nm }));
    if (line.methaneYieldLPerKgVs !== undefined && (yieldL > 1.3 * t.yieldHigh || yieldL < 0.7 * t.yieldLow)) w.push(T("Entered BMP {yieldL} L/kg VS is outside the usual {yieldLow}–{yieldHigh} for \"{nm}\": check that it is methane (not biogas) per kg VS (not per kg fresh mass).", { yieldL, yieldLow: t.yieldLow, yieldHigh: t.yieldHigh, nm }));
    const labLine = line.dryMatterPct !== undefined && line.vsPctOfDm !== undefined && line.methaneYieldLPerKgVs !== undefined;
    if (t.confidence === "LOW" && !labLine) w.push(T("Parameters for \"{nm}\" have low confidence — a laboratory analysis (BMP) is needed.", { nm }));
    // Ask for a sale value only where it can be entered and would count: an own stream that is neither bought, nor paid
    // to get rid of (the sale-value field is hidden then), nor delivered (its sale value belongs to the supplier).
    if (unpricedCompetingUse(t.flags, delivered, purchasePrice, handling) && opportunity === 0) w.push(T("\"{nm}\" often has an alternative use (e.g. animal feed) — enter its sale price.", { nm }));
    if (t.flags.includes("pretreatment")) w.push(T("\"{nm}\": pretreatment (steam explosion, extrusion, milling) is not in the CAPEX of this screening (milling electricity, {pretreatment_milling_kwh_t} kWh/t, is counted; steam, alkali or extrusion steps are not), and the catalogue yield assumes it is done — obtain a pretreatment quotation and a delivered straw price before relying on the result.", { nm, pretreatment_milling_kwh_t: Math.round(params.get("eng.pretreatment_milling_kwh_t")) }));
    if (t.flags.includes("seasonal") && months < 9) w.push(T("Seasonal stream ({month}): equipment sits idle for the rest of the year.", { month: M(months, "month") }));
    // A stream the catalogue treats as year-round but the client enters as seasonal sizes the plant for the peak month.
    else if (months < 9 && t.defaultMonths >= 12) w.push(T("\"{nm}\" is entered for {month} only: the digester is sized for that peak and sits idle the rest of the year. If the stream can be stored (e.g. ensiled), feeding it year-round needs a plant about {times} smaller.", { nm, month: M(months, "month"), times: fmtTimes(T.lang)(12 / months) }));
    const eurT = (local: number | undefined) => (local ?? 0) / fx;
    if (eurT(line.currentDisposalCostPerTonneLocal) > PLAUSIBLE_DISPOSAL_EUR_T || -eurT(line.purchasePricePerTonneLocal) > PLAUSIBLE_GATE_FEE_EUR_T || eurT(line.purchasePricePerTonneLocal) > PLAUSIBLE_PURCHASE_EUR_T)
      w.push(T("\"{nm}\": the entered price per tonne is far above usual market levels (disposal > {PLAUSIBLE_DISPOSAL_EUR_T}, gate fee > {PLAUSIBLE_GATE_FEE_EUR_T}, purchase > {PLAUSIBLE_PURCHASE_EUR_T} €/t equivalent): check the unit (per tonne, local currency) — the result depends on it directly.", { nm, PLAUSIBLE_DISPOSAL_EUR_T, PLAUSIBLE_GATE_FEE_EUR_T, PLAUSIBLE_PURCHASE_EUR_T }));
    if (isEffluentLike(t, dm)) w.push(T("\"{nm}\" is very dilute: consider a high-rate reactor (UASB / covered lagoon) instead of a CSTR — the model's CSTR costing is conservative here.", { nm }));
    if (t.flags.includes("energy_crop") && !((line.purchasePricePerTonneLocal ?? 0) > 0) && opportunity === 0) w.push(T("\"{nm}\" is a purchased or own-grown crop — enter its cost per tonne (typically 30–45 €/t delivered), otherwise the gas is counted as free.", { nm }));
    if (ensiled) w.push(T("\"{nm}\": enter the harvested fresh mass that goes into the clamp; {ensilingLoss} % of its dry matter is lost during ensiling (KTBL) and a clamp silo is costed. If you buy finished silage out of another farm's clamp, the loss and the clamp are the seller's and this result is conservative.", { nm, ensilingLoss: Math.round(scenario.ensilingLoss * 100) }));
    if (t.flags.includes("energy_crop")) w.push(T("Energy-crop share is capped in many support schemes (e.g. EEG maize cap, RED III sustainability criteria) — check before relying on it."));
    if (t.abp !== "none") w.push(t.abp === "cat3" ? T("Animal by-products (Cat. 3) → pasteurisation and veterinary approval required.") : T("Animal by-products (Cat. 2) → pasteurisation and veterinary approval required."));
    if (delivered && line.distanceKm === undefined) w.push(T("Delivery distance not given — logistics cost is understated."));

    lines.push({
      id: line.id, label: locText(t.name, lang), typeId: t.id, tonnesYear: fed, ...(ensiled ? { ensiledTonnesYear: tonnes } : {}), ...(rejectShare > 0 ? { rejectShare } : {}), monthlyTonnes: mt, dryMatterPct: dm,
      vsPctOfDm: vsPct, methaneYieldLPerKgVs: yieldL,
      vsTonnesYear: vsT, ch4M3Year: ch4, ch4Fraction, nKgYear: nKg, p2o5KgYear: pKg, k2oKgYear: kKg, delivered,
      distanceKm: distance, transportCostEurYear: transportCost, purchaseCostEurYear: purchaseCost,
      disposalSavingEurYear: disposalSaving, opportunityCostEurYear: opportunity, category: t.category, warnings: w,
    });

    for (let i = 0; i < 12; i++) {
      const f = fed > 0 ? mt[i] / fed : 0;
      monthlyTonnes[i] += mt[i];
      monthlyVs[i] += vsT * f;
      monthlyCh4[i] += ch4 * f;
    }
    ch4Raw += ch4;
    biogasRaw += ch4 / ch4Fraction;
    if (t.flags.includes("poultry")) { poultryVs += vsT; if (line.nKgT === undefined) poultryNUnknown = true; }
    if (t.flags.includes("fat")) fatVs += vsT;
    if (t.flags.includes("fat_dominant")) fatDominantVs += vsT;
    if (t.category === "manure") manureVs += vsT;
    if (t.abp !== "none") abpT += tonnes;
  }

  const tonnesTotal = sum(lines.map((l) => l.tonnesYear));
  const vsTotal = sum(lines.map((l) => l.vsTonnesYear));
  const dmWeighted = tonnesTotal > 0 ? sum(lines.map((l) => l.tonnesYear * l.dryMatterPct)) / tonnesTotal : 0;
  const poultryShare = vsTotal > 0 ? poultryVs / vsTotal : 0;
  const fatShare = vsTotal > 0 ? fatVs / vsTotal : 0;
  const manureShare = vsTotal > 0 ? manureVs / vsTotal : 0;

  // Total N per tonne of digester content is an upper bound of NH₄-N (ammonium is part of total N; density ≈ 1 t/m³, so
  // kg/t ≈ g/L). Dry-gas mass leaves the digester; nitrogen stays.
  const realGuess = scenario.processRealisation;
  const gasT = (ch4Raw * realGuess * params.get("eng.ch4_density_kg_m3") + Math.max(0, biogasRaw - ch4Raw) * realGuess * params.get("eng.co2_density_kg_m3")) / 1000;
  const nTotal = sum(lines.map((l) => l.nKgYear));
  const nInDigester = tonnesTotal > gasT ? nTotal / (tonnesTotal - gasT) : 0;
  const ammoniumThr = params.get("eng.ammonium_inhib_g_l");
  // Lab nitrogen for every poultry stream and total N below the threshold proves NH₄-N cannot reach it: the poultry-share
  // proxy is then not applied.
  const nRulesOutInhibition = !poultryNUnknown && nInDigester <= ammoniumThr;
  let inhibition = 1;
  if (poultryShare > thr && !nRulesOutInhibition) {
    inhibition = Math.max(0.7, 1 - lossPer10 * ((poultryShare - thr) / 0.1));
    const ps = D(poultryShare * 100);
    const cut = D((1 - inhibition) * 100);
    warnings.push(
      T("Poultry manure is {ps} % of the organic matter: risk of ammonia inhibition. The model cuts the yield by {cut} %; dilution or a co-substrate is needed.", { ps, cut }),
    );
  }
  // Warn only where the nitrogen comes mainly from protein-rich wastes (fish, slaughter, food, grass, grain): slurry-only
  // digesters run at their own N level by long practice, and poultry has its own proxy above. Advice only, no yield cut.
  else if (nInDigester > ammoniumThr && nTotal > 0 && sum(lines.filter((l) => l.category !== "manure").map((l) => l.nKgYear)) / nTotal >= 0.5) {
    warnings.push(T("Total nitrogen in the digester ≈ {n} kg/t. Above {thr} g/L of ammonium nitrogen methane formation is inhibited (FNR), and digestion turns much of the organic nitrogen into ammonium: measure NH₄-N, dilute, or add a low-nitrogen co-substrate. The model does not reduce the yield for this.", { n: D(nInDigester), thr: D(ammoniumThr) }));
  }
  if (fatShare > fatWarn) {
    inhibition *= 0.95;
    const fs = D(fatShare * 100);
    warnings.push(T("Fats are {fs} % of the organic matter: risk of foaming and long-chain fatty-acid inhibition; dose gradually.", { fs }));
  }

  // Unheated lagoons digest at ambient temperature and lose gas in the cold months. The AgSTAR factor was measured at annual
  // means of 15–18 °C and is applied below 20 °C only; warmer sites keep the full yield (no measured data there).
  const lagoon = ctx.reactor === "lagoon" && tonnesTotal > 0 && lagoonEligible(dmWeighted, ctx) && meanTemp(ctx.region.monthlyTempC) < 20 ? params.get("eng.lagoon_yield_factor") : 1;
  const real = scenario.processRealisation * inhibition * lagoon;
  const ch4Total = ch4Raw * real;
  const biogasTotal = biogasRaw * real;
  const monthlyCh4Scaled = monthlyCh4.map((x) => x * real);

  return {
    lines,
    tonnesYear: tonnesTotal,
    vsTonnesYear: vsTotal,
    dryMatterPct: dmWeighted,
    ch4M3Year: ch4Total,
    biogasM3Year: biogasTotal,
    monthlyCh4M3: monthlyCh4Scaled,
    monthlyTonnes,
    monthlyVsTonnes: monthlyVs,
    energyDensityKwhPerTonne: tonnesTotal > 0 ? (ch4Total * lhv) / tonnesTotal : 0,
    nKgYear: sum(lines.map((l) => l.nKgYear)),
    p2o5KgYear: sum(lines.map((l) => l.p2o5KgYear)),
    k2oKgYear: sum(lines.map((l) => l.k2oKgYear)),
    manureShareVs: manureShare,
    poultryShareVs: poultryShare,
    fatShareVs: fatShare,
    fatDominantShareVs: vsTotal > 0 ? fatDominantVs / vsTotal : 0,
    abpTonnesYear: abpT,
    ensiledTonnesYear: sum(lines.map((l) => l.ensiledTonnesYear ?? 0)),
    inhibitionFactor: inhibition,
    warnings,
  };
}

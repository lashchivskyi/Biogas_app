import { activeMonths, DAYS_IN_MONTH } from "./climate";
import type { RunContext } from "./context";
import { ANIMALS, FEEDSTOCKS, PAID_HANDLING } from "./feedstockData";
import type { FeedstockLineInput, FeedstockLineResult, FeedstockSummary } from "./types";

/**
 * Feedstock-first sizing: everything downstream (digester, CHP, CAPEX) is derived from these numbers.
 * Gas is computed as  VS [t] × specific yield [L CH₄/kg VS] — so a customer's real dry matter matters.
 */
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const zeros = () => new Array(12).fill(0) as number[];

export function resolveLine(line: FeedstockLineInput) {
  if (line.animal) {
    const a = ANIMALS[line.animal];
    const t = FEEDSTOCKS[a.feedstock];
    const collect = line.housing === "seasonal" ? a.collectSeasonal : a.collectYearRound;
    return { typeDef: t, tonnesBase: line.quantity * a.tonnesPerHeadYear * collect, isAnimal: true, animalLabel: a.name.en };
  }
  if (!line.type) throw new Error(`Feedstock line ${line.id} has neither animal nor type`);
  const t = FEEDSTOCKS[line.type];
  return { typeDef: t, tonnesBase: line.quantity, isAnimal: false, animalLabel: undefined };
}

export function analyseFeedstock(ctx: RunContext): FeedstockSummary {
  const { input, params, scenario, mods, fx, t: T, lang } = ctx;
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
  let fatVs = 0;
  let manureVs = 0;
  let abpT = 0;
  const warnings: string[] = [];

  for (const line of input.feedstocks) {
    if (!(line.quantity > 0)) continue;
    const { typeDef: t, tonnesBase, isAnimal } = resolveLine(line);
    const tonnes = tonnesBase * scenario.feedstockAvailability * mods.feedstock;
    const dm = line.dryMatterPct ?? t.dryMatterPct;
    const months = isAnimal ? 12 : line.monthsActive ?? t.defaultMonths;
    const start = line.startMonth ?? t.defaultStartMonth;
    const act = activeMonths(months, start);
    const activeDays = act.reduce((acc, on, i) => acc + (on ? DAYS_IN_MONTH[i] : 0), 0) || 1;
    const mt = act.map((on, i) => (on ? (tonnes * DAYS_IN_MONTH[i]) / activeDays : 0));

    const vsT = (tonnes * dm * t.vsPctOfDm) / 10000;
    const blend = scenario.yieldBlend;
    const yieldL = blend < 0 ? t.yieldTyp + -blend * (t.yieldLow - t.yieldTyp) : t.yieldTyp + blend * (t.yieldHigh - t.yieldTyp);
    // 1 L/kg VS × t VS ×1000 kg/t / 1000 L/m3 = t VS × yield  → m3 CH4
    const ch4 = vsT * yieldL * mods.methaneYield;
    const ch4Fraction = t.ch4Fraction;

    const nutrientScale = dm / t.dryMatterPct; // diluted slurry carries proportionally less nutrient
    const nKg = tonnes * t.nKgT * nutrientScale;
    const pKg = tonnes * t.p2o5KgT * nutrientScale;
    const kKg = tonnes * t.k2oKgT * nutrientScale;

    const delivered = !!line.delivered;
    const distance = delivered ? Math.max(0, line.distanceKm ?? 0) : 0;
    const returnFactor = delivered && t.category === "manure" ? 1.5 : 1;
    const transportCost = delivered ? tonnes * (transportFixed + distance * transportRate) * returnFactor : 0;
    const purchaseCost = ((line.purchasePricePerTonneLocal ?? 0) / fx) * tonnes;
    const handling = line.handling ?? t.defaultHandling;
    const disposalSaving =
      PAID_HANDLING.includes(handling) && (line.currentDisposalCostPerTonneLocal ?? 0) > 0
        ? ((line.currentDisposalCostPerTonneLocal ?? 0) / fx) * tonnes * scenario.disposalRealisation
        : 0;
    const opportunity = ((line.opportunityValuePerTonneLocal ?? 0) / fx) * tonnes;

    const w: string[] = [];
    const nm = t.name[lang];
    if (t.confidence === "LOW") w.push(T(`Parameters for "${nm}" have low confidence — a laboratory analysis (BMP) is needed.`, `Параметри «${nm}» мають низьку довіру — потрібен лабораторний аналіз (BMP).`));
    if (t.flags.includes("competing_use") && opportunity === 0) w.push(T(`"${nm}" often has an alternative use (e.g. animal feed) — enter its sale price.`, `«${nm}» часто має альтернативне використання (корм) — вкажіть його ціну.`));
    if (t.flags.includes("seasonal") && months < 9) w.push(T(`Seasonal stream (${months} months): equipment sits idle for the rest of the year.`, `Сезонний потік (${months} міс.): обладнання простоюватиме решту року.`));
    if (t.flags.includes("dilute")) w.push(T(`"${nm}" is very dilute: consider a high-rate reactor (UASB / covered lagoon) instead of a CSTR — the model's CSTR costing is conservative here.`, `«${nm}» дуже розбавлений: розгляньте високонавантажений реактор (UASB / накрита лагуна) замість CSTR — оцінка CAPEX тут консервативна.`));
    if (t.abp !== "none") w.push(T(`Animal by-products (${t.abp === "cat3" ? "Cat. 3" : "Cat. 2"}) → pasteurisation and veterinary approval required.`, `Побічні продукти тваринного походження (${t.abp === "cat3" ? "кат. 3" : "кат. 2"}) → потрібна пастеризація та ветеринарне узгодження.`));
    if (delivered && !(line.distanceKm && line.distanceKm > 0)) w.push(T("Delivery distance not given — logistics cost is understated.", "Відстань доставки не вказана — вартість логістики занижена."));

    lines.push({
      id: line.id, label: t.name[lang], typeId: t.id, tonnesYear: tonnes, monthlyTonnes: mt, dryMatterPct: dm,
      vsTonnesYear: vsT, ch4M3Year: ch4, ch4Fraction, nKgYear: nKg, p2o5KgYear: pKg, k2oKgYear: kKg, delivered,
      distanceKm: distance, transportCostEurYear: transportCost, purchaseCostEurYear: purchaseCost,
      disposalSavingEurYear: disposalSaving, opportunityCostEurYear: opportunity, category: t.category, warnings: w,
    });

    for (let i = 0; i < 12; i++) {
      const f = tonnes > 0 ? mt[i] / tonnes : 0;
      monthlyTonnes[i] += mt[i];
      monthlyVs[i] += vsT * f;
      monthlyCh4[i] += ch4 * f;
    }
    ch4Raw += ch4;
    biogasRaw += ch4 / ch4Fraction;
    if (t.flags.includes("poultry")) poultryVs += vsT;
    if (t.flags.includes("fat")) fatVs += vsT;
    if (t.category === "manure") manureVs += vsT;
    if (t.abp !== "none") abpT += tonnes;
  }

  const tonnesTotal = sum(lines.map((l) => l.tonnesYear));
  const vsTotal = sum(lines.map((l) => l.vsTonnesYear));
  const dmWeighted = tonnesTotal > 0 ? sum(lines.map((l) => l.tonnesYear * l.dryMatterPct)) / tonnesTotal : 0;
  const poultryShare = vsTotal > 0 ? poultryVs / vsTotal : 0;
  const fatShare = vsTotal > 0 ? fatVs / vsTotal : 0;
  const manureShare = vsTotal > 0 ? manureVs / vsTotal : 0;

  let inhibition = 1;
  if (poultryShare > thr) {
    inhibition = Math.max(0.7, 1 - lossPer10 * ((poultryShare - thr) / 0.1));
    const ps = (poultryShare * 100).toFixed(0);
    const cut = ((1 - inhibition) * 100).toFixed(0);
    warnings.push(
      T(
        `Poultry manure is ${ps} % of the organic matter: risk of ammonia inhibition. The model cuts the yield by ${cut} %; dilution or a co-substrate is needed.`,
        `Птахівничий послід становить ${ps} % органічної речовини: ризик аміачного інгібування. Модель знижує вихід на ${cut} %; потрібне розведення або ко-сировина.`,
      ),
    );
  }
  if (fatShare > fatWarn) {
    inhibition *= 0.95;
    const fs = (fatShare * 100).toFixed(0);
    warnings.push(T(`Fats are ${fs} % of the organic matter: risk of foaming and long-chain fatty-acid inhibition; dose gradually.`, `Жирові відходи — ${fs} % органічної речовини: ризик піноутворення та інгібування довголанцюговими жирними кислотами; дозувати поступово.`));
  }

  const real = scenario.processRealisation * inhibition;
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
    abpTonnesYear: abpT,
    inhibitionFactor: inhibition,
    warnings,
  };
}

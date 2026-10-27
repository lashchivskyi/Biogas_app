import type { CustomerDemand } from "./demand";
import { ANIMALS, FEEDSTOCKS } from "./feedstockData";
import type { Tr } from "./i18n";
import type { Confidence, ProjectInput, QualityGapId, ScenarioResult } from "./types";

/**
 * Data quality: what the customer told us vs what we assumed. A screening tool cannot reach HIGH
 * confidence without laboratory analysis of the feedstock — this is enforced, not hoped for.
 */
export function assessQuality(
  input: ProjectInput,
  base: ScenarioResult,
  demand: CustomerDemand,
  T: Tr,
  ctx: { currency: string; profileOnly: boolean; unvalidatedCapital?: boolean },
): { level: Confidence; score: number; reasons: string[]; missing: string[]; missingCodes: QualityGapId[] } {
  let score = 80;
  const reasons: string[] = [];
  const missing: string[] = [];
  const missingCodes: QualityGapId[] = [];
  const gap = (id: QualityGapId, text: string) => { missingCodes.push(id); missing.push(text); };
  const cur = ctx.currency;
  const measuredFeedstock = Boolean(input.labAnalysisAvailable) && input.feedstocks.every((f) =>
    (f.dryMatterPct ?? 0) > 0 && (f.vsPctOfDm ?? 0) > 0 && (f.methaneYieldLPerKgVs ?? 0) > 0,
  );

  if (input.feedstocks.some((f) => f.animal)) {
    score -= 8;
    reasons.push(T("Manure volumes estimated from head counts, not measured", "Обсяги гною оцінені за кількістю голів, а не виміряні"));
  }
  const lowShare =
    base.feed.tonnesYear > 0
      ? base.feed.lines.filter((l) => FEEDSTOCKS[l.typeId].confidence === "LOW").reduce((a, l) => a + l.tonnesYear, 0) / base.feed.tonnesYear
      : 0;
  if (lowShare > 0.4) {
    score -= 12;
    reasons.push(T("Most feedstock has low-confidence parameters", "Більшість сировини має параметри низької довіри"));
  }
  if (!measuredFeedstock) {
    score -= 15;
    reasons.push(T("Complete laboratory DM, VS and BMP values are unavailable for every feedstock — catalogue estimates are used where missing", "Немає повного набору лабораторних DM, VS і BMP для кожної сировини — пропущені значення взято з каталогу"));
    gap("lab", T("Laboratory DM, VS and BMP for every feedstock stream", "Лабораторні DM, VS і BMP для кожного потоку сировини"));
  }
  if (ctx.profileOnly) {
    score -= 6;
    reasons.push(T("At least one price affecting this route relies on an unconfirmed market proxy or uncontracted offtake — confirm the applicable tariff or buyer contract", "Принаймні одна ціна, що впливає на цей маршрут, ґрунтується на непідтвердженому ринковому орієнтирі або недоговірному збуті — уточніть застосовний тариф чи контракт із покупцем"));
  }
  if (ctx.unvalidatedCapital) {
    score -= 8;
    reasons.push(T("Route-specific CAPEX lacks independent local validation — obtain comparable supplier quotations", "CAPEX цього маршруту не має незалежного локального підтвердження — отримайте зіставні комерційні пропозиції постачальників"));
  }
  if (!demand.electricityKnown) {
    score -= 12;
    gap("electricity", T("Annual electricity consumption (kWh) — without it self-consumption is not credited", "Річне споживання електроенергії (кВт·год) — без нього власне споживання не враховується"));
  }
  if (!demand.electricityPriceKnown && input.energy.electricityKwhYear !== 0) {
    score -= 6;
    gap("electricity_price", T(`Electricity price from your bill (${cur}/kWh)`, `Ціна електроенергії за рахунком (${cur}/кВт·год)`));
  }
  if (demand.heatWanted && !demand.heatKnown) {
    score -= 14;
    gap("heat", T("Heat consumption (kWh/year or gas m³) — unquantified heat earns no revenue", "Обсяг теплоспоживання (кВт·год/рік або газ, м³) — без підтвердженого обсягу дохід від тепла не зараховується"));
  }
  if (!demand.heatWanted && (input.energy.gasM3Year ?? 0) > 0) {
    score -= 4;
    reasons.push(T("Gas is used but a heat need is not confirmed", "Є споживання газу, але потреба в теплі не підтверджена"));
  }
  if (input.site.landHa === undefined) {
    score -= 8;
    gap("land", T("Land available for digestate spreading (ha)", "Площа полів, придатних для внесення дигестату (га)"));
  }
  if (input.feedstocks.filter((f) => f.delivered).some((f) => !(f.distanceKm && f.distanceKm > 0))) {
    score -= 8;
    gap("distance", T("Distances to delivered feedstock sources", "Відстані до джерел сировини, що доставляється"));
  }
  // Delivered streams with a price (gate fee or purchase) are already priced; only own waste has a disposal cost to ask for.
  const own = new Set(input.feedstocks.filter((f) => !(f.delivered && f.purchasePricePerTonneLocal !== undefined)).map((f) => f.id));
  const paidLines = base.feed.lines.filter((l) => own.has(l.id) && FEEDSTOCKS[l.typeId].defaultHandling === "paid_disposal");
  if (paidLines.length && input.feedstocks.every((f) => !((f.currentDisposalCostPerTonneLocal ?? 0) > 0))) {
    score -= 5;
    gap("disposal", T(`Current disposal cost (${cur}/t) — possible savings not credited`, `Поточна вартість утилізації (${cur}/т) — можлива економія не врахована`));
  }
  if (base.kwElEquivalent < 30 || base.kwElEquivalent > 5000) {
    score -= 8;
    reasons.push(T("Scale outside the CAPEX calibration range (30 kW – 5 MW electrical equivalent)", "Масштаб поза діапазоном калібрування CAPEX (30 кВт – 5 МВт ел. еквіваленту)"));
  }
  if (input.feedstocks.some((f) => f.animal && ANIMALS[f.animal] && f.housing === "seasonal")) {
    reasons.push(T("Seasonal grazing reduces collectable manure — the collected share is estimated", "Сезонне випасання зменшує зібраний гній — частку зібраного оцінено"));
  }
  score = Math.max(0, Math.min(100, score));
  const level: Confidence = score >= 85 && measuredFeedstock ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  return { level, score, reasons, missing, missingCodes };
}

import { missingProcessInputs } from "./processes";
import type { CustomerDemand } from "./demand";
import { ANIMALS, FEEDSTOCKS } from "./feedstockData";
import type { Tr } from "./i18n";
import type { Confidence, ProjectInput, QualityFactor, QualityGapId, ScenarioResult } from "./types";

/** Best score a screening can reach: without verified documents it never claims HIGH (≥ 85). */
export const QUALITY_START = 80;

export interface QualityResult { level: Confidence; score: number; reasons: string[]; missing: string[]; missingCodes: QualityGapId[]; factors: QualityFactor[] }

const levelOf = (score: number, measuredFeedstock: boolean): Confidence => (score >= 85 && measuredFeedstock ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW");

/** Lowers the score to `max` and records the difference as a factor, so Σ points still explains the score. */
export function capQuality(q: QualityResult, max: number, factor: Omit<QualityFactor, "points">): void {
  const points = q.score - Math.min(q.score, max);
  q.score -= points;
  if (points > 0) q.factors.push({ ...factor, points });
  q.level = levelOf(q.score, q.level === "HIGH");
}

/**
 * Data quality: what the customer told us vs what we assumed. A screening tool cannot reach HIGH
 * confidence without laboratory analysis of the feedstock — this is enforced, not hoped for.
 */
export function assessQuality(
  input: ProjectInput,
  base: ScenarioResult,
  demand: CustomerDemand,
  T: Tr,
  ctx: { currency: string; profileOnly: boolean; unvalidatedCapital?: boolean; priceSlips?: number },
): QualityResult {
  let score = QUALITY_START;
  const reasons: string[] = [];
  const missing: string[] = [];
  const missingCodes: QualityGapId[] = [];
  const factors: QualityFactor[] = [];
  const reason = (id: string, owner: QualityFactor["owner"], points: number, text: string) => {
    score -= points; reasons.push(text); factors.push({ id, owner, points, text });
  };
  const gap = (id: QualityGapId, points: number, text: string) => {
    score -= points; missingCodes.push(id); missing.push(text); factors.push({ id, owner: "client", points, text, gap: id });
  };
  const cur = ctx.currency;
  const measured = (f: ProjectInput["feedstocks"][number]) => (f.dryMatterPct ?? 0) > 0 && (f.vsPctOfDm ?? 0) > 0 && (f.methaneYieldLPerKgVs ?? 0) > 0;
  const measuredFeedstock = Boolean(input.labAnalysisAvailable) && input.feedstocks.every(measured);
  // A stream with its own lab DM/VS/BMP no longer depends on the weak catalogue entry for its type.
  const labIds = new Set(input.labAnalysisAvailable ? input.feedstocks.filter(measured).map((f) => f.id) : []);

  if (input.feedstocks.some((f) => f.animal)) {
    reason("head_counts", "client", 8, T("Manure volumes estimated from head counts, not measured — enter measured tonnes per year", "Обсяги гною оцінені за кількістю голів, а не виміряні — вкажіть виміряні тонни на рік"));
  }
  const lowShare =
    base.feed.tonnesYear > 0
      ? base.feed.lines.filter((l) => !labIds.has(l.id) && FEEDSTOCKS[l.typeId].confidence === "LOW").reduce((a, l) => a + l.tonnesYear, 0) / base.feed.tonnesYear
      : 0;
  if (lowShare > 0.4) {
    reason("low_catalogue", "client", 12, T("Most feedstock has low-confidence catalogue parameters — a laboratory analysis replaces them", "Більшість сировини має каталожні параметри низької довіри — лабораторний аналіз їх замінює"));
  }
  if (!measuredFeedstock && !input.process) {
    score -= 15;
    reasons.push(T("Complete laboratory DM, VS and BMP values are unavailable for every feedstock — catalogue estimates are used where missing", "Немає повного набору лабораторних DM, VS і BMP для кожної сировини — пропущені значення взято з каталогу"));
    missingCodes.push("lab");
    missing.push(T("Laboratory DM, VS and BMP for every feedstock stream", "Лабораторні DM, VS і BMP для кожного потоку сировини"));
    factors.push({ id: "lab", owner: "client", points: 15, text: missing[missing.length - 1], gap: "lab" });
  }
  if (ctx.priceSlips) {
    // At least 10 points, and always down to LOW: a price we think is mistyped must not carry a "strong" verdict.
    reason("price_units", "client", Math.max(10, score - 49), T("An entered price is far from market levels — likely a unit slip; correct it or confirm it with an invoice", "Введена ціна далека від ринкового рівня — ймовірна помилка в одиницях; виправте її або підтвердьте рахунком"));
  }
  if (ctx.profileOnly) {
    reason("price_proxy", "model", 6, T("At least one price affecting this route relies on an unconfirmed market proxy or uncontracted offtake — confirm the applicable tariff or buyer contract", "Принаймні одна ціна, що впливає на цей маршрут, ґрунтується на непідтвердженому ринковому орієнтирі або недоговірному збуті — уточніть застосовний тариф чи контракт із покупцем"));
  }
  if (ctx.unvalidatedCapital) {
    reason("capex_unvalidated", "model", 8, T("Route-specific CAPEX lacks independent local validation — obtain comparable supplier quotations", "CAPEX цього маршруту не має незалежного локального підтвердження — отримайте зіставні комерційні пропозиції постачальників"));
  }
  if (!demand.electricityKnown) {
    gap("electricity", 12, T("Annual electricity consumption (kWh) — without it self-consumption is not credited", "Річне споживання електроенергії (кВт·год) — без нього власне споживання не враховується"));
  }
  if (!demand.electricityPriceKnown && input.energy.electricityKwhYear !== 0) {
    gap("electricity_price", 6, T(`Electricity price from your bill (${cur}/kWh)`, `Ціна електроенергії за рахунком (${cur}/кВт·год)`));
  }
  if (demand.heatWanted && !demand.heatKnown) {
    gap("heat", 14, T("Heat consumption (kWh/year or gas m³) — unquantified heat earns no revenue", "Обсяг теплоспоживання (кВт·год/рік або газ, м³) — без підтвердженого обсягу дохід від тепла не зараховується"));
  }
  if (!demand.heatWanted && (input.energy.gasM3Year ?? 0) > 0) {
    reason("heat_need", "client", 4, T("Gas is used but a heat need is not confirmed", "Є споживання газу, але потреба в теплі не підтверджена"));
  }
  if (!input.process && input.site.landHa === undefined) {
    gap("land", 8, T("Land available for digestate spreading (ha)", "Площа полів, придатних для внесення дигестату (га)"));
  }
  if (input.feedstocks.filter((f) => f.delivered).some((f) => !(f.distanceKm && f.distanceKm > 0))) {
    gap("distance", 8, T("Distances to delivered feedstock sources", "Відстані до джерел сировини, що доставляється"));
  }
  // Delivered streams with a price (gate fee or purchase) are already priced; only own waste has a disposal cost to ask for.
  const own = new Set(input.feedstocks.filter((f) => !(f.delivered && f.purchasePricePerTonneLocal !== undefined)).map((f) => f.id));
  const paidLines = base.feed.lines.filter((l) => own.has(l.id) && FEEDSTOCKS[l.typeId].defaultHandling === "paid_disposal");
  if (paidLines.length && input.feedstocks.every((f) => !((f.currentDisposalCostPerTonneLocal ?? 0) > 0))) {
    gap("disposal", 5, T(`Current disposal cost (${cur}/t) — possible savings not credited`, `Поточна вартість утилізації (${cur}/т) — можлива економія не врахована`));
  }
  const pretreatShare = base.feed.tonnesYear > 0 ? base.feed.lines.filter((l) => FEEDSTOCKS[l.typeId].flags.includes("pretreatment")).reduce((a, l) => a + l.tonnesYear, 0) / base.feed.tonnesYear : 0;
  if (pretreatShare > 0.3) {
    reason("pretreatment_unmodelled", "model", 8, T("Feedstock needs pretreatment (e.g. straw) whose CAPEX and energy are not in this screening — obtain a pretreatment quotation", "Сировина потребує попередньої обробки (напр. солома), CAPEX і енергія якої не входять у цей скринінг — отримайте оферту на обробку"));
  }
  if (base.kwElEquivalent < 30 || base.kwElEquivalent > 5000) {
    reason("scale_range", "model", 8, T("Scale outside the CAPEX calibration range (30 kW – 5 MW electrical equivalent)", "Масштаб поза діапазоном калібрування CAPEX (30 кВт – 5 МВт ел. еквіваленту)"));
  }
  if (input.feedstocks.some((f) => f.animal && ANIMALS[f.animal] && f.housing === "seasonal")) {
    reasons.push(T("Seasonal grazing reduces collectable manure — the collected share is estimated", "Сезонне випасання зменшує зібраний гній — частку зібраного оцінено"));
  }
  const q: QualityResult = { level: "LOW", score: Math.max(0, score), reasons, missing, missingCodes, factors };
  if (input.process) {
    const text = T("Process inputs and project budgets require document verification; ranges are assumptions, not validated accuracy.", "Параметри процесу й бюджети потребують звірки з документами; діапазони є припущеннями, а не підтвердженою точністю.");
    reasons.push(text);
    capQuality(q, 65, { id: "process_scope", owner: "model", text });
    if (missingProcessInputs(input.process).length) {
      const need = T("Project budgets, residuals disposal and auxiliary energy", "Бюджети проєкту, утилізація залишків та власні енергопотреби");
      missing.push(need);
      capQuality(q, 34, { id: "process_inputs", owner: "client", text: need });
    }
  }
  q.level = levelOf(q.score, measuredFeedstock);
  return q;
}

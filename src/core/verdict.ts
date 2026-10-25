import { fmtInt, type CoreLang, tr } from "./i18n";
import type { Assessment, Confidence, ScenarioResult, VerdictId } from "./types";

/**
 * The verdict is rule-based and every branch states the evidence that triggered it.
 * It never comes from the composite score alone, and it never counts subsidies.
 */
export function decideVerdict(args: {
  base: ScenarioResult;
  cons: ScenarioResult;
  opt: ScenarioResult;
  confidence: { level: Confidence; score: number };
  minKwEl: number;
  breakEven: Assessment["breakEven"];
  lang: CoreLang;
}): Assessment["verdict"] {
  const { base, cons, opt, confidence, minKwEl, breakEven, lang } = args;
  const T = tr(lang);
  const fmt = fmtInt(lang);
  const y = (n: number) => (lang === "uk" ? `${n.toFixed(1).replace(".", ",")} р.` : `${n.toFixed(1)} yr`);
  const reasons: string[] = [];
  const whatWouldChange: string[] = [];

  if (base.feed.tonnesYear <= 0) {
    return { id: "INSUFFICIENT_DATA", reasons: [T("No feedstock stream entered.", "Не вказано жодного потоку сировини.")], whatWouldChange: [T("Add herd size or waste quantity.", "Додайте поголів'я або обсяг відходів.")] };
  }
  if (confidence.score < 35) {
    reasons.push(T(`Not enough data for a conclusion (data quality ${confidence.score}/100).`, `Недостатньо даних для висновку (якість даних ${confidence.score}/100).`));
    return { id: "INSUFFICIENT_DATA", reasons, whatWouldChange: [T("Fill in the items listed under “What to clarify”.", "Заповніть пропущені дані зі списку «Що потрібно уточнити».")] };
  }

  const kw = base.kwElEquivalent;
  const pb = base.fin.simplePaybackYears;
  const npvBase = base.fin.npvEur;

  if (kw < minKwEl && npvBase < 0) {
    reasons.push(T(`Energy equivalent ≈ ${Math.round(kw)} kWe — below ${minKwEl} kW — and the base-case NPV is negative (€${fmt(npvBase)}).`, `Енергетичний еквівалент ≈ ${Math.round(kw)} кВт ел. — менше ${minKwEl} кВт, а NPV базового сценарію від'ємний (${fmt(npvBase)} €).`));
    whatWouldChange.push(T("Add energy-dense wastes (co-substrate) or pool feedstock with neighbours (cluster plant).", "Додати енергетично щільні відходи (ко-сировина) або об'єднати потоки сусідніх господарств (кластер)."));
    whatWouldChange.push(T("Consider the simplest option — a biogas boiler for a constant heat need — or supplying feedstock to a larger plant.", "Оцінити найпростіший варіант — біогазовий котел за постійної потреби в теплі, або здачу сировини на більшу установку."));
    return { id: "NOT_RECOMMENDED_AT_SCALE", reasons, whatWouldChange };
  }

  const pbCons = cons.fin.simplePaybackYears;
  const strong = pb !== null && pb <= 6.5 && pbCons !== null && pbCons <= 10.5 && (base.fin.dscrMin ?? 0) >= 1.3 && confidence.level !== "LOW";
  const borderline = npvBase < 0 && npvBase >= -0.1 * base.fin.capexEur && pb !== null && pb <= 8.5 && opt.fin.npvEur >= 0;
  const possible = (npvBase >= 0 && pb !== null && pb <= 10) || borderline;

  if (strong) {
    reasons.push(T(`Simple payback ≈ ${y(pb!)} (base) and ≈ ${y(pbCons!)} in the conservative case; base NPV €${fmt(npvBase)}; minimum DSCR ${(base.fin.dscrMin ?? 0).toFixed(2)}.`, `Проста окупність ≈ ${y(pb!)} (базовий) і ≈ ${y(pbCons!)} у консервативному сценарії; NPV базового ${fmt(npvBase)} €; DSCR мін. ${(base.fin.dscrMin ?? 0).toFixed(2)}.`));
    whatWouldChange.push(T("Confirm with a laboratory feedstock analysis (BMP) and real energy invoices.", "Підтвердити лабораторним аналізом сировини (BMP) та реальними рахунками за енергію."));
    return { id: "STRONG_CANDIDATE", reasons, whatWouldChange };
  }
  if (possible) {
    reasons.push(
      borderline
        ? T(`Base NPV close to zero (€${fmt(npvBase)}) at the country discount rate, payback ≈ ${y(pb!)}; optimistic case positive (€${fmt(opt.fin.npvEur)}).`, `Базовий NPV біля нуля (${fmt(npvBase)} €) при ставці дисконтування країни, окупність ≈ ${y(pb!)}; оптимістичний сценарій додатний (${fmt(opt.fin.npvEur)} €).`)
        : T(`Base NPV positive (€${fmt(npvBase)}), payback ≈ ${y(pb!)}.`, `Базовий NPV додатний (${fmt(npvBase)} €), окупність ≈ ${y(pb!)}.`),
    );
    if (cons.fin.npvEur < 0) {
      reasons.push(T(`Conservative-case NPV is negative (€${fmt(cons.fin.npvEur)}) — sensitive to key assumptions.`, `У консервативному сценарії NPV від'ємний (${fmt(cons.fin.npvEur)} €) — проєкт чутливий до ключових припущень.`));
      whatWouldChange.push(T("Secure long-term heat and power offtake; benchmark CAPEX with 3–5 suppliers.", "Зафіксувати довгостроковий попит на тепло та електрику, перевірити CAPEX у 3–5 постачальників."));
    }
    if (confidence.level === "LOW") {
      reasons.push(T("Data confidence is low — the verdict is preliminary.", "Рівень довіри до даних низький — вердикт попередній."));
      whatWouldChange.push(T("Fill in missing data and run a laboratory feedstock analysis.", "Заповнити пропущені дані та провести лабораторний аналіз сировини."));
    }
    if ((base.fin.dscrMin ?? 99) < 1.3) whatWouldChange.push(T("Raise the equity share or obtain concessional finance: DSCR is below bank thresholds.", "Збільшити частку власного капіталу або отримати пільгове фінансування: DSCR нижче порога банку."));
    return { id: "POSSIBLE_WITH_CONDITIONS", reasons, whatWouldChange };
  }

  const deep = npvBase < -0.1 * base.fin.capexEur;
  reasons.push(
    pb === null
      ? T("Base-case operating margin does not cover costs.", "Операційний прибуток базового сценарію не покриває витрат.")
      : T(`Simple payback ≈ ${y(pb)}; base NPV €${fmt(npvBase)} (${deep ? "well below zero" : "below zero"} at the country discount rate).`, `Проста окупність ≈ ${y(pb)}; NPV базового сценарію ${fmt(npvBase)} € (${deep ? "істотно нижче нуля" : "нижче нуля"} при ставці дисконтування країни).`),
  );
  if (opt.fin.npvEur < 0) reasons.push(T(`Even the optimistic case has a negative NPV (€${fmt(opt.fin.npvEur)}).`, `Навіть оптимістичний сценарій має від'ємний NPV (${fmt(opt.fin.npvEur)} €).`));
  if (breakEven.capexReductionPct !== null) whatWouldChange.push(T(`NPV = 0 with ≈ ${Math.round(breakEven.capexReductionPct)} % lower CAPEX (or an equivalent grant).`, `NPV = 0 при зниженні CAPEX на ≈ ${Math.round(breakEven.capexReductionPct)} % (або еквівалентному гранті).`));
  else whatWouldChange.push(T("Lower CAPEX alone does not fix it — additional revenue streams are needed.", "Зниження CAPEX саме по собі проблему не розв'язує — потрібні додаткові джерела доходу."));
  if (breakEven.energyPriceIncreasePct !== null) whatWouldChange.push(T(`NPV = 0 with ≈ ${Math.round(breakEven.energyPriceIncreasePct)} % higher energy prices.`, `NPV = 0 при зростанні цін на енергію на ≈ ${Math.round(breakEven.energyPriceIncreasePct)} %.`));
  whatWouldChange.push(T("A gate-fee co-substrate (food waste, fats), a real heat customer, or a cluster with neighbours.", "Ко-сировина з платою за приймання (харчові відходи, жири), реальний споживач тепла, або кластер із сусідніми господарствами."));
  return { id: "WEAK_ECONOMICS", reasons, whatWouldChange };
}

export const VERDICT_LABELS: Record<VerdictId, { uk: string; en: string }> = {
  STRONG_CANDIDATE: { uk: "Сильний кандидат", en: "Strong candidate" },
  POSSIBLE_WITH_CONDITIONS: { uk: "Можливо за умов", en: "Possible with conditions" },
  WEAK_ECONOMICS: { uk: "Слабка економіка", en: "Weak economics" },
  INSUFFICIENT_DATA: { uk: "Недостатньо даних", en: "Insufficient data" },
  NOT_RECOMMENDED_AT_SCALE: { uk: "Не рекомендовано при поточному масштабі", en: "Not recommended at current scale" },
};

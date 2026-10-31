import type { Assessment, RouteId, ScenarioId } from "@/core";
import type { Cell, Sheet } from "./xlsx";

/**
 * Editable spreadsheet of a paid report: the same numbers as the page, in EUR, with the assumptions behind them.
 * Labels follow the model language (English or Ukrainian), like the model's own explanations.
 * The standard plan gets the base case; the full plan adds scenarios, routes, sensitivities and support cases.
 */
export function reportSheets(a: Assessment, opts: { currency: string; access: "standard" | "full" }): Sheet[] {
  const uk = a.lang === "uk";
  const T = (en: string, ukText: string) => (uk ? ukText : en);
  const full = opts.access === "full";
  const base = a.scenarios.base;
  const route = (r: RouteId) => ({ chp: T("CHP", "Когенерація"), boiler: T("Boiler", "Котел"), biomethane: T("Biomethane", "Біометан") })[r];
  const scn = (s: ScenarioId) => ({ conservative: T("Conservative", "Консервативний"), base: T("Base", "Базовий"), optimistic: T("Optimistic", "Оптимістичний") })[s];
  const be = a.breakEven;
  const blank: Cell[] = [];

  const summary: Cell[][] = [
    [T("Methalytics preliminary screening — export", "Methalytics — попередня оцінка, експорт"), ""],
    [T("Pre-tax screening, not a bankable feasibility study. All money in EUR.", "Попередня оцінка до оподаткування, не банківське ТЕО. Усі гроші в EUR."), ""],
    [T("Model version", "Версія моделі"), a.dataAudit?.modelVersion ?? ""],
    [T("Data version", "Версія даних"), a.dataAudit?.dataVersion ?? ""],
    [T("Data as of", "Дані станом на"), a.dataAudit?.asOfDate ?? ""],
    [T("Country", "Країна"), a.countryCode],
    [T("Exchange rate, local currency per EUR", "Курс, місцева валюта за EUR"), a.fx],
    [T("Local currency", "Місцева валюта"), opts.currency],
    [T("Chosen route", "Обраний маршрут"), route(a.bestRoute)],
    [T("Verdict", "Вердикт"), a.verdict.id],
    [T("Data confidence", "Довіра до даних"), `${a.confidence.level} (${a.confidence.score}/100)`],
    [T("Robustness across scenarios", "Стійкість між сценаріями"), a.robustness],
    blank,
    [T("Base case", "Базовий сценарій"), "EUR"],
    [T("CAPEX", "CAPEX"), base.capex.totalEur],
    [T("Revenue and savings, year", "Доходи та економія, рік"), base.opexRev.revenueEur],
    [T("OPEX, year", "OPEX, рік"), base.opexRev.opexEur],
    [T("EBITDA, year", "EBITDA, рік"), base.fin.ebitdaEurYear],
    [T("NPV", "NPV"), base.fin.npvEur],
    [T("IRR (share: 0.08 = 8 %)", "IRR (частка: 0,08 = 8 %)"), base.fin.irr],
    [T("Simple payback, years", "Проста окупність, років"), base.fin.simplePaybackYears],
    [T("Minimum DSCR (EBITDA-based screening ratio)", "Мінімальний DSCR (оціночний, на основі EBITDA)"), base.fin.dscrMin],
    [T("Debt, EUR", "Борг, EUR"), base.fin.debtEur],
    [T("Biogas, m³/year", "Біогаз, м³/рік"), base.feed.biogasM3Year],
    [T("Electrical capacity, kWe", "Електрична потужність, кВт"), base.kwElEquivalent],
    [T("Net electricity, MWh/year", "Чиста електроенергія, МВт·год/рік"), base.energy.elNetKwh / 1000],
    [T("Useful heat, MWh/year", "Корисне тепло, МВт·год/рік"), base.energy.heatUsefulKwh / 1000],
    [T("Biomethane, Nm³/year", "Біометан, Нм³/рік"), base.energy.biomethaneNm3],
    blank,
    [T("Break-even (NPV = 0, one value at a time)", "Беззбитковість (NPV = 0, по одному значенню)"), ""],
    [T("CAPEX reduction needed, %", "Потрібне зниження CAPEX, %"), be.capexReductionPct],
    [T("Energy price increase needed, %", "Потрібне зростання цін на енергію, %"), be.energyPriceIncreasePct],
    [T("Highest installed cost, EUR", "Найвища вартість будівництва, EUR"), be.maxCapexEur ?? null],
    ...(be.product ? [
      [T(`Product value now, ${be.product.unit}`, `Цінність продукту зараз, ${be.product.unit}`), be.product.currentEur],
      [T(`Product value at NPV = 0, ${be.product.unit}`, `Цінність продукту при NPV = 0, ${be.product.unit}`), be.product.breakEvenEur],
      ...(be.product.breakEvenEurMwh !== undefined ? [[T("Biomethane at NPV = 0, EUR/MWh LHV", "Біометан при NPV = 0, EUR/МВт·год (нижча теплота згоряння)"), be.product.breakEvenEurMwh]] : []),
    ] : []),
    ...(a.monteCarlo ? [
      [T(`Monte Carlo (${a.monteCarlo.n} independent draws of the scenario quantities)`, `Монте-Карло (${a.monteCarlo.n} незалежних вибірок величин сценаріїв)`), ""],
      ["NPV P10, EUR", a.monteCarlo.p10NpvEur], [T("NPV median, EUR", "Медіана NPV, EUR"), a.monteCarlo.p50NpvEur], ["NPV P90, EUR", a.monteCarlo.p90NpvEur],
      [T("Chance that NPV > 0", "Імовірність NPV > 0"), a.monteCarlo.probPositive],
    ] as Cell[][] : []),
    [T("Feedstock price headroom, EUR/t of every input (+ can pay more, − needs a gate fee)", "Запас ціни сировини, EUR/т кожної сировини (+ можна платити більше, − потрібна плата за прийом)"), be.feedstockEurT ?? null],
    blank,
    [T("Notes", "Примітки"), ""],
    ...a.notes.map((n) => [n, ""] as Cell[]),
  ];

  const years = base.fin.cashFlows.map((_, t) => t);
  const flowScenarios: ScenarioId[] = full ? ["conservative", "base", "optimistic"] : ["base"];
  const cashflow: Cell[][] = [
    [T("Year", "Рік"), ...flowScenarios.map((s) => `${scn(s)}: ${T("cash flow, EUR", "грошовий потік, EUR")}`), ...flowScenarios.map((s) => `${scn(s)}: ${T("cumulative, EUR", "наростаючим підсумком, EUR")}`)],
    ...years.map((t) => [t, ...flowScenarios.map((s) => a.scenarios[s].fin.cashFlows[t]), ...flowScenarios.map((s) => a.scenarios[s].fin.cumulative[t])]),
    blank,
    [T("Year 0 is construction (CAPEX). Pre-tax, nominal; escalation and first-year ramp-up as in the methodology.", "Рік 0 — будівництво (CAPEX). До оподаткування, номінально; індексація та вихід на потужність у першому році — за методикою.")],
  ];

  const lines = (title: string, rows: { label: string; eur: number }[], total: number): Cell[][] => [[title, "EUR"], ...rows.map((r) => [r.label, r.eur] as Cell[]), [T("Total", "Разом"), total], blank];
  const money: Cell[][] = [
    ...lines(T("CAPEX", "CAPEX"), base.capex.lines, base.capex.totalEur),
    ...lines(T("Revenue and savings, year 1 basis", "Доходи та економія, база першого року"), base.opexRev.revenue, base.opexRev.revenueEur),
    ...lines(T("OPEX, year 1 basis", "OPEX, база першого року"), base.opexRev.opex, base.opexRev.opexEur),
  ];

  const evidence = a.marketEvidence ?? [];
  const assumptions: Cell[][] = [
    [T("Parameter", "Параметр"), T("Value", "Значення"), T("Unit", "Одиниця"), T("Type", "Тип"), T("Confidence", "Довіра"), T("Date", "Дата"), T("Source", "Джерело"), "ID"],
    ...evidence.map((p) => [p.label, p.value, p.unit, p.origin ?? p.kind, p.confidence, p.date, p.source, p.id]),
    blank,
    [T("Data check", "Перевірка даних"), T("Status", "Статус"), T("Observed through", "Період до"), T("Valid until", "Чинне до"), T("Reason", "Причина")],
    ...(a.dataAudit?.checks ?? []).map((c) => [c.parameterId, c.status, c.observedThrough ?? "", c.validUntil ?? "", c.reason]),
  ];

  const sheets: Sheet[] = [
    { name: T("Summary", "Підсумок"), rows: summary, widths: [70, 22] },
    { name: T("Cash flow", "Грошовий потік"), rows: cashflow, widths: [8, ...flowScenarios.flatMap(() => [26, 26])] },
    { name: T("CAPEX and OPEX", "CAPEX і OPEX"), rows: money, widths: [70, 16] },
    { name: T("Assumptions", "Припущення"), rows: assumptions, widths: [50, 14, 14, 22, 12, 12, 90, 40] },
  ];

  if (a.measureFirst?.length) {
    sheets.push({ name: T("Verify first", "Перевірити першим"), widths: [22, 30, 18, 18, 18, 14], rows: [
      [T("Input", "Вхідні дані"), T("Registry parameter", "Параметр реєстру"), T("NPV at low end, EUR", "NPV на нижній межі, EUR"), T("NPV at high end, EUR", "NPV на верхній межі, EUR"), T("Value of knowing (EVPI), EUR", "Цінність знання (EVPI), EUR"), T("Can flip the answer", "Може змінити відповідь")],
      ...a.measureFirst.map((m) => [m.kind, m.parameterId ?? "", m.lowNpvEur, m.highNpvEur, m.evpiEur, m.flips ? T("yes", "так") : ""] as Cell[]),
    ] });
  }

  if (a.ghg) {
    const g = a.ghg;
    sheets.push({ name: T("Climate (RED)", "Клімат (RED)"), widths: [60, 18], rows: [
      [T("Climate case, EU RED II Annex VI default values (separate from the verdict)", "Кліматичний сценарій, стандартні значення EU RED II, додаток VI (окремо від вердикту)"), ""],
      [T("Product", "Продукт"), g.product],
      [T("Digestate storage", "Зберігання дигестату"), g.digestate],
      ...g.shares.map((s) => [T(`Energy share, ${s.substrate}`, `Енергетична частка, ${s.substrate}`), s.share] as Cell[]),
      [T("Emissions per MJ biogas / biomethane, g CO2e", "Викиди на МДж біогазу / біометану, г CO2e"), g.feedGMJ],
      [T("Emissions per MJ product, g CO2e", "Викиди на МДж продукту, г CO2e"), g.productGMJ],
      [T("Fossil comparator, g CO2e/MJ", "Викопний еквівалент, г CO2e/МДж"), g.comparatorGMJ],
      [T("Saving (share)", "Скорочення (частка)"), g.saving],
      [T("RED minimum (share)", "Мінімум RED (частка)"), g.minSaving],
      [T("Rated thermal input, MW", "Номінальна теплова потужність на вході, МВт"), g.ratedInputMw],
      [T("Avoided emissions, t CO2e/year", "Уникнуті викиди, т CO2e/рік"), g.avoidedTco2eYear],
    ] });
  }

  if (a.scale?.length) {
    const routes: RouteId[] = ["chp", "boiler", "biomethane"];
    sheets.push({ name: T("Plant size", "Розмір установки"), widths: [12, 16, ...routes.flatMap(() => [14, 16, 16])], rows: [
      [T("Size (× your feedstock)", "Обсяг (× вашої сировини)"), T("Feedstock, t/year", "Сировина, т/рік"), ...routes.flatMap((r) => [`${route(r)}: kWe`, `${route(r)}: CAPEX, EUR`, `${route(r)}: NPV, EUR`])],
      ...a.scale.map((p) => [p.multiplier, p.tonnesYear, ...routes.flatMap((r) => [p.routes[r].kwEl, p.routes[r].capexEur, p.routes[r].npvEur])] as Cell[]),
      blank,
      [T("Extra feedstock on the same terms (price, transport rate, disposal saving); delivered streams travel distance × √size. CAPEX is the model estimate, without a supplier quote.", "Додаткова сировина на тих самих умовах (ціна, тариф перевезення, економія на утилізації); привізна сировина їде на відстань × √обсягу. CAPEX — оцінка моделі без пропозиції постачальника.")],
    ] });
  }

  if (a.quoteCheck) {
    const q = a.quoteCheck;
    sheets.push({ name: T("Quote check", "Перевірка пропозиції"), widths: [60, 18], rows: [
      [T("Supplier quote check", "Перевірка пропозиції постачальника"), "EUR"],
      [T("Route", "Маршрут"), route(q.route)],
      [T("Quote", "Пропозиція"), q.quoteEur],
      [T("Model estimate, same route and capacity", "Оцінка моделі, той самий маршрут і потужність"), q.modelledEur],
      [T("Model range, optimistic", "Діапазон моделі, оптимістичний"), q.modelRangeEur[0]],
      [T("Model range, conservative", "Діапазон моделі, консервативний"), q.modelRangeEur[1]],
      [T("Position", "Положення"), q.position],
      ...(q.capacity ? [[T(`Capacity, ${q.capacity.unit}`, `Потужність, ${q.capacity.unit}`), q.capacity.value] as Cell[]] : []),
      [T("Highest price at NPV = 0", "Найвища ціна при NPV = 0"), q.maxCapexEur],
      blank,
      ...lines(T("Complete scope, model estimate per item", "Повний обсяг, оцінка моделі за позиціями"), q.scope, q.modelledEur),
    ] });
  }

  if (full) {
    const routes: RouteId[] = ["chp", "boiler", "biomethane"];
    sheets.push({ name: T("Routes", "Маршрути"), widths: [16, 16, 16, 16, 16, 12, 14], rows: [
      [T("Route", "Маршрут"), T("Scenario", "Сценарій"), "CAPEX, EUR", T("EBITDA/year, EUR", "EBITDA/рік, EUR"), "NPV, EUR", "IRR", T("Payback, years", "Окупність, років")],
      ...routes.flatMap((r) => (["conservative", "base", "optimistic"] as ScenarioId[]).map((s) => {
        const x = a.routeMatrix[r][s];
        return [route(r), scn(s), x.capex.totalEur, x.fin.ebitdaEurYear, x.fin.npvEur, x.fin.irr, x.fin.simplePaybackYears] as Cell[];
      })),
    ] });
    sheets.push({ name: T("Sensitivity", "Чутливість"), widths: [48, 18, 18, 16, 12], rows: [
      [T("Stress test (one at a time)", "Стрес-тест (по одному)"), "NPV, EUR", T("Change in NPV, EUR", "Зміна NPV, EUR"), T("Payback, years", "Окупність, років"), T("Flips NPV sign", "Змінює знак NPV")],
      ...a.sensitivity.map((s) => [s.label, s.npvEur, s.deltaNpvEur, s.paybackYears, s.breaks ? T("yes", "так") : ""]),
      blank,
      [T("Parameter range", "Діапазон параметра"), T("Low input", "Нижнє значення"), T("High input", "Верхнє значення"), T("NPV at low, EUR", "NPV при нижньому, EUR"), T("NPV at high, EUR", "NPV при верхньому, EUR")],
      ...(a.parameterSensitivity ?? []).map((p) => [p.parameterId, p.lowInput, p.highInput, p.lowNpvEur, p.highNpvEur]),
    ] });
    sheets.push({ name: T("Support cases", "Підтримка"), widths: [48, 12, 10, 18, 14, 18, 60], rows: [
      [T("Scheme (separate case, never in the verdict)", "Схема (окремий сценарій, не входить у вердикт)"), T("Status", "Статус"), T("Eligible", "Відповідає"), "NPV, EUR", T("Payback, years", "Окупність, років"), T("Change in NPV, EUR", "Зміна NPV, EUR"), T("Source", "Джерело")],
      ...a.supportCases.map((s) => [s.name, s.status, s.eligible ? T("yes", "так") : T("no", "ні"), s.npvEur, s.paybackYears, s.deltaNpvEur, s.source]),
    ] });
  }
  return sheets;
}

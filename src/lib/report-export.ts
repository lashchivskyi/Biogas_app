import type { Assessment, RouteId, ScenarioId } from "@/core";
import { tr } from "@/core/i18n";
import type { Cell, Sheet } from "./xlsx";

/**
 * Editable spreadsheet of a paid report: the same numbers as the page, in EUR, with the assumptions behind them.
 * Labels follow the model language (`a.lang`), like the model's own explanations.
 * The standard plan gets the base case; the full plan adds scenarios, routes, sensitivities and support cases.
 */
export function reportSheets(a: Assessment, opts: { currency: string; access: "standard" | "full" }): Sheet[] {
  const T = tr(a.lang);
  const full = opts.access === "full";
  const base = a.scenarios.base;
  const route = (r: RouteId) => ({ chp: T("CHP"), boiler: T("Boiler"), biomethane: T("Biomethane") })[r];
  const scn = (s: ScenarioId) => ({ conservative: T("Conservative"), base: T("Base"), optimistic: T("Optimistic") })[s];
  const be = a.breakEven;
  // Machine codes never reach the sheet: each enum is shown in the report language (unknown codes stay visible).
  const CODES: Record<string, string> = {
    STRONG_CANDIDATE: "Strong candidate", POSSIBLE_WITH_CONDITIONS: "Possible with conditions",
    WEAK_ECONOMICS: "Weak economics", INSUFFICIENT_DATA: "Insufficient data",
    NOT_RECOMMENDED_AT_SCALE: "Not recommended at this scale",
    LOW: "low", MEDIUM: "medium", HIGH: "high",
    MEASURED: "Measured", USER_INPUT: "User input", MARKET_DATA: "Market data",
    ENGINEERING_ASSUMPTION: "Engineering assumption", CALCULATED_VALUE: "Calculated value",
    clear_go: "Clear go in all scenarios", grey: "Depends on the scenario", clear_no: "Clear no in all scenarios", insufficient: "Insufficient data",
    FACT: "Fact", ASSUMPTION: "Assumption", CALCULATION: "Calculation", ESTIMATE: "Estimate",
    CONSTANT: "Constant", WITHIN_REVIEW_WINDOW: "Within review window", REVIEW_REQUIRED: "Review required",
    EXPIRED: "Expired", UNDATED: "Undated",
    below: "Below the model range", within: "Within the model range", above: "Above the model range",
    open: "Open", competitive: "Competitive", closing: "Closing", closed: "Closed", uncertain: "Uncertain",
    electricity: "Electricity", heat: "Heat", biomethane: "Biomethane",
    closed_storage: "Closed (gas-tight)", open_storage: "Open (not gas-tight)",
    yield: "Gas yield", quantity: "Quantity", capex: "CAPEX", electricity_price: "Electricity price",
    export_price: "Export price", heat_price: "Heat price", heat_buyer: "Heat buyer", offtake: "Offtake",
    fertiliser: "Fertiliser value", bill_structure: "Bill structure", market: "Market",
  };
  const C = (code: string | undefined) => (code === undefined ? "" : CODES[code] ? T(CODES[code]) : code);
  const blank: Cell[] = [];

  const summary: Cell[][] = [
    [T("Methalytics preliminary screening — export"), ""],
    [T("Pre-tax screening, not a bankable feasibility study. All money in nominal EUR (prices escalated, discounted at the country rate)."), ""],
    [T("Model version"), a.dataAudit?.modelVersion ?? ""],
    [T("Data version"), a.dataAudit?.dataVersion ?? ""],
    [T("Data as of"), a.dataAudit?.asOfDate ?? ""],
    [T("Country"), a.countryCode],
    [T("Exchange rate, local currency per EUR"), a.fx],
    [T("Local currency"), opts.currency],
    [T("Chosen route"), route(a.bestRoute)],
    [T("Verdict"), C(a.verdict.id)],
    [T("Data confidence"), `${C(a.confidence.level)} (${a.confidence.score}/100)`],
    [T("Robustness across scenarios"), C(a.robustness)],
    blank,
    [T("Base case"), "EUR"],
    [T("CAPEX"), base.capex.totalEur],
    [T("Revenue and savings, year"), base.opexRev.revenueEur],
    [T("OPEX, year"), base.opexRev.opexEur],
    [T("EBITDA, year"), base.fin.ebitdaEurYear],
    [T("NPV"), base.fin.npvEur],
    [T("IRR (share: 0.08 = 8 %)"), base.fin.irr],
    [T("Simple payback, years"), base.fin.simplePaybackYears],
    [T("Discounted payback at the project discount rate, years (empty: not within the horizon)"), base.fin.discountedPaybackYears ?? null],
    [T("Minimum DSCR (EBITDA-based screening ratio)"), base.fin.dscrMin],
    [T("Debt, EUR"), base.fin.debtEur],
    [T("Biogas, m³/year"), base.feed.biogasM3Year],
    [T("Electrical capacity, kWe"), base.kwElEquivalent],
    [T("Net electricity, MWh/year"), base.energy.elNetKwh / 1000],
    [T("Useful heat, MWh/year"), base.energy.heatUsefulKwh / 1000],
    [T("Biomethane, Nm³/year"), base.energy.biomethaneNm3],
    blank,
    [T("Break-even (NPV = 0, one value at a time)"), ""],
    [T("CAPEX reduction needed, %"), be.capexReductionPct],
    [T("Energy price increase needed, %"), be.energyPriceIncreasePct],
    [T("Highest installed cost, EUR"), be.maxCapexEur ?? null],
    ...(be.product ? [
      [T("Product value now, {unit}", { unit: be.product.unit }), be.product.currentEur],
      [T("Product value at NPV = 0, {unit}", { unit: be.product.unit }), be.product.breakEvenEur],
      ...(be.product.breakEvenEurMwh !== undefined ? [[T("Biomethane at NPV = 0, EUR/MWh LHV"), be.product.breakEvenEurMwh]] : []),
    ] : []),
    ...(a.monteCarlo ? [
      [T("Monte Carlo ({n} independent draws of the scenario quantities)", { n: a.monteCarlo.n }), ""],
      ["NPV P10, EUR", a.monteCarlo.p10NpvEur], [T("NPV median, EUR"), a.monteCarlo.p50NpvEur], ["NPV P90, EUR", a.monteCarlo.p90NpvEur],
      [T("Chance that NPV > 0"), a.monteCarlo.probPositive],
    ] as Cell[][] : []),
    [T("Feedstock price headroom, EUR/t of every input (+ can pay more, − needs a gate fee)"), be.feedstockEurT ?? null],
    blank,
    [T("Notes"), ""],
    ...a.notes.map((n) => [n, ""] as Cell[]),
  ];

  const years = base.fin.cashFlows.map((_, t) => t);
  const flowScenarios: ScenarioId[] = full ? ["conservative", "base", "optimistic"] : ["base"];
  const cashflow: Cell[][] = [
    [T("Year"), ...flowScenarios.map((s) => `${scn(s)}: ${T("cash flow, EUR")}`), ...flowScenarios.map((s) => `${scn(s)}: ${T("cumulative, EUR")}`)],
    ...years.map((t) => [t, ...flowScenarios.map((s) => a.scenarios[s].fin.cashFlows[t]), ...flowScenarios.map((s) => a.scenarios[s].fin.cumulative[t])]),
    blank,
    [T("Year 0 is construction (CAPEX). Pre-tax, nominal; escalation and first-year ramp-up as in the methodology.")],
  ];

  const lines = (title: string, rows: { label: string; eur: number }[], total: number): Cell[][] => [[title, "EUR"], ...rows.map((r) => [r.label, r.eur] as Cell[]), [T("Total"), total], blank];
  const money: Cell[][] = [
    ...lines(T("CAPEX"), base.capex.lines, base.capex.totalEur),
    ...lines(T("Revenue and savings, year 1 basis"), base.opexRev.revenue, base.opexRev.revenueEur),
    ...lines(T("OPEX, year 1 basis"), base.opexRev.opex, base.opexRev.opexEur),
  ];

  const evidence = a.marketEvidence ?? [];
  const assumptions: Cell[][] = [
    [T("Parameter"), T("Value"), T("Unit"), T("Type"), T("Confidence"), T("Date"), T("Source"), "ID"],
    ...evidence.map((p) => [p.label, p.value, p.unit, C(p.origin ?? p.kind), C(p.confidence), p.date, p.source, p.id]),
    blank,
    [T("Data check"), T("Status"), T("Observed through"), T("Valid until"), T("Reason")],
    ...(a.dataAudit?.checks ?? []).map((c) => [c.parameterId, C(c.status), c.observedThrough ?? "", c.validUntil ?? "", c.reason]),
  ];

  const sheets: Sheet[] = [
    { name: T("Summary"), rows: summary, widths: [70, 22] },
    { name: T("Cash flow"), rows: cashflow, widths: [8, ...flowScenarios.flatMap(() => [26, 26])] },
    { name: T("CAPEX and OPEX"), rows: money, widths: [70, 16] },
    { name: T("Assumptions"), rows: assumptions, widths: [50, 14, 14, 22, 12, 12, 90, 40] },
  ];

  if (a.measureFirst?.length) {
    sheets.push({ name: T("Verify first"), widths: [22, 30, 18, 18, 18, 14], rows: [
      [T("Input"), T("Registry parameter"), T("NPV at low end, EUR"), T("NPV at high end, EUR"), T("Value of knowing (EVPI), EUR"), T("Can flip the answer")],
      ...a.measureFirst.map((m) => [C(m.kind), m.parameterId ?? "", m.lowNpvEur, m.highNpvEur, m.evpiEur, m.flips ? T("yes") : ""] as Cell[]),
    ] });
  }

  if (a.ghg) {
    const g = a.ghg;
    sheets.push({ name: T("Climate (RED)"), widths: [60, 18], rows: [
      [T("Climate case, EU RED II Annex VI default values (separate from the verdict)"), ""],
      [T("Product"), C(g.product)],
      [T("Digestate storage"), C(`${g.digestate}_storage`)],
      ...g.shares.map((s) => [T("Energy share, {substrate}", { substrate: s.substrate }), s.share] as Cell[]),
      [T("Emissions per MJ biogas / biomethane, g CO2e"), g.feedGMJ],
      [T("Emissions per MJ product, g CO2e"), g.productGMJ],
      [T("Fossil comparator, g CO2e/MJ"), g.comparatorGMJ],
      [T("Saving (share)"), g.saving],
      [T("RED minimum (share)"), g.minSaving],
      [T("Rated thermal input, MW"), g.ratedInputMw],
      [T("Avoided emissions, t CO2e/year"), g.avoidedTco2eYear],
    ] });
  }

  if (a.scale?.length) {
    const routes: RouteId[] = ["chp", "boiler", "biomethane"];
    sheets.push({ name: T("Plant size"), widths: [12, 16, ...routes.flatMap(() => [14, 16, 16])], rows: [
      [T("Size (× your feedstock)"), T("Feedstock, t/year"), ...routes.flatMap((r) => [`${route(r)}: kWe`, `${route(r)}: CAPEX, EUR`, `${route(r)}: NPV, EUR`])],
      ...a.scale.map((p) => [p.multiplier, p.tonnesYear, ...routes.flatMap((r) => [p.routes[r].kwEl, p.routes[r].capexEur, p.routes[r].npvEur])] as Cell[]),
      blank,
      [T("Extra feedstock on the same terms (price, transport rate, disposal saving); delivered streams travel distance × √size. CAPEX is the model estimate, without a supplier quote.")],
    ] });
  }

  if (a.quoteCheck) {
    const q = a.quoteCheck;
    sheets.push({ name: T("Quote check"), widths: [60, 18], rows: [
      [T("Supplier quote check"), "EUR"],
      [T("Route"), route(q.route)],
      [T("Quote"), q.quoteEur],
      [T("Model estimate, same route and capacity"), q.modelledEur],
      [T("Model range, optimistic"), q.modelRangeEur[0]],
      [T("Model range, conservative"), q.modelRangeEur[1]],
      [T("Position"), C(q.position)],
      ...(q.capacity ? [[T("Capacity, {unit}", { unit: q.capacity.unit }), q.capacity.value] as Cell[]] : []),
      [T("Highest price at NPV = 0"), q.maxCapexEur],
      blank,
      ...lines(T("Complete scope, model estimate per item"), q.scope, q.modelledEur),
    ] });
  }

  if (full) {
    const routes: RouteId[] = ["chp", "boiler", "biomethane"];
    sheets.push({ name: T("Routes"), widths: [16, 16, 16, 16, 16, 12, 14], rows: [
      [T("Route"), T("Scenario"), "CAPEX, EUR", T("EBITDA/year, EUR"), "NPV, EUR", "IRR", T("Payback, years")],
      ...routes.flatMap((r) => (["conservative", "base", "optimistic"] as ScenarioId[]).map((s) => {
        const x = a.routeMatrix[r][s];
        return [route(r), scn(s), x.capex.totalEur, x.fin.ebitdaEurYear, x.fin.npvEur, x.fin.irr, x.fin.simplePaybackYears] as Cell[];
      })),
    ] });
    sheets.push({ name: T("Sensitivity"), widths: [48, 18, 18, 16, 12], rows: [
      [T("Stress test (one at a time)"), "NPV, EUR", T("Change in NPV, EUR"), T("Payback, years"), T("Flips NPV sign")],
      ...a.sensitivity.map((s) => [s.label, s.npvEur, s.deltaNpvEur, s.paybackYears, s.breaks ? T("yes") : ""]),
      blank,
      [T("Parameter range"), T("Low input"), T("High input"), T("NPV at low, EUR"), T("NPV at high, EUR")],
      ...(a.parameterSensitivity ?? []).map((p) => [p.parameterId, p.lowInput, p.highInput, p.lowNpvEur, p.highNpvEur]),
    ] });
    sheets.push({ name: T("Support cases"), widths: [48, 12, 10, 18, 14, 18, 60], rows: [
      [T("Scheme (separate case, never in the verdict)"), T("Status"), T("Eligible"), "NPV, EUR", T("Payback, years"), T("Change in NPV, EUR"), T("Source")],
      ...a.supportCases.map((s) => [s.name, C(s.status), s.eligible ? T("yes") : T("no"), s.npvEur, s.paybackYears, s.deltaNpvEur, s.source]),
    ] });
  }
  return sheets;
}

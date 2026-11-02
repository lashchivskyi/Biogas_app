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
  /** Registry units say "local" for the project currency; the sheet names it. */
  const unitText = (unit: string) => unit.replace(/local/g, opts.currency);
  const blank: Cell[] = [];
  // Number formats (invariant Excel codes: Excel shows them with the reader's own separators). The values stay unrounded.
  const EUR = "#,##0", N1 = "#,##0.0", N2 = "#,##0.00", PCT = "0.0%", PCT0 = "0%", AUTO = "auto";
  const formats = new Map<Cell[], string | (string | undefined)[]>();
  const fm = (fmt: string | (string | undefined)[], row: Cell[]): Cell[] => (formats.set(row, fmt), row);
  const headings = new Set<Cell[]>();
  const head = (row: Cell[]): Cell[] => (headings.add(row), row);

  const summary: Cell[][] = [
    head([T("Methalytics preliminary screening — export"), ""]),
    [T("Pre-tax screening, not a bankable feasibility study. All money in nominal EUR (prices escalated, discounted at the country rate)."), ""],
    [T("Country"), a.countryCode],
    fm(AUTO, [T("Exchange rate, local currency per EUR"), a.fx]),
    [T("Local currency"), opts.currency],
    [T("Chosen route"), route(a.bestRoute)],
    [T("Verdict"), C(a.verdict.id)],
    [T("Data confidence"), `${C(a.confidence.level)} (${a.confidence.score}/100)`],
    [T("Robustness across scenarios"), C(a.robustness)],
    blank,
    head([T("Base case"), "EUR"]),
    fm(EUR, [T("CAPEX"), base.capex.totalEur]),
    fm(EUR, [T("Revenue and savings, year"), base.opexRev.revenueEur]),
    fm(EUR, [T("OPEX, year"), base.opexRev.opexEur]),
    fm(EUR, [T("EBITDA, year"), base.fin.ebitdaEurYear]),
    fm(EUR, [T("NPV"), base.fin.npvEur]),
    fm(PCT, [T("IRR (share: 0.08 = 8 %)"), base.fin.irr]),
    fm(N1, [T("Simple payback, years"), base.fin.simplePaybackYears]),
    fm(N1, [T("Discounted payback at the project discount rate, years (empty: not within the horizon)"), base.fin.discountedPaybackYears ?? null]),
    fm(N2, [T("Minimum DSCR (EBITDA-based screening ratio)"), base.fin.dscrMin]),
    fm(EUR, [T("Debt, EUR"), base.fin.debtEur]),
    fm(EUR, [T("Biogas, m³/year"), base.feed.biogasM3Year]),
    fm(EUR, [T("Electrical capacity, kWe"), base.kwElEquivalent]),
    fm(EUR, [T("Net electricity, MWh/year"), base.energy.elNetKwh / 1000]),
    fm(EUR, [T("Useful heat, MWh/year"), base.energy.heatUsefulKwh / 1000]),
    fm(EUR, [T("Biomethane, Nm³/year"), base.energy.biomethaneNm3]),
    blank,
    head([T("Break-even (NPV = 0, one value at a time)"), ""]),
    fm(N1, [T("CAPEX reduction needed, %"), be.capexReductionPct]),
    fm(N1, [T("Energy price increase needed, %"), be.energyPriceIncreasePct]),
    fm(EUR, [T("Highest installed cost, EUR"), be.maxCapexEur ?? null]),
    ...(be.product ? [
      fm(AUTO, [T("Product value now, {unit}", { unit: be.product.unit }), be.product.currentEur]),
      fm(AUTO, [T("Product value at NPV = 0, {unit}", { unit: be.product.unit }), be.product.breakEvenEur]),
      ...(be.product.breakEvenEurMwh !== undefined ? [fm(N1, [T("Biomethane at NPV = 0, EUR/MWh LHV"), be.product.breakEvenEurMwh])] : []),
    ] : []),
    ...(a.monteCarlo ? [
      head([T("Monte Carlo ({n} independent draws of the scenario quantities)", { n: a.monteCarlo.n }), ""]),
      fm(EUR, [T("NPV P10, EUR"), a.monteCarlo.p10NpvEur]), fm(EUR, [T("NPV median, EUR"), a.monteCarlo.p50NpvEur]), fm(EUR, [T("NPV P90, EUR"), a.monteCarlo.p90NpvEur]),
      fm(PCT0, [T("Chance that NPV > 0"), a.monteCarlo.probPositive]),
    ] as Cell[][] : []),
    fm(N1, [T("Feedstock price headroom, EUR/t of every input (+ can pay more, − needs a gate fee)"), be.feedstockEurT ?? null]),
    blank,
    head([T("Notes"), ""]),
    ...a.notes.map((n) => [n, ""] as Cell[]),
  ];

  const years = base.fin.cashFlows.map((_, t) => t);
  const flowScenarios: ScenarioId[] = full ? ["conservative", "base", "optimistic"] : ["base"];
  const cashflow: Cell[][] = [
    [T("Year"), ...flowScenarios.map((s) => `${scn(s)}: ${T("cash flow, EUR")}`), ...flowScenarios.map((s) => `${scn(s)}: ${T("cumulative, EUR")}`)],
    ...years.map((t) => fm(["0", ...flowScenarios.flatMap(() => [EUR]), ...flowScenarios.flatMap(() => [EUR])], [t, ...flowScenarios.map((s) => a.scenarios[s].fin.cashFlows[t]), ...flowScenarios.map((s) => a.scenarios[s].fin.cumulative[t])])),
    blank,
    [T("Year 0 is construction (CAPEX). Pre-tax, nominal; escalation and first-year ramp-up as in the methodology.")],
  ];

  const lines = (title: string, rows: { label: string; eur: number }[], total: number): Cell[][] => [head([title, "EUR"]), ...rows.map((r) => fm(EUR, [r.label, r.eur])), fm(EUR, [T("Total"), total]), blank];
  const money: Cell[][] = [
    ...lines(T("CAPEX"), base.capex.lines, base.capex.totalEur),
    ...lines(T("Revenue and savings, year 1 basis"), base.opexRev.revenue, base.opexRev.revenueEur),
    ...lines(T("OPEX, year 1 basis"), base.opexRev.opex, base.opexRev.opexEur),
  ];

  const evidence = a.marketEvidence ?? [];
  const assumptions: Cell[][] = [
    [T("Parameter"), T("Value"), T("Unit"), T("Type"), T("Confidence"), T("Date"), T("Source"), "ID"],
    ...evidence.map((p) => fm(AUTO, [p.label, p.value, unitText(p.unit), C(p.origin ?? p.kind), C(p.confidence), p.date, p.source, p.id])),
    blank,
    head([T("Data check"), T("Status"), T("Observed through"), T("Valid until"), T("Reason")]),
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
      ...a.measureFirst.map((m) => fm(EUR, [C(m.kind), m.parameterId ?? "", m.lowNpvEur, m.highNpvEur, m.evpiEur, m.flips ? T("yes") : ""])),
    ] });
  }

  if (a.ghg) {
    const g = a.ghg;
    sheets.push({ name: T("Climate (RED)"), widths: [60, 18], rows: [
      [T("Climate case, EU RED II Annex VI default values (separate from the verdict)"), ""],
      [T("Product"), C(g.product)],
      [T("Digestate storage"), C(`${g.digestate}_storage`)],
      ...g.shares.map((s) => fm(PCT, [T("Energy share, {substrate}", { substrate: s.substrate }), s.share])),
      fm(N1, [T("Emissions per MJ biogas / biomethane, g CO2e"), g.feedGMJ]),
      fm(N1, [T("Emissions per MJ product, g CO2e"), g.productGMJ]),
      fm(N1, [T("Fossil comparator, g CO2e/MJ"), g.comparatorGMJ]),
      fm(PCT, [T("Saving (share)"), g.saving]),
      fm(PCT, [T("RED minimum (share)"), g.minSaving]),
      fm(N2, [T("Rated thermal input, MW"), g.ratedInputMw]),
      fm(EUR, [T("Avoided emissions, t CO2e/year"), g.avoidedTco2eYear]),
    ] });
  }

  if (a.scale?.length) {
    const routes: RouteId[] = ["chp", "boiler", "biomethane"];
    sheets.push({ name: T("Plant size"), widths: [12, 16, ...routes.flatMap(() => [14, 16, 16])], rows: [
      [T("Size (× your feedstock)"), T("Feedstock, t/year"), ...routes.flatMap((r) => [`${route(r)}: kWe`, `${route(r)}: CAPEX, EUR`, `${route(r)}: ${T("NPV, EUR")}`])],
      ...a.scale.map((p) => fm(["0.0#", EUR, ...routes.flatMap(() => [EUR, EUR, EUR])], [p.multiplier, p.tonnesYear, ...routes.flatMap((r) => [p.routes[r].kwEl, p.routes[r].capexEur, p.routes[r].npvEur])])),
      blank,
      [T("Extra feedstock on the same terms (price, transport rate, disposal saving); delivered streams travel distance × √size. CAPEX is the model estimate, without a supplier quote.")],
    ] });
  }

  if (a.quoteCheck) {
    const q = a.quoteCheck;
    sheets.push({ name: T("Quote check"), widths: [60, 18], rows: [
      [T("Supplier quote check"), "EUR"],
      [T("Route"), route(q.route)],
      fm(EUR, [T("Quote"), q.quoteEur]),
      fm(EUR, [T("Model estimate, same route and capacity"), q.modelledEur]),
      fm(EUR, [T("Model range, optimistic"), q.modelRangeEur[0]]),
      fm(EUR, [T("Model range, conservative"), q.modelRangeEur[1]]),
      [T("Position"), C(q.position)],
      ...(q.capacity ? [fm(AUTO, [T("Capacity, {unit}", { unit: q.capacity.unit }), q.capacity.value])] : []),
      fm(EUR, [T("Highest price at NPV = 0"), q.maxCapexEur]),
      blank,
      ...lines(T("Complete scope, model estimate per item"), q.scope, q.modelledEur),
    ] });
  }

  if (full) {
    const routes: RouteId[] = ["chp", "boiler", "biomethane"];
    sheets.push({ name: T("Routes"), widths: [16, 16, 16, 16, 16, 12, 14], rows: [
      [T("Route"), T("Scenario"), "CAPEX, EUR", T("EBITDA/year, EUR"), T("NPV, EUR"), "IRR", T("Payback, years")],
      ...routes.flatMap((r) => (["conservative", "base", "optimistic"] as ScenarioId[]).map((s) => {
        const x = a.routeMatrix[r][s];
        return fm([undefined, undefined, EUR, EUR, EUR, PCT, N1], [route(r), scn(s), x.capex.totalEur, x.fin.ebitdaEurYear, x.fin.npvEur, x.fin.irr, x.fin.simplePaybackYears]);
      })),
    ] });
    sheets.push({ name: T("Sensitivity"), widths: [48, 18, 18, 16, 12], rows: [
      [T("Stress test (one at a time)"), T("NPV, EUR"), T("Change in NPV, EUR"), T("Payback, years"), T("Flips NPV sign")],
      ...a.sensitivity.map((s) => fm([undefined, EUR, EUR, N1], [s.label, s.npvEur, s.deltaNpvEur, s.paybackYears, s.breaks ? T("yes") : ""])),
      blank,
      head([T("Parameter range"), T("Low input"), T("High input"), T("NPV at low, EUR"), T("NPV at high, EUR")]),
      ...(a.parameterSensitivity ?? []).map((p) => fm([undefined, AUTO, AUTO, EUR, EUR], [p.parameterId, p.lowInput, p.highInput, p.lowNpvEur, p.highNpvEur])),
    ] });
    sheets.push({ name: T("Support cases"), widths: [48, 12, 10, 18, 14, 18, 60], rows: [
      [T("Scheme (separate case, never in the verdict)"), T("Status"), T("Eligible"), T("NPV, EUR"), T("Payback, years"), T("Change in NPV, EUR"), T("Source")],
      ...a.supportCases.map((s) => fm([undefined, undefined, undefined, EUR, N1, EUR], [s.name, C(s.status), s.eligible ? T("yes") : T("no"), s.npvEur, s.paybackYears, s.deltaNpvEur, s.source])),
    ] });
  }
  for (const sh of sheets) {
    sh.formats = sh.rows.map((row) => formats.get(row));
    sh.boldRows = sh.rows.flatMap((row, i) => (headings.has(row) ? [i] : []));
  }
  return sheets;
}

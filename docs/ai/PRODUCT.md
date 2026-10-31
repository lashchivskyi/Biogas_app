# Product

## Who it is for

Owners of organic residues and energy users who must decide whether a biogas/biomethane
project deserves a paid feasibility study:
- farms (dairy, pig, poultry), food and drink processors, agro-industry;
- industrial heat and power users;
- operators of waste, wastewater and landfills;
- developers screening many sites.

They know their feedstock and energy bills, not anaerobic digestion. The product must be
honest when a project does not work.

## Business

- One-off payment per project via Stripe. Two plans, price by the project country's tier
  (A/B/C), set only on the server: `src/config/plans.ts`, signed quote in `src/server/payments`.
- Flow: landing / segment pages → free calculator (screening verdict) → pricing → checkout →
  private report link by email (`/[lang]/report/[token]`). Samples and methodology build trust.
- Display currency EUR or USD (ECB rate); USD checkout only with a fresh rate (≤ 7 days).

## What the model computes (src/core/assess.ts)

fresh mass → TS → VS → BMP / CH₄ → digester sizing (HRT, OLR, heat losses) → monthly balance
for CHP / boiler / upgrading to biomethane → CAPEX (components × country factor), OPEX, revenue
→ pre-tax cash flow 15 years → NPV, IRR, payback, simplified DSCR → verdict and data quality.
Three scenarios (conservative / base / optimistic), one-at-a-time sensitivities, support schemes
as a separate case. Market data per country and, where official data exist, per state/province
(city → admin1 code → regional data).

## Calculations where an error hurts the client most

| Area | Why critical | Guard |
|---|---|---|
| Methane yield (BMP, VS) | multiplies all revenue | feedstock catalogue confidence; lab BMP recommended |
| Energy balance, parasitic load, heat use | decides CHP vs boiler vs biomethane | `audit-balances.test.ts` |
| CAPEX components and country factor | largest uncertainty (±30 %) | DBFZ 2023 German anchors, `scripts/calibrate-capex.ts` |
| Electricity, gas, export prices | sets savings and revenue | official sources, `docs/ai/DATA-SOURCES.md` |
| Discount rate, escalation, horizon | NPV sign | Damodaran CRP + assumptions in `sources.ts` |
| Support schemes | can flip the decision | separate case, official legal texts only |
| Verdict and quality score | what the client reads first | `verdict.ts`, `quality.ts`, `core.test.ts` |

## Open hypotheses (validate or replace)

- Willingness to pay at €160–390 per report and the tier split by country.
- The free verdict is trusted without a human expert; which evidence raises trust most.
- German-based CAPEX × country factor is adequate outside the EU (BR, IN, MX use single benchmarks).
- Inputs the client does not yet control (export price, operator wage, heat price, financing
  terms, vendor quotes) would improve accuracy enough to justify a longer form.
- Regional (admin1) market data matter enough beyond US, CA, BR, IN, MX, IT.

## Market position (competitor benchmark 2026-10-31; re-check yearly)

Nobody else sells self-serve, multi-country screening with a verdict. Competitor classes:
- Free one-country agency tools, no live prices, no verdict: KTBL (DE, existing plants), Luke (FI, Excel since
  04/2026, ≤ 15 kt), AgSTAR Screening Tool + Penn State (US), ECLAC Methane Calculator (wastewater), BiogasWorld
  (≥ 30 kt), LFGcost-Web (US landfill, after-tax, credits). Generic: RETScreen Expert (CAD 869/yr, Monte Carlo).
- Lead-gen calculators (Bioflux, GrowDiesel; Indian CBG): IRR/payback and PDF, method not disclosed.
- Enterprise, sales-led: Anessa AD•A/AD•O (16 countries, operations + CI revenue loss, fleet benchmarks),
  SIMBA#biogas (ADM1 dynamic), NNFCC (UK; paid GGSS carbon calculator). Map: IEA BioGRAM (07/2026, potential
  and cost by region, no project economics).
- Human studies: ADEME funds feasibility studies up to ~70 % → our report is the step before paying for one.
Stronger: 33 countries with official prices (+ admin1), three routes, verdict + robustness, provenance per
parameter, EVPI, Monte Carlo, AgSTAR back-test, support kept separate. Weaker: biomethane offtake value (EU =
0.8 × business gas + 20 €/MWh judgement, no client input), no EU compliance-market value, pre-tax only, error bands narrower
than real plants scatter, no bank-format output (browser print only), one site at a time, CAPEX anchored on German plants.
How professionals get accuracy (and we cannot copy): lab BMP and metered quantities, supplier quotes, a grid
operator connection study, an offtake contract, an after-tax bank model. Our edge is to say which of these matters
for this project (EVPI) and re-run with each piece of evidence, so confidence rises as the client prepares.

## Roadmap (Impact × Accuracy gain × Client value × Competitive edge ÷ Complexity; audit 2026-10-31)

1. Done 2026-10-31: honest uncertainty (coupled prices, DM/VS and lab bands, stress-test wording, AgSTAR band) and
   the buyer's biomethane offer. 2. EU compliance value as support cases from legal texts (FR CPB, DE THG, NL ERE,
   UK RTFO).
3. Evidence loop: "what to verify first" turns into RFQ / sampling / grid-operator request templates; the client
   uploads results and the report re-runs with a higher evidence level. Main reason to pay.
4. Silage clamp and ensiling loss for stored feeds. 5. Bank pack (construction year, CIT, depreciation, equity IRR,
   yearly DSCR, reinvestment, residual value) as the top plan. 6. EU back-test and EU manure per head.
7. Injection and grid connection by country + operator quote input. 8. Portfolio / cross-country comparison.
Not a goal: ADM1 simulation, plant monitoring (Anessa's space), GIS potential maps (IEA BioGRAM is free).

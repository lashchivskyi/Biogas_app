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

## Market position (competitor audit 2026-10-31; re-check yearly)

No public tool combines official market data for many countries, route comparison, a verdict and
per-parameter provenance. Closest: Anessa AD•A (enterprise, sales-led, CI-focused), Luke Biogas tool
(FI, free, Chen–Hashimoto HRT kinetics, itemised parasitics, CSV/PDF), KTBL (DE, free, incl. existing
plants post-EEG), LFGcost-Web v3.6 (US landfill, after-tax, loan, credits, break-even price solver),
RETScreen (generic, Monte Carlo), Bioflux (free, 10 languages, scenario compare, no NPV/method).
Roadmap by Impact × Differentiation ÷ Complexity. Done 2026-10-31: absolute break-even (product price, max CAPEX,
feedstock €/t), supplier-quote check vs the model's own range and scope, XLSX export of the paid report.
Next, highest first:
1. Back-test on real plants (AgSTAR, DBFZ) and publish the error band on /methodology.
2. HRT-dependent yield (realisation is a fixed 0.85/0.90/0.95 today) and a size/config sweep
   (CHP kWe, upgrading Nm³/h, co-substrate share) to answer "what scale is optimal".
3. Existing-plant flow: keep CHP vs convert to biomethane vs flex (post-subsidy EU market).
4. Carbon case kept separate from the base verdict: CI (RED III defaults, CA-GREET Tier 1 logic) and
   credit value (LCFS, RIN D3, THG-Quote, GoO) with policy-risk haircut.
5. "Measure first" ranking: which lab test or quote moves the verdict most (value of information).
6. P10/P50/P90 Monte Carlo; 7. portfolio and cross-country comparison of one project;
8. after-tax/equity IRR (only if banks ask). Not a goal: dynamic ADM1 simulation.

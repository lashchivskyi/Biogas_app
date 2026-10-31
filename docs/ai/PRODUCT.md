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

## Market position (benchmark 2026-10-31; re-check yearly)

No public tool combines multi-country official market data, three routes, verdict and provenance.
Nearest rivals by group: free single-country screeners (KTBL, Méthasim FR, EPA/GMI AD Screening
Tool, LFGcost-Web, Luke FI, RETScreen generic); enterprise SaaS (Anessa AD•A: mass/energy, GHG,
finance, scenarios; sales-led price); process simulators (SIMBA#, BioWin: ADM1, no market data);
carbon calculators (CARB Tier 1, GREET, ABC Biogas CAT); Excel finance templates; consultants.
Gaps that matter most for paying clients, in order:
1. GHG / carbon intensity and its revenue (LCFS, RIN, RED III/GoO, ETS) as a separate case:
   for US/EU biomethane this is often the largest revenue line; today only a methane-loss check.
2. Back-test against real plants (AgSTAR database, DBFZ data) with a published error band.
3. Editable export (cash flow to Excel) and a bank-style case: equity IRR, debt sculpting, tax.
4. P10/P50/P90 (Monte Carlo) instead of three fixed scenarios.
5. Portfolio screening of many sites for developers.
Not a goal: dynamic ADM1 simulation (design stage, not screening).

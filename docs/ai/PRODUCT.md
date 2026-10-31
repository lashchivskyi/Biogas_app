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

Nobody else sells self-serve, multi-country screening with a verdict. Searched EN, DE, FR, IT, ES, PL, PT-BR, FI, UK.
- Free one-country agency/university tools, no verdict, data frozen: KTBL Wirtschaftlichkeitsrechner (DE, new
  plants; Preisstand 2025 but EEG choices end 2016) + Post-EEG-Rechner (existing plants); Luke Biogas Tool (FI, Excel
  v3 25.09.2026, ≤ 15 kt); AgSTAR AD Screening Tool, Penn State dairy/swine RNG tools (09/2025), WSU/USDA-ERS AD Budget
  Calculator (US, 2013 costs, 2018); LandGEM/LFGcost-Web (US landfill); ECLAC Methane Calculator (wastewater); IDAE
  BIOGEMIS (ES, GHG only); ATB Methanrechner, KWS calculator (yield only); BiogasWorld (≥ 30 kt). Generic: RETScreen
  Expert (CAD 869/yr), NREL CREST. Old/unclear: ADEME GAZdeFERME, INRAE Méthasim, SmallBIOGAS (AINIA), UniTo BP tool.
- Lead-gen calculators (Bioflux, GrowDiesel; Indian CBG e.g. PelletRates "plant ROI"): method not disclosed.
- Enterprise, sales-led: Anessa AD•A/AD•O (16 countries, "bankable ROI" + monitoring), SIMBA#biogas (ADM1), Mendelsohn
  (IT, Consorzio Biogas), NNFCC (UK). Map: IEA BioGRAM (07/2026, regional potential, no project economics).
- Human studies: ADEME funds up to ~70 % of a feasibility study → our report is the step before paying for one.

Same inputs through free tools (`scripts/benchmark.ts` re-runs the model against the recorded tool outputs; LandGEM
in `processes.test.ts`). Model ÷ tool, like-for-like scope; every gap > 15 % explained:
| Case → tool | Gas | Power | CAPEX | OPEX | Why the gap, who is right |
|---|---|---|---|---|---|
| de_nawaro → KTBL | 0.86 | 0.82 | 1.05 | 1.03 | KTBL uses its standard yield with no realisation (356 vs 340 L/kg VS, × 0.90): a well-run plant; our base is deliberately lower; our optimistic gas is 0.96 of KTBL. OPEX split differs (our labour 2.5×, repair 1.3×, supplies incl. plant power 0.3× KTBL's), totals agree. |
| dairy_400 in FI → Luke v3 | 1.00 BMP | 1.56 | 0.93 | 2.67 | Luke burns ≈ 25 % of the gas in a boiler to heat the digester and dumps 440 MWh of CHP heat (method flaw; CHP plants heat from the engine) and realises 82 % (Chen–Hashimoto, HRT 35 d) vs our 90 %. Luke OPEX: 0.5 h/d labour vs 500–750 h/a for 75 kW (IEE/DBFZ 2023) and 13 €/MWh CHP service vs ASUE-based 2.6 ct → Luke too low. Digester heat 1.16: 38 °C vs 35 °C. |
| us_dairy_rng → WSU | 0.78 | – | 1.03 CHP, 0.87 RNG | – | Same VS per cow (6.8 kg/d); WSU 0.23 m³/kg VS without realisation vs our 0.20 × 0.90. Our chain is checked on 79 US digesters (AgSTAR, median 0.94); WSU would sit ≈ 1.2 → WSU optimistic. RNG CAPEX: WSU $1.02 M (2013) injection point vs our 350 k€ LOW → we are likely low. |
| us_closed_landfill → LandGEM | 0.98 | – | – | – | Same first-order decay; mid-year placement vs LandGEM's sections = −2 % timing. |

Client jobs × who serves them × our position:
| Job | Who serves it today | Us |
|---|---|---|
| Is this worth a paid feasibility study? | consultants (paid, weeks); tools give numbers, no verdict | **edge**: verdict + robustness in minutes |
| How much gas/energy from my feedstock? | KTBL, Luke, AgSTAR, WSU, ATB, KWS (free) | parity; we add realisation and real-plant check |
| CHP, heat or biomethane? | Luke (manual split), WSU/KTBL (one route per run) | **edge**: three routes, one run, full energy balance |
| What does it earn at today's prices here? | one-country tools with frozen prices | **edge**: 33 countries, dated official prices, admin1 |
| What should I check first? | consultants | **edge**: EVPI + request templates |
| Subsidies / credits | KTBL (EEG ≤ 2016), WSU + Penn State (RIN/LCFS), Luke (FI grant) | partial: separate cases; no EU compliance value |
| Overwrite a cost line I know | Luke, KTBL, WSU (every line editable) | **gap**: one supplier total per route |
| Lender model, grid connection, GHG certificate | consultants, RETScreen, Anessa; grid operators; BIOGEMIS/NNFCC | **gap**: pre-tax, injection LOW, RED defaults only |
| Operate / optimise a running plant; regional potential | Anessa, KTBL Post-EEG; IEA BioGRAM | not a goal |

Proven differentiators (keep ≤ 3): (1) checked against real plants, not design values — AgSTAR back-test median 0.94
on 79 digesters; none of the four tools run publishes a back-test, and two of them (KTBL, WSU) read 18–28 % above us on
gas; (2) current dated prices for 33 countries — KTBL's tariff years end 2016, WSU prices are 2013/2018, Luke uses
Finnish 2023 costs, LandGEM has no economics; (3) one run compares all three routes with a closed energy balance, a
verdict and what to verify first — the tools need one run per route and leave the decision to the user (Luke's route
split even wastes CHP heat). Weaker: biomethane offtake value (EU judgement formula), no EU compliance-market value,
pre-tax only, no bank format, one site at a time, CAPEX anchored on German plants. Professionals get accuracy from
lab BMP, metered quantities, quotes, a grid study, an offtake contract and a bank model; our edge is to say which of
these matters here (EVPI) and re-run with each piece of evidence.

## Roadmap (Impact × Accuracy gain × Client value × Competitive edge ÷ Complexity; audit 2026-10-31)

1. Done 2026-10-31: honest uncertainty, buyer's biomethane offer, evidence requests ("how to check"), silage clamp
   and ensiling loss, EU dairy manure per head (IPCC) with a Danish per-tonne check.
2. EU compliance value as support cases from legal texts (FR CPB, DE THG, NL ERE, UK RTFO).
3. Next step of the evidence loop: upload of lab / quote documents and a visible evidence level per input.
4. Bank pack (construction year, CIT, depreciation, equity IRR, yearly DSCR, reinvestment, residual value).
5. Injection and grid connection by country + operator quote input (benchmark: WSU injection $1.02 M in 2013 $
   vs our 350 k€ LOW; RNG CAPEX 0.87 of WSU).
6. Line-item overrides (digester, storage, CHP/upgrader, labour h/a, service €/MWh) as USER_INPUT with evidence level;
   every free tool allows it. 7. OPEX split vs KTBL Preisstand 2025 (labour 857 h at 550 kW vs our ≈ 1 830 h, repair
   1.3×, supplies 0.3×; total within 3 %), no retune without a second source. 8. Portfolio / cross-country comparison.
Not a goal: ADM1 simulation, plant monitoring (Anessa's space), GIS potential maps (IEA BioGRAM is free).

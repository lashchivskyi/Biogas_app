# Product

## Mission

The client makes one decision: **whether to pay for a detailed feasibility study (€10–100 k and months
of work), and what to verify first.** A quality product therefore means three things:
1. it is rarely wrong about that decision (a false "go" wastes the study, a false "no" loses a project);
2. it shows its own uncertainty honestly (no claimed accuracy, freshness or expert review without proof);
3. it gives the client a concrete next step (what to check, whom to ask, what would change the answer).

Everything else (model, UI, pricing) serves this. Product decisions start from the client's decision,
not from the model; "ready" is measured against this mission, never asserted: `npm run scorecard` measures the
quality contract (items, thresholds and reasons in DECISIONS 2026-11-03; starting state in STATUS).

## Decision frames by segment (2026-11-03)

| Segment | Decision | Alternative | What convinces | False "yes" costs | False "no" costs | After the report |
|---|---|---|---|---|---|---|
| Dairy farm | build an on-farm digester (CHP / heat / biomethane); pay for a study | keep or cover the slurry store; deliver manure to a neighbour's or central plant; pool with neighbours [F] | collected manure, own power/heat use, a heat buyer, payback vs the farm's own target [A §7.2], operator hours, grants; AgSTAR screens from ≥ 500 milking cows unless co-substrates, odour or grants help [A §7.1] | the study (free scoping … > $100 k [A §7.0]); if built, farm debt on a plant that does not pay: poor planning is "the root cause for many failed" US digesters [A §7.0] | lost energy savings and methane cut; the neighbours' cluster forms without them | lab DM/VS/BMP, metered manure, ask neighbours (FNR step 8: more substrate or an operator group, then re-run [F]), utility/grid enquiry, grant check |
| Pig farm | same; often a covered store vs nothing | open store or lagoon; cover + flare for odour; deliver to a central plant; co-digest | scale and dilution decide: AgSTAR's floor is 2 000 finishing places, "most projects not viable until > 10 000" [A §7.1]; thin slurry (KTBL standard yields [K]) gives little gas per m³; a co-substrate with a gate fee | as dairy, plus a plant sized on head count while the collected slurry is thinner than assumed | missed co-digestion income; odour/ammonia pressure unsolved | measure slurry DM and collected volume; list co-substrates within ~15 km with gate fees |
| Food / drink processor | digest residues or wastewater on site, or keep paying disposal; often a vendor's build-own-operate offer | today's disposal (gate fee, sewer surcharge, feed sale); a third-party AD plant; aerobic treatment | avoided disposal €/t, year-round streams, process heat use, short payback (industrial hurdle), ABP/food-safety separation; "are you paying for disposal?" is AgSTAR's first economic question [A §7.1]; AD is the treatment of choice for food waste [I-FW] | capital and management time in a non-core asset; production risk | keep paying rising disposal; a Scope 1/2 lever lost | waste audit by month (mass, DM or COD), BMP tests, gate-fee and vendor quotes |
| Developer | which sites get development money (feedstock contracts, land, grid/gas request, permits) | other sites or countries in the pipeline; sell the project | the same method across sites and countries, feedstock in the radius, offtake price, connection distance, permit risk; 37 investors/developers plan €36 bn and > 1 200 plants in five years [E] → many sites to triage | development spend on a site that dies; studies, permits and licences add 10–15 % to the contractor's price [I-SS] | a good site taken by a competitor | feedstock letters of intent, grid/gas operator request, land option, full study for the top sites |
| Municipality / wastewater | digest sludge or biowaste (or upgrade) vs alternatives; procure a study | aerobic stabilisation, sludge incineration or export, composting, flaring landfill gas | compliance: plants ≥ 10 000 p.e. need energy audits and energy neutrality by 2045 (Directive (EU) 2024/3019); electricity autonomy 37 % below 10 000 PE, 68–100 % above 100 000 PE, upgrading worth assessing above 100 Nm³/h [I-WW]; life-cycle cost vs the alternative | public money and a procurement cycle; political cost | missed 2045 target and higher operating cost | energy audit, project in the investment plan, study tender written from the report, funding application |
| Investor / bank | does a developer's project deserve due diligence or a term sheet | other deals; decline | independent, dated numbers with a downside case, DSCR, NPV drivers and provenance; the bankable prospectus is the feasibility study's job [A §7.3], ours is a pre-tax screening | due-diligence fees; credit risk if a screening is read as bankable | a missed deal | ask the developer for the study, an independent engineer and a bank model; use "what to verify first" as the question list |

Sources: [A] EPA AgSTAR Project Development Handbook, 3rd ed., EPA 430-B-20-001, April 2020; [F] FNR Guide to Biogas,
5th ed. 2010 (French ed. 2013), ch. 11 Project realisation; [K] KTBL Faustzahlen Biogas, 3rd ed. 2013 and KTBL
Wirtschaftlichkeitsrechner (Preisstand 2025); [I-SS] IEA Bioenergy Task 37, Exploring the viability of small scale
anaerobic digesters in livestock farming, 2015; [I-WW] Task 37, Sustainable biogas production in municipal wastewater
treatment plants, 2015; [I-FW] Task 37, Food waste digestion, 2018; [E] EBA, 4th Biomethane Investment Outlook, July 2026.
What follows for the product: a false "yes" is the costly error in five of six segments (study, then a failing plant), so
STRONG must be rare on weak evidence (contract D1). Every "after" step is a measurement or a request, which is what
"what to verify first" and the request letters deliver. Gaps by segment: developers need cross-site comparison (roadmap 8),
banks an after-tax pack (roadmap 4), municipalities energy-neutrality accounting (not modelled).

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

- Willingness to pay at €160–390 per report, the tier split by country, and whether price should scale with plant size (proposal in DECISIONS 2026-11-02).
- The free verdict is trusted without a human expert; which evidence raises trust most.
- German-based CAPEX × country factor is adequate outside the EU (BR, IN, MX use single benchmarks).
- Inputs the client does not yet control (export price, operator wage, heat price, financing
  terms, vendor quotes) would improve accuracy enough to justify a longer form.
- Regional (admin1) market data matter enough beyond US, CA, BR, IN, MX, IT.

## EU market and validation evidence (2026-11-03; sources in DATA-SOURCES › validation)

- Size: Europe produced 22 bcm biogas + biomethane in 2024 (19 bcm EU-27), biomethane 5.2 bcm from 1 620 plants averaging 483 m³/h, ≈ 4×
  a CHP plant (EBA Statistical Report 2025). Pipeline: 37 investors/developers plan €36 bn and > 1 200 plants in five years (EBA, 7/2026).
- Price signal (ACER 2025): biomethane costs ≈ 61 €/MWh to make; manure biomethane with its certificate sold at ≈ 103 €/MWh, waste-based at
  ≈ 61, gas (TTF) at ≈ 38. Our EU price fits waste biomethane; manure biomethane is undervalued unless its compliance value is modelled.
- Validation by segment (2026-11-03; gas output, not money). Two-level accuracy: (1) no systematic bias per segment beyond ±15 %,
  (2) the single-project range shown honestly and narrowed by the client's measurements.
  | Segment | Evidence (open, dated) | Model ÷ real | Status |
  |---|---|---|---|
  | EU farms: manure + energy crops | Messprogramm III, 39 DE plants (2016–18, metered); SE 108 farm plants (2024) | 0.87 (p10–p90 0.73–0.95); 0.86 | confirmed, ≈ 13 % conservative |
  | US dairy | AgSTAR 79 digesters (self-reported, half nameplate) | median 1.05, scatter 0.5–2.7 | bias confirmed; per plant not checkable |
  | Biomethane farm plants FR | ODRÉ 547 sites 2025 (metered, no inputs) | 88 % inside the model spread | spread confirmed, level not |
  | Food/drink residues (stillage, fruit/veg, food waste, whey) | catalogue vs FNR/KTBL standard yields (3 fixed 2026-11-03) | — | values match primary sources; no real-plant check (no open plant-level data) |
  | Landfill gas | EPA LMOP 828 sites, 2022 measured collection | method 1.05; with AP-42 defaults 1.90; engines 0.80 | method confirmed; defaults too optimistic |
  | Wastewater, sewage sludge | no current open per-plant data | — | not validated |
  | Existing gas → power | LMOP 284 engine projects | 0.80 of datasheet efficiency | model too optimistic |
  | Other countries (UA, TR, BR, IN, MX, …) | none per plant | — | physics shared, not validated |
  Residue catalogue aligned to FNR/KTBL 2026-11-03 (stillage, brewer's grain, beet pulp); slaughter, fats, fish, POME have no open primary value.
- Grass silage, whole-crop cereal silage, grain and fresh beet added to the catalogue (2026-11-03); 8 of 53 measured plants still feed others.

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
| What would make it work? | consultants (weeks); tools: one manual re-run per idea | **edge**: levers tested on the client's own data, scenario lab (free); break-even per lever + action plan (paid) |
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

# Product

Who the client is, what decision we serve, market position and roadmap. Changes only when the product or the
market evidence changes; one-off research write-ups and unconfirmed findings do not belong here.

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
- Developers, consultants and plants after their tariff pay more and more often than farms; a "check the vendor's
  offer" input turns the main substitute into demand (test in beta interviews).

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
  Slaughter residues, fats, fish, POME and olive pomace have no open primary yield value (kept MEDIUM/LOW).

## Market position (competitor benchmark 2026-11-04 from primary sources; re-check yearly)

Nobody else sells self-serve, multi-country screening with a verdict (searched EN, DE, FR, IT, ES, PL, PT-BR, FI, UK).
"Time" = a first complete run by someone who has the data (our estimate, not measured); "inputs" = fields needed for a result.
| Reference | Who / price | Sectors | Countries · languages | Inputs · time | Accuracy evidence | Transparency | Free ↔ paid |
|---|---|---|---|---|---|---|---|
| KTBL Wirtschaftlichkeitsrechner | KTBL, free web | farm AD, CHP | DE · de | ~30 · 20 min | none published | standard yields, cost tables | all free |
| Luke Biogas Tool v3 (09/2026) | Luke, free Excel | farm AD ≤ 15 kt | FI · fi/en | ~40 · 30 min | none | open workbook | all free |
| EPA/GMI AD Screening Tool v2.2 (03/2022) | EPA, free Excel | manure, food, sludge, ~100 items | any · en (pt manual) | 3–10 · 10 min | **calibrated on > 100 EPA digesters** (IQR 0.40–0.73 of theoretical) | open; gas + GHG only, no money | all free |
| WSU/USDA-ERS AD Budget Calculator (2018) | WSU, free Excel | dairy AD, CHP/RNG | US · en | ~25 · 20 min | none; 2013 costs | open | all free |
| EPA LFGcost-Web v3.6 (09/2023) | EPA LMOP, free Excel | landfill gas: engine, turbine, boiler, RNG, CNG | US · en | ~10 · 15 min | none; 2013/2019 cost curves | open formulas | all free |
| EPA LandGEM | EPA, free Excel | landfill gas generation | any · en | ~6 · 10 min | method = AP-42 | open | all free |
| BiogasFlux (GrowDiesel, IN vendor; lead channel) | free now, paid tiers "planned", no price | biogas/CBG/RNG yield, revenue, payback | any (INR/USD/EUR/CNY) · 10 languages | ~6 · 2 min | none; **method not disclosed** | none | all free today (account to save) |
| RETScreen Expert | NRCan, CAD 869/yr (third-party copies of the NRCan price) | all energy projects | any · many languages | 50+ · hours | none biogas-specific | generic | viewer free, save/print paid |
| Anessa AD•A/AD•O/AD•M (operator SaaS) | sales-led, no public price | AD development → operations | 16 countries · en | data room · weeks | self-reported impact only | closed | none free |
| IEA BioGRAM (07/2026) | IEA, free map | regional potential + cost | world · en | area · 5 min | none per project | method note | all free; no project economics |
| Feasibility study (consultant) | ADEME 2025 eligible cost ≤ €100 k (diagnostic ≤ €50 k), 50–70 % funded; Thurgau CHF 8–12 k (2014); AgSTAR "free scoping … > $100 k" | any | local · local | site data · weeks–months | site-specific, bankable | report | all paid |
| **Methalytics** | free screening; €160–390 per report | 50+ feedstocks, gas streams, 3 routes | 33 · 25 | 6–30 · ≈ 5 min (U2 not yet measured) | AgSTAR, FNR MP III, SE, LMOP, ODRÉ back-tests (A1 RED, see STATUS) | all parameters with source on /methodology | verdict + levers free; HOW FAR / HOW SURE paid |

Same inputs through the free tools (`npx tsx scripts/benchmark.ts`, 10 cases × 6 tools; LandGEM in `processes.test.ts`). Model ÷ tool:
| Case → tool | Gas | Power | CAPEX | OPEX | Why the gap, who is right |
|---|---|---|---|---|---|
| de_nawaro → KTBL | 0.95 | 0.92 | 1.09 | 1.09 | KTBL standard yields = our catalogue (realisation 1.0 since 2026-11-03); OPEX split differs, totals agree. |
| dairy_400 in FI → Luke v3 | 0.99 BMP | 1.75 | 0.97 | 2.72 | Luke heats the digester with a gas boiler and dumps CHP heat (method flaw) and assumes 0.5 h/d labour, 13 €/MWh service → Luke too low. |
| us_dairy_rng → WSU | 0.86 | – | 1.07 CHP, 0.98 RNG | – | WSU 0.23 m³/kg VS design yield; our chain is back-tested on AgSTAR digesters. |
| us_closed_landfill → LandGEM | 0.98 | – | – | – | Same decay; −2 % timing convention. |
| dairy_400, ro_pig_complex, gb_food, it_whey → AD Screening Tool | 1.34, 0.87, 0.97, 0.68 vs its theoretical; 2.37, 1.53, 1.71, 1.21 vs its calibrated mid | – | – | – | Same VS. Yields agree for pig and food waste; dairy: AD-ST 148 m³/t VS (Ward et al.) vs our 200; whey: the example's lab BMP 340 vs AD-ST 550. Its calibration (40–73 % of theoretical, > 100 US digesters) also absorbs collection, downtime and flaring, which we model separately, so it is a scope gap, not proven bias. **Open A1 check**: re-run AD-ST on the AgSTAR back-test herds; if it lands nearer the metered gas than we do, our dairy yield or per-head VS is high. |
| us_closed_landfill → LFGcost-Web | – | 1.07 kWh/m³ CH4 | 0.77 engine; 0.58 RNG | 1.21 | Engine: LFGcost $1 300/kW + $1.35 M fixed (2013, ≥ 800 kW) vs our component sum; RNG: 342 cfm is below the tool's 1 000–6 000 cfm range, so its $6 M fixed term is extrapolated → not evidence. |
Competitor tools are a cross-check, never a calibration target (DECISIONS 2026-10-31).

Positioning, one sentence per segment (free alternative named; paid value must beat it):
- Dairy / pig farm: "Before you pay €10–100 k for a study, know in 5 minutes whether your herd and energy use can carry a digester at
  today's prices, and which three facts to measure first" (free alternative: KTBL/Luke/AD-ST give gas and cost, not a decision).
- Food / drink processor: "Find out whether digesting your residues beats today's disposal bill, with the break-even gate fee and the
  vendor questions to ask" (free: none for residues outside the US; vendors' own offers).
- Developer: "Triage sites in 33 countries with one dated method and a verdict per site, then spend development money on the best"
  (free: one-country tools, one route per run; gap: no portfolio view yet, roadmap 8).
- Municipality / wastewater / landfill: "See whether your sludge, biowaste or landfill gas pays for a study, with the gas already
  measured as the input" (free: LandGEM/LFGcost for US landfills, BioWATT for wastewater; gap: energy-neutrality accounting).
- Investor / bank: "An independent, sourced pre-tax screen with a downside case and a list of what the developer must prove"
  (free: nothing comparable; gap: not bankable, no after-tax pack, roadmap 4).

Paid value vs what is free elsewhere (2026-11-04): Excel export and line-item tables are NOT unique (Luke, WSU, AD-ST, LFGcost are
open workbooks, KTBL lists every cost line), and BiogasFlux gives yield, revenue and payback free in 10 languages. What nobody gives
free: (1) what to verify first ranked by value of information, with pre-filled request letters; (2) break-even per lever and the
order of action; (3) Monte Carlo + stress tests across three routes at dated local prices. The paid page and the pricing copy must lead
with these three, not with tables; a professional who owns KTBL buys (1)–(2) or nothing.

Proven differentiators (keep ≤ 3): (1) dated official prices for 33 countries — KTBL tariffs end 2016, WSU 2013/2018, LFGcost
2013/2019, Luke Finnish 2023; (2) one run compares three routes with a closed energy balance, a verdict and what to verify first; (3)
back-tested on several open real-plant sets with the result published on /methodology — no longer unique: AD-ST publishes a calibration
on > 100 digesters, so claim "checked against real plants in five datasets", never "the only one". Weaker: biomethane offtake value,
no EU compliance value, pre-tax only, one site at a time, CAPEX anchored on German plants, no line-item override (every free tool has it).

Wider market (2026-11-04; full write-up in the owner's Claude doc "Methalytics — міжнародне маркетингове дослідження"):
- The main substitute is not software but vendors'/EPCs' free feasibility offers; then free state tools and free neutral
  advisers (C.A.R.M.E.N. DE, ADBA UK, chambers FR), then a subsidised study. Channel hypothesis: be the advisers' tool.
- Decision flow (official/association counts): EU 1 975 biomethane plants mid-2026 (+327/yr); DE 9 315 CHP plants, many
  leaving the 20-year EEG tariff; USDA paused loan guarantees for new digesters 04–12/2026 (lenders need honest screening).
- Proposed position (owner to confirm, STATUS): "independent second opinion before a study or a vendor contract"; revenue
  from developers, consultants and plants after their tariff; farms stay the free top of the funnel; never sell leads to vendors.

## Roadmap (Impact × Accuracy gain × Client value × Competitive edge ÷ Complexity; audit 2026-10-31)

Numbers are stable ids referenced elsewhere; a done item is deleted, not renumbered.
2. EU compliance value as support cases from legal texts (FR CPB, DE THG, NL ERE, UK RTFO).
3. Next step of the evidence loop: upload of lab / quote documents and a visible evidence level per input.
4. Bank pack (construction year, CIT, depreciation, equity IRR, yearly DSCR, reinvestment, residual value).
5. Injection and grid connection by country + operator quote input (benchmark: WSU injection $1.02 M in 2013 $
   vs our 350 k€ LOW; RNG CAPEX 0.87 of WSU).
6. Line-item overrides (digester, storage, CHP/upgrader, labour h/a, service €/MWh) as USER_INPUT with evidence level;
   every free tool allows it. 7. OPEX split vs KTBL Preisstand 2025 (labour 857 h at 550 kW vs our ≈ 1 830 h, repair
   1.3×, supplies 0.3×; total within 3 %), no retune without a second source. 8. Portfolio / cross-country comparison.
Not a goal: ADM1 simulation, plant monitoring (Anessa's space), GIS potential maps (IEA BioGRAM is free).

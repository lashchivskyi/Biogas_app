---
name: sector-calibration
description: Raise Methalytics accuracy per sector and country with the transfer-validation architecture - official data, real-plant references, country adapters, national macro checks, key client inputs - and keep the sector x country evidence matrix honest. Use for "calibrate sector/cluster X", "validate against real plants", "transfer validation to country Y", or a run of the cards in cards.md.
---
## Architecture (what accuracy means here)
A result = 1 physics × 2 feedstock (sector) × 3 country × 4 project. Each layer has its own evidence:
1. **Physics** (CH₄ from VS × BMP, COD → CH₄, heat and power balances, engines): universal; validated where plants exist.
2. **Feedstock** (DM, VS, BMP, CH₄ %, N per stream): sector-specific, mostly country-independent; national values
   (e.g. manure per head) override the catalogue where an official source exists.
3. **Country adapters**: everything that differs physically or economically: climate (regional temperatures),
   animal/diet norms, typical technology, operation (availability, gas collected), altitude (engine derating),
   grid 50/60 Hz, prices, tariffs, FX, wages, CAPEX level, regulation. Each adapter = a parameter with an official source.
4. **Project**: client values override layers 2–3 (form → formToInput → validate → core → evidence register).

A validation found in one country transfers to another ONLY through layers 1–2 and ONLY if every layer-3 difference that
matters is an explicit sourced adapter. Money never transfers. A physical calibration changes every country: it needs a
mechanism, a primary source and a holdout, never a per-country fudge factor.

## Evidence status per sector × country (the matrix in `scripts/scorecard.ts`, derived, never hand-typed)
- **V · validated here**: local references, holdout within bounds, n ≥ 10 (or an official aggregate for the sector).
- **T · transferred**: same feedstock + technology validated elsewhere (V), every relevant adapter of this country is
  sourced (not LOW), and the country macro check is within 0.75–1.25. Scenario band widened by the LOW adapters' ranges.
- **D · data only**: data sourced, no validation and no valid transfer (different feedstock, technology or practice).
- **G · gap**: key data LOW or route unusable without client budgets.
Report V and T separately; never present T as V. Claims to clients follow the matrix.

## Declared bounds (do not change to pass; DECISIONS › Quality contract)
Gas/energy ±25 % for ≥ 80 % (AgSTAR 2020 §7.2) · CAPEX ±30 % for ≥ 70 % (A2), AACE class 5 −50…+100 % for ≥ 95 % (A3),
references ≥ 2024 · scenario band holds the real value in 70–90 % (R1/R2) · D1 = 0 STRONG on projects closed for
economic reasons · macro check: model ÷ official national production 0.75–1.25 (AMBER outside, never tuned per country).

## Procedure (one cluster per fresh session; read only the card and the files it names)
1. `git status`; read `docs/ai/DATA-SOURCES.md` (known sources and blocks: do not search them again) and the card.
2. Baseline: `npx tsx scripts/compare-scenarios.ts --save $TEMP/before.json`; `npm run scorecard -- --quick`.
3. **Data**: primary source per gap (official body, regulator, EUR-Lex/BREF, KTBL/FNR/DBFZ, IEA Bioenergy, EPA/EIA,
   national statistics, peer-reviewed, issuer filing): value | unit | basis (FM/TS/VS, biogas/CH₄, HHV/LHV, currency/year)
   | period | URL | geography. Stop rule: 3 targeted searches without a primary source → keep value, LOW, reason in
   `source`, one block line in DATA-SOURCES, move on.
4. **References**: inputs known before the outcome + measured output. Inclusion/exclusion rules fixed before any ratio,
   applied both ways; physics ceiling per row. Store `src/countries/data/<set>.json` (URL, period, scope per row), wire
   into `scripts/accuracy-references.ts` / `capex-references.ts`; split by stable id parity before looking; report holdout.
5. **Adapters**: for each country in the card, list the layer-3 differences that change gas or cost by > 5 % and check
   each has a sourced parameter; add missing ones (with tests) or mark the country D for this sector.
6. **Macro check** (where the card asks): official national biogas production by origin vs the model run on official
   national activity data (livestock, sludge, landfill); report the ratio per country, do not tune to it.
7. **Calibrate** only sourced physical parameters backed by the references; unexplained bias is reported. Never tune
   toward a positive verdict; support schemes stay out of the base verdict.
8. **Key client inputs**: the inputs with the highest EVPI for this sector (`measureFirst`, `core/uncertainty.ts`) must be
   reachable early in the calculator with a plain hint; texts in 25 languages (localization skill).
9. After: `--save $TEMP/after.json`, `--diff`; `npm test`, `npm run lint`, `npm run typecheck`, full `npm run scorecard`,
   `npm run build`. Every verdict change explained by its cause; D1 must not worsen.
10. **Independent review**: one subagent with `expert-review`, given the diff, this file and the card: opens sources,
    checks balances, override path, holdout honesty, V/T labels, D1, texts. Fix 🔥/⚡ before reporting.
11. docs/ai only through the gate: DATA-SOURCES (sources, blocks, cadence), STATUS (next step), DECISIONS (a rule changed).

## Token discipline
Fresh session per cluster · read by path, search before reading · research subagents only for independent countries or
source families, each returns ≤ 15 rows (value | unit/basis | period | URL | scope | confidence), no page dumps · use
script summaries (`--diff`, scorecard rows), not JSON.

## Report (Ukrainian, short)
1. Per sector: status before → after (✅ = V or T in its main countries, 🟡 = D, 🔴 = G), one line why.
2. Table: parameter | was | now | source (URL, period) | confidence | effect on gas/NPV.
3. References: set, n, holdout within bounds, median model ÷ real, excluded rows and rule.
4. Matrix change: cells that moved to V / T / D / G; macro-check ratios.
5. Verdict changes (39 × 33) with cause; D1, A1*, A2, R1 before → after.
6. Blocked sources, owner decisions, review findings and fixes; what was run and what was not.

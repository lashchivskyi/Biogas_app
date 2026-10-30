# Status

Updated 2026-10-31. Rewrite this file at the end of a task; keep it under 40 lines.

## Current state

- Model 0.6.0; data review date 2026-10-30. Tests, lint, typecheck, build pass.
- Market data: official sources for all 33 countries except the LOW items in DATA-SOURCES.md.
- Regional data: US (51), CA (13), BR (27), IN (34), MX (32), IT (7 price zones); cities carry admin1 codes.
- CAPEX recalibrated against DBFZ 2023; support schemes checked against legal texts.
- Methodology tab: USD display; country-table numeric widths include six decimal places and a non-shrinking confidence dot; original table layout retained.
- Data-confidence score is itemised (`confidence.factors`, client vs model) and explained in a
  report panel with points per missing input; the score formula and verdicts are unchanged.
- Reference examples (39): 9 strong, 11 possible, 9 weak, 6 too small, 4 insufficient. Most
  model a prepared client: lab DM/VS/BMP at catalogue-typical values, metered manure, reused storage.
- AI knowledge architecture: AGENTS.md + CLAUDE.md + docs/ai + rules + skills.

## Next (highest value first)

1. Client inputs that the model now takes from defaults: export price / PPA, operator wage,
   heat price and buyer, vendor CAPEX quote, loan rate and tenor, lab BMP.
2. Spain: gate biomethane grid injection for the Canary Islands (no gas grid; verify).
3. Kazakhstan gas ceilings and Canadian provincial gas from official texts (browser access).
4. Heat value in provinces/regions without a gas grid (oil/propane parity instead of gas).
5. Argentina and Kazakhstan regional electricity by distributor.

## Known weaknesses

- India: base CBG value is gas parity and CAPEX is high for small dung plants, so the Punjab
  cooperative stays weak; only the GOBARdhan support case changes it. Check Indian CAPEX at < 1 MW.
- Process examples with `basisDate` after the market-data date fall to INSUFFICIENT_DATA silently.

- Small manure-only plants: CAPEX 20–35 % above DBFZ (gas-tight storage assumed).
- Open digestate storage costed as concrete; earthen lagoons are cheaper.
- Model-side confidence deductions (price proxy −6, unvalidated CAPEX −8, scale −8) still count
  toward the verdict gate (LOW blocks STRONG); decide whether the gate should use client data only.
- Canada electricity is the 2025 Hydro-Québec comparison (2026 edition not published).

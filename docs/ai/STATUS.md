# Status

Updated 2026-10-30. Rewrite this file at the end of a task; keep it under 40 lines.

## Current state

- Model 0.6.0; data review date 2026-10-30. Tests, lint, typecheck, build pass.
- Market data: official sources for all 33 countries except the LOW items in DATA-SOURCES.md.
- Regional data: US (51), CA (13), BR (27), IN (34), MX (32), IT (7 price zones); cities carry admin1 codes.
- CAPEX recalibrated against DBFZ 2023; support schemes checked against legal texts.
- Methodology tab: every parameter dated; USD display mode.
- AI knowledge architecture: AGENTS.md + CLAUDE.md + docs/ai + rules + skills.

## Next (highest value first)

1. Client inputs that the model now takes from defaults: export price / PPA, operator wage,
   heat price and buyer, vendor CAPEX quote, loan rate and tenor, lab BMP.
2. Spain: gate biomethane grid injection for the Canary Islands (no gas grid; verify).
3. Kazakhstan gas ceilings and Canadian provincial gas from official texts (browser access).
4. Heat value in provinces/regions without a gas grid (oil/propane parity instead of gas).
5. Argentina and Kazakhstan regional electricity by distributor.

## Known weaknesses

- Small manure-only plants: CAPEX 20–35 % above DBFZ (gas-tight storage assumed).
- Open digestate storage costed as concrete; earthen lagoons are cheaper.
- Canada electricity is the 2025 Hydro-Québec comparison (2026 edition not published).

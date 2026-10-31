# Status

Updated 2026-10-31. Rewrite at the end of a task; keep under 40 lines.
## Current state

- Model 0.6.1; data review 2026-10-30. Tests (995), lint, typecheck, build pass.
- Market data: official sources for 33 countries except LOW items in DATA-SOURCES.md. Regional data: US, CA, BR,
  IN, MX, IT via admin1 codes. CAPEX recalibrated against DBFZ 2023; support schemes checked against legal texts.
- Stress tests 2026-10-31 (~300 cases) fixed storage, effluent, yield-as-built, grease, warm climates, unit slips,
  manure digestate return, haulage. Follow-ups: low-DM residues as effluent; operator time 22.5·kWe^0.72;
  optional client inputs (export/heat price, operator cost, loan); straw milling 66.6 kWh/t; weak-currency
  validation bounds; supplier quote replaces one route's CAPEX (scenarios still apply). Baseline 1 287 runs.
- Decision tools (2026-10-31, competitor audit items 1–3): break-even product price / max CAPEX / feedstock €/t,
  supplier-quote check with scope list, XLSX export on paid report and sample pages. compare-scenarios: 0 changes.
  Not yet seen in a browser; the calculator form has no new inputs (quote fields already existed).

## Next (highest value first)

1. Dilute streams use CSTR sizing in cool regions (HRT 25 d); UASB 650 €/m³ is judgement, only −20 % CAPEX.
   Needs a sourced UASB/lagoon €/m³ (none found twice).
2. Labour curve is checked against FNR 2008 (3–7 h/kWe) up to 1 MW only; above that and for waste plants with
   reception/pasteurisation it is extrapolated. DBFZ EEG-Monitoring 2023 Tab. 5-4 not retrievable by search.
3. Lipid share per fat-rich type (slaughter, fish, olive): not found. Try full texts: Hejnfelt & Angelidaki 2009,
   Biomass Bioenergy 33:1046; Alburquerque et al. 2004, Bioresour Technol 91:195 (Table 1). Whole-stream flag stays.
4. Straw: mill CAPEX, steam/alkali steps and a delivered straw price are not modelled (only milling kWh).
   Press quotes 130–150 €/t (Lower Saxony 2025) are not an accepted source; Zenodo "Straw supply costs for
   Germany NUTS3 2010–2020" might be.
5. Spain Canary injection gate; KZ gas ceilings; CA provincial gas; off-grid heat parity; AR/KZ regional power.

## Known weaknesses

- Judgement values (LOW): warm-climate 3-month store, `MANURE_RETURN_HAUL` 1.5, price plausibility bands.
- Biomethane price in RO, GR, RS, MD, BG, MX, TH, VN, TR is a LOW local estimate (0.40 €/Nm³).
- Catalogue yields ≈ KTBL reference (cattle slurry 209 vs 200 L CH₄/kg VS); not confirmed from Faustzahlen.
- Best route can be a boiler with no heat buyer when all routes lose (US/CA dairies); warned, but its
  sensitivities look odd (yield −20 % raises NPV because unsold gas only costs money).
- `dynamicPaybackYears` is undiscounted (not in the UI). India CBG = gas parity; Canada power 2025 edition.
- Model-side confidence deductions still lower the level (LOW blocks STRONG): decide if that stays.

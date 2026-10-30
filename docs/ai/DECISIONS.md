# Decisions

One line per decision: date — decision — why. Change a decision only with new evidence, and
replace the line rather than adding a contradicting one.

## Data

- 2026-10-30 — Market values come only from official/primary sources and the latest published
  period; no reachable official source → keep the value, confidence LOW, reason in the source text.
  — Third-party copies (news, brokers, mirrors) produced wrong numbers (KZ spot was 2× off).
- 2026-10-30 — Every parameter carries a date (publication or data period); judgement values
  carry the review date. — "Unknown" dates hid weak evidence from clients.
- 2026-10-30 — Source strings shown to clients are short: organisation, dataset/document, period, basis.
- 2026-10-30 — Regional market data via admin1 codes (GeoNames): preset regions and searched cities
  map to `US.WI`, `CA.10`, `BR.27`…; national value is the fallback. — Prices differ ×2–3 inside
  US, CA, BR, IN, MX.
- 2026-10-30 — Currencies without an ECB rate use the national central bank (NBU, NBM, NBK, BCRA,
  NBS); VND uses the State Bank of Vietnam cross rate, entered by hand (site blocks scripts).

## Model

- 2026-10-30 — CAPEX recalibrated to DBFZ/IEE 2023 German reference plants (CHP 2 400 €/kW at
  100 kW, storage 120 €/m³, gas system 120 €/(Nm³/h), upgrading 1.2 M€ at 250 Nm³/h). — Old values
  were partly too low while total storage was too high.
- 2026-10-30 — Only ~150 d (incl. digester) of digestate storage is gas-tight (TA Luft 2021);
  the rest of the closed season is open storage at half the cost.
- 2026-10-30 — Plant electricity use = max(3 kWh/t, 3.2 % of methane energy) ≈ 8 % of CHP output (DBFZ 2023).
- 2026-10-30 — CHP service cost scales with size (2.6 ct/kWh at 100 kW, exponent −0.32).
- 2026-10-30 — Feedstock-loss sensitivity keeps CAPEX as built (plant was sized for the base case).
- 2026-10-30 — Revenue lines under €0.5 are hidden in tables but still counted in totals.
- 2026-10-31 — Data-confidence score starts at 80 (`QUALITY_START`), so a screening never shows
  HIGH; every lost point is a `QualityFactor` owned by `client` or `model` (test: score = 80 − Σ).
  Streams with lab DM/VS/BMP no longer count toward the "low-confidence catalogue" deduction.

## Product

- 2026-10-30 — Keep country conditions as the existing table with six-decimal formatting.
  Fix numeric column widths and confidence-dot shrinking within the existing table width;
  do not replace it with cards or round values merely to make them fit.
- 2026-10-30 — Model computes in EUR; USD is a display conversion at one ECB rate, never
  per-country cross rates.
- 2026-10-30 — Support schemes: official legal text required for any modelled value; without it
  the scheme is described but not modelled (e.g. CZ biomethane auction prices).

## AI workflow

- 2026-10-30 — `AGENTS.md` is the single instruction file (Codex reads it, `CLAUDE.md` imports it),
  written in English to save tokens; replies to the owner stay in Ukrainian.
- 2026-10-30 — Knowledge lives in code, tests and four files in `docs/ai/`; no dated reports.

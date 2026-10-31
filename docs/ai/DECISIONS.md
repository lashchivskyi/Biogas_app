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
- 2026-10-31 — INSUFFICIENT_DATA is gated on client-owned points only (plus blocking caps: expired price,
  future/missing process basis); model-owned points still lower the level. — Complete forms in KZ/AR/UA/IN
  were told to "fill in" gaps that only the model's data had.
- 2026-10-31 — Unknown storage volume on a farm with own slurry = the existing store holds that slurry
  (Nitrates Directive closed-season duty); only its gas-tight cover is costed, with a warning. Explicit 0 is
  respected. — New storage for slurry the farm already stores made manure CAPEX 2× DBFZ.
- 2026-10-31 — Feeds with >50 % of VS from pure grease (`fat_dominant`: grease-trap fat, DAF sludge) cannot be
  STRONG: stable fat co-digestion is documented only up to ≈ 30 % of VS (Long et al. 2012).
- 2026-10-31 — Annual mean ≥ 20 °C: digestate store = `eng.storage_months_warm` (3 months, LOW judgement)
  instead of the German closed-season rule; dilute effluent ≤ 1 month everywhere. — A 6–9 month store was
  costed for sites with no spreading ban. Best route stays "highest NPV" even if it is a boiler with no heat
  buyer (switching to CHP made verdicts less honest on seasonal sites); a warning is shown instead.
- 2026-10-31 — Yield shortfall sensitivity keeps CAPEX as built, like feedstock loss. — Resizing made
  "yield −20 %" raise NPV.
- 2026-10-31 — Delivered manure's digestate goes back to the supplying farms (return leg, `MANURE_RETURN_HAUL`):
  no plant handling/export cost, no "imported nutrient" credit, no plant land need. — It was paid for twice
  (return haul + third-party export) and its fertiliser value, which the farms already had, was credited to the plant.
- 2026-10-31 — Entered prices outside plausibility bands are flagged as likely unit slips and force LOW confidence
  (client-owned), but are still used: off-grid diesel sites can genuinely pay 3× the national price.
- 2026-10-31 — Effluent-like streams (processing residue ≤ 6 % DM, plus the `dilute` flag) store digestate ≤ 1 month;
  the rule uses the stream's actual dry matter, not the type. — Whey and pot ale were costed with the 6–9 month
  spreading-ban store that vinasse already skipped. Threshold is judgement (LOW).
- 2026-10-31 — Operator time = 22.5·kWe^0.72 h/a (min 750), fitted to Walla & Schneeberger 2008 Table 2
  (620 / 1 164 / 1 978 h at 100 / 250 / 500 kWe). — The linear 5 h/kWe overstated labour above ~250 kWe.
- 2026-10-31 — Client-supplied export price, heat price, operator cost and loan terms replace the national estimate
  and are shown as USER_INPUT evidence; loan terms never enter NPV. Vendor CAPEX quote deliberately not added (route ambiguity).
- 2026-10-31 — Validation bounds on local-currency amounts are 1e8 per unit (1e15 for project budgets): they only
  guard against nonsense; plausibility is judged in EUR against national levels. — 1000 rejected VND prices.
- 2026-10-31 — Straw adds mechanical-milling electricity (66.6 kWh/t) to plant use; its CAPEX and other pretreatment stay
  warned, not modelled. Fat-rich types keep the whole-stream "fat" flag (no sourced lipid shares); only the wording changed.
- 2026-10-31 — A supplier CAPEX quote needs its technology (CHP / boiler / biomethane) and replaces only that route's CAPEX;
  conservative/optimistic multipliers (1.2 / 0.9) still apply; process inputs ignore it; > 2.5× from the model → unit-slip
  warning and LOW confidence. — One total for all three routes would have made biomethane look as cheap as a CHP plant.

- 2026-10-31 — Absolute break-even (max CAPEX, product value, feedstock €/t) uses the exact linear root from two
  runs: NPV is linear in CAPEX, main-product price and a per-tonne feedstock cost. Any non-linear term (tax with
  loss carry-forward, price-dependent sizing) must switch these to bisection. Covered by `break-even.test.ts`.
- 2026-10-31 — Supplier-quote position uses the model's own optimistic/conservative CAPEX for the same route as
  the band; no new judgement constant. The 2.5× unit-slip warning stays separate.

- 2026-10-31 — Yield realisation stays a fixed scenario factor (0.85/0.90/0.95): no authoritative per-substrate
  kinetic constants were found (first-order k values vary by test method); an HRT model would move every verdict
  without better evidence. Scale is answered by the plant-size table instead.
- 2026-10-31 — National manure per head lives in country profiles (`manure`); US dairy uses NRCS AWMFH ch. 4 /
  ASAE D384.2 because the AgSTAR back-test showed the EU-style catalogue at half of reported US output.
- 2026-10-31 — Climate case uses RED Annex VI default values only (no actual-value calculation, no carbon price);
  credits are valued only inside support cases with an official mechanism (US RIN/LCFS). Heat in CHP is allocated by
  the RED Carnot share at 150 °C.

- 2026-10-31 — Monte Carlo samples the existing scenario quantities independently (triangular: conservative /
  base / optimistic), Latin hypercube, fixed seed, 160 draws, chosen route only. No new ranges were invented; the
  asymmetric scenario spreads make the median NPV lower than the base case on purpose. It never changes the verdict.
- 2026-10-31 — "What to verify first" ranks by EVPI (build / no-build) over each input's own evidence range, three
  runs per input, NPV interpolated linearly; inputs the client supplied are not listed.

## Product

- 2026-10-30 — Keep country conditions as the existing table with six-decimal formatting.
  Fix numeric column widths and confidence-dot shrinking within the existing table width;
  do not replace it with cards or round values merely to make them fit.
- 2026-10-30 — Model computes in EUR; USD is a display conversion at one ECB rate, never
  per-country cross rates.
- 2026-10-30 — Support schemes: official legal text required for any modelled value; without it
  the scheme is described but not modelled (e.g. CZ biomethane auction prices).

- 2026-10-31 — Reference examples show prepared clients (lab analysis, metered manure, existing
  storage, sourced tipping fees/surcharges); each lever is named in the case text. No market or
  model parameter was changed for them. — Owner asked for more realistic, less pessimistic samples.

- 2026-10-31 — Excel export (in-browser XLSX, no dependency) is a paid-report feature: standard plan gets base
  case, CAPEX/OPEX and assumptions; full plan adds scenarios, routes, sensitivities, support cases. Not in the
  free calculator. Money in EUR with the FX row; labels follow the model language (en/uk).

## AI workflow

- 2026-10-30 — `AGENTS.md` is the single instruction file (Codex reads it, `CLAUDE.md` imports it),
  written in English to save tokens; replies to the owner stay in Ukrainian.
- 2026-10-30 — Knowledge lives in code, tests and four files in `docs/ai/`; no dated reports.

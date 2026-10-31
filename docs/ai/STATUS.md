# Status

Updated 2026-10-31. Rewrite at the end of a task; keep under 40 lines.
## Current state

- Model 0.6.1; data review 2026-10-30. Tests (1 015), lint, typecheck, build pass. Browser check pending
  (calculator field and report texts of 2026-10-31 not seen in a browser yet).
- Market data: official sources for 33 countries except LOW items (177 in `audit-sources`). Regional data: US, CA,
  BR, IN, MX, IT. CAPEX calibrated on DBFZ 2023; support schemes checked against legal texts.
- Audit 2026-10-31 (39 examples × 33 countries): CH₄, CAPEX/OPEX/revenue, electricity split and cash flows close.
- Done 2026-10-31 (audit items a, b): buyer's biomethane offer (local/MWh HHV) replaces the estimate; Monte Carlo
  couples energy and biomethane prices, adds catalogue DM × VS ±20 % and lab BMP ±8 %; report calls the
  conservative case a stress test, shows "> 99 %" instead of 100 % and the AgSTAR per-plant band (0.4–2.2×).
  compare-scenarios: 0 of 1 287 verdicts or NPVs moved. MC widened modestly (gb_food P10–P90 3.5 → 4.2 M€); it is
  still narrower than real plants scatter, because downtime and operating problems are not modelled — said in text.

## Next (highest value first) — ranking in PRODUCT.md › Roadmap

1. EU compliance value for biomethane as support cases from legal texts (FR CPB, DE THG, NL ERE, UK RTFO).
2. Evidence loop (RFQ / sampling / grid-operator templates, re-run with evidence). 3. Silage clamp + ensiling loss
   (KTBL ≈ 10–12 %, verify). 4. Bank pack: construction year, CIT + depreciation, equity IRR, yearly DSCR,
   reinvestment, residual value (55 of 520 positive cases have IRR < discount + 2.5 pp, all already conditional).
5. EU back-test; EU dairy VS per head (3.7 vs IPCC 5.1 kg/d). 6. Injection (350 k€, LOW) / grid connection by country.
- EVPI "yield" item still ignores catalogue DM/VS (only BMP range); include it when the lab-test line is reworked.
- Carried: UASB €/m³ judgement; labour > 1 MW extrapolated; lipid shares per fat-rich type; straw pretreatment;
  Spain Canary gate, KZ gas ceilings, CA provincial gas, AR/KZ regional power.

## Known weaknesses

- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL` 1.5, plausibility bands, discount λ = 0.6.
- Biomethane price LOW everywhere (EU formula; RO, GR, RS, MD, BG, MX, TH, VN, TR 0.40 €/Nm³ estimate).
- Only membrane upgrading; no propane/odorisation, injection fees, flexible-CHP premium.
- Boiler with no heat buyer can be "best" when all routes lose (warned). `dynamicPaybackYears` undiscounted.

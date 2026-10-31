# Status

Updated 2026-10-31. Rewrite at the end of a task; keep under 40 lines.
## Current state

- Model 0.6.1; data review 2026-10-30. Tests (1 017), lint, typecheck, build pass. Browser check pending for all
  2026-10-31 UI work (biomethane-offer field, risk texts, "how to check" request templates).
- Market data: official sources for 33 countries except LOW items (177 in `audit-sources`). Regional data: US, CA,
  BR, IN, MX, IT. CAPEX calibrated on DBFZ 2023; support schemes checked against legal texts.
- Done 2026-10-31: buyer's biomethane offer; honest Monte Carlo (coupled prices, DM/VS ±20 %, lab BMP ±8 %,
  stress-test wording, AgSTAR band); "how to check" per EVPI item with a pre-filled lab / supplier / buyer request
  (en, uk; other locales get English) and the field to enter the answer; ensiling loss (KTBL 8 / 9.3 / 12 % DM) and a
  clamp silo (60 €/m³ at 780 kg/m³) for energy crops; EU dairy cows at IPCC 2006 VS (W 5.1, E 4.5 kg/d) in 22
  profiles + UA. compare-scenarios: 8 verdict changes, all us_dairy_rng in European countries (up, more manure);
  de_nawaro −1.2 M€ (clamp + loss).
- EU check (Danish Energy Agency, "Biogas plants in Denmark and Mexico", plant-reported): model ÷ reported CH₄ per
  tonne 0.88 (Combigas, pie labels ambiguous), 0.90 (Kroghsminde, grass silage entered as maize), 0.61 (Madsen:
  7 % pretreated straw at untreated yield, 85 d HRT). Per-tonne only: it does not test manure per head.

## Next (highest value first) — ranking in PRODUCT.md › Roadmap

1. EU compliance value for biomethane as support cases from legal texts (FR CPB, DE THG, NL ERE, UK RTFO).
2. Maize-plant CAPEX vs the BMWK/IEE/DBFZ reference (Kurzfristanalyse 13.02.2024, Tab. 4-1: new 510 kW rated /
   1 135 kWe flexible NawaRo + slurry, 7 521 €/kW = 3.84 M€ in 2023, 4.34 M€ in 2026): model 4.70 M€ (+22 %), +41 % if
   the flexibility engine is added at the model's own curve; without the clamp (0.93 M€) +4…17 %. But total cost per
   kWh is 5–12 % BELOW the report's 31.5 ct (model OPEX 0.88 M€ is ≈ 20 % lower than implied). Report does not say
   whether silo and digestate storage are in the 7 521 €/kW → nothing retuned. Open: its scope (ask DBFZ/IEE).
3. Bank pack: construction year, CIT + depreciation, equity IRR, yearly DSCR, reinvestment, residual value.
4. Straw pretreatment yield (Madsen gap); grass silage type; other cattle / swine VS vs IPCC (swine back-test 0.80
   argues against IPCC 0.30 kg/d). 5. Injection (350 k€, LOW) / grid connection by country. 6. Request templates in
   more languages. EVPI "yield" item ignores catalogue DM/VS.
- Carried: UASB €/m³; labour > 1 MW extrapolated; lipid shares; Canary gate, KZ gas ceilings, CA provincial gas,
  AR/KZ regional power; Canada dairy still on the catalogue (IPCC N. America 5.4).

## Known weaknesses

- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL` 1.5, plausibility bands, discount λ = 0.6.
- Biomethane price LOW everywhere (EU formula; RO, GR, RS, MD, BG, MX, TH, VN, TR 0.40 €/Nm³ estimate).
- Only membrane upgrading; no propane/odorisation, injection fees, flexible-CHP premium.
- Boiler with no heat buyer can be "best" when all routes lose (warned). `dynamicPaybackYears` undiscounted.

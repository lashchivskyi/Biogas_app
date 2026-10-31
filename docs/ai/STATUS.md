# Status

Updated 2026-10-31 (evening). Rewrite at the end of a task; keep under 40 lines.
## Current state

- Model 0.6.1; data review 2026-10-30. Tests (1 069), lint, typecheck, build pass. Browser check pending for all
  2026-10-31 UI work (biomethane-offer field, risk texts, "how to check" request templates).
- Market data: official sources for 33 countries except LOW items (177 in `audit-sources`). Regional data: US, CA,
  BR, IN, MX, IT. CAPEX calibrated on DBFZ 2023; support schemes checked against legal texts.
- Done 2026-10-31: buyer's biomethane offer; honest Monte Carlo; EVPI requests; ensiling loss + clamp silo; gas streams.
- Lender-style finance audit 2026-10-31: 3 examples recomputed by hand = code; `finance-audit.test.ts` (50 tests);
  discounted payback; discount-rate ±pp sensitivity; "pre-tax, nominal EUR, not bankable" in UI, export, methodology.

## Next (highest value first) — ranking in PRODUCT.md › Roadmap

1. EU compliance value for biomethane as support cases from legal texts (FR CPB, DE THG, NL ERE, UK RTFO).
2. Maize-plant CAPEX vs the BMWK/IEE/DBFZ reference (Kurzfristanalyse 13.02.2024, Tab. 4-1: new 510 kW rated /
   1 135 kWe flexible NawaRo + slurry, 7 521 €/kW = 3.84 M€ in 2023, 4.34 M€ in 2026): model 4.70 M€ (+22 %), +41 % if
   the flexibility engine is added at the model's own curve; without the clamp (0.93 M€) +4…17 %. But total cost per
   kWh is 5–12 % BELOW the report's 31.5 ct (model OPEX 0.88 M€ is ≈ 20 % lower than implied). Report does not say
   whether silo and digestate storage are in the 7 521 €/kW → nothing retuned. Open: its scope (ask DBFZ/IEE).
3. Bank pack: construction year + IDC, CIT + depreciation (then after-tax WACC), equity IRR, yearly DSCR,
   reinvestment, residual value. Landfill/process budgets: confirm scope vs model gas system with a real quote.
4. Straw pretreatment yield (Madsen gap); grass silage type; other cattle / swine VS vs IPCC (swine back-test 0.80
   argues against IPCC 0.30 kg/d). 5. Injection (350 k€, LOW) / grid connection by country. 6. Request templates in
   more languages. EVPI "yield" item ignores catalogue DM/VS.
- Carried: UASB €/m³; labour > 1 MW extrapolated; lipid shares; Canary gate, KZ gas ceilings, CA provincial gas,
  AR/KZ regional power; Canada dairy still on the catalogue (IPCC N. America 5.4).

## Known weaknesses

- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL` 1.5, plausibility bands, discount λ = 0.6.
- Biomethane price LOW everywhere (EU formula; RO, GR, RS, MD, BG, MX, TH, VN, TR 0.40 €/Nm³ estimate).
- Only membrane upgrading; no propane/odorisation, injection fees, flexible-CHP premium.
- Boiler with no heat buyer can be "best" when all routes lose (warned). Discount base 6 % may be after-tax (see DECISIONS).
- Gas streams (`process`) get no support cases; PL FIT is CPI-indexed but modelled flat (conservative).

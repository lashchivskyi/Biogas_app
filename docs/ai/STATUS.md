# Status

Updated 2026-11-01. Rewrite at the end of a task; keep under 40 lines.
## Current state

- Model 0.6.1; data review 2026-10-30. Tests (1 378), lint, typecheck, build pass.
- UX audit 2026-10-31 (Chrome, prod build, demo payments; en/uk/de, desktop+390 px; axe WCAG 2.2 AA, Lighthouse): fixed CLS
  (skeleton heights), contrast, DE/NL/FI mobile overflow, report re-render on client, three.js loaded late, font preload,
  scroll-region focus, 24 px footer targets. Lighthouse after: desktop 99/100/100/100; mobile a11y/SEO 100, perf home/pricing
  ≈ 89–91, calculator/report ≈ 79 (model bundle ≈ 135 kB gz at hydration). Not tested: real Stripe test, real email.
- Offer audit 2026-11-01: pricing lists = report content; gas-stream reports got residues, methane, break-even, "if eligible"
  support; free/paid boundary, INSUFFICIENT_DATA not sold, withdrawal waiver, VAT note, no "Feasibility" in names
  (DECISIONS). Prices unchanged; plans independent, no upgrade (owner). NOT browser-tested.
- UX follow-up 2026-11-01: INSUFFICIENT_DATA lists minimum fields; failed payment reopens checkout; localised errors; no dark theme.
- Market data: official sources for 33 countries except LOW items (177 in `audit-sources`). Regional data: US, CA,
  BR, IN, MX, IT. CAPEX calibrated on DBFZ 2023; support schemes checked against legal texts.
- Competitor benchmark (PRODUCT.md › Market): 4 examples vs KTBL, Luke v3, WSU, LandGEM; gaps > 15 % explained, nothing retuned (`scripts/benchmark.ts`).
- Scenario sweep (`scenario-matrix.ts`, `scenario-sweep.test.ts`, `properties.test.ts`, `hostile-input.test.ts`): 13 464 assessments,
  0 throws/NaN, balances close (`MATRIX=full`, ≈ 8 min). Report consistency (`report-consistency.test.ts`): 30 reports, 0 contradictions.
  One plant per project. Open: purchased energy at the "optimistic" price → 54 of 1 287 cases unordered.
## Next (highest value first) — ranking in PRODUCT.md › Roadmap

1. EU compliance value for biomethane as support cases from legal texts (FR CPB, DE THG, NL ERE, UK RTFO).
2. Maize-plant CAPEX vs BMWK/IEE/DBFZ Kurzfristanalyse 13.02.2024 Tab. 4-1 (7 521 €/kW → 4.34 M€ in 2026): model 4.70 M€
   (+22 %; +41 % with flex engine; +4…17 % without clamp), yet cost/kWh 5–12 % below its 31.5 ct (model OPEX ≈ 20 % lower).
   Silo/digestate storage scope unknown → nothing retuned; ask DBFZ/IEE.
3. Bank pack: construction year + IDC, CIT + depreciation (then after-tax WACC), equity IRR, yearly DSCR,
   reinvestment, residual value. Landfill/process budgets: confirm scope vs model gas system with a real quote.
4. Straw pretreatment yield (Madsen gap); grass silage type; other cattle / swine VS vs IPCC (swine back-test 0.80
   argues against IPCC 0.30 kg/d). 5. Injection (350 k€ LOW; WSU $1.02 M 2013) / grid connection by country.
   6. Line-item cost overrides; request templates in more languages; EVPI "yield" ignores catalogue DM/VS.
- Carried: UASB €/m³; labour > 1 MW; lipid shares; Canary gate; KZ/CA gas; AR/KZ power; CA dairy VS.
## Known weaknesses
- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL` 1.5, plausibility bands, discount λ = 0.6.
- Biomethane price LOW everywhere (EU formula; RO, GR, RS, MD, BG, MX, TH, VN, TR 0.40 €/Nm³ estimate).
- Only membrane upgrading; no odorisation, injection fees, flexible-CHP premium. Gas-stream support: "if eligible" only.
- Boiler with no heat buyer can be "best" when all routes lose (warned). Discount base 6 % may be after-tax (DECISIONS). PL FIT modelled flat.
- Security review 2026-11-01: 0 critical/high in code (npm audit prod 0). Open before launch, owner decides: seller entity + VAT/OSS
  (Stripe Tax), full privacy policy + imprint page (terms §8 is one sentence and omits Vercel/DB/Resend/Sentry), retention
  of orders/leads and report-link lifetime, DPAs, durable rate limit (WAF/Redis; in-memory is per instance), nonce CSP.

# Status — 2026-11-04. Current state and next steps only; overwrite, ≤ 40 lines, no history.

## Quality scorecard (`npm run scorecard`; contract in DECISIONS › Quality contract)
- 42 items: GREEN 19 · AMBER 6 · RED 12 · GREY 5.
- RED: A1 AgSTAR 39 % of 41 read values (38 nameplate × 8 760 h rows left out), like for like 50 % of 22, median 1.02; A1l
  landfill 1.26; A1f IT biowaste AD-only 7/9, median 0.82; A2 7/11 (model above budgets, median 1.18), A3 10/11 (BR 180 Nm³/h, feed unknown, 3.0×); R1/R2 bands; I2 54 unordered; P1/P2; U4; S1.
- AMBER: D2 one-sided (1 'go' on own economics: AA Dairy → WEAK); A1s 0.90; R3 ODRÉ 86 % (proxy); P3/U3 stale. GREY: U1/U2, C1, Re2.

## Current state
- Model 0.6.1; data review 2026-10-30. NOT deployed: methalytics.com has no DNS (NXDOMAIN).
- Open audit findings (2026-11-02): verdict reasons in € while cards may show USD; "Market data require review" lists raw
  IDs; export price 0 = blank; price-slip flag cannot be confirmed with an invoice; tenor rounded to years; el header chip
  wraps at 360 px.
- L10n: 25 languages, machine QA + MQM, NO native review; names not yet rewritten natively. Legal: `docs/legal/LAWYER-BRIEF.md`.

## Launch readiness
- RED (owner unless noted): 1 domain + Vercel prod + Postgres PITR; 2 Resend SPF/DKIM/DMARC; 3 staging + Stripe test;
  4 alerts + uptime; 5 restore drill; 6 Stripe test payment end to end; 7 k6 load test (Claude after 3); 8 privacy text
  incl. funnel event log (LAWYER-BRIEF §3.4); 9 browser error reporting (Claude); 10 Resend bounce webhook (Claude);
  11 Search Console; 12 legal. AMBER: access logs hold report URLs.
- Go/No-Go: closed beta GO with limits (staging, beta terms, Stripe test mode, free reports, 3–5 countries, en/uk); public
  launch NO-GO until RED 1–12 closed, D1/D2 green (≥ 8 blind beta cases) and ≥ 3 paid at list price.

## Owner decisions open
- Position "independent second opinion before a study or a vendor contract" and beta countries UA, IT, DE, PL (PRODUCT › Wider market).
- Stripe product name language (DECISIONS › Product). Pricing revisit after ≥ 3 paid.

## Next work (highest value first; each moves a scorecard item)
0. Beta: 20 interviews (developers, consultants/chambers, plants after tariff, food processors) with Van Westendorp; owner
   runs Google Trends + Keyword Planner by hand; then build ONE of: vendor-offer check → existing-plant decision → portfolio.
1. A1: re-run AD Screening Tool on the AgSTAR back-test herds; open why US lagoons read 1.54 (solids separation? partial herd?).
2. A1l: annual waste by year (or LandGEM import); k by precipitation (AP-42).
3. A2: realised (not budget) costs ≥ 2024; LWK storage 1.60 (FNR III economic sheets are 2016/17 costs: too old for A2).
4. D2: ≥ 3 'go' on own economics (blind beta); support-dependent 'go' need the scheme of their year to be judged.
5. P1/P2 hydration. 6. I2 scenarios. 7. S1 MFA. 8. Sourced ≥ 2024 UASB/lagoon/LFG CAPEX-OPEX (else client budgets).

## Known weaknesses
- Not validated at plant level: wastewater/sludge, food and drink residues (IT municipal biowaste only, fresh mass), countries other than US/DE (FR, SE aggregates only).
- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL`, plausibility bands, λ = 0.6, gas-grid 2 km, advisor
  assumptions; biomethane GO premium outside FR/NL; biomethane price outside the EU.

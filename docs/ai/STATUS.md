# Status — 2026-11-04. Current state and next steps only; overwrite, ≤ 40 lines, no history.

## Quality scorecard (`npm run scorecard`; contract in DECISIONS › Quality contract)
- 40 items: GREEN 19 · AMBER 5 · RED 11 · GREY 5.
- RED: A1 AgSTAR 37 % all / 53 % like for like (median 0.95; misses = downtime, lagoons, co-digestion); A1l landfill 1.26
  (uniform-deposition input); A2 4/6 (n = 6); R1/R2 band diagnostics; I2 54 unordered scenarios; I7 4 stale; P1/P2; U4; S1.
- AMBER: D2 one-sided; A1s Sweden 0.90 (aggregate); R3 ODRÉ 86 % (proxy); P3/U3 stale browser evidence. GREY: U1/U2, C1, Re2.

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
2. A1l: landfill input of annual waste by year (or LandGEM import); split k by precipitation (AP-42).
3. A2: storage cost (LWK "new storage" 1.60 incl. TA Luft gas-tight store); more primary plant costs ≥ 2024 with scope.
4. D2: documented "go" cases + blind beta into `realityCases`. 5. P1/P2 sample report and calculator hydration.
6. I2 scenario redesign. 7. S1 admin throttling + MFA. 8. I7 UA grid factor, BR/IN CAPEX.

## Known weaknesses
- Not validated at plant level: wastewater/sludge, food and drink residues, countries other than US/DE (FR, SE aggregates only).
- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL`, plausibility bands, λ = 0.6, gas-grid 2 km, advisor
  assumptions; biomethane price LOW everywhere.

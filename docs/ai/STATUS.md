# Status — updated 2026-11-04. Rewrite at the end of a task; keep under 40 lines.
## Quality scorecard 2026-11-04 (`npm run scorecard`; contract: DECISIONS 2026-11-03)
- 40 items: GREEN 19 · AMBER 5 · RED 11 · GREY 5. Round 4 (accuracy root causes, DECISIONS 2026-11-04): A1g RED → GREEN (landfill engines
  0.99, out of sample 0.99); A1l 1.89 → 1.26 (still RED); U4 139 → 137; Re1 now includes ≥ 2 000 synthetic variations.
- "How accurate we are" on /methodology: n, median, p10–p90, share within ±25 %, distribution strip, source per set, from
  `src/countries/data/accuracy-summary.json` (`npx tsx scripts/accuracy.ts --write`; `accuracy.test.ts` fails on drift).
- RED: A1 AgSTAR 37 % all / 53 % like for like (40 plants, median 0.95; misses = downtime, lagoons, co-digestion); A1l 1.26 (uniform-deposition
  input, p10–p90 0.65–3.90); A2 4/6 (LWK storage, n = 6); R1/R2 band diagnostics; I2 54 unordered scenarios; I7 4 stale; P1/P2; U4; S1.
- AMBER: D2 one-sided; A1s Sweden 0.90 (aggregate); R3 ODRÉ 86 % (proxy); P3/U3 stale browser evidence. GREY: U1/U2, C1, Re2.
## Current state
- Model 0.6.1; data review 2026-10-30. NOT deployed: methalytics.com has no DNS (NXDOMAIN).
- Model changes 2026-11-04: landfill-gas engines × 0.80 of datasheet (EPA LMOP, 284 projects); landfill methane-recovery guidance 50 %
  (was 60 %; air dilution) in 25 locales + us_closed_landfill example → 14 of 1 287 verdicts (that example, POSSIBLE → WEAK). Source audit
  vs 065f9e3: beet pulp, solid manure, whole-crop high, dairy VS (IPCC 2019) corrected → 2 verdicts; Sweden 0.90 (DECISIONS 2026-11-04).
- Audits 2026-11-02: open — verdict reasons in € while cards may show USD; "Market data require review" lists raw IDs; export price 0
  = blank; price-slip flag cannot be confirmed with an invoice; tenor rounded to whole years; el header chip wraps at 360 px.
- L10n: 25 languages, machine QA + MQM; NO native review (incl. the new accuracy section). Legal: `docs/legal/LAWYER-BRIEF.md`.
## Launch readiness 2026-11-01
- RED (owner unless noted): 1 domain + Vercel prod + Postgres PITR; 2 Resend SPF/DKIM/DMARC; 3 staging + Stripe test; 4 alerts + uptime;
  5 restore drill; 6 Stripe test payment end to end; 7 k6 load test (Claude after 3); 8 analytics + privacy text; 9 browser error
  reporting (Claude); 10 Resend bounce webhook (Claude); 11 Search Console; 12 legal. AMBER: access logs hold report URLs.
- Go/No-Go: closed beta GO with limits (staging, beta terms, Stripe test mode, free reports, 3–5 countries, en/uk); public launch NO-GO
  until RED 1–12 closed, scorecard D1/D2 green (≥ 8 blind beta cases) and ≥ 3 paid at list price.
## Next work (highest value first; each moves a scorecard item)
1. A1/R1: pig VS and lagoon temperature checked on primary sources (no change, DECISIONS 2026-11-04); open: why US lagoons
   read 1.54 (solids separation? partial herd?) and US swine per place (needs metered farms, sows split).
2. A1l: landfill input of annual waste by year (or LandGEM import) instead of uniform deposition; split k by precipitation (AP-42).
3. A2: storage cost (LWK "new storage" 1.60: 0.64 M€ storage incl. TA Luft 150-day gas-tight store vs a ≈ 2014 concept); more primary
   plant costs ≥ 2024 with stated scope. 4. D2: documented "go" cases + blind beta into `realityCases`.
5. P1/P2: sample report and calculator hydration. 6. I2 scenario redesign. 7. S1 admin throttling + MFA. 8. I7 UA grid factor, BR/IN CAPEX.
## Known weaknesses
- Not validated at plant level: wastewater/sludge, food and drink residues, countries other than US/DE (FR, SE only aggregates).
- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL`, plausibility bands, λ = 0.6, gas-grid 2 km, advisor assumptions; biomethane price LOW.

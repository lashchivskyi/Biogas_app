# Status — updated 2026-11-03. Rewrite at the end of a task; keep under 40 lines.
## Quality scorecard 2026-11-03, round 2 (`npm run scorecard`; contract: DECISIONS 2026-11-03)
- 37 items: GREEN 19 · AMBER 2 · RED 11 · GREY 5 (start: 15 · 2 · 9 · 7 of 33). Model results unchanged (compare-scenarios 0 / 1 287).
- Moved to green: D1 0 STRONG of 10 AgSTAR economic closures; R1b real-plant range covers 78 % (leave-one-out); I5 dead fields removed;
  U3 axe 0 + keyboard self-check pass (fixed focus under the fixed header); payback text "> 25 yr" (fixed 54 hidden text/tile mismatches).
- RED: A1 energy ±25 % 34 % (38/79 AgSTAR rows are nameplate × 8 760 h; still 34 % without them); R1 scenario band 19 % (diagnostic);
  A2 CAPEX ±30 % 67 % (4/6, median 1.15; only primary references kept, n too small; LWK new-storage 1.75); R2 33 %; I2 54 unordered scenarios (all negative-EBITDA plants; needs scenario redesign); I7 4 stale (UA grid factor, BR/IN CAPEX);
  P1 applied-throttling LCP 2.95 s on the sample report (calculator 1.9 s; simulated 3.5–6.6 s); P2 TBT up to 1.0 s (sample report,
  uk calculator: hydration of the full report); U4 139 l10n; S1 ASVS self-assessment 19/24 (fails 2.2.1, 3.1.1, 4.3.1).
- AMBER: D2 one-sided (no documented "go" cases). GREY: U1/U2 usability, C1 Stripe end to end, Re2 restore drill.
- Europe (round 3): manure per head stays IPCC 2006 everywhere (a floor); the DK Normtal swap was reverted (ex-storage volume). ODRÉ FR: 88 % of 547
  agri sites inside the model spread (R3 AMBER, plan basis undefined). SE official farm plants 168 kWh/t vs model 130 (A1s AMBER 0.77, feed
  9.3 % DM ⇒ ≈ 6 % solid). A1e Messprogramm III: 39 plants median 0.87, 87 % within ±25 % (GREEN, after realisation 1.0); grass/GPS/grain/beet now in the catalogue.
  DBFZ: upgrader use ≈ 0.82 vs model 0.91. Source survey: DATA-SOURCES.md.
## Current state
- Model 0.6.1; data review 2026-10-30. NOT deployed: methalytics.com has no DNS (NXDOMAIN).
- Audits 2026-11-02 (rules in DECISIONS): calculator = sample pages for 39 examples; every client deduction closable by a field.
  Open: verdict reasons in € while cards may show USD; "Market data require review" lists raw parameter IDs; export price 0 = blank;
  price-slip flag cannot be confirmed with an invoice; tenor silently rounded to whole years; el header chip wraps at 360 px.
- Market data: official sources for 33 countries except LOW items (`audit-sources`). Benchmarks vs KTBL, Luke, WSU, LandGEM (PRODUCT).
- L10n: 25 languages, machine QA + MQM; NO native review. Open: English parameter-register texts (owner), process-flow labels.
  Legal: `docs/legal/LAWYER-BRIEF.md`. Security review 2026-11-01: 0 critical/high (not an ASVS audit).
## Launch readiness 2026-11-01
- GREEN: logs + Sentry envelope, payment alerts, cron re-sends stuck links, `/api/health`, config gate, hreflang, sitemap, robots, CI + Vercel.
- RED (owner unless noted): 1 domain + Vercel prod + Postgres PITR; 2 Resend SPF/DKIM/DMARC; 3 staging + Stripe test; 4 alerts + uptime;
  5 restore drill; 6 Stripe test payment end to end; 7 k6 load test (Claude after 3); 8 analytics + privacy text; 9 browser error
  reporting (Claude); 10 Resend bounce webhook (Claude); 11 Search Console; 12 legal. AMBER: access logs hold report URLs (short retention).
- Go/No-Go: closed beta GO with limits (staging, beta terms, Stripe test mode, free reports, 3–5 countries, en/uk); public launch NO-GO
  until RED 1–12 closed, scorecard D1/D2 green (≥ 8 blind beta cases) and ≥ 3 paid at list price.
## Next work (highest value first; each moves a scorecard item)
1. Residues: catalogue aligned to FNR/KTBL (3 values, 1 verdict); no real-plant check exists;
   plant-level residue data needed (beta processors). 1b. Landfill/existing gas (LMOP): collection guidance 60 % applied; engines 0.80
   of datasheet → owner: engine derate for gas streams? Wastewater: no open data. Realisation 1.0 applied 2026-11-03 (DE 0.87, SE 0.86). 1b. P1/P2: sample report and calculator hydration (630 kB HTML, TBT ≈ 1 s on a slow phone): server-only report sections.
2. D2: documented "go" cases (published studies or operators with economics) + blind beta into `realityCases`.
3. I2: scenario redesign for loss-making plants. 4. S1: admin login throttling + MFA; token-in-URL accepted risk to the owner.
5. A2: more primary plant costs ≥ 2024 with stated scope (DBFZ, KTBL, agencies; n = 6 now); storage cost of the LWK case.
6. I7: official UA grid factor; BR/IN CAPEX. 7. Product: pricing, EU compliance value, bank pack.
## Known weaknesses
- Pulp & paper, starch, food-manufacturer sectors: reference examples without budgets ("—" for money). Only membrane upgrading.
- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL`, plausibility bands, λ = 0.6, gas-grid 2 km, advisor assumptions; biomethane price LOW.

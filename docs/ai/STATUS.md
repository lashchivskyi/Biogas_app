# Status — updated 2026-11-02. Rewrite at the end of a task; keep under 40 lines.
## Current state
- Model 0.6.1; data review 2026-10-30. NOT deployed: methalytics.com has no DNS (NXDOMAIN).
- Logic audit 2026-11-02 (rules in DECISIONS): calculator equals the sample pages for all 39 examples; sweep 0 verdict / 0 NPV changes in
  the core, via the form +3 STRONG, +45 MEDIUM. Open: verdict reasons show € while cards may show USD; "Market data require review" lists
  raw parameter IDs; export price 0 = blank (only "no grid" models unpaid export).
- Quality audit 2026-11-02 (rules in DECISIONS): every client deduction is closable by a form field (0 client factors left with all fields
  filled). Open: price-slip flag cannot be "confirmed with an invoice" (a genuine offer > 3× national, e.g. US RNG with attributes, stays LOW).
- UX/security: axe WCAG 2.2 AA, Lighthouse desktop 99/100/100/100; security review 2026-11-01 (0 critical/high). Not tested: real Stripe, email.
- UX rebuild 2026-11-02: live estimate beside the form, folded inputs bar, verdict + NPV range, KPI tiers, report index, sample map,
  sample → calculator. Not re-run: axe, Lighthouse. Not fixed: el header chip wraps at 360 px.
- Advisor + scenario lab + action plan 2026-11-02 (rules in DECISIONS): free = verdict + tested levers + lab (sliders, compare 3, apply);
  paid = break-even sentences, action plan (stored in the snapshot), EVPI, Monte Carlo. "In short" = conclusion + 3 facts + "what the paid
  report answers"; teaser bug fixed (calculator never listed checks / Monte Carlo). 25-language copy: machine QA only, NO native review.
  Fixed on the way: paid/sample pages printed "€590.0K" (Node ICU). Not done: axe / Lighthouse of the new section; real-phone slider speed.
- Market data: official sources for 33 countries except LOW items (`audit-sources`). Benchmarks vs KTBL, Luke, WSU, LandGEM (PRODUCT.md).
  Inputs: one `NumberInput` (25 locales); xlsx with Excel number formats. Open: tenor silently rounded to whole years.
- L10n: 25 languages, machine QA + MQM rounds (DECISIONS 2026-11-01/02); NO native review anywhere. Open SHARED: English parameter-register
  texts (owner decision), process-flow labels, Latin units in uk/th/vi, % spacing, ~250 `KNOWN` QA defects. Legal: `docs/legal/LAWYER-BRIEF.md`.
## Launch readiness 2026-11-01 (green = verified in code/tests/local prod build)
- GREEN: redacted JSON logs + Sentry envelope, payment alerts, cron re-sends stuck links, no PII in logs, `/api/health`, config gate,
  404/error pages, hreflang 25 + x-default, sitemap 1 181 URLs, robots; deploy = CI + Vercel, rollback = instant rollback.
- RED (owner unless noted; dates proposed 2026-11-01): 1 domain + Vercel prod + Postgres with PITR (11-07); 2 Resend SPF/DKIM/DMARC (11-07);
  3 staging with own DB + Stripe test (11-10); 4 Sentry alert + uptime on `/api/health` (11-10); 5 restore drill (11-12); 6 real Stripe test
  payment end to end (11-12); 7 k6 load test — Claude after 3; 8 funnel analytics tool + privacy text (decide 11-10, Claude builds 11-14);
  9 browser error reporting — Claude 11-14; 10 Resend bounce webhook — Claude 11-14; 11 Search Console (11-10); 12 legal before sales.
- AMBER: host access logs contain report URLs (bearer token) — short retention, team-only access.
- **Go/No-Go 2026-11-01: closed beta GO with limits** (staging, privacy notice + beta terms, Stripe test mode, free reports, 3–5 countries,
  en/uk); **public launch NO-GO** until RED 1–12 closed and ≥ 8 blind beta cases vs real studies (verdict class agrees ≥ 80 %, no STRONG
  where the study said no, CAPEX ±30 % in ≥ 70 %; each → `scripts/benchmark.ts`) and ≥ 3 paid at list price.
## Next product work (highest value first) — ranking in PRODUCT.md › Roadmap
1. Owner decision: pricing (DECISIONS 2026-11-02: size factor, wider Extended gap, re-run discount); measure willingness to pay in the beta.
2. EU compliance value for biomethane as support cases (FR CPB, DE THG, NL ERE, UK RTFO). 3. Maize-plant CAPEX vs DBFZ 2024 Tab. 4-1 (ask DBFZ/IEE).
4. Bank pack: construction year + IDC, CIT + depreciation, equity IRR, yearly DSCR, reinvestment, residual value.
5. Advisor levers with sourced data: hub biogas pooling (no trucking), flexible CHP, grants. 6. Straw pretreatment; grass silage. 7. Grid cost.
## Known weaknesses
- Pulp & paper, starch and food-manufacturer sectors have only reference examples without budgets: their model case shows physics and "—" for money.
- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL` 1.5, plausibility bands, discount λ = 0.6, gas-grid default 2 km, advisor
  assumptions (gate fee, haul distances, heat share); biomethane price LOW everywhere. Only membrane upgrading; 54 of 1 287 cases unordered.

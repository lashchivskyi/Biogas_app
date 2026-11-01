# Status

Updated 2026-11-01. Rewrite at the end of a task; keep under 40 lines.
## Current state
- Model 0.6.1; data review 2026-10-30. Tests (1 408), lint, typecheck, build pass. NOT deployed: methalytics.com has no DNS (NXDOMAIN).
- UX audit 2026-10-31 (axe WCAG 2.2 AA, Lighthouse desktop 99/100/100/100; mobile calculator/report perf ≈ 79). Offer audit and
  security review 2026-11-01 (0 critical/high; refund replay, admin CSRF, PII in log fixed; CSP; shared rate limit). Not tested: real Stripe, real email.
- Market data: official sources for 33 countries except LOW items (177 in `audit-sources`). Scenario sweep 13 464 assessments, 0 throws/NaN,
  balances close; 30 reports, 0 contradictions. Benchmark vs KTBL, Luke, WSU, LandGEM (PRODUCT.md › Market).
- L10n: tooltips, plan names, terms unified; automatic QA (`src/i18n/__tests__/qa.test.ts`, glossary, skill `localization`). Open: ~250 known DNT/unit/
  abbreviation defects (`KNOWN`), % spacing, +60 % buttons; no native review.
## Launch readiness 2026-11-01 (green = verified in code/tests/local prod build)
- GREEN: server errors → redacted JSON log + Sentry envelope (`monitoring.ts`); payment alerts (paid, mismatch, refund, dispute);
  cron re-sends stuck report links + owner alert at 1 h; no PII/tokens in app logs; health `/api/health` (storage check);
  config gate at start; 404 (unknown page/sample/report token) and error/global-error pages; hreflang 25 langs + x-default,
  canonical, sitemap 1 181 URLs, robots; deploy = CI + Vercel, rollback = Vercel instant rollback (migrations append-only).
- RED, owner = owner unless noted (dates proposed 2026-11-01, change freely):
  1. Domain + Vercel prod project + managed Postgres with PITR/daily backups — 2026-11-07.
  2. Resend domain: SPF, DKIM, DMARC (p=none → quarantine after 4 weeks), test to Gmail/Outlook — 2026-11-07.
  3. Staging = Vercel Preview with own Postgres, Stripe test keys + webhook — 2026-11-10.
  4. Sentry project + alert rule (new issue → email); uptime monitor on `/api/health` every 5 min — 2026-11-10.
  5. Restore drill on staging: provider PITR restore + `npm run db -- export-json/import-json`, record time — 2026-11-12.
  6. Real Stripe test payment end to end (webhook, email, refund, cron) on staging — 2026-11-12.
  7. `k6 run -e BASE=<staging> -e REPORT_TOKEN=… scripts/load.k6.js`; thresholds in the script — Claude, after 3 — 2026-11-13.
  8. Funnel analytics: `track()` only fills `window.dataLayer`, nothing reads it (CSP blocks GTM). Owner picks tool + privacy
     text; recommended cookieless first-party counter (no consent banner) — decide 2026-11-10, Claude builds by 2026-11-14.
  9. Browser errors are not reported (error.tsx only renders) — Claude, same-origin endpoint with rate limit — 2026-11-14.
  10. Resend bounce/complaint webhook → owner alert (accepted mail can still bounce) — Claude, after 2 — 2026-11-14.
  11. Search Console: verify domain (`NEXT_PUBLIC_GSC_VERIFICATION`), submit sitemap — after 1, 2026-11-10.
  12. Legal before sales (from security review): seller entity, VAT/OSS, privacy policy + imprint, retention, DPAs — date by owner.
- AMBER: host access logs contain report URLs (bearer token) — keep Vercel log retention short, access team-only.
- **Go/No-Go (expert review 2026-11-01): closed beta GO with limits** — staging (RED 1, 3, 4, 8, 9), privacy notice + beta terms, Stripe test mode, free reports, 3–5 countries, en/uk;
  **public launch NO-GO** until RED 1–12 closed and beta shows ≥ 8 blind cases vs real studies/plants (verdict class agrees ≥ 80 %, no STRONG where the study said no, CAPEX ±30 % in ≥ 70 %; each case → `scripts/benchmark.ts`) and ≥ 3 paid at list price.
## Next product work (highest value first) — ranking in PRODUCT.md › Roadmap
1. EU compliance value for biomethane as support cases (FR CPB, DE THG, NL ERE, UK RTFO).
2. Maize-plant CAPEX vs DBFZ 2024 Tab. 4-1: model +22 % CAPEX, cost/kWh 5–12 % below (OPEX ≈ −20 %); scope unknown → not retuned; ask DBFZ/IEE.
3. Bank pack: construction year + IDC, CIT + depreciation, equity IRR, yearly DSCR, reinvestment, residual value.
4. Straw pretreatment; grass silage; cattle/swine VS vs IPCC. 5. Injection / grid connection cost by country. 6. Line-item overrides.
## Known weaknesses
- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL` 1.5, plausibility bands, discount λ = 0.6. Biomethane price LOW everywhere.
- Only membrane upgrading; gas-stream support "if eligible" only; boiler can be "best" when all routes lose (warned); 54 of 1 287 cases unordered.

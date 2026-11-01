# Status

Updated 2026-11-01. Rewrite at the end of a task; keep under 40 lines.
## Current state
- Model 0.6.1; data review 2026-10-30. Tests (2 017), lint, typecheck, build pass. NOT deployed: methalytics.com has no DNS (NXDOMAIN).
- UX audit 2026-10-31 (axe WCAG 2.2 AA, Lighthouse desktop 99/100/100/100; mobile calculator/report perf ≈ 79). Offer audit and
  security review 2026-11-01 (0 critical/high; refund replay, admin CSRF, PII in log fixed; CSP; shared rate limit). Not tested: real Stripe, real email.
- Market data: official sources for 33 countries except LOW items (177 in `audit-sources`). Scenario sweep 13 464 assessments, 0 throws/NaN,
  balances close; 30 reports, 0 contradictions. Benchmark vs KTBL, Luke, WSU, LandGEM (PRODUCT.md › Market).
- L10n: terms unified; automatic QA (`qa.test.ts`, glossary, skill `localization`); CLDR plurals in `fmt()` for the 7 counted offer lines in 21 of 25 locales
  (`plural.test.ts`: n = 0, 1, 2, 5, 21, 1.5). Open: ~250 known DNT/unit/abbreviation defects (`KNOWN`), % spacing, +60 % buttons; no native review.
  MQM review 2026-11-01 (independent AI reviewers, 1 per language, ~16–17k words each; found → major/minor, critical 0 everywhere; majors after fixes, not re-reviewed): pl 7/45 → 1/~33, cs 6/23 → 0/~11, sk 5/33 → 0/~25, sr 8/34 → 0/~26, bg 11/67 → 0/~55. Threshold (0 critical, ≤ 16 major per 16k words) met. Open for a native: pl address Ty vs Pan/Pani, KGJ/kogenerace, substrát/surovina, hygienizace/pasteurizace, sr/bg button imperatives, support-scheme wording; NOT a native review.
  MQM 2026-11-01, de/nl/da/sv/fi (dict + all modules + step/process help, ~7–9k words each, 2 rounds, errors before → after; critical/major/minor): de 43 (4/11/28) → 9 (0/0/9), nl 81 (0/12/69) → 24 (0/0/24), da 78 (2/20/56) → 21 (0/1/20), sv 77 (4/17/56) → 19 (0/0/19), fi 59 (0/28/31) → 10 (0/1/9); round-2 minors/major then fixed, not re-reviewed; NOT a native review. Not covered: `src/i18n/core/*`; English leaks of the same labels (reactor, upgrading, existing CHP) remain in the other 20 languages.
  MQM 2026-11-01, fr/it/es/pt/ro (dict + all modules, ~10k words each; critical/major/minor, round 1 → round 2 by fresh reviewers): fr 54 (0/23/31) → 30 (0/0/30), it 56 (0/6/50) → fixed, not re-reviewed, es 62 (0/17/45) → 27 (0/0/27), pt 90 (0/11/79) → 11 (0/0/11), ro 100 (0/38/62) → 11 (0/1/10); round-2 minors then fixed. NOT a native review. Open for a native: fr withdrawal-right wording (L221-28), ro beet pulp tăiței/borhot, es support-scheme term + Retorno, pt IVA/nota fiscal/ICSD, it GSE scheme names, VAT copy contradicts itself in all 5 (vatExclusive/vatFinal/legal.vat; owner).
  MQM 2026-11-01, vi/th/uk (dict + all modules + step/process help, 9 410 EN words each, round 1 only; critical/major/minor found → still open after fixes, not re-reviewed): vi 30 (0/10/20) → ~9 minor, th 41 (2/10/29) → ~15 minor (2 critical = pig "places" read as "pens", fixed), uk 32 (0/10/22) → ~9 minor. Open for a native: th ก๊าซชีวภาพ vs ไบโอแก๊ส, DM/TS variants, "โรงงาน" vs "ระบบ"; vi "khí sinh học" vs biogas, "sổ an toàn"; uk "компаратор" for fossil comparator, "станція/установка", "скринінг". `decision.units.nm3hRaw` default was French; other locales without own value now show English.
  MQM 2026-11-01, hu/el/tr/lt/lv/et (dict + all modules + step/process help, 9 375 EN words each; errors critical/major/minor, round 1 → fresh round 2): hu 54 (0/11/43) → 6 (0/0/6), el 83 (0/17/66) → 2 (0/0/2), tr 61 (0/25/36) → 2 (0/0/2), lt 86 (0/26/60) → 7 (0/3/4), lv 65 (0/26/39) → 11 (0/0/11), et 88 (0/29/59) → 1 (0/0/1); round-2 findings fixed, not re-reviewed; threshold (0 critical, ≤ 9 major per 9.4k words) met; NOT a native review. Open for a native: hu KÁT/METÁR wording, Fermentor vs Digestátum; el συν-χώνευση, Αξιολόγηση/Συμπέρασμα; tr YEKDEM, 'yol' for route, digestat; lt Grūdų žlaugtai/barda, Atsargus/Konservatyvus; lv rauši/drabiņas, koģenerācija vs CHP in labels; et informal button imperatives (Ava, Vaata) vs formal, EBITDA label. Per-language label words for reactor/upgrading/biogas/CHP(existing)/COD are now in `processes.ts` (`localWords`, `existingChp`); sensitivity % follows the locale (hu/el/et tight, tr prefix).
  Model sentences: English text in code is the key, every language incl. uk is one catalog `src/i18n/core/<locale>.ts` (719 keys; no Ukrainian left in `src/core`). Done for uk, de, pl, fr, it, es, pt, ro, cs, sk, sr, bg, nl, da, sv, fi, hu, el, tr, lt, lv, et, vi, th (it/pt/ro/nl/da/sv/fi/vi/th: machine QA only, NO native review). English in EVERY language (also uk): parameter-register `source`/note texts (`countries/sources.ts`, `modelAudit.ts`) in the full report/xlsx — owner decision needed (~100+ strings in the sample reports of every catalog language).
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
- Pulp & paper, starch and food-manufacturer sectors have only reference examples without budgets: their model case shows physics and "—" for money. Needs a costed case with an official/peer-reviewed COD-reactor cost basis (none found 2026-11-01).
- Judgement values (LOW): warm-climate store, `MANURE_RETURN_HAUL` 1.5, plausibility bands, discount λ = 0.6. Biomethane price LOW everywhere.
- Only membrane upgrading; gas-stream support "if eligible" only; boiler can be "best" when all routes lose (warned); 54 of 1 287 cases unordered.

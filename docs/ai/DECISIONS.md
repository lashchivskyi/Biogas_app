# Decisions

What a future session must not rediscover or relitigate. Entry = `date — decision — why (evidence) — where enforced`,
at most 4 lines. Change a decision only with new evidence and replace its line; never add a contradicting one.
Not here: what was done (git log), verdict/NPV counts of a change (commit message), parameters (code), plans (STATUS).

## Data

- 2026-10-30 — Market values come only from official/primary sources, latest published period; no reachable official
  source → keep the value, confidence LOW, reason in the source text. — Third-party copies were wrong (KZ spot 2× off).
- 2026-10-30 — Every parameter carries a date (publication or data period); judgement values carry the review date.
  Client-facing source strings are short: organisation, dataset/document, period, basis.
- 2026-10-30 — Regional market data via GeoNames admin1 codes (`US.WI`, `CA.10`, `BR.27`); the national value is the
  fallback. — Prices differ ×2–3 inside US, CA, BR, IN, MX.
- 2026-10-30 — Currencies without an ECB rate use the national central bank (NBU, NBM, NBK, BCRA, NBS); VND = State
  Bank of Vietnam cross rate by hand (site blocks scripts).
- 2026-10-31 — `DATA_REVIEW_AS_OF` must be ≥ the newest `observedThrough` of any fetched row, else every verdict is
  downgraded as "price expired". Bump it with each data refresh.
- 2026-11-03 — Validation and CAPEX references only from official bodies, filings or studies with stated scope; CAPEX
  references dated ≥ 2024. News, vendor quotes, sector aggregates and coarse national substrate classes (KOWR PL) are
  deleted, not shown as noise (owner). `scripts/capex-references.ts`.
- 2026-11-03 — Danish Normtal ex-storage slurry (34.1 t at 7.96 % DM) carries storage water and double-counts the store
  (+28–48 % digester). A future swap must use excreted mass (28.9 t "ab dyr"). EU manure per head stays IPCC.

## Model

- 2026-10-30 — CAPEX anchored on DBFZ/IEE 2023 German reference plants; only ~150 d of digestate storage is gas-tight
  (TA Luft 2021), the rest open at half the cost. Plant power = max(3 kWh/t, 3.2 % of methane energy) (DBFZ 2023).
- 2026-10-30 — Feedstock-loss and yield-shortfall sensitivities keep CAPEX as built. — Resizing made "yield −20 %" raise NPV.
- 2026-10-31 — Data-confidence score starts at 80 (`QUALITY_START`), so a screening never shows HIGH; every lost point
  is a `QualityFactor` owned by `client` or `model`. INSUFFICIENT_DATA is gated on client-owned points only.
- 2026-10-31 — Unknown storage volume on a farm with own slurry = the existing store holds it (Nitrates Directive); only
  its gas-tight cover is costed. Explicit 0 is respected. — New storage made manure CAPEX 2× DBFZ.
- 2026-10-31 — Feeds with > 50 % of VS from pure grease (`fat_dominant`) cannot be STRONG (stable co-digestion documented
  only to ≈ 30 % of VS, Long et al. 2012).
- 2026-10-31 — Annual mean ≥ 20 °C: digestate store = `eng.storage_months_warm` (LOW); effluent-like streams (≤ 6 % DM by
  actual DM, or `dilute`) store ≤ 1 month. Best route stays "highest NPV" even for a boiler without a heat buyer (warning).
- 2026-10-31 — Delivered manure's digestate returns to the supplying farms (`MANURE_RETURN_HAUL`): no plant export cost,
  no nutrient credit. — It was paid twice and credited with value the farms already had.
- 2026-10-31 — Entered prices outside plausibility bands are flagged as unit slips and force LOW confidence but are used
  (off-grid diesel sites can pay 3× national). Validation bounds on local-currency amounts only guard against nonsense.
- 2026-10-31 — Client export price, heat price, operator cost and loan terms replace national estimates as USER_INPUT;
  loan terms never enter NPV. A supplier CAPEX quote needs its route and replaces only that route's CAPEX.
- 2026-10-31 — Break-even (max CAPEX, product value, feedstock €/t) = exact linear root of two runs. Any non-linear term
  (tax loss carry-forward, price-dependent sizing) must switch to bisection. `break-even.test.ts`.
- 2026-10-31 — Money basis: pre-tax, nominal EUR; energy +2 %/a, OPEX +2.5 %/a, tariffs flat; discount 6 % + 0.6 ×
  Damodaran CRP with −1/+2 pp sensitivity. `finance-audit.test.ts` (hand recompute = code to 1e-13).
- 2026-10-31 — Year-1 start-up share applies only to new digesters; existing gas streams start at full output.
- 2026-10-31 — Climate case = RED Annex VI defaults only; credits valued only in support cases with an official mechanism
  (US RIN/LCFS). CHP heat allocated by the RED Carnot share at 150 °C.
- 2026-10-31 — Monte Carlo samples the scenario quantities (triangular, LHS, fixed seed, 160 draws, chosen route) and
  never changes the verdict. Real-plant scatter (AgSTAR) is shown as text, not sampled (mixes reporting noise and downtime).
- 2026-10-31 — "What to verify first" ranks by EVPI (build / no-build) over each input's evidence range; client-supplied
  inputs are not listed. A buyer's biomethane offer is per MWh HHV, without support, replacing the three price parameters.
- 2026-10-31 — One plant, three scenarios (owner): sizing on the base case only; scenarios, Monte Carlo and stress tests
  change output, prices and the CAPEX multiplier. `plant-sizing.test.ts`, ratchet in `report-consistency.test.ts`.
- 2026-10-31 — By design, NOT bugs: net buyers of power/heat lose when that price rises; biomethane only above
  `eng.upgrade_min_nm3h` (NPV steps there); CAPEX steps in equipment modules; confidence drops outside 30 kW–5 MW.
- 2026-10-31 — Competitor tools are a cross-check, never a calibration target (KTBL/WSU use design yields, Luke heats
  with a separate boiler). Re-run recipe: KTBL by HTTP POSTs, Luke/WSU/AD-ST/LFGcost workbooks headless; `scripts/benchmark.ts`.
- 2026-11-02 — Advisor (`core/advice.ts`) tests only levers the client controls (heat buyer, food waste, neighbours'
  manure, debt share); never prices, yields, CAPEX or support. Losing levers are shown, never hidden. `ADVICE_ASSUMPTIONS` LOW.
- 2026-11-02 — Previews run `assess(…, { lite: true })`; `advice.test.ts` proves lite = full and that "Apply" gives the
  preview's verdict. Lever break-evens are roots on the lever's own route.
- 2026-11-03 — Yield realisation 0.95 / 1.00 / 1.00 (owner): catalogue yields are KTBL/FNR standard yields, already
  full-scale; × 0.90 counted the shortfall twice. Evidence: 39 Messprogramm III plants (within ±25 % 62 → 87 %), SE farms.
- 2026-11-04 — Landfill-gas engines × `eng.chp_landfill_site_factor` 0.80 of datasheet (EPA LMOP, 284 projects, both halves
  0.79–0.80); AD engines keep the datasheet (AgSTAR heated tanks 0.95–1.00). Landfill help: ≈ 50 % of modelled METHANE.
- 2026-11-04 — Checked on primary sources, NOT changed: pig VS per place (EU confirmed; US evidence conflicting, needs
  metered farms); lagoon temperature (model lagoons only at ≥ 20 °C = IPCC max MCF, so the AgSTAR lagoon gap is not
  temperature). Flagged, unresolved: maize silage N, poultry manure DM/BMP, Eastern dairy VS needs national Tier 2.
- 2026-11-04 — AD Screening Tool reads 1.2–2.4× below us on equal VS, but its calibration also absorbs collection,
  downtime and flaring: open A1 check (STATUS), not a retune. Never claim "the only back-tested tool".

## Product and offer

- 2026-10-30 — Model computes in EUR; USD is display only at one ECB rate. Country table keeps six-decimal formatting.
- 2026-10-30 — Support schemes need an official legal text for any modelled value; otherwise described, not modelled.
- 2026-10-31 — Reference examples show prepared clients (lab, metered manure, sourced fees); no market or model parameter
  changed for them (owner asked for realistic samples).
- 2026-10-31 — Report consistency: the Assessment is the single source; every displayed number is recomputed and compared
  (`report-consistency.test.ts`). Ranges always read low – high.
- 2026-11-01 — Free = the answer (verdict, reasons, ranges, driver names, advisor levers, scenario lab). Paid = HOW FAR and
  HOW SURE (break-even, action plan, driver amounts, Monte Carlo, line items, request letters, Excel). The verdict stays
  free: a hidden "no" would be sold, then refunded. INSUFFICIENT_DATA is never sold (quote 422 + checkout guard).
- 2026-11-01 — Standard and Extended are independent purchases, no upgrade (owner; built and removed). Withdrawal box
  unticked, exact text stored on the order and repeated in the email (CRD Art. 16(m)).
- 2026-11-01 — Gas streams: support cases marked "if eligible", never eligible (scheme gas-source categories not modelled).
- 2026-11-01 — A sold report is the Assessment JSON saved at checkout, never recomputed; new fields optional, renderer
  tolerant (`stored-snapshot.test.ts`). Rate-limit key = platform header, else the right-most X-Forwarded-For.
- 2026-11-01 — Security: a refunded order is final for non-admin sources; state-changing `/api/admin/*` needs Sec-Fetch-Site
  same-origin; failed report email → webhook 500 (Stripe retries). CSP keeps `'unsafe-inline'` scripts on purpose (nonces
  force every page dynamic). Rate limits shared via Postgres, fail open.
- 2026-11-01 — hreflang uses language-only codes (`HREFLANG`, `sr-Latn`); sitemap and head list the same set + x-default.
  `scripts/load.k6.js` is for staging only.
- 2026-11-01 — One report template for every inlet (`ResultView`); only AD-specific blocks swap, money hidden when
  `financialsAvailable` is false. Sector model case from `segments.ts` `modelExampleId`.
- 2026-11-02 — Logic audit rules (`logic-audit.test.ts`): DM + VS + BMP entered = lab-measured; fit scores rate the project,
  data gaps are deducted once in data quality; 0 % debt → DSCR "—"; a prompt only where a field answers it; client prices
  are evidence, not "market data require review"; xlsx exports no money when the page withholds it.
- 2026-11-02 — A client data-quality deduction exists only if a form field closes it; manure from head counts × IPCC per-head
  is not deducted; lab gap is one item (15, or 27 when > 40 % of mass is LOW catalogue). "No electricity data = no verdict"
  would need an explicit rule, not points.
- 2026-11-02 — Page header and xlsx do NOT show model/data version (owner); versions stay in `dataAudit`.
- 2026-11-02 — Calculator flow: report audit reads `Stat`'s `data-stat-*` attributes (keep them); the live panel shows
  physics + confidence only, money only in the result; no new three.js on these pages; verdict colours #0e7a55 / #c98a0b /
  #c0392b, every mark also has a shape and a label.
- 2026-11-04 — Funnel analytics = first-party cookieless event log; visit id = SHA-256(daily salt | IP | UA), salts deleted
  daily; allow-listed events and keys; money stages server-only; 400 days. No GTM/GA, no persistent cookie id (owner).
- 2026-11-04 — Pricing: owner keeps €160–390 through the closed beta (0 paid orders, no willingness-to-pay data); revisit
  after ≥ 3 paid at list price. Open proposals: size factor by CAPEX, Extended ≈ 1.5× Standard, discounted re-run.
- OPEN (owner): Stripe product name/description is English for every buyer. Recommended: localised plan name +
  `footer.disclaimer`, English in metadata; ask the accountant about invoice language (`docs/legal/LAWYER-BRIEF.md` §9).

## Performance

- 2026-10-31 — Do not render `ResultView` on the client for EUR (~2 s main thread on phones). three.js loads on first
  interaction / viewport proximity; skeleton heights ≥ final content. Local Lighthouse: `NEXT_PUBLIC_LOCAL_IP_GEO=0`, discard
  the first cold run.

## Quality contract (2026-11-03; `npm run scorecard`, thresholds in `scripts/scorecard.ts`)

- Structure: ISO/IEC 25010:2023 characteristics plus decision accuracy. GREEN met on valid evidence, AMBER proxy / small n /
  stale, RED missed, GREY not measured (= not met). A threshold changes only with new evidence, never to turn a row green;
  a reference never leaves a set because the model misses it.
- D1: 0 STRONG on projects closed for economic reasons (n ≥ 10) — a false "go" is the costliest error. D2: verdict class
  agrees with documented outcome in ≥ 80 %, n ≥ 8 (beta gate); only cases with a documented outcome and pre-outcome inputs.
  Operating AgSTAR digesters are shown, not counted (support and profit unknown).
- A1 gas/energy within ±25 % of real plants in ≥ 80 % (AgSTAR 2020 §7.2 pre-feasibility "±25 % or greater"). A2 CAPEX
  ±30 % in ≥ 70 %; A3 within AACE class 5 (−50 … +100 %) in ≥ 95 %. Press and vendor figures shown, not counted.
- R1/R2: real value inside the conservative–optimistic band in 70–90 % (100 % = band too wide), n ≥ 20. The scenario band
  is NOT widened for AgSTAR scatter (no source splits downtime vs reporting); R1b tests the real-plant range instead.
- Integrity I1–I7 (balances, 0 contradictions over 39 × 33, report = model, unique ids, no dead fields, support never moves
  the verdict, 0 market values undated or > 400 days unless `evidence.checkedOn` confirms the latest period).
- Performance: CWV "good" at p75; before launch Lighthouse mobile on 5 pages (TBT is the INP proxy, AMBER at best). U1 ≥ 90 %
  task success, U2 median ≤ 5 min (n ≥ 5); U3 axe 0 serious + keyboard pass; U4 `qa-known.ts` at 0. S1 ASVS L1 site, L2
  money/webhooks/tokens (self-assessment `scripts/asvs-checklist.json`). C1 Stripe test mode end to end.
- ODRÉ (FR) tests the spread only (R3, AMBER at best: published capacity may follow output); it is not accuracy.

## Localization

- 2026-11-01 — A plan keeps one local name per locale (the pricing-page one) everywhere; Stripe product names English.
  Each locale uses the NPV/IRR/CHP/COD terms its UI already uses; one form of address per locale. `src/i18n/glossary.ts`.
- 2026-11-01 — Localization QA is code (`glossary.ts`, `qa.test.ts`); known defects are a ratchet (`KNOWN`): lower, never raise.
  Register codes FACT/ASSUMPTION/CALCULATION/ESTIMATE and VS stay English (DNT test wins over reviewers).
- 2026-11-01 — Plurals: own ICU subset in `src/i18n/message.ts` on `Intl.PluralRules`, not `intl-messageformat` (no dependency,
  edge-safe). New counted strings must be plural; `qa-rules.pluralIssues` demands every CLDR category.
- 2026-11-01 — Model text: code writes English (`T("English", vars?)`, English is the key); Ukrainian in `src/i18n/core/uk.ts`,
  imported statically so `assess()` stays synchronous; plain literals only (`core-catalog.test.ts`).
- 2026-11-02 — Text enters only through `src/i18n` (`react/jsx-no-literals`, `hardcoded.test.ts`, `registry.test.ts`; prebuild
  fails on a missing language). Fixed-width SVG text uses `lib/text-fit.ts`. Excel numbers stay raw, dates ISO.
- 2026-11-04 — Terms fixed without a native (EBITDA, confidence, verdict, upgrading, slurry, Monte Carlo = probability
  range, …) live in `FIXED_TERMS` (`src/i18n/glossary.ts`), checked by `fixed-terms.test.ts`. Render harness must call
  `registerMessages` before `assess()`.

## AI workflow

- 2026-10-30 — `AGENTS.md` is the single instruction file (Codex reads it, `CLAUDE.md` imports it), in English; replies
  to the owner in Ukrainian.
- 2026-11-04 — Knowledge lives in code, tests and four `docs/ai/` files under a write gate (AGENTS › Project memory) with
  size limits enforced by `src/__tests__/project-docs.test.ts`. — Every session appended summaries and weak findings
  (DECISIONS reached 478 lines), which buried decisions and misled later analysis.
- 2026-11-04 — Automated Google Trends requests are refused here as bot-check circumvention; search demand stays unmeasured
  until the owner runs Trends / Keyword Planner by hand. Market-research write-ups live outside the repo (owner's Claude doc).

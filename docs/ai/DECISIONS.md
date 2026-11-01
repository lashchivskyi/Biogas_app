# Decisions

One line per decision: date — decision — why. Change a decision only with new evidence, and
replace the line rather than adding a contradicting one.

## Data

- 2026-10-30 — Market values come only from official/primary sources and the latest published
  period; no reachable official source → keep the value, confidence LOW, reason in the source text.
  — Third-party copies (news, brokers, mirrors) produced wrong numbers (KZ spot was 2× off).
- 2026-10-30 — Every parameter carries a date (publication or data period); judgement values
  carry the review date. — "Unknown" dates hid weak evidence from clients.
- 2026-10-30 — Source strings shown to clients are short: organisation, dataset/document, period, basis.
- 2026-10-30 — Regional market data via admin1 codes (GeoNames): preset regions and searched cities
  map to `US.WI`, `CA.10`, `BR.27`…; national value is the fallback. — Prices differ ×2–3 inside
  US, CA, BR, IN, MX.
- 2026-10-30 — Currencies without an ECB rate use the national central bank (NBU, NBM, NBK, BCRA,
  NBS); VND uses the State Bank of Vietnam cross rate, entered by hand (site blocks scripts).

## Model

- 2026-10-30 — CAPEX recalibrated to DBFZ/IEE 2023 German reference plants (CHP 2 400 €/kW at
  100 kW, storage 120 €/m³, gas system 120 €/(Nm³/h), upgrading 1.2 M€ at 250 Nm³/h). — Old values
  were partly too low while total storage was too high.
- 2026-10-30 — Only ~150 d (incl. digester) of digestate storage is gas-tight (TA Luft 2021);
  the rest of the closed season is open storage at half the cost.
- 2026-10-30 — Plant electricity use = max(3 kWh/t, 3.2 % of methane energy) ≈ 8 % of CHP output (DBFZ 2023).
- 2026-10-30 — CHP service cost scales with size (2.6 ct/kWh at 100 kW, exponent −0.32).
- 2026-10-30 — Feedstock-loss sensitivity keeps CAPEX as built (plant was sized for the base case).
- 2026-10-30 — Revenue lines under €0.5 are hidden in tables but still counted in totals.
- 2026-10-31 — Data-confidence score starts at 80 (`QUALITY_START`), so a screening never shows
  HIGH; every lost point is a `QualityFactor` owned by `client` or `model` (test: score = 80 − Σ).
  Streams with lab DM/VS/BMP no longer count toward the "low-confidence catalogue" deduction.
- 2026-10-31 — INSUFFICIENT_DATA is gated on client-owned points only (plus blocking caps: expired price,
  future/missing process basis); model-owned points still lower the level. — Complete forms in KZ/AR/UA/IN
  were told to "fill in" gaps that only the model's data had.
- 2026-10-31 — Unknown storage volume on a farm with own slurry = the existing store holds that slurry
  (Nitrates Directive closed-season duty); only its gas-tight cover is costed, with a warning. Explicit 0 is
  respected. — New storage for slurry the farm already stores made manure CAPEX 2× DBFZ.
- 2026-10-31 — Feeds with >50 % of VS from pure grease (`fat_dominant`: grease-trap fat, DAF sludge) cannot be
  STRONG: stable fat co-digestion is documented only up to ≈ 30 % of VS (Long et al. 2012).
- 2026-10-31 — Annual mean ≥ 20 °C: digestate store = `eng.storage_months_warm` (3 months, LOW judgement)
  instead of the German closed-season rule; dilute effluent ≤ 1 month everywhere. — A 6–9 month store was
  costed for sites with no spreading ban. Best route stays "highest NPV" even if it is a boiler with no heat
  buyer (switching to CHP made verdicts less honest on seasonal sites); a warning is shown instead.
- 2026-10-31 — Yield shortfall sensitivity keeps CAPEX as built, like feedstock loss. — Resizing made
  "yield −20 %" raise NPV.
- 2026-10-31 — Delivered manure's digestate goes back to the supplying farms (return leg, `MANURE_RETURN_HAUL`):
  no plant handling/export cost, no "imported nutrient" credit, no plant land need. — It was paid for twice
  (return haul + third-party export) and its fertiliser value, which the farms already had, was credited to the plant.
- 2026-10-31 — Entered prices outside plausibility bands are flagged as likely unit slips and force LOW confidence
  (client-owned), but are still used: off-grid diesel sites can genuinely pay 3× the national price.
- 2026-10-31 — Effluent-like streams (processing residue ≤ 6 % DM, plus the `dilute` flag) store digestate ≤ 1 month;
  the rule uses the stream's actual dry matter, not the type. — Whey and pot ale were costed with the 6–9 month
  spreading-ban store that vinasse already skipped. Threshold is judgement (LOW).
- 2026-10-31 — Operator time = 22.5·kWe^0.72 h/a (min 750), fitted to Walla & Schneeberger 2008 Table 2
  (620 / 1 164 / 1 978 h at 100 / 250 / 500 kWe). — The linear 5 h/kWe overstated labour above ~250 kWe.
- 2026-10-31 — Client-supplied export price, heat price, operator cost and loan terms replace the national estimate
  and are shown as USER_INPUT evidence; loan terms never enter NPV. Vendor CAPEX quote deliberately not added (route ambiguity).
- 2026-10-31 — Validation bounds on local-currency amounts are 1e8 per unit (1e15 for project budgets): they only
  guard against nonsense; plausibility is judged in EUR against national levels. — 1000 rejected VND prices.
- 2026-10-31 — Straw adds mechanical-milling electricity (66.6 kWh/t) to plant use; its CAPEX and other pretreatment stay
  warned, not modelled. Fat-rich types keep the whole-stream "fat" flag (no sourced lipid shares); only the wording changed.
- 2026-10-31 — A supplier CAPEX quote needs its technology (CHP / boiler / biomethane) and replaces only that route's CAPEX;
  conservative/optimistic multipliers (1.2 / 0.9) still apply; process inputs ignore it; > 2.5× from the model → unit-slip
  warning and LOW confidence. — One total for all three routes would have made biomethane look as cheap as a CHP plant.

- 2026-10-31 — Absolute break-even (max CAPEX, product value, feedstock €/t) uses the exact linear root from two
  runs: NPV is linear in CAPEX, main-product price and a per-tonne feedstock cost. Any non-linear term (tax with
  loss carry-forward, price-dependent sizing) must switch these to bisection. Covered by `break-even.test.ts`.
- 2026-10-31 — Supplier-quote position uses the model's own optimistic/conservative CAPEX for the same route as
  the band; no new judgement constant. The 2.5× unit-slip warning stays separate.

- 2026-10-31 — Yield realisation stays a fixed scenario factor (0.85/0.90/0.95): no authoritative per-substrate
  kinetic constants were found (first-order k values vary by test method); an HRT model would move every verdict
  without better evidence. Scale is answered by the plant-size table instead.
- 2026-10-31 — National manure per head lives in country profiles (`manure`); US dairy uses NRCS AWMFH ch. 4 /
  ASAE D384.2 because the AgSTAR back-test showed the EU-style catalogue at half of reported US output.
- 2026-10-31 — European dairy cows (22 profiles + UA) excrete the IPCC 2006 Table 10A-4 VS (W. Europe 5.1, E. Europe
  4.5 kg/d) in the DüV volume of 20 m³/a (DM 11.6 / 10.3 %); was 3.7 kg/d. Other cattle and swine stay on the catalogue:
  the US swine back-test (0.80, n = 12) argues against IPCC's 0.30 kg/d for market swine. Not tuned to a verdict: the
  8 changed verdicts are a US-size herd placed in Europe.
- 2026-10-31 — Energy crops (`energy_crop`): the entered quantity is the harvested mass into the clamp; purchase and
  haulage are paid on it, DM loss 9.3 % base / 12 % cons. / 8 % opt. (KTBL 2021 Tab. 1) reduces what is digested,
  nutrients stay. A clamp holding the full annual harvest is costed at 60 €/m³ (LfL 2015/16 escalated; fee tables are
  the upper check) and 780 kg FM/m³ (LfL). Checked against the BMWK/IEE/DBFZ 510 kW reference (`scripts/benchmark.ts`): CAPEX +15 % vs the 2023–2026 range, cost per kWh 5–12 % below it, reference scope (silo, storage) undisclosed → not retuned.
- 2026-10-31 — Money basis: pre-tax, nominal EUR. Energy +2 %/a and OPEX +2.5 %/a (nominal), tariffs flat, discount
  6 % + 0.6 × Damodaran CRP read as a nominal pre-tax EUR rate (Damodaran Jan 2026 Green & Renewable 6.04 % after-tax USD
  ≈ 7.8–8.1 % pre-tax USD ≈ 6.3–6.6 % EUR) with a −1/+2 pp sensitivity, not retuned. Payback shown simple and discounted.
  Lender audit (`finance-audit.test.ts`): hand recompute of de_nawaro, fr_farm_injection, us_closed_landfill = code to 1e-13.
- 2026-10-31 — Year-1 start-up share (`eng.rampup_year1`, FNR: new digester reaches target load ≈ day 110) applies only
  to new digesters; existing gas streams (`gas`, `landfill`) start at full output. — A running digester was charged
  25 % of its first-year revenue (−0.2…−0.5 M€ NPV). Commissioning of new CHP/upgrader is not modelled (weeks).
- 2026-10-31 — Climate case uses RED Annex VI default values only (no actual-value calculation, no carbon price);
  credits are valued only inside support cases with an official mechanism (US RIN/LCFS). Heat in CHP is allocated by
  the RED Carnot share at 150 °C.

- 2026-10-31 — Monte Carlo samples the scenario quantities (triangular: conservative / base / optimistic), Latin
  hypercube, fixed seed, 160 draws, chosen route only; it never changes the verdict. The biomethane price shares the
  energy-price draw (EU biomethane is priced off gas; power tracks gas). Two sourced bands exist only in the Monte
  Carlo, not in the scenarios: catalogue DM × VS ±20 % (IPCC 2006 Vol. 4 §10.4.4 Tier 2 ±20 %, LOW) unless the client
  measured both, lab BMP ±8 % (Hafner et al. 2020). — The report called a "grey" project "100 % positive"; the
  conservative case is now labelled a stress test and certainty is shown as "> 99 %". Real-plant scatter (AgSTAR
  0.4–2.2×) is shown as text, not sampled: it mixes reporting noise with downtime the model does not simulate.
- 2026-10-31 — A buyer's biomethane offer is entered per MWh HHV (how offers are quoted), without support, and
  replaces the three biomethane price parameters as USER_INPUT (conservative × 0.85, optimistic × 1.1, like a power
  export contract). It removes the price from "what to verify first"; > 3× from the estimate → unit-slip warning.
- 2026-10-31 — "What to verify first" ranks by EVPI (build / no-build) over each input's own evidence range, three
  runs per input, NPV interpolated linearly; inputs the client supplied are not listed.

## Product

- 2026-10-30 — Keep country conditions as the existing table with six-decimal formatting.
  Fix numeric column widths and confidence-dot shrinking within the existing table width;
  do not replace it with cards or round values merely to make them fit.
- 2026-10-30 — Model computes in EUR; USD is a display conversion at one ECB rate, never
  per-country cross rates.
- 2026-10-30 — Support schemes: official legal text required for any modelled value; without it
  the scheme is described but not modelled (e.g. CZ biomethane auction prices).

- 2026-10-31 — Reference examples show prepared clients (lab analysis, metered manure, existing
  storage, sourced tipping fees/surcharges); each lever is named in the case text. No market or
  model parameter was changed for them. — Owner asked for more realistic, less pessimistic samples.

- 2026-10-31 — "What to verify first" items carry steps, a request pre-filled with the screening design basis (lab,
  suppliers, power/heat/biomethane buyers) and the calculator field for the answer; the client re-runs the report with
  the evidence. Paid reports only (EVPI is). Texts in en/uk, English elsewhere.
- 2026-10-31 — Excel export (in-browser XLSX, no dependency) is a paid-report feature: standard plan gets base
  case, CAPEX/OPEX and assumptions; full plan adds scenarios, routes, sensitivities, support cases. Not in the
  free calculator. Money in EUR with the FX row; labels follow the model language (en/uk).

- 2026-10-31 — `DATA_REVIEW_AS_OF` must be ≥ the newest `observedThrough` of any fetched row: a fetch dated after it
  makes `assess` flag "price expired" and downgrade every verdict (560 of 1 287 cases in the first diff). Bump it with
  each data refresh. Export haircut 0.85 is left unchanged: no official source, likely conservative for baseload CHP.

- 2026-10-31 — Report consistency gate (`report-consistency.test.ts`): the Assessment is the single source; every number in
  the verdict text, tiles, tables, charts, EVPI, Monte Carlo, export and translations is recomputed and compared. Display
  ranges (CAPEX, payback, NPV) now always read low – high.
- 2026-10-31 — One plant, three scenarios (owner chose "size once at base"). `runScenarioRoute` sizes digester, storage, engine,
  upgrader and CAPEX lines on the base case (and ignores the feedstock/yield stress modifiers when sizing); conservative,
  optimistic, Monte Carlo draws and stress tests change only output, prices and the CAPEX multiplier. A built upgrader flares
  gas above its design flow. Base results unchanged; 29 of 1 287 verdicts moved (via the conservative case, both ways). CAPEX
  disorder gone (139 → 0); unordered NPV/EBITDA 197 → 54 of 1 287. Remainder: a net buyer of electricity/heat pays the higher
  "optimistic" energy price (boiler, biomethane, some CHP). Open: price multiplier on purchases (hold at base, or pair
  with the buyer's side). Ratchet in `report-consistency.test.ts` (≤ 16 of 234); `plant-sizing.test.ts` guards the sizing.
- 2026-10-31 — Sweep findings (do not rediscover). Fixed: methane-loss `ratio` was Infinity (now `null`); CHP round-up loop
  hung above 1e16 kW; `processSchema.safeParse` threw on `monthsActive` = 1e300; `assess` returned NaN for non-finite input
  (now throws). By design, NOT bugs: net buyers of power/heat are worse off when that price rises (only sell-side prices are
  monotone); biomethane is eligible only above `eng.upgrade_min_nm3h`, so the headline NPV steps there; CAPEX is stepwise
  in equipment modules (≤ ~12 % of CAPEX per step); confidence drops outside 30 kW–5 MW (`scale_range`), so a verdict can
  fall one level for a much larger plant; revenue lines < €0.5 are hidden but counted.

- 2026-10-31 — Competitor tools are a cross-check, never a calibration target: KTBL and WSU read 18–28 % more gas
  because they apply standard/design yields with no realisation, Luke reads 36 % less power because it heats the
  digester with a separate boiler; the AgSTAR back-test (0.94) stays the yield anchor. How to re-run them: KTBL
  daten.ktbl.de/biogas is a session form app (scriptable with HTTP POSTs), Luke v3 and WSU ADBC are Excel workbooks
  that the Python `formulas` package recalculates headless; outputs recorded in `scripts/benchmark.ts`.

## AI workflow

- 2026-10-30 — `AGENTS.md` is the single instruction file (Codex reads it, `CLAUDE.md` imports it),
  written in English to save tokens; replies to the owner stay in Ukrainian.
- 2026-10-30 — Knowledge lives in code, tests and four files in `docs/ai/`; no dated reports.

## 2026-10-31 — UX audit: performance guards
- Do not render `ResultView` on the client for EUR (`CurrencyResultView` keeps the server view): it re-ran ~2 s of main-thread work on phones.
- three.js (hero scene, bottom emblem) loads on first interaction / viewport proximity, never at hydration; keep skeleton heights ≥ final content (CLS).
- Lighthouse locally: build with `NEXT_PUBLIC_LOCAL_IP_GEO=0` (the ipapi.co call delays `ready`); first run per batch is cold, discard it.

## 2026-11-01 — Offer boundary and payments
- Free view = the answer (verdict, robustness class, ranges incl. 3 NPVs, driver NAMES); paid = the work behind it (driver NPV
  amounts, Monte Carlo, line items, request letters, Excel). The free → paid block lists THIS project's counts per plan. A clear
  no says the report will not change it. — Freemium practice: give the conclusion, sell the detail; honesty keeps trust.
- INSUFFICIENT_DATA is never sold (quote 422 + checkout guard). — A paid "fill in more fields" invites refunds.
- Standard and Extended are independent purchases: no upgrade, no credit; the client chooses before paying (owner,
  2026-11-01; an upgrade was built and removed). Prices unchanged: owner declined the proposed Standard cut.
- Withdrawal: separate unticked box, exact text stored on the order and repeated in the delivery email (CRD Art. 16(m)).
- Gas streams (wastewater, landfill, existing gas): support cases computed but marked "if eligible", never eligible — scheme
  gas-source categories (e.g. Klär-/Deponiegas) are not modelled. Residue (BMP) inputs follow normal scheme rules.

- 2026-11-01 — A sold report is the Assessment JSON saved at checkout, never recomputed; a model/data release must not
  change it. New Assessment fields must be optional and the renderer tolerant (`stored-snapshot.test.ts` enforces it).
  Rate-limit key = platform header, else the RIGHT-most X-Forwarded-For (left-most is client-controlled).
- 2026-11-01 — Security review: a refunded order (`reversed`) is final for non-admin sources (a replayed `paid` webhook must not
  restore the report); state-changing `/api/admin/*` calls need Sec-Fetch-Site same-origin (Basic credentials are sent cross-site).
  A failed report-link email makes `applyProviderStatus` throw (webhook 500 → Stripe re-delivers); a 200 is never retried.
  CSP keeps `'unsafe-inline'` scripts on purpose: nonces force all pages dynamic and Next's inline RSC payload has no build hash;
  the gain is `script-src`/`connect-src 'self'`. Rate limits on checkout/quote/leads are shared via Postgres and fail open.
- 2026-11-01 — Launch readiness: hreflang uses language-only codes (`HREFLANG`, `sr-Latn`), not `INTL_TAG` regions — `es-ES`
  is never shown to es-MX/AR searchers, `en-GB` not to US/IN. Sitemap and page head list the same set incl. x-default.
  The reconcile cron also re-sends report links stuck after payment and emails the owner once at 1 h. Load (local prod
  build, 1 Node process): quote ≈ 65 req/s (15 ms each), paid report SSR ≈ 20 req/s (≈ 50 ms, 630 kB HTML / 110 kB gz);
  the calculator runs in the browser. `scripts/load.k6.js` is for staging only (Vercel rate limit → 429 counted, not failed).
- 2026-11-01 — Localization: a plan keeps one local name per locale, the one on the pricing page (e.g. de Basisbericht, fr
  Rapport essentiel), also in offer teasers and FAQ; Stripe product names stay English. Each locale uses its own
  NPV/IRR/CHP/COD terms where its UI already does (VAN, Kapitalwert, BHKW, ChZT…) and one form of address (it tu, es usted,
  Nordics du/sinä, others formal). Core engineering notes stay English for non-uk locales (`coreLang`). Tooltip coverage is
  enforced by `dict.test.ts`.
- 2026-11-01 — Localization QA is code: `src/i18n/glossary.ts` (terms, forbidden variants, DO-NOT-TRANSLATE, SI units, style) +
  `__tests__/qa.test.ts` over every i18n module; style guide = skill `localization`. Scenario is "Conservative" in every
  language (the verdict text said "pessimistic" in 24 locales; fixed). Known defects are a ratchet (`KNOWN`): lower, never raise.

- 2026-11-01 — Plurals and numbers: own ICU subset in `src/i18n/message.ts` (`{n, plural, one{# x} few{# xs} other{# xs}}`, `select`, `=N`,
  `#`, non-ICU `decimal{}` for Serbian "1,5 provere") on `Intl.PluralRules`, not `intl-messageformat`: no dependency or ~15 kB parser for
  features we never write, runs on edge/Node/browser unchanged, apostrophes stay literal (uk/fr/it). `fmt(s, vars, locale)` keeps plain `{name}`
  as before; integers print as passed, fractions get the locale mark. Languages whose noun does not change after a number (hu, tr, vi, th) keep
  plain `{n}`; counts in the core text (en/uk only) use `fmtUnit` (months, years, days) and `fmtTimes`; `fmtSig` replaces `toPrecision`
  (it printed `2.34e+4` for VND/THB). New counted strings must be written as plural; `qa-rules.pluralIssues` demands every CLDR
  category the locale uses for 0–1000 and decimals.

- 2026-11-01 — Model catalogs for nl, da, sv, fi added to `CORE_LOCALES`: translated from the English source (718 keys each), machine QA only. The parameter-register source texts stay English in every language until the owner decides (STATUS.md). Not native-reviewed.

- 2026-11-01 — Model catalogs for it, pt (BR), ro added to `CORE_LOCALES` (718 keys each, machine QA only, no native review). Multi-line request letters (`evidence.ts`) keep their `\n` in the catalog (fr/es were repaired; de, pl, cs, sk, sr, bg, nl, da, sv, fi still lose the line breaks — fix when those are reviewed). Parameter-register texts (review-policy status, source/note texts, parameter labels) are still English in every language.

- 2026-11-01 — Model catalogs for vi and th added to `CORE_LOCALES` (718 keys each, machine QA only, no native review). Terms follow the glossary and the words the vi/th UI already uses (vi "bể phân hủy", "chất thải sau phân hủy", "hoàn vốn"; th "บ่อหมัก", "กากหลังหมัก", "ระยะคืนทุน"; verdict labels copied from the dictionaries). Support-scheme, law and regulator names stay as in the English source (official spelling); numbers inside scheme texts follow the locale (vi comma decimal, dot thousands; th dot decimal, comma thousands); CHP is the long glossary term in th. Rendered full reports (4 examples × vi/th): 0 audit findings; the only English left is the parameter-register text (open owner decision above).

- 2026-11-01 — Model catalogs for hu, el, tr, lt, lv, et added (718 keys each, machine QA only, no native review). Rendered reports of these languages differ from English only in the parameter-register texts (≈ 42–47 strings per report), still awaiting the owner decision. Source issues found, not fixed: `scoring.ts:86` placeholder names say `Kwh` for MWh; en "half of the plant's energy earns nothing" ignores `{share}` (whatif.ts:63); "Fact/Assumption/Calculation/Estimate" mixed-case labels are translated while the upper-case codes stay DNT.

- 2026-11-01 — Ukrainian model text moved out of the code into `src/i18n/core/uk.ts` (one place for every language, same shape as the other catalogs). Code writes only English: `T("English", vars?)` and `{ en: "…" }`; the English text is the key, English has no catalog. `uk` is imported statically by `core/i18n.ts` (not loaded by `getCoreCatalog`) so `assess()` stays synchronous for Ukrainian everywhere; other locales still load per request. Strings must be plain literals with `{placeholders}` (no `${…}`); `core-catalog.test.ts` fails on a dynamic source text, a text without a `uk` entry, or a stale key. Acronyms (CAPEX, NPV) are not keys. Ukrainian place names of regions stay in `countries/ua.ts` (`names.uk`). Checked: assess + xlsx sheets for 39 examples × en/uk and 1 example × 33 countries identical to before (except the data hash).

- 2026-11-01 — de/nl/da/sv/fi MQM terms fixed (do not relitigate without a native): EBITDA is "Betriebsergebnis/Bedrijfsresultaat/Driftsresultat vor/vóór/før Abschreibungen" (the bare word means EBIT); confidence is Vertrauensniveau / betrouwbaarheid / pålidelighed ("Datasikkerhed", "Datasäkerhet" = IT security, rejected); da refund = refusion (payback = tilbagebetaling); sv screening = "översiktlig bedömning" ("förstudie" is the feasibility study); register codes FACT/ASSUMPTION/CALCULATION/ESTIMATE stay English; MobilePay/Klarna/iDEAL/SEPA removed from payment strings (not in source, not verified in Stripe); kWe stays kWe in de (SI rule). Reactor/upgrading/existing-CHP/raw-biogas labels are now localised via `localWords` in `processes.ts`; dm abbreviations TS/DS/KA from there too.

- 2026-11-01 — One report template for every inlet: `ResultView` renders AD and process inputs (COD, landfill, existing gas, residue); only AD-specific blocks are swapped (feedstock → digestate diagram, feedstock table, digestate fold, €/kW market bands) and money blocks are hidden when `financialsAvailable` is false. `ProcessReport` was removed; the consistency audit now checks process reports with the AD audit. The sector model case comes from one rule (`segments.ts` `modelExampleId`: a costed example first, a reference without budgets only as fallback) and one helper (`lib/examples.ts` `modelCase`) used by the home picker and the sector page; the card is shown with "—" instead of being hidden when economics are unavailable.

- 2026-11-01 — pl/cs/sk/sr/bg MQM of core catalogs and rendered reports: register codes FACT/ASSUMPTION/CALCULATION/ESTIMATE stay English (a reviewer asked to translate them; the DNT test and this rule win). Counted years use `labels.units.yearsN` (ICU plural per language; other locales keep `{n} <years>`). Terms fixed without a native: sk slurry = hnojovica (kejda is Czech), verdict label bg = Заключение and sr = Zaključak (not Оценка/Procena, which also mean score), sr economics = ekonomika (ekonomija = economy), cs/sk/sr/bg pasteurisation in the CAPEX table follows the catalog, cs gate fee = poplatek za převzetí, bg upgrading = Обогатяване до биометан. Scheme and law names, dates and numbers unverified at the official site: cs MPO biomethane auction results, bg КЕВР statement on PV ≤ 30 kW, sk ÚRSO decision 0078/2026/E-OZ and decree number.

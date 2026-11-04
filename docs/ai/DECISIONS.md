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

- 2026-10-31 (values replaced 2026-11-03: 0.95/1.00/1.00, see below) — Yield realisation stays a fixed scenario factor: no authoritative per-substrate
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
- Free view = the answer (verdict, reasons, robustness class, ranges incl. 3 NPVs, driver NAMES) + WHAT would help: the advisor's tested
  levers with the verdict and NPV after each, and the scenario lab (it only speeds up what the free form already allows). Paid = HOW FAR
  and HOW SURE: break-even sentences (`verdict.thresholds`, never in the free view, since 2026-11-02), the action plan (break-even heat
  price / gate fee per lever, combination, order of action), driver NPV amounts, Monte Carlo, line items, request letters, Excel. The
  verdict stays free: it is the honesty filter (a hidden "no" would be sold, then refunded). "In short" = conclusion first + three facts
  (identical in every tier) + "what the paid report answers for THIS project" (free only, hidden for a clear no). A clear no says the
  report will not change it. — Freemium practice: give the conclusion and the direction, sell the detail; honesty keeps trust.
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
- 2026-11-02 — de/nl/da/sv/fi MQM of core catalogs and rendered reports (do not relitigate without a native): verdict = Einschätzung (de), Besked (sv), Arvio (fi); nl biomethane = groen gas, upgrading = opwerking; fi NPV = nettonykyarvo, digestate = mädäte, feedstock = seossyöte; da confidence = pålidelighed (Datasikkerhed rejected), flow unit Nm³/h never Nm³/t; sv tariff (not taxa); de keeps CAPEX masculine and the verdict line capitalised nouns. Scheme names checked: DK ens.dk støtteudbud til biogas og andre grønne gasser; SE Energimyndigheten produktionsstöd + Klimatklivet; FI Ruokavirasto Maatalouden investointituki. Unverified: SDE++ category names, DK miljøgodkendelse.
- 2026-11-02 — fr/it/es/pt/ro MQM of core catalogs and rendered reports (do not relitigate without a native): pt-BR slurry = dejeto líquido (chorume = leachate), EBITDA = Resultado operacional (EBITDA), DSCR never ICSD; es upgrading = purificación (depuración = wastewater), permit difficulty = dificultad; fr never-payback = "non atteint", pasteurisation (one term), CPB scheme = Tarif d'achat du biométhane injecté, UK planning = Autorisation d'urbanisme; it route = percorso (filiera rejected), palm mills = oleifici di palma; ro upgrading = purificare (epurare = wastewater), gate fee = taxă de primire, Monte Carlo = interval de probabilitate ("certitudine" overclaims, same fix in it/ro offer copy). VS stays VS in all five (DNT test) although local practice is SV/SOV.
- 2026-11-02 — vi/th/uk MQM of core catalogs and rendered reports (do not relitigate without a native): Monte Carlo is a probability range, never "certainty" (vi Khoảng xác suất, th ช่วงความน่าจะเป็น, uk Діапазон ймовірностей); vi "Possible with conditions" = Có thể, nếu đáp ứng điều kiện ("khả thi" reads as a feasibility study); th economics = ความคุ้มค่าทางเศรษฐกิจ (เศรษฐศาสตร์ = the discipline), whey = เวย์, slurry = สเลอร์รี; uk operating margin = Операційна маржа (EBITDA) (not "прибуток" = EBIT), confidence = Достовірність, DM = СР, digester = реактор, kWe = кВт ел.; amounts are "lợi nhuận hoạt động", not "biên". Render harness must call `registerMessages(locale, catalog)` before `assess()`, otherwise model text shows English.

- 2026-11-02 — Market-readiness pass of localisation. (1) Text enters only through `src/i18n`: `react/jsx-no-literals` (lint) blocks typed JSX text, `hardcoded.test.ts` blocks typed `aria-label/title/placeholder/alt/label`, `registry.test.ts` forces every new `src/i18n/*.ts` module into the QA corpus, `prebuild` runs dict/registry/hardcoded/core-catalog tests so a missing language fails `npm run build`. (2) SVG labels (process diagram, tornado, legend) wrap and shrink through `lib/text-fit.ts` + `SvgLabel/SvgStack`; any new fixed-width SVG text must use them. (3) Pages set `overflow-wrap:anywhere` + `hyphens:auto` for text (not buttons: they wrap below 480 px). (4) Search: every page has its own title (`seo-copy.ts`, native query first), description (page lead), Open Graph and Twitter card in the page language through `pageMetadata()`; guide pages are localised in all 25 languages and in the sitemap; pricing carries FAQPage. No search volumes claimed: none measured; read Search Console after launch. (5) A full refund now emails the buyer in their language (`notifyRefund`, once per refund). (6) Boiler route no longer shows "power + heat" under "heat only" in the diagram. (7) Excel labels `NPV, EUR` / `NPV P10, EUR` / `NPV P90, EUR` come from the catalogs (term from the glossary); numbers stay raw (Excel applies the reader's separators), dates are ISO text, there is no CSV export (if one is added: `;` and decimal comma for locales whose decimal is a comma).
- 2026-11-02 — OPEN for the owner, not applied: Stripe product name/description (`PRODUCT` in `payments/service.ts`) is English for every buyer and appears on the checkout line and the invoice. Options: (A) keep English; (B) recommended: name = the buyer's localised plan name (`pricing.plans[plan].name`, already reviewed) and description = the localised one-line "automated screening, not a feasibility study" (`footer.disclaimer`), English original kept in Stripe `metadata`; (C) language-neutral "Methalytics · Standard / Extended". B needs no new translation and no change in payment logic, only `product_data` text; ask the accountant whether invoice lines must be in the buyer's language. Legal items for counsel: `docs/legal/LAWYER-BRIEF.md`.
- 2026-11-02 — Logic audit rules (do not relitigate without new evidence). (1) A stream with DM, VS and BMP all entered in the form is lab-measured: `formToInput` sets `labAnalysisAvailable`, so the calculator, the sample page and a paid report give the same verdict and data score (`logic-audit.test.ts` round-trips all 39 examples). Before, the flag was never set from the form: 3 of 128 STRONG cases fell to POSSIBLE and 45 cases to LOW confidence. (2) Fit scores rate the project, not the data: missing electricity/heat/land and catalogue-only feedstock are deducted once, in data quality; the fit scores keep the note only. Range (scenario/EVPI) plus a data-quality deduction for the same input stays by design: quality says how much rests on the client's data, it never moves NPV. (3) No debt (0 % share) means DSCR is not applicable ("—"), never 0; 0 % debt and 0 % interest are answers in the form. (4) A prompt is shown only where a field answers it: disposal cost only for paid disposal/landfill as chosen by the client; "enter its sale price" only for an own, unpriced, not-paid-for stream. (5) Client prices are evidence to verify, not "market data require review". (6) The xlsx exports no money when the page withholds it (`financialsAvailable` false). (7) Empty gas-grid distance = registered judgement `eng.gas_grid_default_km` (2 km, LOW) in CAPEX, and is "not given", never "more than 10 km", in scoring.
- 2026-11-02 — Owner: the page header and the xlsx do NOT show "Model version / Data version / Data as of" (removed in 56c059f, not restored). Their catalog keys were deleted from all 24 core catalogs. Model and data versions stay in `dataAudit` of the stored assessment for support and audits.
- 2026-11-02 — Data-quality rules (do not relitigate without new evidence). A client deduction exists only if a form field closes it; `logic-audit.test.ts` fills every field for all AD examples and requires zero client factors left. Not deducted (standard path): manure from head counts × national/IPCC per-head values (IPCC 2019 Vol. 4 Ch. 10; range stays in "verify first"; measured tonnes go in the herd line's optional `measuredTonnesYear`, which replaces head count × per-head × housing share); gas used without a heat need; 0 km delivery; disposal cost of delivered streams (never credited). Lab gap is one item: 15 points, 27 when > 40 % of the mass is LOW-confidence catalogue (was two items for one action). `price_proxy` and `capex_unvalidated` are client-closable (own price, supplier quote for the chosen route) and shown under "What you can add", but stay outside the insufficient-data gate (`ADVISORY_CLIENT_FACTORS`). Heat value counts as a proxy only when heat is sold/used (that is when the heat-price field exists). A herd-only dairy (no energy, land or lab) now gets a verdict instead of INSUFFICIENT (dairy_400 with full data is WEAK too); if the owner wants "no electricity data = no verdict", add it as an explicit rule, not via points.
- 2026-11-02 — Calculator / result / samples rebuilt as one flow (input → result → meaning → next step). Rules: (1) the report audit reads
  figures through `Stat`'s `data-stat-label/value/note` attributes, not CSS classes; keep them when restyling. (2) The calculator's live
  panel and its result are ONE `assess()` of the deferred form (uncertainty off); the panel shows physics + data confidence only, money only
  in the result (before the energy step it would rest on national defaults). (3) A typical case opens straight on its result; sample pages link
  `calculator?example=<id>` (param read once, then removed). (4) The robustness NPV sentence is `sr-only`; `DecisionRange` draws the same three
  NPVs against zero (aria-hidden). Equal payback ends are shown once ("no payback", not "no payback – no payback"). (5) No new three.js on these
  pages: SVG/CSS only (performance guard above, print/PDF, battery); the process is shown by the flow diagram with the client's own numbers.
  (6) Verdict colours in charts: green #0e7a55 / amber #c98a0b / red #c0392b passed the dataviz palette validator; amber is below 3:1, so every
  mark also has a shape and a legend label. (7) The sample map is drawn in the box's real pixels (ResizeObserver), not a scaled viewBox, so
  axis text stays legible at 360 px; money ticks render after hydration (Node/browser CLDR compact suffixes differ).
- 2026-11-02 — Advisor (`core/advice.ts`) tests only changes the client controls: a year-round heat buyer for 80 % of the unused heat;
  food waste up to 30 % of VS from 15 km at a 6 €/t gate fee; neighbours' manure trucked 5 km (×2, ×3); debt share down to DSCR 1.3,
  only when DSCR is one of the Strong gaps. Never prices, yields, CAPEX or support (stress tests / break-even cover those). Judgement
  values live in `ADVICE_ASSUMPTIONS` (LOW; gate fee checked against WRAP Gate Fees 2025/26: AD fees fell, several councils pay £0 or
  less). Food waste at 6 €/t and trucked slurry usually LOSE money here — shown as "also tested", never hidden; the paid break-even gate
  fee says what it would take. Cluster ≠ plant-size table (that one assumes the extra feedstock on the same terms, no haulage).
- 2026-11-02 — Previews run `assess(…, { lite: true })` (≈ 13 runs; no stress tests, EVPI, Monte Carlo, plant sizes, quote check,
  support cases). `advice.test.ts` proves lite = full (verdict, gaps, ranges, route, confidence; 39 examples) and that "Apply" (form
  round trip, en/de number formats) gives the preview's verdict and NPV. Break-even heat price and gate fee are linear roots on the
  lever's OWN route (the best-route NPV bends where the route switches). A sold report stores `advice` computed at checkout.
- 2026-11-02 — OPEN for the owner (pricing; nothing changed in code): keep list prices through the closed beta and measure willingness
  to pay (Van Westendorp questions in beta interviews, checkout drop-off). Value anchors: a farm biogas feasibility study ≈ CHF 8–12 k
  (Kanton Thurgau, 2014, 60 % subsidised); ADEME funds 50–70 % of methanisation studies, eligible costs up to €100 k → €160–390 is
  1–4 % of a farm study and < 1 % of an industrial one. Proposal: (1) a size factor from the server-side quote (CAPEX < €1 M ×1,
  €1–5 M ×1.5, > €5 M ×2.5) — the flat per-project price is the real mismatch, not the level; (2) Standard = decision report (answer,
  action plan, checks, Excel), Extended = investor pack (routes × scenarios, stress tests, support schemes) at ≈ 1.5× Standard instead
  of 1.2×, without cutting Standard (declined 2026-11-01); (3) a discounted re-run of the same project after new evidence.

## 2026-11-03 — Quality contract (`npm run scorecard`, thresholds in `scripts/scorecard.ts`)
- Structure: the nine ISO/IEC 25010:2023 characteristics (functional suitability, performance efficiency, compatibility,
  interaction capability, reliability, security, maintainability, flexibility, safety) plus decision accuracy. Status: GREEN met on
  valid evidence, AMBER met only on a proxy / small n / stale evidence, RED missed, GREY not measured (counts as not met). Facts are
  measured by the script or read from `scripts/scorecard-evidence.json` (date + commit, measured values only). A threshold changes only
  with new evidence, never to turn a row green; a reference never leaves a set because the model misses it.
- Decision. D1: 0 STRONG on projects closed for economic reasons, green from n ≥ 10 — a false "go" costs the study and at worst a failing
  plant (AgSTAR 2020 §7.0: poor planning is the root cause of many failed digesters; decision frames in PRODUCT). D2: verdict class
  (STRONG/POSSIBLE = go, WEAK/NOT = no, INSUFFICIENT = miss) agrees with the documented outcome in ≥ 80 %, n ≥ 8 (= beta launch gate).
  Cases enter `realityCases` only with a documented outcome (study, operator, official record) and the input known before it. Operating
  AgSTAR digesters are shown, not counted: their support and profitability are unknown.
- Accuracy. A1 gas/energy within ±25 % of real plants in ≥ 80 %: AgSTAR 2020 §7.2 puts pre-feasibility at "±25 percent or greater".
  Today's set = AgSTAR electricity (self-reported, downtime included); metered sets join as they come. A2 CAPEX ±30 % in ≥ 70 % (stretch:
  near AACE class 4) and A3 within AACE RP 18R-97 class 5 (actual −50 % … +100 % of the estimate) in ≥ 95 % (honest floor for a screening;
  FNR 2005 survey spread 1 010–6 411 €/kWe, IEA Task 37 2015 Table 9). Ratio = model ÷ published (midpoint of a range). Counted:
  official, project, company, academic, aggregate sources; press and vendor figures shown, not counted (source policy above).
- Range honesty. R1/R2: the real value lies inside the conservative–optimistic band in 70–90 % (target ≈ 80 %, the P10–P90 reading
  clients give it; 100 % = band too wide to inform), green from n ≥ 20.
- Integrity. I1 balances close; I2 0 contradictions over 39 examples × 33 countries (`auditModel`; unordered scenarios count: a client
  reads "optimistic" as better); I3 report = model; I4 0 duplicate ids; I5 0 dead input fields (static: read by `src/core`, filled by
  `src/lib/form.ts`); I6 support never moves the base verdict; I7 0 market values undated or > 400 days old (annual statistics + lag).
- Performance: Core Web Vitals "good" at p75 (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1). Before launch: Lighthouse mobile lab, 5 key pages,
  worst page counts (`--web`); INP has no lab metric, so TBT is a proxy and AMBER at best until field data. Browser evidence is stale once
  any rendered file changed after its commit.
- Interaction: U1 task success ≥ 90 % and U2 median ≤ 5 min to the first verdict (the "verdict in minutes" promise) in moderated
  sessions, n ≥ 5 per round; U3 WCAG 2.2 AA = axe 0 serious/critical AND a recorded keyboard pass (axe checks only machine-checkable
  criteria); U4 0 hard l10n errors = the `qa-known.ts` ratchet at 0.
- Security S1: OWASP ASVS L1 for the site, L2 for checkout, webhooks and report tokens (money and a bearer link to paid content);
  needs a checklist run, the 2026-11-01 code review is not one. Compatibility C1: Stripe test-mode end to end (checkout → webhook →
  email → report); unit tests mock Stripe. Reliability: fault-tolerance tests + restore drill. Maintainability: 0 failing tests, type
  errors, lint errors. Flexibility: every example runs in every country; all locales and catalogs complete. Safety: hazard register on
  every case; INSUFFICIENT_DATA never sold.
- 2026-11-03 (scorecard round 2; model results unchanged: compare-scenarios 0 of 1 287 verdicts, 0 NPV moved).
  Real outcomes: `src/countries/data/agstar-shutdown.json` = EPA AgSTAR "Shutdown" sheet, farm-scale, one animal, no co-digestion, with a
  recorded "Reason for Closure" (38; 10 economic: cost, payback, buyback price, bankruptcy). Run at today's prices. D1 = 0 STRONG of 10;
  D2 stays AMBER until documented "go" cases exist (operating digesters are not "go": support and profit unknown).
  AgSTAR electricity: 38 of 79 rows are exact multiples of 8 760 h (nameplate × full year, not readings); without them accuracy is still
  34 %, so the scatter is not only reporting. The scenario band (input uncertainty) is NOT widened: no primary source splits the scatter
  into downtime vs reporting, and widening would move verdicts on judgement. The report's existing "reality check" (p10–p90 of model ÷
  reported) is the real-plant range; contract R1b tests it leave-one-out (78 %); R1 stays as a diagnostic.
  CAPEX references: news-sourced figures are `press` whatever the direction of the miss (ES Calahorra 0.67, GB Coleshill 0.86); the LWK
  75 kW cases were rebuilt at 75 kW (580 cows; 750 gave 110 kW) and the "new storage" case with existingStorage 0. No recalibration:
  the only primary maize-CHP anchor (BMWK/IEE/DBFZ 2024 Tab. 4-1) reads 1.15; TR (academic, unit doubt), IT (sector aggregate of
  2008–12 plants), RO (2015 nominal) do not state scope (silage clamp, storage, grid). New-storage LWK reads 1.75: storage cost open.
  Unordered scenarios (54): all are plants with negative EBITDA in base and optimistic, where the optimistic volumes lose more. Tried and
  reverted: purchases at base price (54 → 53) and swapping the stress sets by NPV (breaks CAPEX order). Needs a scenario redesign.
  Payback: text above 25 years says "> 25 yr" like the tiles (`PAYBACK_SHOWN_MAX_YEARS`; new key in 24 catalogs); the audit had caught 1
  of 54 such cases (comma thousands). Dead fields removed: `projectRole` (analytics only, stays in form state), `assumedSupportEurPerKwh`.
  I7: a value > 400 days old is stale unless `evidence.checkedOn` ≤ 400 days confirms it is the latest period (CA Hydro-Québec 2025, VN
  EVN 10 May 2025, US OEWS May 2025 checked 2026-11-03: no newer release). Still stale: UA grid factor (Ember/OWID 2022), BR/IN CAPEX factors.
  Web: Lighthouse runs simulated and applied throttling (P1 green needs both); keyboard self-check `scripts/keyboard-check.ts`; ASVS 4.0.3
  self-assessment `scripts/asvs-checklist.json` (fails: admin login throttling 2.2.1, token in URL 3.1.1, admin MFA 4.3.1). All three
  are self-assessments, labelled so on the scorecard. `html { scroll-padding-top: 5rem }` fixed focus under the fixed header (2.4.11).
- 2026-11-03 — Owner: unreliable or old CAPEX references are deleted, not shown as noise. Removed from `capex-benchmarks.json` and
  `capex-references.ts`: TR academic study (unit doubt), IT sector aggregate (2008–12 plants), RO 2015 plant, all news-sourced figures
  (PL, CZ, GB, ES, RO 2019, DE topagrar) and the UA vendor quote. Kept: 2 FR issuer filings (2025/26, same developer) and the primary
  German anchors (BMWK/IEE/DBFZ 2024, LWK, AgSTAR via Cornell). Nothing in the model changes (`applied: false` everywhere). A2/R2 now rest
  on n = 6: the row says so. New references enter only from official bodies, filings or studies with stated scope and a date ≥ 2024.
  The earlier line about TR/IT/RO reading 1.45–1.94× no longer applies: those points are gone.
- 2026-11-03 — First European references. ODRÉ (`odre-biomethane.json`): metered annual injection per French site (GWh HHV) next to the
  publisher's "capacité théorique de production à date" (basis undefined; agricultural sites inject a median 1.00 of it, so it is a
  planned output, not nameplate × 8 760 h). It tests the spread, not accuracy: R3 = share of agricultural sites (in service ≥ 1 full year)
  whose output ÷ plan lies inside the model's conservative–optimistic spread for fr_farm_injection (0.75–1.10): 88 % of 547 in 2025
  (2024 86 %, 2023 80 %). AMBER at best, because the capacity may be updated to match output. No feedstock per site, so A1 for Europe
  stays GREY (A1e) and AgSTAR is labelled US. DBFZ Report 50 (18.12.2023): 248 upgrading sites, ≈ 152 484 Nm³/h, ≈ 1.1 bn m³ in 2022
  → national utilisation ≈ 0.82 vs the model's implied 8 000 / 8 760 = 0.91 (one rounded aggregate, not a per-plant set; recorded,
  not applied). DBFZ CHP full-load hours (4 282 h with flex premium, 2021) are not comparable: flexible plants double the engines.
- 2026-11-03 — Swedish official farm-plant aggregate (A1s): 108 farm plants 2024, 1 188 kt substrate (98 % manure) → 200 GWh LHV =
  168 kWh/t; the model gives 122 kWh/t for the catalogue's dairy slurry (8.5 % DM) = 0.72. Not acted on: the statistics do not split
  slurry from solid manure (solid gives ≈ 3× per tonne) or species; AgSTAR (0.94) and Danish Normtal DM (7.96 %, below the catalogue)
  point the other way. Open check: share of solid manure in Swedish farm plants (Jordbruksverket / plant survey) before any yield change.
- 2026-11-03 — Danish Normtal 2026/27 for dairy manure was tried and reverted: its ex-storage slurry (34.1 t at 7.96 % DM) carries storage
  water, so the digester and store grew 28–48 % for the same gas (double-counted store). A future swap must use excreted mass (28.9 t,
  "ab dyr") with the DM, and be compared with compare-scenarios. Manure per head stays IPCC 2006 in every European profile.
- 2026-11-03 — Sweden A1s refined: farm-plant digestate 1 153 kt at 6 % DM + biogas mass (≈ 41 kt) give a feed of ≈ 9.3 % DM (8.8–9.7),
  i.e. ≈ 6 % solid manure in the catalogue's slurry/solid blend, not a solid-manure effect. Model ÷ actual = 0.77 (co-substrates, 2 % of
  the mass, left out, so slightly low). The gap is per kg VS: Sweden implies ≈ 0.22 m³ CH4/kg VS realised vs the model's 0.18.
- 2026-11-03 — FNR Biogas-Messprogramm III data sheets (`bmp3-plants.json`, 53 of 61 plants, 2016–18, fed mass and methane derived from
  metered power): 48 plants feed grass, whole-crop cereal silage, grain or beet, which the calculator cannot enter (catalogue gap; the most
  frequent substrate is grass silage, 31 plants). 3 plants are ≥ 98 % catalogue substrates: model ÷ measured 0.65 / 0.75 / 0.72 (fed silage
  converted back to harvested mass). Pure-maize BGA 38: 396–412 L CH4/kg VS measured vs model 340 × 0.90 = 306; all 52 plants median
  368 L/kg VS. Volunteer plants (likely better run) and n = 3, so no change yet.
- 2026-11-03 — What-if, NOT applied: realisation 0.95 / 1.00 / 1.00 (KTBL standard yields as the base, as KTBL itself uses) moves 39 of 1 287
  verdicts (34 up, 2 STRONG → POSSIBLE, 3 other), A1e → 0.73 / 0.83 / 0.80, Sweden → 0.86, AgSTAR within ±25 % 34 → 37 %. It raises the
  false-"yes" risk the decision frames call the costliest, on n = 3 plants + one national aggregate. Apply only with a second per-plant
  European set (Messprogramm sheets with grass/GPS once the catalogue has those types, or beta meters).
- 2026-11-03 — ACER (CHEST 2025, slide 27, from S&P Global/ICIS/EEX/IEA): biomethane production cost 61 €/MWh (40–86), TTF 37.7, TTF + GO
  manure 103 (88–122), waste 60.5, unsubsidised waste 90 (basis not stated; GO = DK/NL/DE). The model's EU price (0.8 × business gas +
  20 €/MWh LHV premium ≈ 60 €/MWh LHV in DE) matches waste biomethane but is about half the 2025 traded value of manure biomethane with its
  GO/proof of sustainability. Not applied: GO value is a compliance market (roadmap 2: EU compliance value as a support case).
- 2026-11-03 — Catalogue: grass silage (incl. clover grass), whole-crop cereal silage, ground cereal grain and fresh sugar beet added from FNR
  Leitfaden Biogas 2010 Tab. 4.3/4.4 (after KTBL; CH4 310 / 329 / 380 / 350 L/kg VS, DM/VS 35/90, 33/95, 87/97, 23/90; RED pathway = maize,
  approximated). Labels in 25 locales are machine-written (no native review). Existing results unchanged (0 of 1 287).
  Messprogramm III re-tested: 39 plants now enterable (BGA 09 and 21 excluded: > 450 L CH4/kg VS, above what agricultural mixes give).
  Model ÷ measured median 0.78, 62 % within ±25 % (A1e RED). With realisation 0.95 / 1.00 / 1.00 (KTBL/FNR standard yields as the base):
  median 0.87, 87 % within ±25 % (A1e GREEN), Sweden 0.86, AgSTAR within ±25 % 34 → 37 %, D1 still 0 STRONG on economic closures, R3 86 %;
  39 of 1 287 verdicts move (list in the earlier what-if line).
- 2026-11-03 — APPLIED (owner): realisation 0.95 / 1.00 / 1.00. Catalogue yields are KTBL/FNR standard yields, i.e. already full-scale
  values; × 0.90 counted the shortfall twice. Evidence: 39 Messprogramm III plants (median 0.78 → 0.87, within ±25 % 62 → 87 %), Swedish
  farm plants 0.77 → 0.86, AgSTAR median 0.94 → 1.05 (within ±30 % 0.44 → 0.42). compare-scenarios: 39 of 1 287 verdicts — 32 up
  (marginal plants above NPV 0 or POSSIBLE → STRONG: de_starch × 11, dk_cluster × 4, br_vinasse × 6, es_olive × 3, th_pome × 3,
  ro_pig_complex × 3, …), 2 STRONG → POSSIBLE (pl_frozen_veg@FI boiler → CHP, se_biowaste_fuel@HU CHP → biomethane: more gas makes the
  costlier route the highest NPV, which misses the STRONG rule), 5 others. Median NPV +0.1–0.2 M€ in the EU, ≈ 0 in US/CA. Slurry test band
  now 6–19 m³ CH4/t (FNR Tab. 4.2). Conservative 0.95 keeps a margin for a worse-run plant than the volunteer sample.
- 2026-11-03 — Owner: aggregate national statistics with coarse substrate classes are not a validation source. Poland (KOWR 2025) was
  tried and deleted: its classes ("food-processing waste", "fruit/vegetable residues") cannot be mapped to a substrate, so the
  comparison measured the mapping, not the model. Residue accuracy needs plant-level data (beta processors with meters).
- 2026-11-03 — Residue catalogue checked against primary sources (FNR Leitfaden 2010 Tab. 4.5 EEG standard yields, 4.7, 4.9 after KTBL;
  LfL Bayern gas-yield database as an upper bound, Baserga). Changed: grain stillage 8 % DM / 92 % VS / 360 → FNR 6 / 94 / 385 L CH4/kg VS
  (−18 % per tonne; LfL wheat 21, rye 30 m³/t bracket it); brewer's grain 280 → FNR 313 (+12 %); beet pulp pressed 71 → 65 m³ CH4/t (EEG
  standard; LfL max 65; FNR 49 sets the low bound) and wet pulp likewise. Unchanged, consistent with sources: potato pulp (44 vs FNR 47),
  whey (19 vs LfL max 18–20), source-separated food waste (IEA Task 37 2018), maize, grass, whole-crop, grain, beet. No primary open
  value found: slaughter residues, fats, fish, POME, olive pomace (kept, MEDIUM/LOW as before). compare-scenarios: 1 of 1 287 verdicts
  (gb_whisky@US WEAK → POSSIBLE, NPV −12 k → +3 k €, more gas from draff).
- 2026-11-03 — Gas-stream inlets checked on EPA LMOP (published 2024-09, data 2022, GHGRP-reported collection; `lmop-landfills.json`).
  Landfill method: our first-order decay = EPA's own estimate for the same sites (median 1.05). Reality: sites collect a median 60 % of that
  estimate (p10–p90 24–83 %), so with the AP-42 defaults a client would type (k 0.04, L0 100, 75 % collection) the model reads 1.90 on
  142 closed sites (A1l RED); the example us_closed_landfill uses 70 %. Engines on landfill gas: real electricity ÷ our TEDOM full-load
  curve = 0.80 (p10–p90 0.67–0.91, n 284; A1g RED): part load, siloxanes, ageing. Not applied yet (both move gas-stream verdicts):
  proposed collection guidance ≈ 60 % of generation and a site derate for landfill/existing-gas engines; AD engines keep the datasheet
  (no open per-plant evidence against it). Wastewater/sludge: no current open per-plant data (A1w GREY).
- 2026-11-03 — APPLIED (owner): landfill collection guidance ≈ 60 % (EPA LMOP 2022, 25–85 %) in the form help of 25 locales (machine
  translation, no native review) and the us_closed_landfill example 70 → 60 %. compare-scenarios: 5 of 1 287 verdicts, all this example
  outside the US (GB, LT, FR, ES, FI: POSSIBLE → WEAK, NPV −0.9…−1.9 M€: less gas for the same upgrader); in the US the boiler case loses
  less (smaller boiler). The engine derate for gas streams is still open.

- 2026-11-04 — Accuracy root causes per reference (`scripts/accuracy.ts` prints them; shared code `scripts/accuracy-references.ts`, used by
  the scorecard too). AgSTAR (79, self-reported): heated tanks median 0.95, unheated covered lagoons 1.54 (19; the model designs a heated
  tank and has no ambient-temperature yield), induced blanket / fixed film 2.3–2.9 (liquid fraction only), extra gas uses (CNG, pipeline,
  boiler) 1.39 (18: electricity is part of the gas), 4 plants report more power than the herd's manure can give at 100 % collection and
  Bo (AWMFH 2008 Table 4-5(a), highest yield 125 lb milk/d: 20 lb VS/d = 9.07 kg × IPCC Bo 0.24 × datasheet η: co-digestion or herd
  mismatch, model 0.20–0.51). Like-for-like rule (fixed before ratios, both directions): dairy, electricity only, heated tank, ≤ ceiling
  → 40 plants, median 0.95, 53 % within ±25 %; the rest of the misses are plants far below their herd's gas (Ravenna 72 kWh/head vs
  ≥ 1 600): downtime / partial collection, which the report's real-plant range (R1b) carries. A1 status stays on all 79.
  Messprogramm III misses (5 plants at 0.70–0.73): energy-crop plants measuring 390–418 L CH4/kg VS vs KTBL standard 306–337 (volunteer,
  long retention); no change (realisation already 1.0). Landfills (LMOP): our first-order decay = EPA's estimate (1.05), but per site
  0.70–1.97 because the client enters total waste ÷ years (uniform deposition); methane recovered = volume share × CH4 ÷ 50 %: closed sites
  collect 68 % of the gas by volume at 40 % CH4 → 48 % of the methane (open 54 %). The earlier 60 % guidance was a volume share.
  CAPEX: LWK reference rebuilt at 510 cows (the realisation change had made 580 cows an 85 kW plant: 1.43 → 1.31); "new storage" 1.60 is
  0.64 M€ of storage incl. the TA Luft 2021 150-day gas-tight store a ≈ 2014 concept did not need; CHP 2 400 €/kW at 100 kW.
- 2026-11-04 — APPLIED: `eng.chp_landfill_site_factor` 0.80 on landfill-gas engine output (EPA LMOP 2024-09, 284 projects; same in every
  load band; fitted on even-numbered projects 0.80, odd half 0.79; installed rating stays the datasheet one, heat unchanged). AD engines
  keep the datasheet (AgSTAR heated tanks 0.95–1.00). Landfill help "≈ 50 % (12–83 %)" of the modelled methane in 25 locales and
  us_closed_landfill 60 → 50 %. compare-scenarios: 14 of 1 287 verdicts, all us_closed_landfill outside the US (PL HU IT SK DE AT CZ RO
  EE LV GR RS MD BG: POSSIBLE → WEAK, NPV −1.8 … −2.7 M€); US/CA/BR/IN NPV +0.05 … +0.3 M€ (smaller kit). A1g 0.80 → 0.99, A1l 1.89 → 1.26.
- 2026-11-04 — Synthetic variations (`synthetic-variations.test.ts`, seed 20261104, ≥ 2 000 runs, part of Re1): the 39 examples varied in
  size (× 0.05–20), data completeness (quantities only vs as entered), country (33 + regions) and seasonality. Invariants: balance audit,
  VS ≤ DM, CH4 ≤ biogas, power ≤ 50 % of CHP fuel, N not created. Metamorphic: size (feed × k exactly), typed catalogue DM/VS/BMP =
  empty fields, start month of a year-round feed, 25 languages give identical numbers, FX × k with local inputs × k gives the same EUR
  result, display EUR → USD conversion. A mutation (local inputs not scaled) fails it at once.
- 2026-11-04 — /methodology "How accurate we are" replaces the single AgSTAR block: six sets (AgSTAR all + like for like, Messprogramm III,
  LMOP engines, LMOP closed landfills, CAPEX) with n, median, p10–p90, share within ±25 % (CAPEX ±30 %), a log-scale strip (p10–p90,
  middle half, median, tolerance band) and source · period · basis; untested segments are named. Text machine-written in 25 locales.
- 2026-11-04 — Pig manure per place checked, NOT changed. Primary: IPCC 2006 Vol. 4 Table 10A-7 market swine VS 0.27 (NA, 46 kg) / 0.30
  kg/head·d (W/E Europe, 50 kg) and AWMFH 2008 Table 4-10 grow-to-finish 0.377 kg VS/d at 154 lb, both AS EXCRETED; LfL Basisdaten Tab. 4b
  (11/2024) gives DüV storage volume 1.83–1.89 m³ per average finisher (no DM). Slurry reaching a digester is lower: LfL Schwarzenau
  measured 1.28 m³ per place·a at 5 % TS (via top agrar; LfL report "31611 bericht sommer") ≈ 0.14 kg VS/d vs the catalogue's 0.16 →
  Europe confirmed. US: as-excreted would be × 2.3 (1.75 t at 9.5 % TS), but AgSTAR NC covered-lagoon swine farms read 35–57 kWh/head
  vs model 52–55 today (would become 2.3 × too high) while 4 heated US swine plants read higher than the model (0.27–0.61 and 3.28):
  conflicting, n tiny, sows mixed into head counts → no change; needs per-place metered US data.
- 2026-11-04 — Lagoon temperature checked, NOT changed. IPCC 2006 Table 10A-7 (van't Hoff–Arrhenius, Mangino et al. 2001, retention
  up to a year): anaerobic-lagoon MCF 66 % at 10 °C, 78 % at 15 °C, 80 % from 18 °C. The model designs a covered lagoon only where the
  annual mean is ≥ 20 °C, i.e. at the IPCC maximum: a temperature factor would be 1.0 for every case the model can produce. The AgSTAR
  lagoon gap (19 US lagoons, 1.54; California ≈ 17–18 °C, MCF 79–80 %) is therefore NOT temperature. Open hypotheses (unverified):
  flush dairies separate solids before the lagoon, partial herd, sludge build-up; the backtest enters every plant as a heated tank.
- 2026-11-04 — Landfill help rewritten in 25 locales: share of the modelled METHANE (≈ 50 %; closed ≈ 48 %, operating ≈ 54 %; 21–82 %),
  with the note that drawn-in air makes a volume share read higher. Numbers in the model unchanged.
- 2026-11-04 — Source audit since commit 065f9e3 (primary documents re-read, extracts re-matched by script). Verified exactly: LMOP extract
  (828 landfills, 305 projects) = EPA composite xlsx 2024-09; AgSTAR extract (161 rows: head, electricity, digester) = EPA xlsx; the 10
  "economic" closures read as recorded (two are weak: developer bankrupt, "to be reconfigured"); Messprogramm III BGA 38 = FNR data sheet
  (17 334 t, 33.4 % DM, 96.8 % VS, 128 m³/t, 412 L/kg VS; methane derived from metered power ÷ CHP η); Swedish farm plants 108 / 1 166 kt
  manure / 1 188 kt / 200 GWh / digestate 1 153 kt at 6 % DM = report Tab. 4, 14; Eurostat DE electricity 0.2366 €/kWh and gas 81.1 €/MWh
  (2026-S1) = live API; LfL 20 m³ per 8 000-kg cow; IPCC 2006 dairy VS 5.1 / 4.5; FNR grass, beet, grain, stillage, brewer's grain.
  Corrected (FNR guide, French ed. 2013, Tab. 4.4, 4.7, 4.9; IPCC 2019 Refinement Tab. 10.13A × 10A.5): pressed/wet beet pulp typical
  285 → 218 L CH4/kg VS (the measured FNR mean; 285 was the EEG 2009 legal standard yield, outside the measured 181–254, now the high
  end); cattle solid manure 22 % / 82 % / 165 → 25 % / 80 % / 250 (FNR Tab. 4.9); whole-crop silage high 380 → 350; dairy VS per cow
  Western Europe 5.1 → 5.0, Eastern Europe 4.5 → 3.7 kg/d (latest IPCC default; the 2006 table was 13 years older). LMOP engine factor
  provenance now says MW is "actual or estimated" and flow "current or planned" (LMOP field definitions). compare-scenarios: 2 of 1 287
  verdicts (us_dairy_rng@LT, @RS POSSIBLE → WEAK: Eastern dairy VS); NPV down to −0.49 M€ for Eastern dairy cases. Validation moved the
  right way: Sweden 0.86 → 0.90, Messprogramm p90 0.95 → 1.02, median 0.87. Not changed, flagged: maize silage nutrients (model 4.5 kg N/t
  vs FNR Tab. 4.3 2.8 % DM = 9.2 kg/t; other German tables are lower), poultry manure (model 27 % DM/220 L vs FNR 40 %/280 L, different
  products), pig slurry VS-specific 290 vs FNR 250 at equal m³/t; Eastern dairy needs national Tier 2 VS (Poland NID 2025 not downloadable
  here); support schemes, ODRÉ, Damodaran CRP and AP-42 k/L0 not re-read in this audit.
- 2026-11-04 — Competitor benchmark from primary sources (table and positioning in PRODUCT › Market position). Re-run recipe: EPA/GMI AD
  Screening Tool v2.2 xlsm (globalmethane.org is unreachable; Wayback copy of `documents/AD-ScreeningTool_v2.2.xlsm`, 2023-01) and EPA
  LFGcost-Web v3.6 (`epa.gov/system/files/other-files/2023-09/lfgcost_web_v3.6.zip`) are macro workbooks: read the yield table, the
  calibration tab and the cost formulas with openpyxl and apply them to the same inputs (results recorded in `scripts/benchmark.ts`).
  Do NOT claim "the only back-tested tool": AD-ST's calibration factors are the 25th–75th percentile of measured ÷ modelled biogas on
  > 100 EPA digesters (manual v2.2, 03/2022). Its calibrated mid sits 1.2–2.4 × below the model on equal VS; the factor also covers
  collection, downtime and flaring, so this is an open A1 question, not a retune. BiogasFlux (free, 10 languages, method undisclosed,
  paid tiers announced without price) makes yield/revenue/payback a free commodity → paid value must rest on verify-first, break-even and
  risk, not tables (Excel and line items are free in every public workbook). ADEME 2025 study conditions PDF answers 403 to scripts;
  ceiling and rate come from its indexed text (€100 k feasibility, €50 k diagnostic, 50–70 %), re-read in a browser before quoting.
- 2026-11-04 — Beta funnel analytics: first-party, cookieless **event log** (`funnel_events` / `data/funnel.json`); the owner rejected
  daily counters only (no per-visit path, no time to pay). Each event: time, event, props, `visit` = SHA-256(daily salt | IP | UA)
  truncated (salt in `funnel_salts`, older salts deleted, so ids cannot be recomputed or followed past one UTC day), `order_id` on
  money events (buyer identity stays in the CRM order, never copied). Allow-list of events/keys stays (schema hygiene, no free text,
  URL or token); values: slugs ≤ 64, finite numbers (2 decimals), booleans. `calculator_submit` carries plant class, t/y, kWe, CAPEX/NPV
  in k€ and payback. Money and delivery stages are server-only; the public endpoint refuses them. Retention 400 days. Read:
  `GET /api/admin/funnel?days=30` (`visits` = distinct visits, payments credited to the visit that created the order, so a webhook/poll
  race no longer double-counts; `events` = raw counts; `&raw=1` or `&format=csv`). No GTM/GA: consent + third-party transfer.
  Persistent cookie id rejected: needs a banner and loses 30–60 % of EU visitors who decline.
- 2026-11-04 — Pricing for the closed beta: owner chose to KEEP €160–390 (nothing changed in code). Evidence: substitutes are free (KTBL, Luke, AD-ST, WSU, LFGcost,
  LandGEM, BiogasFlux) or paid per year (RETScreen CAD 869) or sales-led (Anessa, no price); the next paid step is a study at CHF 8–12 k
  (farm, 2014) up to an ADEME ceiling of €100 k, 50–70 % subsidised. No willingness-to-pay data exist yet (0 paid orders). Recommendation:
  keep €160–390 through the closed beta (beta reports free), measure checkout_open → checkout_created → paid by tier and plan plus Van
  Westendorp in interviews; revisit after ≥ 3 paid at list price (flat tiers vs the size factor of 2026-11-02).

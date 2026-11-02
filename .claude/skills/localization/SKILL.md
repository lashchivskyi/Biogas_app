---
name: localization
description: Write, translate or review Methalytics interface text in any of the 25 locales (style guide per language, glossary, do-not-translate list, automatic QA). Use for "translate", "add a language", "fix wording in <language>", or any change to src/i18n/**.
---
Practice: LISA QA model / ISO 17100 (translate → revise by a second linguist → review by a domain expert). The code
enforces what can be checked by machine; native review of meaning and tone is still a human step and is never claimed
as done by the tests.

## Sources of truth (code, not this file)
- `src/i18n/glossary.ts` — approved terms and forbidden variants per locale, DO-NOT-TRANSLATE list, SI units, style data.
- `src/i18n/__tests__/qa.test.ts` (+ `qa-rules.ts`, `qa-corpus.ts`) — QA over **every** i18n module, not only `dict`.
  A new `src/i18n/*.ts` module with user text must be added to `qa-corpus.ts` `modules()`.
- Decision 2026-11-01 (DECISIONS.md): one local name per paid plan; the term the UI of a language already uses wins.

## Rules for every language
1. **Write as a native specialist**, not word for word. Rebuild the sentence if the source order is unnatural. Keep the
   business tone: for a farm or plant owner and an investor, short, concrete, no slang, no marketing superlatives.
2. **Do not translate** (exact spelling, local equivalent only in parentheses for HHV/LHV): Methalytics, Stripe, BMP, VS, UASB,
   EGSB, CSTR, POME, RNG, Bio-CNG, PPA, EPC, Monte Carlo, P10/P50/P90, EVPI, EU RED, HHV/LHV, the register codes
   FACT / ASSUMPTION / CALCULATION / ESTIMATE and HIGH / MEDIUM / LOW, source names (Eurostat, IEA, EPA AgSTAR, Damodaran).
   DM/TS use the local abbreviation from the glossary (`dm`). SI symbols stay Latin: kWh, MWh, Nm³, t, ha, kW, m³ —
   Cyrillic units only in Ukrainian (кВт·год, МВт·год, т, га, Нм³).
3. **One term per concept** from the glossary (digester, digestate, feedstock, CHP, biomethane, payback, NPV, IRR, COD,
   conservative / base / optimistic, plan names). Scenario is **Conservative**, never "pessimistic". Do not mix the English
   abbreviation (NPV, IRR, CHP, COD) with the local one except as "Kapitalwert (NPV)".
4. Placeholders `{name}` and `[accent]` stay exactly; move them to the natural place in the sentence. A string with a count
   (`{n}` checks, rows, sizes, days…) is written as `{n, plural, one{# check} other{# checks}}` with the CLDR categories of the
   language (uk/pl/cs/sk/lt: few + many, lv: zero, ro: few + `de`, sr: few + `decimal{}` for fractions, en/de/fr/it/es/pt/nl/sv:
   one + other). Where the noun does not change after a number (hu, tr, vi, th) keep plain `{n}`. Pass the locale to `fmt(s, vars, locale)`.
   Everything else is word-for-word `{name}`; no other ICU forms. Rules and syntax: `src/i18n/message.ts`; tests: `plural.test.ts`.
5. Never change keys, formulas or numbers. Decimal separator and spacing follow the table below.
6. Titles and headings: sentence case in every language except German nouns (normal German capitalisation) and where a
   plan name is a proper name (pricing). Buttons: short verb or noun, no full stop. Expect +30–40 % length; a button that grows
   > 60 % over English is reported by QA — shorten it.
7. No invisible characters (soft hyphen U+00AD, zero-width U+200B …), no straight `"` quotes, no double spaces, no
   Latin look-alikes inside Cyrillic/Greek words. Serbian is **Latin script only**. Dates are written by `Intl` (INTL_TAG),
   never typed by hand in a string.

## Style table
Address: it **tu**, es **usted**, da/sv **du**, fi **sinä**; every other language uses its polite form (Sie, vous, Ви, Vy, …), one form per locale, never mixed.
Quotes: opening/closing marks used for double quotes. `%`: `space` = "30 %", `tight` = "30%", `prefix` = "%30" (CLDR; the
interface still has "N %" in many tight locales — QA lists it as a warning, align when the text is edited).
Decimal separator in every locale except en/th is a comma; thousands: space (uk pl cs sk hu bg lt lv et sv fi fr; use a
no-break space), dot (de it es pt nl ro sr el tr da vi), comma (en th).

| Locale | Address | Quotes | % | Decimal |
|---|---|---|---|---|
| en | formal | “ ” | space (house) | . |
| uk | formal | « » | space | , |
| pl | formal | „ ” | tight | , |
| de | formal | „ “ | space | , |
| fr | formal | « » (no-break spaces inside) | space (narrow no-break) | , |
| it | **tu** | « » | tight | , |
| es | **usted** | « » | space | , |
| pt (BR) | formal | “ ” | tight | , |
| nl | formal | “ ” | tight | , |
| cs / sk | formal | „ “ | space | , |
| hu | formal | „ ” | tight | , |
| ro | formal | „ ” | space | , |
| bg | formal | „ “ | tight | , |
| sr (Latin) | formal | „ “ | tight | , |
| el | formal | « » | tight | , |
| tr | formal | “ ” | prefix %30 | , |
| lt / lv | formal | „ “ | space | , |
| et | formal | „ “ | tight | , |
| da / sv | **du** | „ “ / ” ” | space | , |
| fi | **sinä** | ” ” | space | , |
| vi | formal | “ ” | tight | , |
| th | formal | “ ” | tight | . |

## Procedure
1. Look up the term in `glossary.ts`; if a new concept appears, add it there first (all 25 locales) and in the table.
2. Translate, then read it aloud as the native audience: would an engineer or farm owner in that country say this?
3. Run `npx vitest run src/i18n/__tests__` and `npm run typecheck`. Fix hard failures. `KNOWN` counters in `qa.test.ts` are
   a ratchet: lower a number when you fix a defect, never raise it to make a test pass.
4. Machine QA cannot judge meaning. Say so in the answer: "native review not done" until a native specialist signs off.

## Rule for every new or changed string
**New text = English + all 25 languages in the same change, or the build fails.** Where a string lives decides how it is enforced:
- `src/i18n/dict/en.ts` (+ the 24 other dictionaries): `dict.test.ts` fails on a missing key, a changed `{placeholder}` or a copy of English.
- A new `src/i18n/<module>.ts`: add it to `modules()` in `__tests__/qa-corpus.ts`, otherwise `registry.test.ts` fails.
- Model sentences (`T("English")`): `core-catalog.test.ts` requires the same key in every `core/<locale>.ts`.
- JSX text and string attributes typed in a component: `react/jsx-no-literals` (lint) and `hardcoded.test.ts` fail. Technical tokens (units, source names, DO-NOT-TRANSLATE words) are on the allow-list in `eslint.config.mjs`; add to it only a token that is identical in every language.
- `npm run build` runs `prebuild` first (dict, registry, hardcoded, core-catalog), so Vercel will not deploy a partial language.
- Fixed-width SVG text must go through `SvgLabel`/`SvgStack` (`lib/text-fit.ts`); never a bare `<text>{label}</text>`.

## String freeze, context and who checks (per release)
1. **Freeze**: stop changing English wording 3 working days before a language release; later English edits wait for the next batch.
2. **Context for the translator**: `npm run l10n:export -- <folder>` writes `translator-brief.csv` (key, English, where used, placeholders to keep, length budget, note). Give it with the glossary table above, a screenshot set from the visual check, and the rule "sentence case, no full stop on buttons, +40 % room".
3. **Layers** (ISO 17100 + LISA): translator → second linguist (revise) → domain reader (a biogas or energy engineer of that country, for terms such as digestate, upgrading, CHP, tariff names) → owner. Machine QA never replaces the first three. Say "native review not done" until a named person signs off.
4. **Legal texts** (waiver, terms, consent, order button, privacy, refund/waiver emails) are a separate track: lawyer plus sworn/certified translator per market, checklist in `docs/legal/LAWYER-BRIEF.md` §6. A language is not "legally ready" because it passed QA.
5. **Search copy** (`src/i18n/seo-copy.ts`, home `meta.*`): written as the native speaker searches (3 phrases per language in `queries`), no invented volumes. After launch check Search Console queries per language and adjust; record the change in DECISIONS.

## Visual check (do after any change to UI text, fonts or layout)
Needs a browser, so it is not in CI. Setup and commands are at the top of `scripts/l10n-visual.mjs` and `scripts/l10n-print.mjs`.
1. `npm run build`, start with `APP_ENV=local PAYMENTS_DEMO=1 STORAGE=json PORT=3100 npm start` (the production config gate refuses to start without real keys otherwise).
2. `node scripts/l10n-visual.mjs <out>`: 25 languages × 360/1280 px × home, calculator, result, checkout, pricing, report, methodology, terms, 404. Read `results.json`: any `page-hscroll`, `outside-viewport`, `clipped-*`, `svg-text-*` is a defect; `button-wraps` is accepted below 480 px. Look at the screenshots of el, th, vi (fonts), de, fi, hu (long words), uk, bg (Cyrillic) before saying "checked".
3. `node scripts/l10n-print.mjs <out>`: A4 PDF per language (browser print is the PDF export); page count and overflow.
4. Pseudo-localisation (`__tests__/pseudo.ts`, `pseudo.test.ts`): English with +40 % length and accents, wired into a unit test; use `pseudoDeep(en)` when you need to see a new layout under stress.
5. Not covered by this check, say so in the answer: Safari/Firefox, real phones, hyphenation quality, right-to-left (no RTL locale is shipped; adding ar/he needs a separate layout pass).

## Exports and mail
- Excel: sheet names ≤ 31 characters and unique, numbers raw, dates ISO text, labels from the catalog (`xlsx.test.ts` runs 25 languages). Print/PDF = browser print of the report page.
- Mail (delivery, waiver confirmation, refund) is written in `order.lang`; subject from `deliveryCopy`; `operations.test.ts` checks 25 languages. A new mail type needs a copy table with all 25 locales and a test of the same shape.
- Stripe Checkout `locale` is mapped in `stripeCheckoutLocale` (uk and sr fall back to English because Stripe has no such page language); product name/description are English until the owner decides (DECISIONS 2026-11-02).

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

# Methalytics — legal review brief (waiver, terms, privacy)

Prepared 2026-11-02 for the owner to hand to counsel and, per language, to a certified or sworn translator.
**Nothing here is legal advice and none of it has been reviewed by a lawyer.** The translations in the product are
machine-assisted and linguistically QA'd, not legally verified (see §6). The owner decides every point marked ☐.

## 1. What the product is, in one paragraph (for counsel)

Methalytics (`methalytics.com`, not yet live) is a website that produces a **preliminary techno-economic screening**
of a biogas / biomethane project from inputs the user types in (feedstock, location, energy prices). The free result
is a verdict class and ranges. Two **automated paid reports** (`standard`, `report`; list price per country tier,
charged once in EUR or USD, via Stripe Checkout) are generated instantly for one locked project and opened through a
**private link** emailed to the buyer (the link is a bearer token). No human engineer is involved. The reports say they
are *not* a feasibility study, not design documentation, not bankable and not investment/safety advice. Typical buyers:
farm and food-plant owners, project developers, municipalities, consultants — **mostly businesses, but private
individuals and sole traders cannot be excluded** (§3.1). The interface and the paid report exist in **25 languages**,
the project can be in **33 countries**: PL CZ SK HU RO MD BG RS GR TR LT LV EE DK SE FI DE AT IT FR ES NL GB US CA MX AR
BR IN TH VN KZ UA.

## 2. Where each text lives (so counsel can read exactly what the customer sees)

| Document / text | Source (English original, translations beside it) | Shown |
|---|---|---|
| Terms of service (8 short sections) | `src/app/[lang]/terms/page.tsx` + `src/i18n/legal.ts` + pricing FAQ in `src/i18n/dict/*.ts` (`pricing.faq`) | `/{lang}/terms`, linked from footer and checkout |
| Consent checkbox 1 | `checkout.consent` in `src/i18n/dict/*.ts` | Checkout, required, unticked |
| **Withdrawal waiver checkbox 2** | `offerCopy[lang].waiver` in `src/i18n/offer.ts` | Checkout, required, unticked, separate from checkbox 1 |
| Waiver confirmation email | `offerCopy[lang].waiverMail` + `src/server/notify.ts` | Inside the report-delivery email |
| Report-delivery email, refund notice | `src/i18n/delivery.ts`, `src/server/notify.ts` | Email in buyer's interface language |
| Privacy | one paragraph, `legalCopy[lang].privacy` — **there is no privacy notice page** | Terms §8 |
| Seller identity | `SITE.legal` in `src/config/site.ts` — **all four fields are placeholders** | Terms §1 |
| Disclaimer "not a feasibility study…" | `footer.disclaimer`, `footer.about`, report header | Every page / every report |

Current English wording (verbatim from the code, 2026-11-02):

- **Checkbox 1:** "I agree to the terms of service and the processing of my data."
- **Checkbox 2 (waiver):** "I ask for the report to be delivered immediately and acknowledge that I lose my right of withdrawal once it has been delivered."
- **Waiver email line:** "On {date} you asked for immediate delivery and confirmed: “{text}”" (the exact stored text is repeated).
- **Pay button:** "Pay {price}". Price is shown in EUR, or USD at a dated reference rate the buyer confirms first.
- **Terms §6 Refunds:** "If we cannot generate your report, request a refund within 14 days. Your statutory rights remain unchanged. EU and UK consumers retain their statutory rights. By requesting immediate access to digital content, you acknowledge that the right of withdrawal ends when the report is delivered."
- **Terms §7 Liability:** "Investment decisions remain your responsibility. Our liability is limited to the price paid, except where the law does not permit this limitation."
- **Terms §8 Personal data:** "We process contact and project data only to provide the service and contact you. We share it only with the payment provider. You may request deletion at any time."
- **No upgrade/credit between the two reports** (pricing FAQ).

What the system records per order (evidence): timestamp and **exact text** of the waiver the buyer ticked, interface
language, email, optional name/company/VAT ID, billing country from Stripe, price and currency, the full input and the
generated assessment snapshot, report token, status history. Delivery email is sent once; it is idempotent.

## 3. Questions counsel must answer (☐ = owner decision after the answer)

### 3.1 Consumer or business — the question that decides the rest
1. Is the service offered to **consumers** (CRD 2011/83/EU and national transpositions, UK CCR 2013) or **B2B only**?
   If B2B-only: ☐ add a checkout declaration "I am buying for my trade, business or profession", refuse consumers,
   and say so in the terms. The waiver below then becomes unnecessary, but the B2B terms must still pass national unfair-terms
   rules and the exclusion of consumer rights must be enforceable (Stripe collects a VAT ID but does not verify business status).
2. If consumers stay: confirm that a farm owner / sole trader buying for a project is treated as a consumer or a trader in
   DE, FR, IT, ES, PL, NL (national case law differs on "dual purpose" purchases).

### 3.2 Withdrawal waiver — CRD Art. 16(m), Art. 8(2), 8(7), 6(1)(h); UK CCR reg. 36–37
The service is delivered instantly, so the 14-day right would otherwise allow a buyer to read the full report and cancel.
The design: separate unticked checkbox + confirmation on a durable medium (the email). Counsel to confirm for **each of the
25 languages' markets** (not only the English text):
1. Does the waiver text satisfy **both** limbs of Art. 16(m) for *digital content not on a tangible medium*: (i) prior
   express consent to begin performance within the withdrawal period, and (ii) acknowledgement that the right is lost once
   performance has begun / is complete? The product text says "lose my right … once it has been delivered". Is the more
   precise wording needed ("once the report has been **made available**")? Is the service better classed as a *service*
   (Art. 16(a), loss when fully performed, and a request to start within the period, proportional payment on earlier
   withdrawal, Art. 14(3)) or as *digital content* — and does the classification change the text?
2. Must the trader's **confirmation (Art. 8(7))** contain more than what the email repeats today (waiver text + date)?
   Should it also repeat the pre-contract information of Art. 6(1)? Is an email to the buyer's address a valid durable medium,
   and is a **private link** to the report acceptable as "delivery"?
3. **Pre-contract information of Art. 6(1)(h)–(i)** (conditions, time limit and procedure for withdrawal + **model withdrawal
   form**, Annex I(B)) must be given *even if the right will be waived*. Today the model form is **not provided**. ☐ Add it? In which languages?
4. **Order button wording — Art. 8(2) "order with obligation to pay".** The button says "Pay {price}". Several states prescribe
   exact or specific labels (e.g. Germany §312j(3) BGB "zahlungspflichtig bestellen" or equivalent; others). Counsel to give
   the compliant label **per language/market** (list in §6). ☐ Replace `checkout.pay`.
5. **Digital Content and Digital Services Directive (EU) 2019/770** and national law (e.g. conformity remedies, burden of proof):
   these cannot be waived. Does "If we cannot generate your report, request a refund within 14 days" conflict with, or
   sufficiently preserve, statutory remedies? What is the legal position if the report is generated but wrong or unusable?
6. **Refund after the waiver.** Product behaviour today: a refund (full) sets the order to "reversed" and **disables the link**;
   there is no customer-facing refund *policy* beyond the FAQ sentence. ☐ Define it: when we refund voluntarily, what the buyer
   keeps (the PDF/xlsx already downloaded), and whether a goodwill window is offered.
7. **UK:** same questions for CCR 2013 reg. 37 and the UK sell-side wording; and for **non-EU markets** in §1 (e.g. TR, RS, MD,
   UA, BR, IN, TH, VN, KZ, MX, AR, US, CA): is there a mandatory cooling-off or e-commerce rule that applies to a foreign
   seller selling digitally to local consumers? (Brazil CDC Art. 49 "7 days for distance purchases" is a known example to check.)
   ☐ Decide the list of countries where **consumer** sales are enabled at launch.

### 3.3 Terms of service
1. **Seller identity and formalities.** ☐ Entity, registration number, VAT ID, address, email (placeholders now). Imprint/Impressum
   obligations (e.g. DE §5 DDG, AT ECG §5, FR LCEN) — must be reachable "in two clicks" from every page; today only the terms page
   carries them. Is a separate imprint page required in each market?
2. **Contract language (Art. 6 CRD "clear and comprehensible language" + national language laws).** France (Loi Toubon) and
   some other states require the consumer-facing contract in the national language; others accept the language the seller
   marketed in. Counsel to say, per market: (a) is the English original or the local translation the binding text,
   (b) is a **"language of the contract"** clause required, (c) can the English version prevail in a dispute with a consumer,
   (d) must the waiver and the button be in the local language even when the user picked English.
3. **Liability clause.** "Limited to the price paid except where the law does not permit" — acceptable for B2B? For consumers
   (Unfair Terms Directive 93/13/EEC, national blacklists such as DE §309 BGB)? Gross negligence, personal injury and
   defective-product carve-outs.
4. **Nature-of-service disclaimers.** "Not a feasibility study, no guarantee of income, not a safety assessment, not investment
   advice." Does the generated report (NPV, IRR, payback, "verdict") fall under any investment-advice or financial-promotion
   regime in the target markets? Does an engineering-type output trigger professional-services licensing (e.g. "engineer's
   stamp" rules) or the German/Austrian/Italian professional titles? Wording we should add to stay outside both.
5. **Prices, VAT and currency.** B2C digital services: place of supply / **OSS** registration; price indications must be
   tax-inclusive for consumers (Price Indication Directive, Omnibus); the product can charge in EUR **or USD at a dated
   reference rate** the buyer confirms — acceptable, and how must the rate/fee be disclosed? Today terms contain contradictory VAT wording in the translated
   versions (`vatExclusive` vs `vatFinal`, set by the `STRIPE_TAX` switch) — ☐ choose one model with the tax adviser.
6. **Bearer-token delivery.** Anyone with the link can open the report. Is it acceptable to state "do not forward" or must
   delivery be to an authenticated account? Liability if a link leaks (the email says it is private).
7. **Governing law / forum / ADR.** ☐ Choice of law for B2B; for consumers mandatory local protections remain (Rome I Art. 6).
   ADR information duties (the EU ODR platform was shut down in July 2025 — counsel to confirm what must replace the old link).
8. **Intellectual property and use of the report** (internal use, no resale; the model's source tables are cited public data),
   **trademark** "Methalytics" (**not searched**; see `src/config/site.ts`), acceptable-use / no scraping of the free calculator.
9. **Accessibility** (EU Accessibility Act, applicable to consumer e-commerce services from 28 June 2025; micro-enterprise
   exemption for services) — confirm applicability; the site was axe-audited (WCAG 2.2 AA) on 2026-10-31.

### 3.4 Privacy (GDPR / UK GDPR / local laws)
Today privacy is **one paragraph** and checkbox 1 *bundles* "terms + processing of my data". Counsel to specify:
1. A proper **privacy notice (Art. 13/14)** — separate page and footer link, per language. What it must list (controller identity,
   purposes + legal bases, recipients, transfers, retention, rights, complaint authority, no automated decision-making).
2. Is the **consent wording legitimate**? Processing to perform the contract needs no consent; bundling it with terms is
   often criticised (Art. 7(2)/(4)). ☐ Replace checkbox 1 by "I have read the terms" + a privacy-notice link, with no data consent.
3. **Processors / recipients** (our list, to be confirmed against real contracts): **Stripe** (payments; independent controller for
   payment data), **Resend** (transactional email), **Vercel** (hosting, edge geolocation header: country only), a **managed
   PostgreSQL** provider (orders, leads), **Sentry** (errors; configured to strip personal data — verify). Climate and city data
   (ERA5, GeoNames) are bundled datasets: no visitor data goes to those providers at runtime. No advertising or analytics cookies are set; the funnel counter that is planned
   is first-party and cookieless (decision pending). ☐ DPAs and **SCCs/DPF** for US recipients; sub-processor list.
4. **Retention.** Orders and leads are kept indefinitely today (no deletion job). ☐ Retention periods: accounting records
   (country-specific, 6–10 years), report data, leads, logs (hosting logs contain report URLs = bearer tokens).
5. **Browser storage.** The site stores the calculator draft and display preferences (language, country, units) in `localStorage`.
   Is that "strictly necessary / functional" under ePrivacy Art. 5(3) so that no banner is needed? Wording for the notice.
6. **Representative / DPO.** Art. 27 representative if the seller is outside the EU/UK; DPO threshold; records of processing.
7. **Lead capture / CRM:** a "request a quote" flow stores project data + contact. Basis, wording, marketing-email rules
   (ePrivacy Art. 13 soft opt-in) — we send **no** marketing today.
8. **Children, special categories:** none intended; confirm no statement needed.

## 4. Product facts counsel should know (so questions are not wasted)

- The report is generated **before** payment is confirmed and stored as a **snapshot**; delivery = email with link after the
  payment-provider webhook confirms. The 14-day period therefore starts at purchase; delivery is within minutes.
- A full refund on the Stripe side flips the order to "reversed"; the link then shows "payment refunded" in the buyer's language
  and the report is no longer served. Partial refunds are manual and leave access unchanged. A chargeback opens an owner alert only.
- The seller never sees card data (Stripe Checkout). Stripe collects billing address and optional tax ID; billing country is
  stored for VAT.
- There is no user account. The buyer is identified by the email entered at checkout.
- All numeric results are screening-grade (pre-tax, no bankability). Claims of accuracy are deliberately not made.
- Languages: the UI/report in 25 languages; **only** en/uk legal text was written first; every other legal text is a translation of it.

## 5. Decisions the owner must take (summary)

| # | Decision | Depends on |
|---|---|---|
| 1 | Consumers allowed, or B2B only? Which countries at launch? | §3.1, §3.2.7 |
| 2 | Binding language per market; English prevails or local? | §3.3.2 |
| 3 | Compliant order-button wording per language | §3.2.4 |
| 4 | Add model withdrawal form + pre-contract information block | §3.2.3 |
| 5 | Replace the bundled consent by terms-acknowledgement + privacy notice | §3.4.1–2 |
| 6 | One VAT model (tax-inclusive vs. added at checkout) | §3.3.5, tax adviser |
| 7 | Retention periods and deletion job | §3.4.4 |
| 8 | Seller entity data, imprint, trademark search | §3.3.1, §3.3.8 |
| 9 | Stripe product name/description: English-only vs. localised vs. neutral (see `docs/ai/DECISIONS.md` 2026-11-02) | invoice language rules |

## 6. What the translator/lawyer must certify, per language

Machine QA checked placeholders, glossary, quotes, plural forms and tone. It did **not** check legal meaning. For each of the
25 locales the **waiver text, withdrawal paragraph (Terms §6), liability paragraph (§7), privacy paragraph (§8), consent line,
order button and the waiver email** should be signed off by a **lawyer qualified in the target market, or a sworn/certified
translator working from the lawyer-approved English text**. Suggested priority (volume and strictness of consumer law):

1. **Tier 1 — before any consumer sale:** de (DE, AT), fr (FR), it, es, nl, pl, en (GB/IE, US/CA wording separately), pt (BR).
2. **Tier 2:** cs, sk, hu, ro, bg, el, lt, lv, et, da, sv, fi, tr, sr, uk.
3. **Tier 3:** vi, th, plus markets outside the EU (MD, KZ, IN, MX, AR) if consumer sales are enabled there.

Checklist per language (attach to the translator's sign-off):

- [ ] Waiver sentence contains: express request to start now **and** acknowledgement of losing withdrawal (both limbs).
- [ ] Terminology matches the statute of that country ("right of withdrawal" = *Widerrufsrecht*, *droit de rétractation*,
      *diritto di recesso*, *derecho de desistimiento*, *prawo odstąpienia od umowy*, …) — not a generic word.
- [ ] Order button label meets the national "obligation to pay" rule (Art. 8(2)).
- [ ] Address form (formal/informal) consistent with the rest of the contract documents.
- [ ] VAT / price wording consistent with the chosen model (§3.3.5).
- [ ] Controller identity, rights and complaint authority named correctly for that country's regulator.
- [ ] Statement of which language version prevails.
- [ ] Sign-off: name, qualification, date, version hash of the source text (git commit of `src/i18n/legal.ts`, `offer.ts`).

Known wording points already raised by the linguistic reviewers (not legal conclusions): fr withdrawal-right wording (L221-28 reference),
pl waiver mail wording, de "ausdrücklich zustimmen" (§356(5) BGB), it/es/pt VAT copy contradicts itself.

## 7. Material to give counsel

- This file; the 8 terms sections and waiver in English and in the language of the first target market (export with
  `npx tsx` from `src/i18n/legal.ts` / `offer.ts`, or copy from the live page once the domain exists).
- A screenshot set of the checkout (360 px and 1280 px) from the visual check in `.claude/skills/localization/SKILL.md`.
- One real delivery email and one refund email (staging, Stripe test mode).
- Stripe account country and business details once the entity exists.

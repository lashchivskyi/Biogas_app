"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { ProjectInput } from "@/core";
import { convertedPlanPrice, PLAN_IDS, priceFor, type PlanId } from "@/config/plans";
import { COUNTRIES } from "@/countries";
import { fmt, type Dict, type Locale } from "@/i18n";
import { coreLang, INTL_TAG } from "@/i18n/config";
import { track } from "@/lib/analytics";
import { usePreferences } from "../LocaleProvider";
import { preferenceCopy } from "@/i18n/preferences";
import { offerCopy } from "@/i18n/offer";
import { formErrorCopy } from "@/i18n/form-errors";
import type { PublicPaymentQuote } from "@/server/payments/quote";
import type { CurrencyPreference } from "@/lib/preferences";
import { CountryFlag, CURRENCY_FLAGS } from "../CountryFlag";
import { FlagSelect } from "../FlagSelect";

export type CheckoutDict = Pick<Dict, "checkout" | "pricing" | "common">;

/**
 * Checkout dialog: pick a plan, leave an email, go to Stripe. The browser never sends a price —
 * the server prices the order from the plan table and the project country's tier.
 */
export function UnlockButton({ input, locale, d, demo, className = "btn btn-primary", label, plan: initialPlan = "report" }: {
  input: ProjectInput | null;
  locale: Locale;
  d: CheckoutDict;
  demo: boolean;
  className?: string;
  label: string;
  plan?: PlanId;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const O = offerCopy[locale];
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email" | "consent" | "waiver", string>>>({});
  const V = formErrorCopy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [quote, setQuote] = useState<PublicPaymentQuote | null>(null);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const preferences = usePreferences();
  const paymentCurrency = preferences.paymentCurrency === "AUTO" ? preferences.currency : preferences.paymentCurrency;
  const copy = preferenceCopy(locale);
  const C = d.checkout;
  const tier = input ? (COUNTRIES[input.countryCode]?.priceTier ?? "A") : "A";
  const quoteCurrency = quote?.currency ?? preferences.currency;
  const rate = quote?.rate ?? (preferences.currency === "USD" ? preferences.usd.value : 1);
  const formatPrice = (minor: number) => new Intl.NumberFormat(INTL_TAG[locale], { style: "currency", currency: quoteCurrency, maximumFractionDigits: 0 }).format(minor / 100);
  const price = (p: PlanId) => formatPrice(convertedPlanPrice(priceFor(p, tier), quoteCurrency, rate));

  useEffect(() => {
    if (!isOpen || !input) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- invalidate the old payment quote before requesting a new one
    setQuote(null);
    setError("");
    fetch("/api/checkout/quote", { method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ plan, lang: locale, input, paymentCurrency }),
    }).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 503 ? C.unavailable : response.status === 422 ? O.insufficient : C.error);
      return response.json() as Promise<PublicPaymentQuote>;
    }).then((value) => { if (!controller.signal.aborted) setQuote(value); }).catch((error: Error) => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [isOpen, input, plan, locale, paymentCurrency, quoteRevision, C.unavailable, C.error, O.insufficient]);

  function open() {
    setError("");
    setState("idle");
    setIsOpen(true);
    ref.current?.showModal();
    track("checkout_open", { plan });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input || !quote) return;
    const fd = new FormData(e.currentTarget);
    // Inline, localised messages instead of the browser's bubbles (WCAG 3.3.1 / 3.3.3): the first problem gets focus.
    const email = String(fd.get("email") ?? "").trim();
    const problems: typeof fieldErrors = {};
    if (!email) problems.email = V[0];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.email = V[1];
    if (fd.get("consent") !== "on") problems.consent = V[2];
    if (fd.get("withdrawalWaiver") !== "on") problems.waiver = V[2];
    setFieldErrors(problems);
    const first = (["email", "consent", "waiver"] as const).find((k) => problems[k]);
    if (first) { document.getElementById(`${id}-${first}`)?.focus(); return; }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, lang: locale, email: fd.get("email"), name: fd.get("name"), company: fd.get("company"), vatId: fd.get("vatId"), consent: fd.get("consent") === "on", withdrawalWaiver: fd.get("withdrawalWaiver") === "on", input, paymentCurrency, quoteToken: quote.token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirectUrl) {
        if (res.status === 409) setQuoteRevision((version) => version + 1);
        setError(res.status === 503 ? C.unavailable : data.error === "insufficient_data" ? O.insufficient : C.error);
        setState("error");
        return;
      }
      track("checkout_submit", { plan, country: input.countryCode });
      window.location.assign(data.redirectUrl);
    } catch {
      setError(C.error);
      setState("error");
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={open}>{label}</button>
      <dialog ref={ref} onClose={() => setIsOpen(false)} aria-labelledby={`${id}-h`} className="m-auto w-[min(560px,calc(100vw-24px))] rounded-3xl p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
        <div className="p-6 text-left sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${id}-h`} className="font-display text-2xl font-semibold">{C.title}</h2>
            <button type="button" onClick={() => ref.current?.close()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-ink" aria-label={C.close}>✕</button>
          </div>
          {!input ? (
            <p className="mt-4 text-ink2">{C.noInput}</p>
          ) : (
            <form onSubmit={submit} noValidate className="mt-5 space-y-4">
              <fieldset disabled={state === "sending"}>
                <legend className="label">{C.plan}</legend>
                <div className="grid gap-2">
                  {PLAN_IDS.map((p) => (
                    <label key={p} className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border p-4 ${plan === p ? "border-brand bg-brandsoft/60" : "border-line"}`}>
                      <span className="flex items-start gap-3">
                        <input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} className="mt-1" />
                        <span>
                          <span className="block font-bold">{d.pricing.plans[p].name}</span>
                          <span className="block text-xs text-muted">{d.pricing.plans[p].tagline} · {d.pricing.plans[p].delivery}</span>
                        </span>
                      </span>
                      <span className="num whitespace-nowrap font-display text-lg font-semibold">{price(p)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="rounded-xl border border-line bg-surface2 p-3">
                <label className="label" htmlFor={`${id}-currency`}>{copy.payment}</label>
                {quote && quote.availableCurrencies.length > 1 ? <FlagSelect id={`${id}-currency`} value={quote.currency} onChange={(currency) => preferences.setPaymentCurrency(currency as CurrencyPreference)} disabled={state === "sending"} options={quote.availableCurrencies.map((currency) => ({ value: currency, label: currency, flag: CURRENCY_FLAGS[currency] }))} /> : <p id={`${id}-currency`} className="num flex items-center gap-2 font-semibold">{quote && CURRENCY_FLAGS[quote.currency] && <CountryFlag code={CURRENCY_FLAGS[quote.currency]} />}{quote?.currency ?? "—"}</p>}
                {quote && quote.currency !== "EUR" && <p className="num mt-2 text-xs text-muted">EUR → {quote.currency}: {new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 6 }).format(quote.rate)} · {quote.rateDate}</p>}
                <p className="mt-2 text-xs text-muted">{copy.billing}</p>
                <p className="mt-2 text-xs text-muted">{copy.tax}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="label" htmlFor={`${id}-email`}>{C.email} *</label><input id={`${id}-email`} name="email" type="email" required aria-required="true" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? `${id}-email-err` : undefined} onChange={() => fieldErrors.email && setFieldErrors((f) => ({ ...f, email: undefined }))} maxLength={160} autoComplete="email" className="field" />{fieldErrors.email && <p id={`${id}-email-err`} role="alert" className="mt-1 text-sm font-semibold text-red-800">{fieldErrors.email}</p>}</div>
                <div><label className="label" htmlFor={`${id}-name`}>{C.name}</label><input id={`${id}-name`} name="name" maxLength={120} autoComplete="name" className="field" /></div>
                <div><label className="label" htmlFor={`${id}-company`}>{C.company}</label><input id={`${id}-company`} name="company" maxLength={160} autoComplete="organization" className="field" /></div>
                <div className="sm:col-span-2"><label className="label" htmlFor={`${id}-vat`}>{C.vat}</label><input id={`${id}-vat`} name="vatId" maxLength={40} className="field" /></div>
              </div>
              <label className="flex items-start gap-3 text-sm text-ink2">
                <input id={`${id}-consent`} type="checkbox" name="consent" required aria-required="true" aria-invalid={!!fieldErrors.consent} aria-describedby={fieldErrors.consent ? `${id}-consent-err` : undefined} onChange={() => fieldErrors.consent && setFieldErrors((f) => ({ ...f, consent: undefined }))} className="mt-1 h-4 w-4" />
                <span>
                  {C.consent.split("{terms}")[0]}
                  <Link href={`/${locale}/terms`} target="_blank" className="font-semibold text-brand underline">{C.terms}</Link>
                  {C.consent.split("{terms}")[1]}
                </span>
              </label>
              {fieldErrors.consent && <p id={`${id}-consent-err`} role="alert" className="-mt-2 text-sm font-semibold text-red-800">{fieldErrors.consent}</p>}
              {/* EU/UK digital content: separate, unticked, express request + acknowledgement (CRD Art. 16(m)). */}
              <label className="flex items-start gap-3 text-sm text-ink2">
                <input id={`${id}-waiver`} type="checkbox" name="withdrawalWaiver" required aria-required="true" aria-invalid={!!fieldErrors.waiver} aria-describedby={fieldErrors.waiver ? `${id}-waiver-err` : undefined} onChange={() => fieldErrors.waiver && setFieldErrors((f) => ({ ...f, waiver: undefined }))} className="mt-1 h-4 w-4" />
                <span>{O.waiver}</span>
              </label>
              {fieldErrors.waiver && <p id={`${id}-waiver-err`} role="alert" className="-mt-2 text-sm font-semibold text-red-800">{fieldErrors.waiver}</p>}
              {coreLang(locale) !== locale && <p className="hint">{d.common.reportLangNote}</p>}
              {demo && <p className="hint text-warn">{C.demo}</p>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
              <button className="btn btn-primary w-full text-base" type="submit" disabled={state === "sending" || !quote}>{state === "sending" ? C.paying : fmt(C.pay, { price: quote ? formatPrice(quote.amountMinor) : "—" })}</button>
              <p className="text-center text-xs text-muted">{C.secure}</p>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

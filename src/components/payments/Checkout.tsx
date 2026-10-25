"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ProjectInput } from "@/core";
import { priceFor, type PlanId } from "@/config/plans";
import { COUNTRIES } from "@/countries";
import { fmt, type Dict, type Locale } from "@/i18n";
import { INTL_TAG } from "@/i18n/config";
import { track } from "@/lib/analytics";

export type CheckoutDict = Pick<Dict, "checkout" | "pricing">;

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
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const C = d.checkout;
  const tier = input ? (COUNTRIES[input.countryCode]?.priceTier ?? "A") : "A";
  const price = (p: PlanId) => new Intl.NumberFormat(INTL_TAG[locale], { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(priceFor(p, tier) / 100);

  function open() {
    setError("");
    setState("idle");
    ref.current?.showModal();
    track("checkout_open", { plan });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input) return;
    const fd = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, lang: locale, email: fd.get("email"), name: fd.get("name"), company: fd.get("company"), vatId: fd.get("vatId"), consent: fd.get("consent") === "on", input }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirectUrl) throw new Error(res.status === 503 ? C.unavailable : data?.error ?? C.error);
      track("checkout_submit", { plan, country: input.countryCode });
      window.location.assign(data.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : C.error);
      setState("error");
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={open}>{label}</button>
      <dialog ref={ref} aria-labelledby="co-h" className="m-auto w-[min(560px,calc(100vw-24px))] rounded-3xl p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
        <div className="p-6 text-left sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 id="co-h" className="font-display text-2xl font-semibold">{C.title}</h2>
            <button type="button" onClick={() => ref.current?.close()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-ink" aria-label={C.close}>✕</button>
          </div>
          {!input ? (
            <p className="mt-4 text-ink2">{C.noInput}</p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <fieldset>
                <legend className="label">{C.plan}</legend>
                <div className="grid gap-2">
                  {(["report", "expert"] as PlanId[]).map((p) => (
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="label" htmlFor="co-email">{C.email} *</label><input id="co-email" name="email" type="email" required maxLength={160} autoComplete="email" className="field" /></div>
                <div><label className="label" htmlFor="co-name">{C.name}</label><input id="co-name" name="name" maxLength={120} autoComplete="name" className="field" /></div>
                <div><label className="label" htmlFor="co-company">{C.company}</label><input id="co-company" name="company" maxLength={160} autoComplete="organization" className="field" /></div>
                <div className="sm:col-span-2"><label className="label" htmlFor="co-vat">{C.vat}</label><input id="co-vat" name="vatId" maxLength={40} className="field" /></div>
              </div>
              <label className="flex items-start gap-3 text-sm text-ink2">
                <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
                <span>
                  {C.consent.split("{terms}")[0]}
                  <Link href={`/${locale}/terms`} target="_blank" className="font-semibold text-brand underline">{C.terms}</Link>
                  {C.consent.split("{terms}")[1]}
                </span>
              </label>
              {demo && <p className="hint text-warn">{C.demo}</p>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
              <button className="btn btn-primary w-full text-base" type="submit" disabled={state === "sending"}>{state === "sending" ? C.paying : fmt(C.pay, { price: price(plan) })}</button>
              <p className="text-center text-xs text-muted">{C.secure}</p>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

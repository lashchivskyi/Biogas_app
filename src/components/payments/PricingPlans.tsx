"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ProjectInput } from "@/core";
import { priceFor, type PlanId } from "@/config/plans";
import { COUNTRIES, COUNTRY_ORDER } from "@/countries";
import { countryName, fmt, type Dict, type Locale } from "@/i18n";
import { coreLang, INTL_TAG } from "@/i18n/config";
import { formToInput, type FormState } from "@/lib/form";
import { guessCountry } from "@/lib/geo";
import { Icon } from "../brand/Icon";
import { UnlockButton } from "./Checkout";

/**
 * Pricing cards. Price follows the PROJECT country (selectable, defaults to the calculator draft or geo guess).
 * If the visitor already ran the calculator, "Get the report" opens checkout for that project directly.
 */
export function PricingPlans({ locale, d, demo }: { locale: Locale; d: Pick<Dict, "pricing" | "checkout" | "common">; demo: boolean }) {
  const P = d.pricing;
  const [country, setCountry] = useState("GB");
  const [input, setInput] = useState<ProjectInput | null>(null);

  useEffect(() => {
    let c = guessCountry(locale).code;
    try {
      const raw = localStorage.getItem("mx.form.v2");
      if (raw) {
        const f = JSON.parse(raw) as FormState;
        const adapter = COUNTRIES[f.countryCode];
        if (adapter) {
          const inp = formToInput(f, adapter, coreLang(locale));
          if (inp.feedstocks.length) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only draft
            setInput(inp);
            c = f.countryCode;
          }
        }
      }
    } catch {
      /* ignore */
    }
    setCountry(c);
  }, [locale]);

  const tier = COUNTRIES[country]?.priceTier ?? "A";
  const money = (cents: number) => new Intl.NumberFormat(INTL_TAG[locale], { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
  const options = useMemo(() => COUNTRY_ORDER.map((c) => ({ c, n: countryName(c, locale) })).sort((a, b) => a.n.localeCompare(b.n, locale)), [locale]);
  const base = `/${locale}`;
  const plans: PlanId[] = ["report", "expert"];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm">
        <label htmlFor="pr-country" className="font-semibold text-ink2">{fmt(P.tierNote, { country: "" }).replace(/\s*$/, "")}</label>
        <select id="pr-country" className="field !w-auto !py-2" value={country} onChange={(e) => setCountry(e.target.value)}>
          {options.map((o) => <option key={o.c} value={o.c}>{o.n}</option>)}
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="card flex flex-col p-6">
          <h2 className="text-xl font-bold">{P.freeName}</h2>
          <p className="mt-1 text-sm text-ink2">{P.freeDesc}</p>
          <div className="num font-display mt-5 text-4xl font-semibold">{P.freePrice}</div>
          <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">{P.freeItems.map((x) => <li key={x} className="flex gap-2.5"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-brand" /><span className="text-ink2">{x}</span></li>)}</ul>
          <Link href={`${base}/calculator`} className="btn btn-ghost mt-6 w-full">{P.freeCta}</Link>
        </article>
        {plans.map((p) => {
          const plan = P.plans[p];
          const featured = p === "expert";
          return (
            <article key={p} className={`card relative flex flex-col p-6 ${featured ? "border-2 border-brand shadow-[0_24px_60px_-30px_rgba(11,107,75,0.55)]" : ""}`}>
              {featured && "badge" in plan && <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{(plan as { badge: string }).badge}</span>}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-sm text-ink2">{plan.tagline}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="num font-display text-4xl font-semibold">{money(priceFor(p, tier))}</span>
              </div>
              <div className="text-xs text-muted">{P.perProject} · {plan.delivery}</div>
              <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">{plan.items.map((x) => <li key={x} className="flex gap-2.5"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-brand" /><span className="text-ink2">{x}</span></li>)}</ul>
              <div className="mt-6">
                {input ? (
                  <UnlockButton input={{ ...input, countryCode: input.countryCode }} locale={locale} d={d} demo={demo} plan={p} label={plan.cta} className={`btn w-full ${featured ? "btn-primary" : "btn-ghost"}`} />
                ) : (
                  <Link href={`${base}/calculator`} className={`btn w-full ${featured ? "btn-primary" : "btn-ghost"}`}>{plan.cta}</Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-muted">{P.regional}</p>
    </div>
  );
}

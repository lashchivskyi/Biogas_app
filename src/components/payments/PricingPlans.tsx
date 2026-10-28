"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProjectInput } from "@/core";
import { convertedPlanPrice, PLAN_IDS, priceFor } from "@/config/plans";
import { COUNTRIES } from "@/countries";
import { countryName, fmt, type Dict, type Locale } from "@/i18n";
import { coreLang, INTL_TAG } from "@/i18n/config";
import { formToInput, type FormState } from "@/lib/form";
import { Icon } from "../brand/Icon";
import { UnlockButton } from "./Checkout";
import { usePreferences } from "../LocaleProvider";
import { preferenceCopy } from "@/i18n/preferences";

/**
 * Pricing cards. Price follows the PROJECT country (selectable, defaults to the calculator draft or geo guess).
 * If the visitor already ran the calculator, "Get the report" opens checkout for that project directly.
 */
export function PricingPlans({ locale, d, demo }: { locale: Locale; d: Pick<Dict, "pricing" | "checkout" | "common" | "country">; demo: boolean }) {
  const P = d.pricing;
  const preferences = usePreferences();
  const country = preferences.country;
  const [input, setInput] = useState<ProjectInput | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mx.form.v2");
      if (raw) {
        const f = JSON.parse(raw) as FormState;
        const adapter = COUNTRIES[f.countryCode];
        if (adapter) {
          const inp = formToInput(f, adapter, coreLang(locale));
          if (inp.feedstocks.length && inp.regionId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only draft
            setInput(inp);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [locale]);

  const tier = COUNTRIES[country]?.priceTier ?? "A";
  const money = (cents: number) => new Intl.NumberFormat(INTL_TAG[locale], {
    style: "currency", currency: preferences.currency, maximumFractionDigits: 0,
  }).format(convertedPlanPrice(cents, preferences.currency, preferences.currency === "USD" ? preferences.usd.value : 1) / 100);
  const base = `/${locale}`;
  const activeInput = input?.countryCode === country && (!preferences.region || input.regionId === preferences.region) && (!preferences.city || input.city?.signature === preferences.city.signature) ? input : null;

  if (!preferences.ready) return <div className="mx-auto h-64 max-w-4xl animate-pulse rounded-2xl bg-surface2" role="status" aria-label={preferenceCopy(locale).detecting} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm">
        <span className="font-semibold text-ink2">{fmt(P.tierNote, { country: countryName(country, locale) })}</span>
        <button type="button" className="font-semibold text-brand underline" onClick={preferences.openSettings}>{preferenceCopy(locale).change}</button>
      </div>
      {/* The free screening is the entry point, not a package: shown as a strip above the two paid plans. */}
      <div className="mx-auto mb-6 flex max-w-4xl flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="num font-display shrink-0 whitespace-nowrap rounded-xl bg-brandsoft px-3 py-1.5 text-lg font-semibold text-brandink">{P.freePrice}</span>
          <div>
            <div className="font-bold">{P.freeName}</div>
            <div className="text-sm text-ink2">{P.freeDesc}</div>
          </div>
        </div>
        <Link href={preferences.href(`${base}/calculator`)} className="btn btn-ghost shrink-0">{P.freeCta}</Link>
      </div>
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
        {PLAN_IDS.map((p) => {
          const plan = P.plans[p];
          const featured = p === "report";
          return (
            <article key={p} className={`card relative flex flex-col p-6 ${featured ? "order-first border-2 border-brand shadow-[0_24px_60px_-30px_rgba(11,107,75,0.55)] md:order-none" : ""}`}>
              {featured && "badge" in plan && <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{(plan as { badge: string }).badge}</span>}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-sm text-ink2">{plan.tagline}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="num font-display text-4xl font-semibold">{money(priceFor(p, tier))}</span>
              </div>
              <div className="text-xs text-muted">{P.perProject} · {plan.delivery}</div>
              <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">{plan.items.map((x) => <li key={x} className="flex gap-2.5"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-brand" /><span className="text-ink2">{x}</span></li>)}</ul>
              <div className="mt-6">
                {activeInput ? (
                  <UnlockButton input={activeInput} locale={locale} d={d} demo={demo} plan={p} label={plan.cta} className={`btn w-full ${featured ? "btn-primary" : "btn-ghost"}`} />
                ) : (
                  <Link href={preferences.href(`${base}/calculator?plan=${p}`)} className={`btn w-full ${featured ? "btn-primary" : "btn-ghost"}`}>{plan.cta}</Link>
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

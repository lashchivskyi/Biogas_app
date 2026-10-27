"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { INTL_TAG, LOCALE_COOKIE, NATIVE_NAME, type Locale } from "@/i18n/config";
import type { LanguageOption } from "@/i18n/language-options";
import { methodologyCopy } from "@/i18n/methodology";
import { preferenceCopy } from "@/i18n/preferences";
import { contextHref, swapLocaleUrl } from "@/lib/preferences";
import { usePreferences } from "./LocaleProvider";
import { CountryFlag, CURRENCY_FLAGS } from "./CountryFlag";
import { FlagSelect } from "./FlagSelect";

/** One shared settings panel; language and project location are independent choices. */
export function PreferenceMenu({ locale, label, options }: { locale: Locale; label: string; options: readonly LanguageOption[] }) {
  const p = usePreferences();
  const open = p.settingsOpen;
  const copy = preferenceCopy(locale);
  const registry = methodologyCopy[locale].registry;
  const [draft, setDraft] = useState({ country: p.country, region: p.region ?? "", currency: p.currency, language: locale });
  const wasOpen = useRef(false);
  const lastDetected = useRef(p.detectedCountry);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (open && (!wasOpen.current || lastDetected.current !== p.detectedCountry)) {
      setDraft({ country: p.country, region: p.region ?? "", currency: p.currency, language: locale });
      requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("#pref-language")?.focus());
    }
    wasOpen.current = open;
    lastDetected.current = p.detectedCountry;
  }, [open, p.country, p.region, p.currency, p.detectedCountry, locale]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) p.closeSettings(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && ref.current?.contains(document.activeElement)) { p.closeSettings(); ref.current.querySelector("button")?.focus(); }
    };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [p]);

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    p.applyPreferences({ country: draft.country, region: draft.region || undefined, displayCurrency: draft.currency });
    document.cookie = `${LOCALE_COOKIE}=${draft.language}; path=/; max-age=31536000; samesite=lax`;
    p.closeSettings();
    const url = contextHref(swapLocaleUrl(window.location.href, draft.language), { country: draft.country, region: draft.region || undefined });
    const locationChanged = draft.country !== p.country || draft.region !== (p.region ?? "");
    if (draft.language !== locale || (path.endsWith("/methodology") && locationChanged)) window.location.assign(url);
    else if (path.endsWith("/calculator") || path.endsWith("/pricing")) window.history.replaceState(null, "", url);
  }
  const names = new Intl.DisplayNames([INTL_TAG[locale]], { type: "region" });
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={open ? p.closeSettings : p.openSettings} aria-expanded={open} aria-haspopup="dialog" aria-label={`${copy.settings}: ${NATIVE_NAME[locale]}, ${p.currency}`} className="flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-2 text-[13px] font-semibold text-white/85 hover:border-white/40">
        <CountryFlag code={options.find((option) => option.locale === locale)?.countryCode ?? "GB"} />{locale.toUpperCase()}<span className="hidden items-center gap-1.5 sm:inline-flex">· <CountryFlag code={CURRENCY_FLAGS[p.currency]} />{p.currency}</span>
      </button>
      {open && <div role="dialog" aria-label={copy.settings} className="fixed inset-x-3 top-16 z-50 max-h-[80dvh] overflow-auto rounded-2xl border border-line bg-white p-5 text-ink shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[420px]">
        <form onSubmit={apply} className="space-y-4">
          <h2 className="font-bold">{copy.settings}</h2>
          <div><label className="label" htmlFor="pref-language">{label}</label><FlagSelect id="pref-language" value={draft.language} onChange={(language) => setDraft({ ...draft, language: language as Locale })} options={options.map(({ locale: l, countryCode }) => ({ value: l, label: NATIVE_NAME[l], flag: countryCode, lang: INTL_TAG[l] }))} /></div>
          <div><label className="label" htmlFor="pref-country">{copy.project}</label><FlagSelect id="pref-country" value={draft.country} onChange={(country) => setDraft({ ...draft, country, region: "" })} options={Object.keys(p.markets).map((country) => ({ value: country, label: `${names.of(country)} · ${country}`, flag: country }))} /></div>
          <div><label className="label" htmlFor="pref-region">{registry.region}</label><select id="pref-region" className="field" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })}><option value="">{registry.select}</option>{p.markets[draft.country]?.regions.map((r) => <option key={r.id} value={r.id}>{r.names?.[locale] ?? r.name}</option>)}</select></div>
          <div><label className="label" htmlFor="pref-currency">{copy.currency}</label><FlagSelect id="pref-currency" value={draft.currency} onChange={(currency) => setDraft({ ...draft, currency: currency as "EUR" | "USD" })} options={["EUR", "USD"].map((currency) => ({ value: currency, label: currency, flag: CURRENCY_FLAGS[currency] }))} /></div>
          <p className="text-xs leading-relaxed text-muted">{copy.reset}</p>
          <button className="btn btn-primary w-full" type="submit">{copy.apply}</button>
        </form>
      </div>}
    </div>
  );
}

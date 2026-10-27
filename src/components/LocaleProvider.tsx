"use client";

import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { COUNTRY_COOKIE, LOCALE_COUNTRY, TZ_COUNTRY, type Locale } from "@/i18n/config";
import { contextHref, displayCurrency, DRAFT_STORAGE, normalizePreferences, PREFERENCES_COOKIE, PREFERENCES_STORAGE, readPreferenceCookie, resolvePreferences, type CurrencyPreference, type CurrencyReference, type PreferenceMarkets, type ProjectPreferences } from "@/lib/preferences";

const LocaleContext = createContext<Locale>("en");
const defaultPreferences: ProjectPreferences = { country: "GB", displayCurrency: "AUTO", paymentCurrency: "AUTO" };
const PreferencesContext = createContext({
  ...defaultPreferences, ready: false, visitorCountry: undefined as string | undefined, currency: "EUR" as "EUR" | "USD", markets: {} as PreferenceMarkets,
  usd: { value: 1, date: "undated" } as CurrencyReference, settingsOpen: false,
  setLocation: (() => {}) as (country: string, region?: string) => void,
  setDisplayCurrency: (() => {}) as (currency: CurrencyPreference) => void, setPaymentCurrency: (() => {}) as (currency: CurrencyPreference) => void,
  applyPreferences: (() => {}) as (patch: Partial<ProjectPreferences>) => void,
  openSettings: () => {}, closeSettings: () => {}, href: (path: string) => path,
});

export function LocaleProvider({ locale, children, markets = {}, usd = { value: 1, date: "undated" } }: PropsWithChildren<{ locale: Locale; markets?: PreferenceMarkets; usd?: CurrencyReference }>) {
  const [preferences, setPreferences] = useState<ProjectPreferences>({ ...defaultPreferences, country: LOCALE_COUNTRY[locale] });
  const [ready, setReady] = useState(false);
  const [visitorCountry, setVisitorCountry] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (!Object.keys(markets).length) return;
    const read = () => {
      let saved: unknown, draft: { countryCode?: string; regionId?: string } | undefined;
      try { saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE) ?? "null"); draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE) ?? "null"); } catch { /* Private mode or old draft. */ }
      const geo = document.cookie.split("; ").find((c) => c.startsWith(`${COUNTRY_COOKIE}=`))?.slice(COUNTRY_COOKIE.length + 1);
      const visitor = geo ?? TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone];
      setVisitorCountry(visitor);
      setPreferences(resolvePreferences({ locale, markets, query: new URLSearchParams(location.search), saved: readPreferenceCookie(document.cookie) ?? saved, draft, visitorCountry: visitor }));
      setReady(true);
    };
    read();
    const synchronize = (event: StorageEvent) => { if (event.key === PREFERENCES_STORAGE) read(); };
    window.addEventListener("storage", synchronize);
    window.addEventListener("popstate", read);
    return () => { window.removeEventListener("storage", synchronize); window.removeEventListener("popstate", read); };
  }, [locale, markets]);

  const update = useCallback((next: ProjectPreferences) => {
    const value = normalizePreferences(next, markets, LOCALE_COUNTRY[locale]);
    setPreferences(value);
    // Contextual form controls must update the same URL as the header, including on reload/back.
    if (/\/(calculator|pricing)$/.test(window.location.pathname)) {
      window.history.replaceState(null, "", contextHref(window.location.href, value));
    }
    try {
      localStorage.setItem(PREFERENCES_STORAGE, JSON.stringify(value));
      document.cookie = `${PREFERENCES_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* In-memory preferences remain usable without storage. */ }
  }, [markets, locale]);
  const setLocation = useCallback((country: string, region?: string) => update({ ...preferences, country, region }), [preferences, update]);
  const value = { ...preferences, ready, visitorCountry, currency: displayCurrency(preferences.displayCurrency, visitorCountry), markets, usd, settingsOpen,
    setLocation,
    setDisplayCurrency: (displayCurrency: CurrencyPreference) => update({ ...preferences, displayCurrency }),
    setPaymentCurrency: (paymentCurrency: CurrencyPreference) => update({ ...preferences, paymentCurrency }),
    applyPreferences: (patch: Partial<ProjectPreferences>) => update({ ...preferences, ...patch }),
    openSettings: () => setSettingsOpen(true), closeSettings: () => setSettingsOpen(false), href: (path: string) => contextHref(path, preferences),
  };
  return <LocaleContext value={locale}><PreferencesContext value={value}>{children}</PreferencesContext></LocaleContext>;
}
export const useLocale = () => useContext(LocaleContext);
export const usePreferences = () => useContext(PreferencesContext);

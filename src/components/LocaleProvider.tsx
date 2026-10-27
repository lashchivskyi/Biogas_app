"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { COUNTRY_COOKIE, LOCALE_COOKIE, LOCALE_COUNTRY, type Locale } from "@/i18n/config";
import { detectVisitorLocation, type VisitorLocation } from "@/lib/visitor-location";
import { adaptToLocation, contextHref, displayCurrency, DRAFT_STORAGE, normalizePreferences, PREFERENCES_COOKIE, PREFERENCES_STORAGE, readPreferenceCookie, resolvePreferences, swapLocaleUrl, type CurrencyPreference, type CurrencyReference, type PreferenceMarkets, type ProjectPreferences } from "@/lib/preferences";

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
  const memoryPreferences = useRef<ProjectPreferences | undefined>(undefined);
  const persist = useCallback((value: ProjectPreferences) => {
    memoryPreferences.current = value;
    try { localStorage.setItem(PREFERENCES_STORAGE, JSON.stringify(value)); } catch { /* Storage can be disabled. */ }
    try { document.cookie = `${PREFERENCES_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=31536000; samesite=lax`; } catch { /* In-memory choices remain available. */ }
  }, []);
  useEffect(() => {
    if (!Object.keys(markets).length) return;
    let active = true;
    let visitor: string | undefined;
    let pending: Promise<VisitorLocation> | undefined;
    let lastCheck = 0;
    const controller = new AbortController();
    const load = () => {
      let saved: unknown, draft: { countryCode?: string; regionId?: string } | undefined;
      try { saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE) ?? "null"); draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE) ?? "null"); } catch { /* Private mode or old draft. */ }
      return resolvePreferences({ locale, markets, query: new URLSearchParams(location.search), saved: memoryPreferences.current ?? readPreferenceCookie(document.cookie) ?? saved, draft, visitorCountry: visitor });
    };
    const read = () => {
      setVisitorCountry(visitor);
      setPreferences(load());
      setReady(true);
    };
    const refresh = (): Promise<VisitorLocation> => {
      if (pending) return pending;
      if (Date.now() - lastCheck < 5000) return Promise.resolve({ country: visitor, source: "unknown" });
      pending = detectVisitorLocation({ hostname: window.location.hostname, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localIpEnabled: process.env.NEXT_PUBLIC_LOCAL_IP_GEO === "1" || (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_LOCAL_IP_GEO !== "0"), signal: controller.signal,
      }).then((result) => {
        if (active) {
          visitor = result.country;
          // Only an actual IP result is persisted as geo; timezone is never labelled as IP.
          try { if (result.source === "ip" && visitor) document.cookie = `${COUNTRY_COOKIE}=${visitor}; path=/; max-age=2592000; samesite=lax`; } catch { /* Cookie storage can be disabled. */ }
          if (result.source === "ip" && visitor) {
            const current = load();
            const adapted = adaptToLocation(current, visitor, markets);
            if (adapted.changed) {
              persist(adapted.preferences);
              const nextLocale = adapted.language ?? locale;
              try { document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`; } catch { /* URL remains authoritative. */ }
              const url = contextHref(swapLocaleUrl(window.location.href, nextLocale), adapted.preferences);
              if (nextLocale !== locale || (window.location.pathname.endsWith("/methodology") && current.country !== adapted.preferences.country)) {
                // Persist before navigation; the next page sees the same detected country and cannot loop.
                window.location.replace(url);
                return result;
              }
              if (/\/(calculator|pricing)$/.test(window.location.pathname)) window.history.replaceState(null, "", url);
            }
          }
          read();
        }
        return result;
      }).finally(() => { pending = undefined; lastCheck = Date.now(); });
      return pending;
    };
    void refresh();
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    const synchronize = (event: StorageEvent) => { if (event.key === PREFERENCES_STORAGE) { memoryPreferences.current = undefined; read(); } };
    window.addEventListener("storage", synchronize);
    window.addEventListener("popstate", read);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(onFocus, 60000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener("storage", synchronize); window.removeEventListener("popstate", read); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [locale, markets, persist]);

  const update = useCallback((next: ProjectPreferences) => {
    const value = normalizePreferences(next, markets, LOCALE_COUNTRY[locale]);
    persist(value);
    setPreferences(value);
    // Contextual form controls must update the same URL as the header, including on reload/back.
    if (/\/(calculator|pricing)$/.test(window.location.pathname)) {
      window.history.replaceState(null, "", contextHref(window.location.href, value));
    }
  }, [markets, locale, persist]);
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

"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, INTL_TAG, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { errorCopy } from "@/i18n/errors";
import "./globals.css";

const subscribe = () => () => undefined;
const serverLocale = () => DEFAULT_LOCALE;
function browserLocale(): Locale {
  const path = window.location.pathname.split("/")[1];
  if (isLocale(path)) return path;
  const cookie = document.cookie.split("; ").find((s) => s.startsWith(`${LOCALE_COOKIE}=`))?.split("=")[1];
  return isLocale(cookie) ? cookie : DEFAULT_LOCALE;
}

/** Root-layout errors have no LocaleProvider; recover the user's locale from the URL. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const locale = useSyncExternalStore(subscribe, browserLocale, serverLocale);
  const t = errorCopy[locale];
  return (
    <html lang={INTL_TAG[locale]}>
      <head><title>{t[3]}</title></head>
      <body>
        <main className="container-x py-24">
          <h1 className="text-3xl font-bold">{t[3]}</h1>
          <p className="mt-3 text-ink2">{t[4]}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={retry}>{t[5]}</button>
            <Link href={`/${locale}`} className="btn btn-ghost">{t[2]}</Link>
          </div>
        </main>
      </body>
    </html>
  );
}

import Link from "next/link";
import { INTL_TAG } from "@/i18n/config";
import { errorCopy } from "@/i18n/errors";
import { requestLocale } from "@/i18n/request";
import "./globals.css";

/** Multiple root layouts need the routing-level 404, rather than a root layout fallback. */
export default async function GlobalNotFound() {
  const locale = await requestLocale();
  const t = errorCopy[locale];
  return (
    <html lang={INTL_TAG[locale]}>
      <head><title>{`404 · ${t[0]}`}</title></head>
      <body>
        <main className="container-x py-24">
          <p className="num text-sm text-muted">404</p>
          <h1 className="mt-2 text-3xl font-bold">{t[0]}</h1>
          <p className="mt-3 text-ink2">{t[1]}</p>
          <Link href={`/${locale}`} className="btn btn-ghost mt-6">{t[2]}</Link>
        </main>
      </body>
    </html>
  );
}

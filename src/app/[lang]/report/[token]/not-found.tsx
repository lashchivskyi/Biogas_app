import Link from "next/link";
import { errorCopy } from "@/i18n/errors";
import { requestLocale } from "@/i18n/request";

/** This private route is already dynamic, so its missing-report UI can read the request locale. */
export default async function ReportNotFound() {
  const locale = await requestLocale();
  const t = errorCopy[locale];
  return (
    <main className="container-x py-24">
      <p className="num text-sm text-muted">404</p>
      <h1 className="mt-2 text-3xl font-bold">{t[0]}</h1>
      <p className="mt-3 text-ink2">{t[1]}</p>
      <Link href={`/${locale}`} className="btn btn-ghost mt-6">{t[2]}</Link>
    </main>
  );
}

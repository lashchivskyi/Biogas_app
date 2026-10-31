import Link from "next/link";
import { SITE } from "@/config/site";
import { errorCopy } from "@/i18n/errors";
import { reportLinkHelp } from "@/i18n/report-link";
import { requestLocale } from "@/i18n/request";

/** This private route is already dynamic, so its missing-report UI can read the request locale. */
export default async function ReportNotFound() {
  const locale = await requestLocale();
  const t = errorCopy[locale];
  const [title, text, support] = reportLinkHelp[locale];
  return (
    <main className="container-x py-24">
      <p className="num text-sm text-muted">404</p>
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-ink2">{text}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={`mailto:${SITE.supportEmail}?subject=${encodeURIComponent("Report link")}`} className="btn btn-primary">{support}</a>
        <Link href={`/${locale}`} className="btn btn-ghost">{t[2]}</Link>
      </div>
    </main>
  );
}

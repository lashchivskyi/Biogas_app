"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { errorCopy } from "@/i18n/errors";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const locale = useLocale();
  const t = errorCopy[locale];
  return (
    <main className="container-x py-24">
      <h1 className="text-3xl font-bold">{t[3]}</h1>
      <p className="mt-3 text-ink2">{t[4]}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={retry}>{t[5]}</button>
        <Link href={`/${locale}`} className="btn btn-ghost">{t[2]}</Link>
      </div>
    </main>
  );
}

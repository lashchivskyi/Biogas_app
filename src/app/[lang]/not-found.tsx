"use client";

import Link from "next/link";
import { errorCopy } from "@/i18n/errors";
import { useLocale } from "@/components/LocaleProvider";

export default function NotFoundPage() {
  const locale = useLocale();
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

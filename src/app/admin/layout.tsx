import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/unbounded";
import "../globals.css";
import { requestLocale } from "@/i18n/request";
import { INTL_TAG } from "@/i18n/config";

export const metadata: Metadata = { title: "Methalytics CRM", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const locale = await requestLocale();
  return (
    <html lang={INTL_TAG[locale]}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

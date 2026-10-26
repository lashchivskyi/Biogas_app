import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "../globals.css";
import { Logo } from "@/components/brand/Logo";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE } from "@/config/site";
import { SEGMENTS } from "@/content/segments";
import { getDictionary, INTL_TAG, isLocale, LOCALES, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";
import { LANGUAGE_OPTIONS } from "@/i18n/language-options";
import { LocaleProvider } from "@/components/LocaleProvider";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return {
    metadataBase: new URL(SITE.url),
    title: { default: `${d.meta.title} | ${SITE.name}`, template: `%s | ${SITE.name}` },
    description: d.meta.description,
    applicationName: SITE.name,
    alternates: alternates(lang as Locale, ""),
    openGraph: { title: d.meta.ogTitle, description: d.meta.ogDescription, type: "website", siteName: SITE.name, locale: INTL_TAG[lang as Locale]?.replace(/-[A-Z][a-z]{3}/, "").replace("-", "_") },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true, "max-image-preview": "large" },
    verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#050d0a", width: "device-width", initialScale: 1 };

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const d = await getDictionary(lang);
  const f = d.footer;
  const base = `/${lang}`;
  return (
    <html lang={INTL_TAG[lang]}>
      <body className="flex min-h-screen flex-col">
        <LocaleProvider locale={lang}>
        <a href="#main" className="skip-link">{d.nav.skip}</a>
        <SiteHeader locale={lang} t={d.nav} descriptor={d.brand.descriptor} languageOptions={LANGUAGE_OPTIONS} />
        <div id="main" className="flex-1">{children}</div>
        <footer className="no-print relative z-10 bg-night text-white/70">
          <div className="container-x grid gap-10 py-14 text-sm md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <Logo descriptor={d.brand.descriptor} />
              <p className="mt-4 max-w-sm">{d.brand.slogan} {f.about}</p>
            </div>
            <nav aria-label={f.sectors}>
              <div className="font-semibold text-white">{f.sectors}</div>
              <ul className="mt-3 space-y-2">
                <li><Link className="hover:text-white" href={`${base}/biogas`}>{f.hub}</Link></li>
                {SEGMENTS.map((s) => (
                  <li key={s.slug}><Link className="hover:text-white" href={`${base}/biogas/${s.slug}`}>{d.fit.segments[s.id as keyof typeof d.fit.segments].label}</Link></li>
                ))}
              </ul>
            </nav>
            <nav aria-label={f.product}>
              <div className="font-semibold text-white">{f.product}</div>
              <ul className="mt-3 space-y-2">
                <li><Link className="hover:text-white" href={`${base}/calculator`}>{f.calculator}</Link></li>
                <li><Link className="hover:text-white" href={`${base}/samples`}>{f.samples}</Link></li>
                <li><Link className="hover:text-white" href={`${base}/pricing`}>{f.pricing}</Link></li>
                <li><Link className="hover:text-white" href={`${base}/methodology`}>{f.methodology}</Link></li>
                <li><Link className="hover:text-white" href={`${base}/terms`}>{f.terms}</Link></li>
              </ul>
            </nav>
            <div>
              <div className="font-semibold text-white">{f.important}</div>
              <p className="mt-3">{f.disclaimer}</p>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="container-x flex flex-wrap justify-between gap-2 py-5 text-xs text-white/45">
              <span>© {new Date().getFullYear()} {SITE.name} · {f.rights}</span>
              <span>{f.payments}</span>
            </div>
          </div>
        </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}


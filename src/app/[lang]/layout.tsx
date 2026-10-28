import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "../globals.css";
import { Logo } from "@/components/brand/Logo";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE } from "@/config/site";
import { BUSINESS_GROUPS, BUSINESS_IDS, BUSINESS_TYPES, businessHref } from "@/core/businesses";
import { getDictionary, INTL_TAG, isLocale, LOCALES, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";
import { LANGUAGE_OPTIONS } from "@/i18n/language-options";
import { LocaleProvider } from "@/components/LocaleProvider";
import { COUNTRIES, COUNTRY_ORDER } from "@/countries";
import { fxFor } from "@/countries/sources";

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
      {/* Extensions such as Grammarly add body attributes before hydration; descendant checks stay active. */}
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <LocaleProvider locale={lang} markets={Object.fromEntries(COUNTRY_ORDER.map((code) => { const c = COUNTRIES[code]; return [code, { currency: c.currency, regions: c.regions.map(({ id, name, names }) => ({ id, name, names })) }]; }))} usd={{ value: fxFor("USD")!.value, date: fxFor("USD")!.date }}>
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
                {BUSINESS_GROUPS.map((group) => (
                  <li key={group.id}><details>
                    <summary className="cursor-pointer font-semibold hover:text-white">{d.audience.items[group.copyIndex].title}</summary>
                    <ul className="mt-2 space-y-2 pl-3">
                      {BUSINESS_IDS.filter((id) => BUSINESS_TYPES[id].audience === group.id).map((id) => <li key={id}><Link className="hover:text-white" href={businessHref(id, base)}>{d.labels.business[id].label}</Link></li>)}
                    </ul>
                  </details></li>
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


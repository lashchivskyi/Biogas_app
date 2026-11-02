import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { HREFLANG, INTL_TAG, LOCALES, type Locale } from "./config";

/** canonical + hreflang alternates for a localised path ("" = home). */
export function alternates(locale: Locale, path: string, only?: readonly Locale[]): Metadata["alternates"] {
  const list = only ?? LOCALES;
  const languages: Record<string, string> = {};
  for (const l of list) languages[HREFLANG[l]] = `/${l}${path}`;
  languages["x-default"] = `/${list.includes("en") ? "en" : list[0]}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}

/** Open Graph locale ("de_DE"; the script subtag of sr-Latn-RS is dropped, as Facebook expects). */
export const ogLocale = (locale: Locale) => INTL_TAG[locale].replace(/-[A-Z][a-z]{3}/, "").replace("-", "_");

/**
 * Title, description, canonical + hreflang, Open Graph and Twitter card of one page, all in the page's language.
 * Without this each page inherited the home page's og:title and og:description from the layout.
 * `only` limits the hreflang set for pages that exist in some languages only (the guides).
 */
export function pageMetadata(locale: Locale, path: string, copy: { title: string; description?: string; ogType?: "website" | "article" }, only?: readonly Locale[]): Metadata {
  const { title, description, ogType = "website" } = copy;
  const alternate = (only ?? LOCALES).filter((l) => l !== locale).map(ogLocale);
  return {
    title,
    ...(description ? { description } : {}),
    alternates: alternates(locale, path, only),
    openGraph: { title, ...(description ? { description } : {}), type: ogType, siteName: SITE.name, url: `/${locale}${path}`, locale: ogLocale(locale), alternateLocale: alternate },
    twitter: { card: "summary_large_image", title, ...(description ? { description } : {}) },
  };
}

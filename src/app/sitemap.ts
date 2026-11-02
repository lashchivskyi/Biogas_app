import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { SEGMENTS } from "@/content/segments";
import { EXAMPLES } from "@/core/examples";
import { HREFLANG, LOCALES, type Locale } from "@/i18n/config";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

/** Every localised page with hreflang alternates and x-default. The guide pages exist in every language (long-form in en/uk, native summaries elsewhere). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const all: Array<[string, number, Freq, readonly Locale[]]> = [
    ["", 1, "weekly", LOCALES],
    ["/calculator", 0.9, "monthly", LOCALES],
    ["/pricing", 0.8, "monthly", LOCALES],
    ["/samples", 0.7, "monthly", LOCALES],
    ...EXAMPLES.map((e) => [`/samples/${e.id}`, 0.5, "monthly", LOCALES] as [string, number, Freq, readonly Locale[]]),
    ["/methodology", 0.4, "monthly", LOCALES],
    ["/terms", 0.2, "yearly", LOCALES],
    ["/biogas", 0.8, "monthly", LOCALES],
    ...SEGMENTS.map(s => [`/biogas/${s.slug}`, 0.7, "monthly", LOCALES] as [string, number, Freq, readonly Locale[]]),
  ];
  return all.flatMap(([path, priority, changeFrequency, locales]) => {
    // Same set as the page's <link rel="alternate"> (src/i18n/seo.ts), including x-default.
    const languages = Object.fromEntries([...locales.map((l) => [HREFLANG[l], absoluteUrl(`/${l}${path}`)]), ["x-default", absoluteUrl(`/${locales.includes("en") ? "en" : locales[0]}${path}`)]]);
    return locales.map((l) => ({ url: absoluteUrl(`/${l}${path}`), lastModified: now, changeFrequency, priority, alternates: { languages } }));
  });
}

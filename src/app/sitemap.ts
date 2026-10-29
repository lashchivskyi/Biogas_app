import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { SEGMENTS } from "@/content/segments";
import { EXAMPLES } from "@/core/examples";
import { INTL_TAG, LOCALES, type Locale } from "@/i18n/config";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

/** Every localised page with hreflang alternates. Long-form guide pages exist only in en/uk. */
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
    ["/biogas", 0.8, "monthly", ["en", "uk"]],
    ...SEGMENTS.map(s => [`/biogas/${s.slug}`, 0.7, "monthly", ["en", "uk"]] as [string, number, Freq, readonly Locale[]]),
  ];
  return all.flatMap(([path, priority, changeFrequency, locales]) => {
    const languages = Object.fromEntries(locales.map((l) => [INTL_TAG[l], absoluteUrl(`/${l}${path}`)]));
    return locales.map((l) => ({ url: absoluteUrl(`/${l}${path}`), lastModified: now, changeFrequency, priority, alternates: { languages } }));
  });
}

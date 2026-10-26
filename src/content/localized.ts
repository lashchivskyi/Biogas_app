import type { Dict, Locale } from "@/i18n";
import { HUB, type HubContent } from "./hub";
import type { Segment, SegmentSeo } from "./segments";

/** Native summaries reuse reviewed product copy rather than silently serving an English article. */
export function localizedHub(locale: Locale, d: Dict): HubContent {
  if (locale === "en" || locale === "uk") return HUB[locale];
  return {
    title: d.footer.hub,
    description: d.meta.description,
    cta: d.nav.cta,
    ctaSectors: d.hub.sectors,
    sections: [
      ...d.story.chapters.map((c, i) => ({ id: `process-${i}`, h: c.title, p: [c.body, c.count] })),
      ...d.principles.items.map((p, i) => ({ id: `principle-${i}`, h: p.title, p: [p.text] })),
    ],
    sector: {
      drivers: d.principles.title, conditions: d.fit.whatItTakes, faq: d.faq.title, others: d.footer.sectors,
      expertTitle: d.pricing.plans.report.tagline, expertText: d.pricing.lead, expertLink: d.nav.pricing,
      disclaimer: d.common.illustrative, calcCta: d.fit.cta,
    },
  };
}

export function localizedSegment(s: Segment, locale: Locale, d: Dict): SegmentSeo {
  if (locale === "en" || locale === "uk") return s.seo[locale];
  const segment = d.fit.segments[s.id];
  return {
    title: `${segment.label} — ${d.brand.descriptor}`,
    description: segment.insight,
    h1: segment.label,
    intro: [segment.insight],
    drivers: d.principles.items.slice(0, 4).map((p) => [p.title, p.text]),
    faq: d.faq.items.slice(0, 3).map((p) => [p.q, p.a]),
  };
}

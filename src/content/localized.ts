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

export function segmentCopy(s: Segment, d: Dict) {
  const authored = d.fit.segments[s.id as keyof Dict["fit"]["segments"]];
  const business = d.labels.business[s.businessType];
  return authored ?? { label: business.label, insight: business.hint, conditions: d.result.robust.steps.slice(1, 4) };
}

export function localizedSegment(s: Segment, locale: Locale, d: Dict): SegmentSeo & { conditions: readonly string[] } {
  const segment = segmentCopy(s, d);
  const label = s.id === "small" ? d.fit.segments.small.label : d.labels.business[s.businessType].label;
  if ((locale === "en" || locale === "uk") && s.seo) return { ...s.seo[locale], h1: s.id === "small" ? s.seo[locale].h1 : label, conditions: segment.conditions };
  return {
    title: `${label} — ${d.brand.descriptor}`,
    description: segment.insight,
    h1: label,
    intro: [segment.insight],
    drivers: d.principles.items.slice(0, 4).map((p) => [p.title, p.text]),
    faq: d.faq.items.slice(0, 3).map((p) => [p.q, p.a]),
    conditions: segment.conditions,
  };
}

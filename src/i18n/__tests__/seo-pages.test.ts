import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Metadata } from "next";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SEGMENTS } from "@/content/segments";
import { EXAMPLES } from "@/core/examples";
import { getDictionary, HREFLANG, INTL_TAG, LOCALES, type Locale } from "..";
import { ogLocale } from "../seo";
import { seoCopy } from "../seo-copy";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, toString: () => "" }) }));

type Gen = (p: { params: Promise<Record<string, string>> }) => Promise<Metadata>;
const text = (v: unknown) => (typeof v === "string" ? v : v && typeof v === "object" && "default" in v ? String((v as { default: string }).default) : "");

async function pages(locale: Locale) {
  const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ lang: locale, ...extra }) });
  const mods = await Promise.all([
    import("@/app/[lang]/layout"), import("@/app/[lang]/calculator/page"), import("@/app/[lang]/pricing/page"), import("@/app/[lang]/samples/page"),
    import("@/app/[lang]/methodology/page"), import("@/app/[lang]/terms/page"), import("@/app/[lang]/biogas/page"), import("@/app/[lang]/biogas/[slug]/page"), import("@/app/[lang]/samples/[id]/page"),
  ]);
  const [layout, calc, pricing, samples, method, terms, hub, segment, sample] = mods as unknown as { generateMetadata: Gen }[];
  const entries: [string, string, Metadata][] = [
    ["", "home", await layout.generateMetadata(params())],
    ["/calculator", "calculator", await calc.generateMetadata(params())],
    ["/pricing", "pricing", await pricing.generateMetadata(params())],
    ["/samples", "samples", await samples.generateMetadata(params())],
    ["/methodology", "methodology", await method.generateMetadata(params())],
    ["/terms", "terms", await terms.generateMetadata(params())],
    ["/biogas", "hub", await hub.generateMetadata(params())],
    [`/biogas/${SEGMENTS[0].slug}`, "segment", await segment.generateMetadata(params({ slug: SEGMENTS[0].slug }))],
    [`/samples/${EXAMPLES[0].id}`, "sample", await sample.generateMetadata(params({ id: EXAMPLES[0].id }))],
  ];
  return entries;
}

const stems = (q: string) => q.toLowerCase().split(/[\s\-–:,]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, Math.min(5, w.length - 1)));

describe.each(LOCALES)("SEO metadata %s", (locale) => {
  it("every page has its own localised title and description, Open Graph in the page language, canonical and hreflang", async () => {
    const entries = await pages(locale);
    const titles = new Map<string, string>(), descriptions = new Map<string, string>();
    for (const [path, name, m] of entries) {
      const title = text(m.title), description = text(m.description);
      expect(title.length, `${name} title`).toBeGreaterThan(8);
      // Search results cut a title at ≈ 60 characters (+ " | Methalytics" from the template): the query sits first. Home keeps its long question-style title.
      expect(title.length, `${name} title length: ${title}`).toBeLessThanOrEqual(name === "home" ? 110 : name === "sample" ? 120 : 72);
      expect(description.length, `${name} description`).toBeGreaterThan(40);
      expect(titles.has(title), `${locale}: duplicate title "${title}" on ${name} and ${titles.get(title)}`).toBe(false);
      if (name !== "home") expect(descriptions.has(description), `${locale}: duplicate description on ${name} and ${descriptions.get(description)}`).toBe(false);
      titles.set(title, name); descriptions.set(description, name);
      const og = m.openGraph as { title?: string; description?: string; locale?: string; url?: string; alternateLocale?: string[] };
      if (name !== "home") expect(og.title, `${name} og:title`).toBe(title);
      expect(og.description, `${name} og:description`).toBeTruthy();
      expect(og.locale, `${name} og:locale`).toBe(ogLocale(locale));
      expect(og.url).toBe(`/${locale}${path}`);
      const alt = m.alternates as { canonical: string; languages: Record<string, string> };
      expect(alt.canonical).toBe(`/${locale}${path}`);
      expect(Object.keys(alt.languages).sort()).toEqual([...Object.values(HREFLANG), "x-default"].sort());
      expect(alt.languages[HREFLANG[locale]]).toBe(`/${locale}${path}`);
    }
  });

  it("targets the way a native speaker searches (first query appears on the home page or the calculator title/description)", async () => {
    const entries = await pages(locale);
    const find = (n: string) => entries.find(([, name]) => name === n)![2];
    const haystack = [find("home"), find("calculator")].map((m) => `${text(m.title)} ${text(m.description)}`).join(" ").toLowerCase();
    const wanted = stems(seoCopy[locale].queries[0]);
    if (locale === "th") expect(haystack).toContain("ก๊าซชีวภาพ"); // Thai has no word spaces: check the core noun
    else for (const s of wanted) expect(haystack, `${locale}: "${seoCopy[locale].queries[0]}" → ${s}`).toContain(s);
  });
});

describe("FAQPage structured data", () => {
  it.each(LOCALES)("home and pricing carry FAQPage in the page language (%s)", async (locale) => {
    const d = await getDictionary(locale);
    const en = await getDictionary("en");
    const wrap = (node: React.ReactNode) => createElement(LocaleProvider, { locale, markets: {}, usd: { value: 1, date: "2026-01-01" }, children: node } as never);
    const params = Promise.resolve({ lang: locale });
    const [{ default: Home }, { default: Pricing }] = await Promise.all([import("@/app/[lang]/page"), import("@/app/[lang]/pricing/page")]);
    for (const [html, faq, enFaq] of [
      [renderToStaticMarkup(wrap(await Home({ params } as never))), d.faq.items, en.faq.items],
      [renderToStaticMarkup(wrap(await Pricing({ params, searchParams: Promise.resolve({}) } as never))), d.pricing.faq, en.pricing.faq],
    ] as const) {
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1].replace(/&quot;/g, '"')));
      const flat = blocks.flatMap((b) => (b["@graph"] ?? [b]) as { "@type": string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[]);
      const faqPage = flat.find((n) => n["@type"] === "FAQPage")!;
      expect(faqPage, locale).toBeDefined();
      expect(faqPage.mainEntity!.map((q) => q.name)).toEqual(faq.map((x) => x.q));
      expect(faqPage.mainEntity!.map((q) => q.acceptedAnswer.text)).toEqual(faq.map((x) => x.a));
      if (locale !== "en") expect(faqPage.mainEntity![0].name).not.toBe(enFaq[0].q);
      expect(INTL_TAG[locale]).toBeTruthy();
    }
  }, 30_000);
});

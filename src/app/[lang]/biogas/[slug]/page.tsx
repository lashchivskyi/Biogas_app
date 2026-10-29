import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { PageHero } from "@/components/PageHero";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { localizedHub, localizedSegment } from "@/content/localized";
import { SEGMENTS, segmentBySlug } from "@/content/segments";
import { countryName, fmt, getDictionary, type Locale } from "@/i18n";
import { coreLang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";
import { makeFormat } from "@/lib/format";
import { DisplayMoney } from "@/components/DisplayMoney";
import { exampleTitle } from "@/lib/examples";
import { SECTOR_IDS, BUSINESS_TYPES, businessHref } from "@/core/businesses";
import { businessCopy } from "@/i18n/businesses";

export function generateStaticParams() {
  return SEGMENTS.map(s => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/biogas/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const s = segmentBySlug(slug);
  if (!s) return {};
  const locale = lang as Locale;
  const seo = localizedSegment(s, locale, await getDictionary(locale));
  return {
    title: seo.title,
    description: seo.description,
    alternates: alternates(locale, `/biogas/${s.slug}`),
    openGraph: { title: seo.title, description: seo.description, type: "article" },
  };
}

export default async function SegmentPage({ params }: PageProps<"/[lang]/biogas/[slug]">) {
  const { lang, slug } = await params;
  const s = segmentBySlug(slug);
  if (!s) notFound();
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const seo = localizedSegment(s, locale, d);
  const H = localizedHub(locale, d).sector;
  const ex = EXAMPLES.find((e) => e.id === s.exampleId);
  const a = ex ? assess(ex.input, getCountry(ex.input.countryCode), { lang: coreLang(locale) }) : undefined;
  const r = a?.ranges;
  const economicsAvailable = a?.financialsAvailable !== false;
  const f = makeFormat(locale, d.labels.units);
  const base = `/${locale}`;
  const calcHref = `${base}/calculator?b=${s.businessType}`;
  const B = businessCopy(locale);

  return (
    <main>
      <PageHero
        crumbs={[{ name: d.brand.descriptor, href: base }, { name: d.hub.sectors, href: `${base}/biogas` }, { name: s.id === "small" ? d.fit.segments.small.label : d.labels.business[s.businessType].label, href: `${base}/biogas/${s.slug}` }]}
        title={seo.h1}
        lead={seo.intro[0]}
      >
        <div className="mt-7 flex flex-wrap items-center gap-3">
          {BUSINESS_TYPES[s.businessType].scope === "specialist" && <span className="text-sm text-white/75">{B.specialist}</span>}
          <Link href={calcHref} className="btn btn-signal">{d.fit.cta} <Icon name="arrow" size={18} /></Link>
        </div>
      </PageHero>

      <section className="container-x grid gap-10 py-16 lg:grid-cols-[1.4fr_1fr]">
        <article className="min-w-0">
          {seo.intro.slice(1).map((p) => <p key={p} className="text-lg leading-relaxed text-ink2">{p}</p>)}

          <h2 className="font-display mt-10 text-2xl font-semibold">{H.drivers}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {seo.drivers.map(([t, x]) => (
              <div key={t} className="card p-5">
                <div className="font-bold">{t}</div>
                <p className="mt-1.5 text-[15px] text-ink2">{x}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display mt-10 text-2xl font-semibold">{H.conditions}</h2>
          <ul className="mt-4 space-y-3">
            {seo.conditions.map((c) => (
              <li key={c} className="flex gap-3 text-ink2"><Icon name="check" size={20} className="mt-0.5 shrink-0 text-brand" />{c}</li>
            ))}
          </ul>

          <h2 className="font-display mt-10 text-2xl font-semibold">{H.faq}</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {seo.faq.map(([q, ans]) => (
              <details key={q} className="group py-4">
                <summary className="flex items-center justify-between gap-4 font-bold">{q}<span aria-hidden className="text-muted transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-ink2">{ans}</p>
              </details>
            ))}
          </div>
        </article>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <div className="eyebrow text-brand">{d.fit.modelCase}</div>
            <div className="mt-1 text-sm text-muted">{ex ? `${exampleTitle(ex, d, locale)} · ${countryName(ex.input.countryCode, locale)}` : d.labels.business[s.businessType].label}</div>
            <div className="font-display mt-3 text-2xl font-semibold">{d.labels.verdict[a?.verdict.id ?? "INSUFFICIENT_DATA"]}</div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface2 p-3"><dt className="text-muted">{d.fit.biogas}</dt><dd className="num font-bold">{r ? fmt(d.flow.m3Yr, { v: f.range(r.biogasM3[0], r.biogasM3[2], (x) => f.compact(x)) }) : "—"}</dd></div>
              <div className="rounded-xl bg-surface2 p-3"><dt className="text-muted">{d.fit.capacity}</dt><dd className="num font-bold">{r && economicsAvailable ? `${f.range(r.kwEl[0], r.kwEl[2])} ${d.labels.units.kw}` : "—"}</dd></div>
              <div className="rounded-xl bg-surface2 p-3"><dt className="text-muted">{d.fit.investment}</dt><dd className="num font-bold">{r && economicsAvailable ? <DisplayMoney value={r.capexEur[2]} end={r.capexEur[0]} initialText={`${f.eur(r.capexEur[2])} – ${f.eur(r.capexEur[0])}`} /> : "—"}</dd></div>
              <div className="rounded-xl bg-surface2 p-3"><dt className="text-muted">{d.fit.payback}</dt><dd className="num font-bold">{r && economicsAvailable ? f.years(r.paybackYears[1]) : "—"}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">{a ? d.result.tone[a.verdict.id] : d.result.robust.accuracy} {H.disclaimer}</p>
            <Link href={calcHref} className="btn btn-primary mt-5 w-full">{H.calcCta}</Link>
            {ex && <Link href={`${base}/samples/${ex.id}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">{d.samples.open} <Icon name="arrow" size={16} /></Link>}
          </div>
          <div className="card p-6">
            <div className="font-bold">{H.expertTitle}</div>
            <p className="mt-1.5 text-sm text-ink2">{H.expertText}</p>
            <Link href={`${base}/pricing`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">{H.expertLink} <Icon name="arrow" size={16} /></Link>
          </div>
        </aside>
      </section>

      <section className="border-t border-line bg-surface py-14">
        <div className="container-x">
          <h2 className="font-display text-2xl font-semibold">{H.others}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {SECTOR_IDS.filter((id) => id !== s.businessType).map((id) => (
              <Link key={id} href={businessHref(id, base)} className="chip hover:border-brand">{d.labels.business[id].label}</Link>
            ))}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: seo.faq.map(([q, ans]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } })),
          }),
        }}
      />
    </main>
  );
}

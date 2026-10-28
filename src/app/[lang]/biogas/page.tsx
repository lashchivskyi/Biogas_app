import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { PageHero } from "@/components/PageHero";
import { localizedHub } from "@/content/localized";
import { BUSINESS_GROUPS, BUSINESS_IDS, BUSINESS_TYPES, businessHref } from "@/core/businesses";
import { businessCopy } from "@/i18n/businesses";
import { BusinessMarketContext } from "@/components/BusinessMarketContext";
import { getDictionary, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/biogas">): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const h = localizedHub(locale, await getDictionary(locale));
  return {
    title: h.title,
    description: h.description,
    alternates: alternates(locale, "/biogas"),
    openGraph: { title: h.title, description: h.description, type: "article" },
  };
}

export default async function BiogasHub({ params }: PageProps<"/[lang]/biogas">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const h = localizedHub(locale, d);
  const base = `/${locale}`;
  const B = businessCopy(locale);
  return (
    <main>
      <PageHero crumbs={[{ name: d.brand.descriptor, href: base }, { name: h.title, href: `${base}/biogas` }]} eyebrow={d.hub.eyebrow} title={h.title} lead={h.description}>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`${base}/calculator`} className="btn btn-signal">{h.cta} <Icon name="arrow" size={18} /></Link>
          <a href="#segments" className="btn btn-ghost-dark">{h.ctaSectors}</a>
        </div>
      </PageHero>

      <div className="container-x grid gap-12 py-16 lg:grid-cols-[240px_1fr]">
        <nav aria-label={d.hub.toc} className="hidden lg:block">
          <div className="sticky top-24 space-y-2 text-sm">
            <div className="eyebrow text-muted">{d.hub.toc}</div>
            {h.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="block text-ink2 hover:text-brand">{s.h}</a>)}
            <a href="#segments" className="block text-ink2 hover:text-brand">{d.hub.sectors}</a>
          </div>
        </nav>
        <article className="max-w-3xl">
          {h.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-b border-line py-8 first:pt-0">
              <h2 className="font-display text-2xl font-semibold">{s.h}</h2>
              {s.p.map((p) => <p key={p} className="mt-4 text-lg leading-relaxed text-ink2">{p}</p>)}
            </section>
          ))}
          <section id="segments" className="scroll-mt-24 pt-10">
            <h2 className="font-display text-2xl font-semibold">{d.hub.sectors}</h2>
            {BUSINESS_GROUPS.map((group) => <section key={group.id} className="mt-8">
              <h3 className="text-lg font-bold">{d.audience.items[group.copyIndex].title}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {BUSINESS_IDS.filter((id) => BUSINESS_TYPES[id].audience === group.id).map((id) => {
                  const business = BUSINESS_TYPES[id];
                  return <article key={id} id={`business-${id}`} className="card scroll-mt-24 p-5">
                    <h4 className="font-bold">{business.guideSlug ? <Link href={businessHref(id, base)} className="hover:text-brand">{d.labels.business[id].label}</Link> : d.labels.business[id].label}</h4>
                    <p className="mt-2 text-sm text-ink2">{d.labels.business[id].hint}</p>
                    {business.scope !== "screening" && <p className="mt-3 text-xs font-semibold">{business.scope === "outside_model" ? B.outside : B.specialist}</p>}
                    {business.scope === "outside_model" ? <p className="mt-2 text-sm text-muted">{B.scopeNote}</p> : <Link href={`${base}/calculator?b=${id}`} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">{d.fit.cta}</Link>}
                    <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">{B.market}</summary><BusinessMarketContext business={id} /></details>
                  </article>;
                })}
              </div>
            </section>)}
          </section>
        </article>
      </div>
    </main>
  );
}

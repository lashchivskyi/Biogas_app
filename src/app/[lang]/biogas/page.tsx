import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { PageHero } from "@/components/PageHero";
import { localizedHub } from "@/content/localized";
import { SEGMENTS } from "@/content/segments";
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
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SEGMENTS.map((s) => (
                <Link key={s.slug} href={`${base}/biogas/${s.slug}`} className="card group p-5 transition hover:border-brand">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{d.fit.segments[s.id].label}</span>
                    <Icon name="arrow" size={18} className="text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
                  </div>
                  <p className="mt-1.5 text-sm text-ink2">{d.fit.segments[s.id].insight}</p>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}

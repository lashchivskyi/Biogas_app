import Link from "next/link";
import type { ReactNode } from "react";
import { absoluteUrl } from "@/config/site";

export interface Crumb {
  name: string;
  href: string;
}

/** Dark page header with breadcrumbs (visible + BreadcrumbList JSON-LD). */
export function PageHero({ eyebrow, title, lead, wideLead = false, crumbs, children }: { eyebrow?: string; title: string; lead?: ReactNode; wideLead?: boolean; crumbs?: Crumb[]; children?: ReactNode }) {
  return (
    <section className="hero relative overflow-hidden pb-14 pt-28 md:pt-32">
      <div className="hero-grid absolute inset-0" aria-hidden />
      <div className="container-x relative">
        {crumbs && crumbs.length > 0 && (
          <>
            <nav aria-label={crumbs[crumbs.length - 1].name} className="mb-5 text-sm text-white/55">
              <ol className="flex flex-wrap items-center gap-1.5">
                {crumbs.map((c, i) => (
                  <li key={c.href} className="flex items-center gap-1.5">
                    {i < crumbs.length - 1 ? <Link href={c.href} className="hover:text-white">{c.name}</Link> : <span aria-current="page" className="text-white/80">{c.name}</span>}
                    {i < crumbs.length - 1 && <span aria-hidden>/</span>}
                  </li>
                ))}
              </ol>
            </nav>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.href) })),
                }),
              }}
            />
          </>
        )}
        {eyebrow && <p className="eyebrow text-signal">{eyebrow}</p>}
        <h1 className="font-display mt-3 max-w-4xl text-3xl font-semibold leading-tight md:text-5xl">{title}</h1>
        {lead && <div className={`mt-4 text-lg text-white/75${wideLead ? "" : " max-w-2xl"}`}>{lead}</div>}
        {children}
      </div>
    </section>
  );
}

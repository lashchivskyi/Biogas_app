import Link from "next/link";
import { assess } from "@/core";
import type { Assessment } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { Icon, type IconName } from "@/components/brand/Icon";
import { HomeStory } from "@/components/home/HomeStory";
import { SegmentPicker, type SegmentCard } from "@/components/home/SegmentPicker";
import { StickyCta } from "@/components/home/StickyCta";
import { Reveal } from "@/components/Reveal";
import { Emblem } from "@/components/three/Emblem";
import { SITE } from "@/config/site";
import { SEGMENTS } from "@/content/segments";
import { countryName, getDictionary, type Locale } from "@/i18n";
import { coreLang } from "@/i18n/config";
import { makeFormat } from "@/lib/format";

const SIGN_ICONS: IconName[] = ["factory", "scale", "heat"];
const STEP_ICONS: IconName[] = ["clock", "doc", "shield", "chart"];
const PRINCIPLE_ICONS: IconName[] = ["leaf", "chart", "heat", "scale", "route", "flame"];
const AUDIENCE_ICONS: IconName[] = ["cow", "factory", "chart", "route"];

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const base = `/${locale}`;
  const F = makeFormat(locale, d.labels.units);
  const cl = coreLang(locale);

  const run = (id: string): { a: Assessment; country: string } => {
    const ex = EXAMPLES.find((e) => e.id === id)!;
    return { a: assess(ex.input, getCountry(ex.input.countryCode), { lang: cl }), country: ex.input.countryCode };
  };
  const segments: SegmentCard[] = SEGMENTS.map((s) => {
    const { a, country } = run(s.exampleId);
    const r = a.ranges;
    const txt = d.fit.segments[s.id];
    return {
      id: s.id, slug: s.slug, label: txt.label, businessType: s.businessType, tone: s.tone, tendency: d.fit.tones[s.tone], insight: txt.insight, conditions: [...txt.conditions],
      example: {
        title: `${d.examples[s.exampleId as keyof typeof d.examples] ?? s.exampleId} · ${countryName(country, locale)}`,
        verdict: d.labels.verdict[a.verdict.id],
        payback: F.years(r.paybackYears[1]),
        capex: `${F.eur(r.capexEur[2])} – ${F.eur(r.capexEur[0])}`,
        kw: `${F.range(r.kwEl[0], r.kwEl[2])} ${d.labels.units.kwe}`,
        biogas: `${F.range(r.biogasM3[0], r.biogasM3[2], (x) => F.compact(x))} m³`,
      },
    };
  });
  const sample = run("slaughter_5000").a;
  const maxNpv = Math.max(...(["conservative", "base", "optimistic"] as const).map((k) => Math.abs(sample.scenarios[k].fin.npvEur)), 1);

  return (
    <main>
      <HomeStory d={d} base={base} />

      {/* ---------- AUDIENCE: whole industry ---------- */}
      <section className="relative z-10 border-t border-white/10 bg-night py-20 text-white">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow text-signal">{d.audience.eyebrow}</p>
            <h2 className="font-display mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-[44px]">{d.audience.title}</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.audience.items.map((it, i) => (
              <Reveal key={it.title} delay={i * 70} className="h-full">
                <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <Icon name={AUDIENCE_ICONS[i]} size={26} className="text-signal" />
                  <div className="mt-4 text-lg font-bold">{it.title}</div>
                  <p className="mt-1.5 text-white/70">{it.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FIT ---------- */}
      <section id="fit" className="relative z-10 scroll-mt-16 bg-night2 py-24 text-white">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow text-signal">{d.fit.eyebrow}</p>
            <h2 className="font-display mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">{d.fit.title}</h2>
            <p className="mt-4 max-w-2xl text-lg text-white/70">{d.fit.sub}</p>
          </Reveal>
          <Reveal className="mt-10">
            <SegmentPicker segments={segments} base={base} t={{ ...d.fit, illustrative: d.common.illustrative }} />
          </Reveal>
        </div>
      </section>

      {/* ---------- SIGNS ---------- */}
      <section className="relative z-10 bg-bg py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <p className="eyebrow text-brand">{d.signs.eyebrow}</p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight sm:text-[44px]">{d.signs.title}</h2>
            <ol className="mt-9 space-y-6">
              {d.signs.items.map((s, i) => (
                <li key={s.title} className="flex gap-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brandsoft text-brand"><Icon name={SIGN_ICONS[i]} size={24} /></span>
                  <div>
                    <div className="text-lg font-bold">{i + 1}. {s.title}</div>
                    <p className="mt-1 text-ink2">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-lg font-semibold">{d.signs.ctaLine} <Link href={`${base}/calculator`} className="text-brand underline decoration-2 underline-offset-4 hover:text-brandink">{d.signs.ctaLink}</Link></p>
          </Reveal>
          <Reveal delay={120}>
            <div className="card h-full p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-bad"><Icon name="x" size={20} /></span>
                <h3 className="text-xl font-bold">{d.signs.notForTitle}</h3>
              </div>
              <ul className="mt-6 space-y-4">{d.signs.notFor.map((t) => <li key={t} className="flex gap-3 text-ink2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bad" />{t}</li>)}</ul>
              <p className="mt-8 rounded-2xl bg-surface2 p-4 text-sm text-ink2">{d.signs.notForNote}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- WHAT YOU GET ---------- */}
      <section className="relative z-10 border-t border-line bg-surface py-24">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <p className="eyebrow text-brand">{d.get.eyebrow}</p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight sm:text-[44px]">{d.get.title}</h2>
            <ul className="mt-8 space-y-4">
              {d.get.items.map((it) => (
                <li key={it.title} className="flex gap-3"><Icon name="check" size={22} className="mt-0.5 shrink-0 text-brand" /><span><b>{it.title}.</b> <span className="text-ink2">{it.text}</span></span></li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`${base}/calculator`} className="btn btn-primary text-base">{d.get.cta} <Icon name="arrow" size={18} /></Link>
              <Link href={`${base}/samples`} className="btn btn-ghost text-base">{d.result.seeSample}</Link>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <figure className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-br from-brandsoft via-transparent to-amber-100 blur-2xl" aria-hidden />
              <Link href={`${base}/samples/slaughter_5000`} className="card block overflow-hidden shadow-[0_30px_80px_-30px_rgba(11,23,18,0.35)] transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between border-b border-line bg-surface2 px-5 py-3 text-xs text-muted">
                  <span className="font-semibold">{d.get.reportLabel} · {d.examples.slaughter_5000}</span>
                  <span>{d.get.sampleTag}</span>
                </div>
                <div className="p-6">
                  <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-300">{d.result.verdict}</div>
                  <div className="font-display mt-2 text-3xl font-semibold">{d.labels.verdict[sample.verdict.id]}</div>
                  <p className="mt-1 text-sm text-muted">{sample.verdict.reasons[0]}</p>
                  <dl className="mt-6 grid grid-cols-2 gap-4">
                    {[
                      [d.fit.biogas, `${F.range(sample.ranges.biogasM3[0], sample.ranges.biogasM3[2], (x) => F.compact(x))} m³`],
                      [d.fit.capacity, `${F.range(sample.ranges.kwEl[0], sample.ranges.kwEl[2])} ${d.labels.units.kw}`],
                      [d.fit.investment, `${F.eur(sample.ranges.capexEur[2])} – ${F.eur(sample.ranges.capexEur[0])}`],
                      [d.fit.payback, F.years(sample.scenarios.base.fin.simplePaybackYears)],
                    ].map(([k, val]) => (
                      <div key={k} className="rounded-xl bg-surface2 p-3"><dt className="text-xs text-muted">{k}</dt><dd className="num mt-0.5 text-lg font-bold">{val}</dd></div>
                    ))}
                  </dl>
                  <div className="mt-6 space-y-2">
                    {(["conservative", "base", "optimistic"] as const).map((k) => {
                      const v = sample.scenarios[k].fin.npvEur;
                      const w = (Math.abs(v) / maxNpv) * 50;
                      return (
                        <div key={k} className="flex items-center gap-3 text-xs">
                          <span className="w-28 text-muted">{d.labels.scenario[k]}</span>
                          <div className="relative h-3 flex-1 rounded-full bg-surface2">
                            <span className="absolute top-0 h-3 w-px bg-ink/40" style={{ left: "50%" }} />
                            <span className={`absolute top-0 h-3 rounded-full ${v < 0 ? "bg-bad/70" : "bg-brand"}`} style={v < 0 ? { right: "50%", width: `${w}%` } : { left: "50%", width: `${w}%` }} />
                          </div>
                          <span className="num w-20 text-right font-semibold">{F.eur(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Link>
              <figcaption className="mt-3 text-center text-xs text-muted">{d.common.illustrative}</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ---------- PROCESS ---------- */}
      <section id="process" className="relative z-10 scroll-mt-16 bg-bg py-24">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow text-brand">{d.process.eyebrow}</p>
            <h2 className="font-display mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-[44px]">{d.process.title}</h2>
            <p className="mt-4 max-w-2xl text-lg text-ink2">{d.process.sub}</p>
          </Reveal>
          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {d.process.steps.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 90} className="h-full">
                  <div className="card flex h-full flex-col p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brandsoft text-brand"><Icon name={STEP_ICONS[i]} size={22} /></span>
                      <span className="font-display text-sm font-semibold text-muted">0{i + 1}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                    <p className="mt-2 flex-1 text-[15px] text-ink2">{s.text}</p>
                    <span className={`mt-5 inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${i === 0 ? "bg-brand text-white" : "bg-surface2 text-ink2"}`}>{s.tag}</span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <div className="mt-8"><Link href={`${base}/pricing`} className="font-semibold text-brand underline underline-offset-4">{d.nav.pricing} →</Link></div>
        </div>
      </section>

      {/* ---------- PRINCIPLES ---------- */}
      <section className="relative z-10 bg-night py-24 text-white">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow text-signal">{d.principles.eyebrow}</p>
            <h2 className="font-display mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-[44px]">{d.principles.title}</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.principles.items.map((p, i) => (
              <Reveal key={p.title} delay={i * 70} className="h-full">
                <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <Icon name={PRINCIPLE_ICONS[i]} size={26} className="text-signal" />
                  <div className="mt-4 text-lg font-bold">{p.title}</div>
                  <p className="mt-1.5 text-white/70">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10"><Link href={`${base}/methodology`} className="inline-flex items-center gap-2 font-semibold text-signal hover:underline">{d.principles.link}</Link></Reveal>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="relative z-10 bg-bg py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <p className="eyebrow text-brand">{d.faq.eyebrow}</p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight sm:text-[44px]">{d.faq.title}</h2>
          </Reveal>
          <div className="divide-y divide-line border-y border-line">
            {d.faq.items.map((x) => (
              <details key={x.q} className="group py-5">
                <summary className="flex items-center justify-between gap-6 text-lg font-bold">{x.q}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45" aria-hidden>+</span></summary>
                <p className="mt-3 max-w-2xl text-ink2">{x.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="hero relative z-10 overflow-hidden py-24">
        <div className="hero-grid absolute inset-0" aria-hidden />
        <div className="container-x relative flex flex-col items-center text-center">
          <Emblem size={170} />
          <h2 className="font-display mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">{d.final.title}</h2>
          <p className="mt-4 max-w-xl text-lg text-white/70">{d.final.sub}</p>
          <Link href={`${base}/calculator`} className="btn btn-signal mt-9 text-base">{d.final.cta} <Icon name="arrow" size={18} /></Link>
        </div>
      </section>

      <StickyCta href={`${base}/calculator`} label={d.nav.cta} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon.svg`, description: d.footer.about },
              { "@type": "WebSite", name: SITE.name, url: `${SITE.url}${base}`, inLanguage: locale },
              { "@type": "WebApplication", name: `${SITE.name} — ${d.footer.calculator}`, url: `${SITE.url}${base}/calculator`, applicationCategory: "BusinessApplication", inLanguage: locale, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } },
              { "@type": "FAQPage", mainEntity: d.faq.items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
            ],
          }),
        }}
      />
    </main>
  );
}

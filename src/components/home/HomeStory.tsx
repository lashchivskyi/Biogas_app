"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/i18n";
import { Icon, type IconName } from "../brand/Icon";
import { SceneCanvas } from "../three/SceneCanvas";
import type { ChapterId } from "../three/ProcessScene";

const QUICK = ["dairy_farm", "pig_farm", "poultry_farm", "slaughterhouse", "dairy_processor", "sugar_beet_factory", "municipal_biowaste", "biogas_developer", "sugar_ethanol"] as const;

const CHAPTER_META: Array<{ id: ChapterId; color: string; icon: IconName }> = [
  { id: "feedstock", color: "#8fd16a", icon: "leaf" },
  { id: "digester", color: "#3ddc97", icon: "drop" },
  { id: "biogas", color: "#ffbf3d", icon: "flame" },
  { id: "energy", color: "#5b9bff", icon: "bolt" },
  { id: "digestate", color: "#c99a62", icon: "route" },
];

function Headline({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("[") ? <span key={i} className="text-gradient">{p.slice(1, -1)}</span> : <span key={i}>{p}</span>))}
    </>
  );
}

export function HomeStory({ d, base }: { d: Pick<Dict, "hero" | "story" | "labels">; base: string }) {
  const H = d.hero;
  const S = d.story;
  const wrapRef = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState<ChapterId>("overview");
  const [active, setActive] = useState(true);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    io.observe(wrap);
    const marks = wrap.querySelectorAll<HTMLElement>("[data-chapter]");
    const io2 = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setChapter(e.target.getAttribute("data-chapter") as ChapterId);
            e.target.classList.add("is-in");
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    marks.forEach((m) => io2.observe(m));
    return () => {
      io.disconnect();
      io2.disconnect();
    };
  }, []);

  const chapters = CHAPTER_META.map((m, i) => ({ ...m, ...S.chapters[i], n: String(i + 1).padStart(2, "0") }));
  const idx = chapters.findIndex((c) => c.id === chapter);

  return (
    <section ref={wrapRef} className="relative bg-night text-white" aria-label={S.intro}>
      <div className="sticky top-0 h-[100svh] w-full">
        <SceneCanvas chapter={chapter} active={active} />
        <ol className={`pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col gap-4 transition-opacity duration-500 md:flex ${idx >= 0 ? "opacity-100" : "opacity-0"}`} aria-hidden>
          {chapters.map((c, i) => (
            <li key={c.id} className="flex items-center justify-end gap-3">
              <span className={`text-xs font-semibold transition-all ${i === idx ? "text-white opacity-100" : "text-white/40 opacity-0 lg:opacity-100"}`}>{c.kicker}</span>
              <span className="block h-2.5 w-2.5 rounded-full transition-transform" style={{ background: i <= idx ? c.color : "rgba(255,255,255,.25)", transform: i === idx ? "scale(1.5)" : "none" }} />
            </li>
          ))}
        </ol>
      </div>

      <div className="relative z-10 -mt-[100svh]">
        <div data-chapter="overview" className="flex min-h-[100svh] items-center pb-16 pt-28">
          <div className="container-x">
            <div className="max-w-[780px]">
              <p className="eyebrow rise-in text-signal">{H.eyebrow}</p>
              <h1 className="font-display rise-in mt-5 text-[40px] font-semibold leading-[1.04] sm:text-6xl lg:text-[76px]" style={{ animationDelay: "80ms" }}>
                <Headline text={H.h1} />
              </h1>
              <p className="rise-in mt-6 max-w-[620px] text-lg text-white/80 sm:text-xl" style={{ animationDelay: "160ms" }}>{H.lead}</p>
              <div className="rise-in mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
                <Link href={`${base}/calculator`} className="btn btn-signal text-base">{H.cta} <Icon name="arrow" size={18} /></Link>
                <a href="#how" className="btn btn-ghost-dark text-base">{H.ctaSecondary} <Icon name="down" size={18} /></a>
              </div>
              <ul className="rise-in mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70" style={{ animationDelay: "320ms" }}>
                {H.trust.map((t) => <li key={t} className="flex items-center gap-2"><Icon name="check" size={16} className="text-signal" />{t}</li>)}
              </ul>
            </div>
            <div className="rise-in glass mt-12 max-w-[780px] p-4 sm:p-5" style={{ animationDelay: "420ms" }}>
              <p className="text-sm font-semibold text-white/85">{H.quick}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK.map((b) => (
                  <Link key={b} href={`${base}/calculator?b=${b}`} className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white/90 transition hover:border-signal hover:bg-white/10">{d.labels.business[b].label}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="how" className="scroll-mt-0">
          <div className="container-x pt-10"><p className="eyebrow text-signal">{S.intro}</p></div>
          {chapters.map((c) => (
            <div key={c.id} data-chapter={c.id} className="reveal flex min-h-[92svh] items-center py-16">
              <div className="container-x">
                <article className="glass max-w-[520px] p-6 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: `${c.color}22`, color: c.color }}><Icon name={c.icon} size={22} /></span>
                    <span className="eyebrow" style={{ color: c.color }}>{c.n} · {c.kicker}</span>
                  </div>
                  <h2 className="font-display mt-5 text-2xl font-semibold leading-tight sm:text-[32px]">{c.title}</h2>
                  <p className="mt-4 text-[17px] leading-relaxed text-white/80">{c.body}</p>
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/50">{S.whatWeCount}</div>
                    <p className="mt-1.5 text-[15px] text-white/85">{c.count}</p>
                  </div>
                </article>
              </div>
            </div>
          ))}
        </div>

        <div data-chapter="outro" className="reveal flex min-h-[80svh] items-center pb-24 pt-10">
          <div className="container-x">
            <div className="glass max-w-[620px] p-7 sm:p-10">
              <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{S.outroTitle}</h2>
              <p className="mt-4 text-lg text-white/80">{S.outroBody}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={`${base}/calculator`} className="btn btn-signal text-base">{H.cta} <Icon name="arrow" size={18} /></Link>
                <a href="#fit" className="btn btn-ghost-dark text-base">{S.outroSecondary}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

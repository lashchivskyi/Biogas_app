"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LOCALE_COOKIE, LOCALES, NATIVE_NAME, type Locale } from "@/i18n/config";
import type { LanguageOption } from "@/i18n/language-options";
import { Logo } from "./brand/Logo";
import { Icon } from "./brand/Icon";

export interface HeaderText {
  how: string; who: string; pricing: string; samples: string; methodology: string; cta: string; ctaShort: string; menu: string; close: string; language: string;
}

/** Replace the locale segment while keeping the rest of the current path. */
function swapLocale(path: string, next: Locale) {
  const parts = path.split("/");
  if (parts.length > 1 && (LOCALES as readonly string[]).includes(parts[1])) parts[1] = next;
  else parts.splice(1, 0, next);
  return parts.join("/") || `/${next}`;
}

/** An explicit language choice wins over Accept-Language on the next visit (read by proxy.ts). */
function rememberLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

function LanguageMenu({ locale, label, options }: { locale: Locale; label: string; options: readonly LanguageOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.contains(document.activeElement)) {
        setOpen(false);
        ref.current.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const choose = (l: Locale) => rememberLocale(l);
  return (
    <div ref={ref} className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} onKeyDown={(e) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      if (!open) setOpen(true);
      requestAnimationFrame(() => {
        const links = Array.from(ref.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
        const current = links.indexOf(document.activeElement as HTMLAnchorElement);
        const next = e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 : current < 0 ? (e.key === "ArrowUp" ? links.length - 1 : 0) : (current + (e.key === "ArrowUp" ? -1 : 1) + links.length) % links.length;
        links[next]?.focus();
      });
    }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox" aria-label={`${label}: ${NATIVE_NAME[locale]}`} className="flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-2 text-[13px] font-semibold text-white/85 hover:border-white/40">
        {locale.toUpperCase()}
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="fixed inset-x-3 top-16 z-50 grid max-h-[70dvh] grid-cols-2 gap-0.5 overflow-auto rounded-2xl border border-white/10 bg-[#071510]/97 p-2 shadow-2xl backdrop-blur-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[420px]">
          {options.map(({ locale: l }) => (
            <li key={l} role="presentation">
              <Link role="option" aria-selected={l === locale} tabIndex={l === locale ? 0 : -1} href={swapLocale(path, l)} hrefLang={l} lang={l} onClick={() => { choose(l); setOpen(false); }} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${l === locale ? "bg-white/10 font-semibold text-white" : "text-white/75 hover:bg-white/5 hover:text-white"}`}>
                <span>{NATIVE_NAME[l]}</span>
                <span className="text-[11px] text-white/40">{l.toUpperCase()}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SiteHeader({ locale, t, descriptor, languageOptions }: { locale: Locale; t: HeaderText; descriptor: string; languageOptions: readonly LanguageOption[] }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const base = `/${locale}`;
  const NAV = [
    { href: `${base}#how`, label: t.how },
    { href: `${base}#fit`, label: t.who },
    { href: `${base}/samples`, label: t.samples },
    { href: `${base}/pricing`, label: t.pricing },
    { href: `${base}/methodology`, label: t.methodology },
  ];
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`no-print fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid || open ? "border-b border-white/10 bg-[#06110d]/85 backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="container-x flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href={base} aria-label="Methalytics" className="shrink-0 max-[359px]:[&_.font-display]:hidden">
          <Logo descriptor={descriptor} animated />
        </Link>
        <nav aria-label={t.menu} className="hidden items-center gap-6 text-[14px] font-semibold text-white/75 xl:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageMenu locale={locale} label={t.language} options={languageOptions} />
          <Link href={`${base}/calculator`} aria-label={t.cta} className="btn btn-signal !px-3 !py-2.5 text-sm sm:!px-4">
            <span className="hidden sm:inline">{t.cta}</span>
            <span className="hidden min-[440px]:inline sm:hidden">{t.ctaShort}</span>
            <Icon name="arrow" size={18} className="min-[440px]:hidden" />
          </Link>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-white xl:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t.close : t.menu} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? "x" : "menu"} size={22} />
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label={t.menu} className="container-x pb-5 xl:hidden">
          <ul className="grid gap-1">
            {NAV.map((n) => (
              <li key={n.href}><Link href={n.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-base font-semibold text-white/85 hover:bg-white/5">{n.label}</Link></li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

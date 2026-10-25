"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LOCALE_COOKIE, LOCALES, NATIVE_NAME, type Locale } from "@/i18n/config";
import { Logo } from "./brand/Logo";
import { Icon } from "./brand/Icon";

export interface HeaderText {
  how: string; who: string; pricing: string; samples: string; methodology: string; cta: string; ctaShort: string; menu: string; close: string; language: string;
}

/** Replace the locale segment of the current path, keeping the rest (and the hash). */
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

function LanguageMenu({ locale, label }: { locale: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const choose = (l: Locale) => rememberLocale(l);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox" aria-label={label} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-[13px] font-semibold text-white/85 hover:border-white/40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" /></svg>
        {locale.toUpperCase()}
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="absolute right-0 top-11 z-50 grid max-h-[70vh] w-[min(420px,92vw)] grid-cols-2 gap-0.5 overflow-auto rounded-2xl border border-white/10 bg-[#071510]/97 p-2 shadow-2xl backdrop-blur-xl">
          {LOCALES.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <Link href={swapLocale(path, l)} hrefLang={l} lang={l} onClick={() => { choose(l); setOpen(false); }} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${l === locale ? "bg-white/10 font-semibold text-white" : "text-white/75 hover:bg-white/5 hover:text-white"}`}>
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

export function SiteHeader({ locale, t, descriptor }: { locale: Locale; t: HeaderText; descriptor: string }) {
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
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href={base} aria-label="Methalytics" className="shrink-0">
          <Logo descriptor={descriptor} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-[14px] font-semibold text-white/75 xl:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageMenu locale={locale} label={t.language} />
          <Link href={`${base}/calculator`} className="btn btn-signal !px-4 !py-2.5 text-sm">
            <span className="hidden sm:inline">{t.cta}</span>
            <span className="sm:hidden">{t.ctaShort}</span>
          </Link>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-white xl:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t.close : t.menu} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? "x" : "menu"} size={22} />
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="container-x pb-5 xl:hidden">
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

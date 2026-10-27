"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { PreferenceMenu } from "./PreferenceMenu";
import { usePreferences } from "./LocaleProvider";
import type { LanguageOption } from "@/i18n/language-options";
import { Logo } from "./brand/Logo";
import { Icon } from "./brand/Icon";

export interface HeaderText {
  how: string; who: string; pricing: string; samples: string; methodology: string; cta: string; ctaShort: string; menu: string; close: string; language: string;
}


export function SiteHeader({ locale, t, descriptor, languageOptions }: { locale: Locale; t: HeaderText; descriptor: string; languageOptions: readonly LanguageOption[] }) {
  const preferences = usePreferences();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const base = `/${locale}`;
  const NAV = [
    { href: `${base}#how`, label: t.how },
    { href: `${base}#fit`, label: t.who },
    { href: `${base}/samples`, label: t.samples },
    { href: preferences.href(`${base}/pricing`), label: t.pricing },
    { href: preferences.href(`${base}/methodology`), label: t.methodology },
  ];
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`no-print fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid || open || preferences.settingsOpen ? "border-b border-white/10 bg-[#06110d]/85 backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="container-x flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href={base} aria-label="Methalytics" className="shrink-0 max-[359px]:[&_.font-display]:hidden">
          <Logo descriptor={descriptor} animated />
        </Link>
        <nav aria-label={t.menu} className="hidden items-center gap-6 text-[14px] font-semibold text-white/75 xl:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <PreferenceMenu locale={locale} label={t.language} options={languageOptions} />
          <Link href={preferences.href(`${base}/calculator`)} aria-label={t.cta} className="btn btn-signal !px-3 !py-2.5 text-sm sm:!px-4">
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

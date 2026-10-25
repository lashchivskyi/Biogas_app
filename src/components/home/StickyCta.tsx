"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Mobile-only bottom CTA that appears after the hero, so the next step is always one tap away. */
export function StickyCta({ href, label }: { href: string; label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const nearEnd = window.innerHeight + window.scrollY > document.body.scrollHeight - 700;
      setShow(window.scrollY > window.innerHeight * 0.8 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className={`no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#06110d]/92 p-3 backdrop-blur-xl transition-transform duration-300 md:hidden ${show ? "translate-y-0" : "translate-y-full"}`} style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <Link href={href} className="btn btn-signal w-full text-base" tabIndex={show ? 0 : -1}>{label}</Link>
    </div>
  );
}

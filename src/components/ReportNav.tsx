"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sticky index of a long report. Plain anchor links (work without JavaScript and in the server markup); the
 * observer only marks the section being read.
 */
export function ReportNav({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const list = useRef<HTMLOListElement>(null);
  const ids = items.map((i) => i.id).join(" ");
  useEffect(() => {
    const els = ids.split(" ").map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting);
      const first = els.find((el) => seen.get(el.id));
      if (first) setActive(first.id);
    }, { rootMargin: "-130px 0px -55% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  // On a phone the index scrolls sideways: keep the section being read in view.
  useEffect(() => {
    const ol = list.current, link = ol?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (ol && link) ol.scrollTo({ left: Math.max(0, link.offsetLeft - 16), behavior: "smooth" });
  }, [active]);
  return (
    <nav aria-label={label} className="no-print sticky top-16 z-30 -mx-5 mb-6 border-b border-line bg-bg/90 px-5 backdrop-blur-md md:-mx-8 md:px-8">
      <ol ref={list} className="relative scrollbar-none flex gap-1.5 overflow-x-auto py-2.5 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a href={`#${i.id}`} aria-current={active === i.id ? "location" : undefined} className={`block whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${active === i.id ? "bg-ink text-white" : "text-ink2 hover:bg-surface2"}`}>{i.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_ORDER } from "@/countries";
import { countryName, type Locale } from "@/i18n";
import { CountryFlag } from "./CountryFlag";
import { alphabetically } from "@/lib/format";

/** Searchable combobox; flags supplement the localised names and ISO codes. */
export function CountrySelect({ id, value, onChange, locale, search, empty }: {
  id: string; value: string; onChange: (code: string) => void; locale: Locale; search: string; empty: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const options = useMemo(() => alphabetically(COUNTRY_ORDER.map((code) => ({ code, name: countryName(code, locale) })), locale, (c) => c.name), [locale]);
  const filtered = options.filter((c) => `${c.name} ${c.code}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)));

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }
  function show() { setOpen(true); setQuery(""); setActive(Math.max(0, options.findIndex((c) => c.code === value))); }

  return (
    <div className="relative min-w-0 text-left">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center"><CountryFlag code={value} /></div>
      <input
        id={id} role="combobox" type="text" autoComplete="off" aria-autocomplete="list"
        aria-expanded={open} aria-controls={`${id}-list`} aria-describedby={`${id}-hint`}
        aria-activedescendant={open && filtered[active] ? `${id}-${filtered[active].code}` : undefined}
        className="field !pl-12 !pr-8 placeholder:text-ink"
        value={open ? query : countryName(value, locale)} placeholder={countryName(value, locale)}
        onFocus={show} onClick={() => { if (!open) show(); }}
        onBlur={() => { setOpen(false); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); setOpen(false); setQuery(""); }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) { show(); return; }
            setActive((n) => Math.max(0, Math.min(filtered.length - 1, n + (e.key === "ArrowDown" ? 1 : -1))));
          }
          if (open && (e.key === "Home" || e.key === "End")) { e.preventDefault(); setActive(e.key === "Home" ? 0 : Math.max(0, filtered.length - 1)); }
          if (open && e.key === "Enter") { e.preventDefault(); if (filtered[active]) choose(filtered[active].code); }
        }}
      />
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 text-muted">⌄</span>
      <span id={`${id}-hint`} className="sr-only">{search}</span>
      {open && <ul ref={list} id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-xl">
        {filtered.map((c, index) => <li
          id={`${id}-${c.code}`} key={c.code} role="option" aria-selected={value === c.code}
          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${index === active ? "bg-brandsoft text-brandink" : "text-ink hover:bg-surface2"}`}
          onPointerDown={(e) => e.preventDefault()} onClick={() => choose(c.code)} onMouseEnter={() => setActive(index)}
        >
          <CountryFlag code={c.code} /><span className="flex-1">{c.name}</span><span className="text-xs text-muted">{c.code}{value === c.code ? " ✓" : ""}</span>
        </li>)}
        {!filtered.length && <li role="presentation" className="px-3 py-4 text-sm text-muted">{empty}</li>}
      </ul>}
    </div>
  );
}

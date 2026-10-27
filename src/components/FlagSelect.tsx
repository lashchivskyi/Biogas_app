"use client";

import { useEffect, useRef, useState } from "react";
import { CountryFlag } from "./CountryFlag";

type Option = { value: string; label: string; flag?: string; lang?: string };

/** SVG flags in both the selected value and list; native options cannot render these on Windows. */
export function FlagSelect({ id, value, options, onChange, disabled = false }: {
  id: string; value: string; options: readonly Option[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", time: 0 });
  const selected = options.find((option) => option.value === value);
  const show = () => { setActive(Math.max(0, options.findIndex((option) => option.value === value))); setOpen(true); };
  const choose = (option: Option) => { onChange(option.value); setOpen(false); };

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <div ref={root} className="relative min-w-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button id={id} type="button" role="combobox" aria-expanded={open && !disabled} aria-controls={`${id}-list`} aria-haspopup="listbox"
      aria-activedescendant={open && options[active] ? `${id}-option-${active}` : undefined}
      disabled={disabled} className="field flex items-center gap-3 text-left disabled:opacity-60" onClick={() => open ? setOpen(false) : show()}
      onKeyDown={(event) => {
        if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          if (event.key === "Enter" || event.key === " ") { if (open && options[active]) choose(options[active]); else show(); }
          else if (event.key === "Home" || event.key === "End") { setActive(event.key === "Home" ? 0 : options.length - 1); setOpen(true); }
          else if (!open) show();
          else setActive((current) => Math.max(0, Math.min(options.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
        } else if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          const now = Date.now();
          typed.current = { text: (now - typed.current.time < 700 ? typed.current.text : "") + event.key.toLocaleLowerCase(), time: now };
          const index = options.findIndex((option) => option.label.toLocaleLowerCase().startsWith(typed.current.text));
          if (index >= 0) { event.preventDefault(); setActive(index); setOpen(true); }
        }
      }}>
      {selected?.flag && <CountryFlag code={selected.flag} />}<span className="min-w-0 flex-1 truncate" lang={selected?.lang}>{selected?.label ?? value}</span><span aria-hidden="true" className="text-muted">⌄</span>
    </button>
    {open && !disabled && <ul ref={list} id={`${id}-list`} role="listbox" aria-labelledby={id} className="absolute inset-x-0 top-full z-50 mt-1 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-line bg-white p-1 shadow-xl">
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value === value}
        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${index === active ? "bg-brandsoft text-brandink" : "text-ink hover:bg-surface2"}`}
        onPointerDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
        {option.flag && <CountryFlag code={option.flag} />}<span className="flex-1" lang={option.lang}>{option.label}</span>{option.value === value && <span aria-hidden="true">✓</span>}
      </li>)}
    </ul>}
  </div>;
}

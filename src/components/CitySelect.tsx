"use client";

import { useEffect, useRef, useState } from "react";
import { cityRegionId, validCity, type CityClimate } from "@/core/location";
import { INTL_TAG, type Locale } from "@/i18n/config";
import { locationCopy } from "@/i18n/location";
import type { CityResult } from "@/server/cities";
import { usePreferences } from "./LocaleProvider";

/** One shared location control used by the header and project form. No browser-supplied coordinates enter the model. */
export function CitySelect({ id, country, locale, region, city, onChange, onPendingChange }: {
  id: string; country: string; locale: Locale; region?: string; city?: CityClimate;
  onChange: (region?: string, city?: CityClimate) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const copy = locationCopy(locale);
  const preferences = usePreferences();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState<{ key: string; results: CityResult[]; failed: boolean }>({ key: "", results: [], failed: false });
  const [selection, setSelection] = useState({ country: "", busy: false, failed: false });
  const controller = useRef<AbortController | null>(null);
  const latestChange = useRef(onChange);
  useEffect(() => { latestChange.current = onChange; }, [onChange]);
  const text = query.trim(), key = `${country}/${locale}/${text}`;
  const results = search.key === key ? search.results : [];
  const busy = selection.country === country && selection.busy;
  const failed = selection.country === country && selection.failed || search.key === key && search.failed;

  useEffect(() => () => { controller.current?.abort(); onPendingChange?.(false); }, [country, locale, onPendingChange]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);
  useEffect(() => {
    if (text.length < 2 || city) return;
    const request = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/cities?${new URLSearchParams({ q: text, country, lang: locale })}`, { signal: request.signal })
        .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data: { results: CityResult[] }) => { if (!request.signal.aborted) setSearch({ key, results: data.results, failed: false }); })
        .catch(() => { if (!request.signal.aborted) setSearch({ key, results: [], failed: true }); });
    }, 350);
    return () => { clearTimeout(timer); request.abort(); };
  }, [text, country, locale, key, city]);

  async function choose(place: CityResult) {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setOpen(false); setSelection({ country, busy: true, failed: false });
    onPendingChange?.(true); latestChange.current(undefined);
    try {
      const r = await fetch(`/api/cities?${new URLSearchParams({ id: String(place.id), country, lang: locale })}`, { signal: request.signal });
      if (!r.ok) throw new Error();
      const data = await r.json() as { city: CityClimate };
      if (!validCity(data.city, country) || data.city.id !== place.id) throw new Error();
      if (!request.signal.aborted) { latestChange.current(cityRegionId(data.city), data.city); setQuery(""); setSelection({ country, busy: false, failed: false }); }
    } catch { if (!request.signal.aborted) setSelection({ country, busy: false, failed: true }); }
    finally { if (!request.signal.aborted) onPendingChange?.(false); }
  }
  function change(region?: string) {
    controller.current?.abort(); onPendingChange?.(false); setSelection({ country, busy: false, failed: false }); setQuery(""); setOpen(false); onChange(region);
  }
  const nf = new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 4 });
  return <div className="min-w-0" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
    {city ? <div className="rounded-xl border border-line bg-brandsoft p-3">
      <input id={id} readOnly value={city.name} aria-describedby={`${id}-hint`} className="w-full min-w-0 rounded bg-transparent font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand" />
      {city.admin1 && <p className="break-words text-sm text-ink2">{city.admin1}</p>}
      <p className="num mt-1 text-xs text-muted">{nf.format(city.latitude)}, {nf.format(city.longitude)} · ERA5 {city.startDate.slice(0, 4)}–{city.endDate.slice(0, 4)}</p>
      <button type="button" className="mt-2 text-sm font-semibold text-brand underline" onClick={() => change()}>{copy.change}</button>
    </div> : <div className="relative">
      <input id={id} type="search" className="field" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open && results.length > 0}
        aria-controls={`${id}-results`} aria-activedescendant={open && results[active] ? `${id}-option-${active}` : undefined} aria-describedby={`${id}-hint`}
        placeholder={copy.search} value={query} disabled={busy} maxLength={100}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); setSelection({ country, busy: false, failed: false }); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); }
          else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setActive((i) => Math.max(0, Math.min(results.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))); }
          else if (e.key === "Enter") { e.preventDefault(); if (open && results[active]) void choose(results[active]); }
        }} />
      {open && results.length > 0 && <ul id={`${id}-results`} role="listbox" aria-label={copy.title} className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-xl">
        {results.map((p, i) => <li key={p.id} id={`${id}-option-${i}`} role="option" aria-selected={i === active}
          className={`cursor-pointer rounded-lg p-3 text-sm ${i === active ? "bg-brandsoft" : "hover:bg-surface2"}`}
          onPointerDown={(e) => e.preventDefault()} onPointerMove={() => setActive(i)} onClick={() => void choose(p)}>
          <span className="block font-semibold">{p.name}</span><span className="block text-xs text-muted">{p.admin1} · {p.countryCode}</span>
        </li>)}
      </ul>}
    </div>}
    {!city && region && <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
      <span>{preferences.markets[country]?.regions.find((r) => r.id === region)?.names?.[locale] ?? preferences.markets[country]?.regions.find((r) => r.id === region)?.name ?? region}</span>
      <button type="button" className="font-semibold text-brand underline" onClick={() => change()}>{copy.change}</button>
    </div>}
    <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-muted">{copy.hint} {(!city || city.dataset) && copy.grid}</p>
    {(busy || preferences.locationLoading || !city && text.length >= 2 && search.key !== key) && <p role="status" className="mt-2 text-xs text-muted">{copy.loading}</p>}
    {(failed || !city && preferences.locationError) && <p role="alert" className="mt-2 text-xs text-warn">{copy.error}</p>}
    {!city && open && text.length >= 2 && search.key === key && !failed && !results.length && <p role="status" className="mt-2 text-xs text-muted">{copy.empty}</p>}
    {/* Regional-profile selector retired in favour of city search. Keep historical region IDs readable.
    <details className="mt-3" open={region && !city ? true : undefined}>
      <summary className="cursor-pointer text-xs font-semibold text-ink2">{copy.fallback}</summary>
      <select aria-label={copy.fallback} className="field mt-2" value={city ? "" : region ?? ""} onChange={(e) => change(e.target.value || undefined)}>
        <option value="">{methodologyCopy[locale].registry.select}</option>
        {preferences.markets[country]?.regions.map((r) => <option key={r.id} value={r.id}>{r.names?.[locale] ?? r.name}</option>)}
      </select>
    </details>
    */}
    <p className="mt-2 text-[10px] text-muted"><a href="https://www.geonames.org/" target="_blank" rel="noreferrer" className="underline">GeoNames</a> · <a href="https://registry.opendata.aws/planette_era5_reanalysis/" target="_blank" rel="noreferrer" className="underline">Copernicus ERA5 / NSF NCAR / Planette · 0.25°</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">CC BY 4.0</a></p>
  </div>;
}

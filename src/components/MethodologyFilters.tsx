"use client";

import { useEffect, useRef } from "react";
import type { MethodologyCopy } from "@/i18n/methodology";
import type { Locale } from "@/i18n/config";
import { preferenceCopy } from "@/i18n/preferences";
import { usePreferences } from "./LocaleProvider";
import type { CityClimate } from "@/core/location";

/** Registry location uses the shared settings panel rather than another independent selector. */
export function MethodologyFilters({ country, region, city, copy, locale, explicitSelection }: {
  country: string; region?: string; city?: CityClimate; copy: MethodologyCopy["registry"]; locale: Locale; explicitSelection: boolean;
}) {
  const p = usePreferences();
  const adopted = useRef("");
  const key = country + "/" + (region ?? "");
  useEffect(() => {
    if (!p.ready) return;
    if (adopted.current !== key) {
      adopted.current = key;
      if (explicitSelection && (p.country !== country || p.region !== region)) { p.setLocation(country, region, city); return; }
    }
    if (p.country === country && p.region === region) return;
    window.location.replace(p.href(window.location.href));
  }, [p, country, region, city, key, explicitSelection]);
  return <div className="methodology-filters">
    <button type="button" className="btn btn-ghost" onClick={p.openSettings}>{preferenceCopy(locale).change}</button>
    <p className="methodology-legend">{copy.note}</p>
  </div>;
}

"use client";

import type { BusinessTypeId } from "@/core/businesses";
import { businessMarket } from "@/countries/business-markets";
import { countryName } from "@/i18n";
import { businessCopy } from "@/i18n/businesses";
import { useLocale, usePreferences } from "./LocaleProvider";

/** Evidence follows the shared project location; language never selects a market. */
export function BusinessMarketContext({ business, country, region }: { business: BusinessTypeId; country?: string; region?: string }) {
  const locale = useLocale();
  const preferences = usePreferences();
  const code = country ?? preferences.country;
  const regionId = country ? region : preferences.region;
  const market = businessMarket(business, code, regionId);
  const profile = market.regional ? preferences.markets[code]?.regions.find((item) => item.id === regionId) : undefined;
  const H = businessCopy(locale);
  return (
    <aside className="mt-4 rounded-xl border border-current/15 p-4 text-sm" aria-label={H.market}>
      <p className="font-semibold">{H.market} · {countryName(code, locale)}{profile ? ` · ${profile.names?.[locale] ?? profile.name}` : ""}</p>
      <p className="mt-1">{H[market.signal]}</p>
      {!market.regional && <p className="mt-2 opacity-75">{H.national}</p>}
      {market.uncommon && <p className="mt-2">{H.uncommon}</p>}
      <ul className="mt-3 space-y-1 text-xs opacity-75">
        {market.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{s.title}</a> · {s.period}</li>)}
      </ul>
      <p className="mt-3 text-xs opacity-70">{H.caveat}</p>
    </aside>
  );
}

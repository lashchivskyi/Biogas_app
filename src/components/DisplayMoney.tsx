"use client";

import { INTL_TAG } from "@/i18n/config";
import { useSyncExternalStore } from "react";
import { sig2 } from "@/lib/format";
import { useLocale, usePreferences } from "./LocaleProvider";

/** EUR remains the source value; cards share the report's display preference. */
const subscribe = () => () => {};
export function DisplayMoney({ value, end, initialText }: { value: number; end?: number; initialText: string }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const locale = useLocale();
  const { currency, usd } = usePreferences();
  const rate = currency === "USD" ? usd.value : 1;
  const money = new Intl.NumberFormat(INTL_TAG[locale], { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });
  const format = (v: number) => money.format(sig2(v * rate));
  // Node and browser CLDR versions can disagree on compact suffixes (M/m, trailing .0).
  return <span data-display-currency={hydrated ? currency : "EUR"}>{!hydrated ? initialText : format(value) + (end === undefined ? "" : ` – ${format(end)}`)}</span>;
}

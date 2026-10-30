"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { INTL_TAG } from "@/i18n/config";
import { displayUnit } from "@/lib/format";
import { useLocale, usePreferences } from "./LocaleProvider";

/** EUR stays the model value; after hydration parameters follow the shared display currency. */
const subscribe = () => () => {};
const useDisplay = () => {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const { currency, usd } = usePreferences();
  return hydrated ? { currency, rate: currency === "USD" ? usd.value : 1, date: usd.date } : undefined;
};

export function DisplayUnitValue({ value, unit, digits, initialText, showUnit = true }: { value: number; unit: string; digits: number; initialText: ReactNode; showUnit?: boolean }) {
  const locale = useLocale();
  const display = useDisplay();
  if (!display) return <>{initialText}</>;
  const shown = displayUnit(value, unit, display);
  if (shown.unit === unit) return <>{initialText}</>;
  const number = new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: digits }).format(shown.value);
  return showUnit ? <>{number} <span className="methodology-unit">{shown.unit}</span></> : <>{number}</>;
}

/** Column headings such as "Gas €/MWh" carry the currency symbol. */
export function DisplayCurrencyLabel({ text }: { text: string }) {
  const display = useDisplay();
  return <>{display?.currency === "USD" ? text.replaceAll("€", "$") : text}</>;
}

/** One line stating the conversion rate; nothing in EUR mode. */
export function DisplayRateNote() {
  const display = useDisplay();
  if (!display || display.currency === "EUR") return null;
  return <p className="methodology-legend num">1 EUR = {display.rate} USD · ECB · {display.date}</p>;
}

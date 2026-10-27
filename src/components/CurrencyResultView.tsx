"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ResultView, type ResultViewProps } from "./ResultView";
import { usePreferences } from "./LocaleProvider";

const subscribe = () => () => {};

/** Keep the server's rendered text through hydration, then apply the shared display currency. */
export function CurrencyResultView({ serverView, ...props }: ResultViewProps & { serverView?: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const p = usePreferences();
  if (!hydrated && serverView) return serverView;
  return <ResultView {...props} display={{ currency: p.currency, rate: p.currency === "USD" ? p.usd.value : 1, date: p.currency === "USD" ? p.usd.date : props.a.dataAudit?.asOfDate ?? "—" }} />;
}

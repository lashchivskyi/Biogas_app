"use client";

import { createContext, useContext, type PropsWithChildren } from "react";
import type { Locale } from "@/i18n/config";

const LocaleContext = createContext<Locale>("en");
export function LocaleProvider({ locale, children }: PropsWithChildren<{ locale: Locale }>) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}
export const useLocale = () => useContext(LocaleContext);

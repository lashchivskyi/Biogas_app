import type { Metadata } from "next";
import { HREFLANG, LOCALES, type Locale } from "./config";

/** canonical + hreflang alternates for a localised path ("" = home). */
export function alternates(locale: Locale, path: string, only?: readonly Locale[]): Metadata["alternates"] {
  const list = only ?? LOCALES;
  const languages: Record<string, string> = {};
  for (const l of list) languages[HREFLANG[l]] = `/${l}${path}`;
  languages["x-default"] = `/${list.includes("en") ? "en" : list[0]}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}

import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/** Shared by the admin layout and page so private screens follow the user's language choice. */
export async function requestLocale(): Promise<Locale> {
  const pathLocale = (await headers()).get("x-mx-path-locale");
  if (isLocale(pathLocale)) return pathLocale;
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

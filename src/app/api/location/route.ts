import { NextResponse } from "next/server";
import { COUNTRY_COOKIE } from "@/i18n/config";
import { countryFromHeaders } from "@/lib/visitor-location";

/** Recheck the current request's CDN geolocation even during client-side navigation. */
export async function GET(request: Request) {
  const country = countryFromHeaders(request.headers);
  const response = NextResponse.json({ country: country ?? null }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  if (country) response.cookies.set(COUNTRY_COOKIE, country, { path: "/", maxAge: 2592000, sameSite: "lax" });
  else response.cookies.delete(COUNTRY_COOKIE);
  return response;
}

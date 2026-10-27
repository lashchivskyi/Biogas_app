import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { CityServiceError, cityClimate, searchCities } from "@/server/cities";
import { clientIp, rateLimited } from "@/server/rateLimit";

const schema = z.object({ country: z.string().regex(/^[A-Z]{2}$/), lang: z.string().refine(isLocale).default("en"),
  q: z.string().trim().min(2).max(100).optional(), id: z.coerce.number().int().positive().max(1e10).optional() }).refine((p) => Boolean(p.q) !== Boolean(p.id));
export async function GET(request: Request) {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { q, id, country, lang } = parsed.data;
  if (rateLimited(`cities:${id ? "climate" : "search"}:${clientIp(request)}`, 60, 60000)) return NextResponse.json({ error: "unavailable" }, { status: 429 });
  try {
    const data = id ? { city: await cityClimate(id, country, lang) } : { results: await searchCities(q!, country, lang) };
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof CityServiceError ? error.code : "unavailable" }, { status: error instanceof CityServiceError ? error.status : 503 });
  }
}

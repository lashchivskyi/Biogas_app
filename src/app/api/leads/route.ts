import { NextResponse } from "next/server";
import { assess } from "@/core";
import { getCountry } from "@/countries";
import { leads } from "@/server/leads";
import { leadSchema } from "@/server/validate";
import { clientIp, rateLimited } from "@/server/rateLimit";

export async function POST(request: Request) {
  if (rateLimited(`lead:${clientIp(request)}`, 8)) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Check the form fields" }, { status: 422 });
  }
  const { website, input, ...contact } = parsed.data;
  if (website) return NextResponse.json({ id: "ok" }); // honeypot: pretend success

  // Recompute on the server: stored verdict can never be forged by the client.
  const a = assess(input, getCountry(input.countryCode), { asOfDate: new Date().toISOString().slice(0, 10) });
  const base = a.scenarios.base;
  const lead = await leads.add({
    name: contact.name,
    company: contact.company || undefined,
    phone: contact.phone,
    email: contact.email || undefined,
    message: contact.message || undefined,
    input,
    verdict: a.verdict.id,
    confidence: a.confidence.level,
    route: a.bestRoute,
    summary: {
      tonnesYear: base.feed.tonnesYear,
      kwEl: base.kwElEquivalent,
      capexEur: base.capex.totalEur,
      paybackYears: base.fin.simplePaybackYears,
      npvEur: base.fin.npvEur,
    },
  });
  return NextResponse.json({ id: lead.id });
}

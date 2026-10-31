import { NextResponse } from "next/server";
import { assess } from "@/core";
import { getCountry } from "@/countries";
import { absoluteUrl } from "@/config/site";
import { leads } from "@/server/leads";
import { notifyOwner } from "@/server/notify";
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
  const a = assess(input, getCountry(input.countryCode), { asOfDate: new Date().toISOString().slice(0, 10), uncertainty: false });
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
  await notifyOwner(`New lead: ${lead.company ?? lead.name}`, [
    `${lead.name}${lead.company ? ` · ${lead.company}` : ""} · ${lead.phone}${lead.email ? ` · ${lead.email}` : ""}`,
    `Project: ${input.businessType} · ${input.countryCode} · verdict ${lead.verdict} (${lead.confidence})`,
    ...(lead.message ? [`Message: ${lead.message}`] : []),
    `Admin: ${absoluteUrl("/admin")}`,
  ]);
  return NextResponse.json({ id: lead.id });
}

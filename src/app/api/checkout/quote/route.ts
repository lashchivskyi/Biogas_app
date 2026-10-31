import { NextResponse } from "next/server";
import { z } from "zod";
import { PLAN_IDS } from "@/config/plans";
import { isLocale } from "@/i18n/config";
import { inputSchema } from "@/server/validate";
import { assess } from "@/core";
import { getCountry } from "@/countries";
import { CheckoutError, createPaymentQuote } from "@/server/payments/quote";
import { assertSellable } from "@/server/payments/service";
import { clientIp, rateLimitedShared } from "@/server/rateLimit";

const schema = z.object({ plan: z.enum(PLAN_IDS), lang: z.string().refine(isLocale), input: inputSchema, paymentCurrency: z.enum(["EUR", "USD"]).optional() });
export async function POST(request: Request) {
  if (await rateLimitedShared(`quote:${clientIp(request)}`, 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  try {
    const request = parsed.data;
    // Refuse early so the dialog can explain it; checkout repeats the check on the full assessment.
    assertSellable(assess(request.input, getCountry(request.input.countryCode), { uncertainty: false }));
    return NextResponse.json(createPaymentQuote(request), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof CheckoutError ? error.status : 503;
    return NextResponse.json({ error: status === 422 ? "insufficient_data" : "Quotation unavailable" }, { status });
  }
}

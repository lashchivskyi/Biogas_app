import { NextResponse } from "next/server";
import { z } from "zod";
import { PLAN_IDS } from "@/config/plans";
import { isLocale } from "@/i18n/config";
import { inputSchema } from "@/server/validate";
import { CheckoutError, createPaymentQuote } from "@/server/payments/quote";
import { clientIp, rateLimited } from "@/server/rateLimit";

const schema = z.object({ plan: z.enum(PLAN_IDS), lang: z.string().refine(isLocale), input: inputSchema, paymentCurrency: z.enum(["EUR", "USD"]).optional() });
export async function POST(request: Request) {
  if (rateLimited(`quote:${clientIp(request)}`, 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  try { return NextResponse.json(createPaymentQuote(parsed.data), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: "Quotation unavailable" }, { status: error instanceof CheckoutError ? error.status : 503 }); }
}

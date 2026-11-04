import { NextResponse } from "next/server";
import { CheckoutError, checkoutSchema, startCheckout } from "@/server/payments/service";
import { reportError } from "@/server/monitoring";
import { clientIp, rateLimitedShared } from "@/server/rateLimit";

export async function POST(request: Request) {
  if (await rateLimitedShared(`checkout:${clientIp(request)}`, 20)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 422 });
  try {
    const { redirectUrl } = await startCheckout(parsed.data, request);
    return NextResponse.json({ redirectUrl });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: e.status });
    await reportError(e, { where: "checkout" }); // Redacted: provider errors can echo the customer email.
    return NextResponse.json({ error: "Payment provider error" }, { status: 502 });
  }
}

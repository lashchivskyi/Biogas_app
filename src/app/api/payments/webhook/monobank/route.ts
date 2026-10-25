import { NextResponse } from "next/server";
import { orders } from "@/server/orders";
import { mapMonoStatus, verifyMonoWebhook } from "@/server/payments/providers";
import { applyProviderStatus } from "@/server/payments/service";

/**
 * monobank acquiring webhook. Body = invoice status; header X-Sign = ECDSA-SHA256 over the RAW body.
 * Always verify before parsing; reply 200 quickly (monobank retries up to 3 times otherwise).
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!(await verifyMonoWebhook(raw, request.headers.get("x-sign")))) return new NextResponse("bad signature", { status: 401 });
  let body: { invoiceId?: string; status?: string; amount?: number; reference?: string; modifiedDate?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }
  const order = (body.invoiceId && (await orders.findByProviderRef(body.invoiceId))) || (body.reference && (await orders.get(body.reference))) || null;
  if (!order) return NextResponse.json({ ok: true, ignored: "unknown order" });
  await applyProviderStatus(order, { status: mapMonoStatus(body.status ?? ""), amountMinor: body.amount, currency: "UAH", modifiedAt: body.modifiedDate }, "webhook:monobank");
  return NextResponse.json({ ok: true });
}

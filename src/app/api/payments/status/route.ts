import { NextResponse } from "next/server";
import { orders } from "@/server/orders";
import { refreshOrder } from "@/server/payments/service";
import { clientIp, rateLimited } from "@/server/rateLimit";

export const dynamic = "force-dynamic";

/** Minimal, non-personal status for the report page. The report token is an unguessable capability. */
export async function GET(request: Request) {
  if (rateLimited(`status:${clientIp(request)}`, 240)) return NextResponse.json({ error: "rate" }, { status: 429 });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const order = await orders.byToken(token);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  const fresh = await refreshOrder(order);
  return NextResponse.json({ status: fresh.status, plan: fresh.plan });
}

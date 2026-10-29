import { NextResponse } from "next/server";
import { z } from "zod";
import { deliverPaidReport } from "@/server/notify";
import { orders } from "@/server/orders";

/** Development-only payment simulator. Disabled in production builds. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.PAYMENTS_DEMO !== "1") return new NextResponse("not found", { status: 404 });
  const p = z.object({ order: z.string().min(10), outcome: z.enum(["paid", "failed"]) }).safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const order = await orders.get(p.data.order);
  if (!order || order.provider !== "demo") return NextResponse.json({ error: "not found" }, { status: 404 });
  const updated = await orders.update(order.id, { status: p.data.outcome }, "demo");
  if (updated) await deliverPaidReport(updated);
  return NextResponse.json({ ok: true });
}

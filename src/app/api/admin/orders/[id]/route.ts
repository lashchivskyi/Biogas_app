import { NextResponse } from "next/server";
import { z } from "zod";
import { checkBasicAuth } from "@/server/adminAuth";
import { deliverPaidReport, notifyRefund } from "@/server/notify";
import { orders } from "@/server/orders";
import { recordStatusChange } from "@/server/payments/service";

const patchSchema = z.object({
  status: z.enum(["paid", "cancelled", "reversed", "pending"]).optional(),
  notes: z.string().max(4000).optional(),
});

/** Manual status changes, e.g. marking an invoiced order as paid or a refund. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  if (checkBasicAuth(request.headers.get("authorization")) !== "ok") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const before = await orders.get(id);
  const updated = await orders.update(id, parsed.data, "admin");
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  await recordStatusChange(before, updated);
  if (before?.status === "paid" && updated.status === "reversed") await notifyRefund(updated);
  await deliverPaidReport(updated); // Manual "paid" (e.g. bank transfer) delivers the link like a provider payment.
  return NextResponse.json(updated);
}

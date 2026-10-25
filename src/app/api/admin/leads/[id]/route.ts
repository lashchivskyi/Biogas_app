import { NextResponse } from "next/server";
import { z } from "zod";
import { checkBasicAuth } from "@/server/adminAuth";
import { leads } from "@/server/leads";

const patchSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "study_sold", "lost"]).optional(),
  notes: z.string().max(4000).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/leads/[id]">) {
  if (checkBasicAuth(request.headers.get("authorization")) !== "ok") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const updated = await leads.update(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

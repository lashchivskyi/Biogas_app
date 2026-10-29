import { NextResponse } from "next/server";
import { database, storageKind } from "@/server/db";
import { dataFile, readJsonArray } from "@/server/jsonFile";
import { paymentsMode } from "@/server/payments/providers";

export const dynamic = "force-dynamic";

/** Uptime probe: 200 when storage answers. Exposes no secrets, counts or personal data. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  const body = { storage: storageKind(), payments: paymentsMode().provider ?? "off", release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null };
  try {
    const db = database();
    if (db) await (await db).query("SELECT 1");
    else await readJsonArray(dataFile("ORDERS_FILE", "orders.json"));
    return NextResponse.json({ ok: true, ...body }, { headers });
  } catch {
    return NextResponse.json({ ok: false, ...body }, { status: 503, headers });
  }
}

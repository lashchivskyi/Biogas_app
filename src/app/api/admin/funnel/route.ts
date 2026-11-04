import { NextResponse } from "next/server";
import { summarizeFunnel, summarizeVisits, toDailyRows } from "@/lib/funnel";
import { checkBasicAuth } from "@/server/adminAuth";
import { funnelEvents, RETENTION_DAYS } from "@/server/funnel";

/**
 * Beta funnel for the owner (`?days=30`): stage counts by visits and by events, the daily rows, and with `&raw=1`
 * every event (time, visit id, order id, properties) for analysis in a spreadsheet; `&format=csv` downloads them.
 */
export async function GET(request: Request) {
  if (checkBasicAuth(request.headers.get("authorization")) !== "ok") return new NextResponse("Unauthorized", { status: 401 });
  const params = new URL(request.url).searchParams;
  const days = Math.min(RETENTION_DAYS, Math.max(1, Number(params.get("days")) || 30));
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const events = await funnelEvents(since);
  const headers = { "cache-control": "no-store" };
  if (params.get("format") === "csv") {
    const cell = (v: unknown) => (v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
    const csv = ["at,event,visit,order,props", ...events.map((e) => [e.at, e.event, e.visit, e.order, JSON.stringify(e.props)].map(cell).join(","))].join("\n");
    return new NextResponse(csv, { headers: { ...headers, "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="funnel-${since}.csv"` } });
  }
  const rows = toDailyRows(events);
  return NextResponse.json(
    { since, visits: summarizeVisits(events), events: summarizeFunnel(rows), rows, ...(params.get("raw") === "1" ? { raw: events } : {}) },
    { headers },
  );
}

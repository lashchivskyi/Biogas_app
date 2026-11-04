import { SERVER_EVENTS, sanitizeEvent } from "@/lib/funnel";
import { recordEventSafely } from "@/server/funnel";
import { clientIp, rateLimited } from "@/server/rateLimit";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|scan/i;
const done = () => new Response(null, { status: 204 });

/**
 * Browser funnel events (navigator.sendBeacon, text/plain). Answers 204 whatever happens: analytics never shows
 * an error to a visitor. Stored per event with the pseudonymous visit id; the address itself is never kept.
 */
export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return done();
  if (BOT.test(request.headers.get("user-agent") ?? "")) return done();
  if (rateLimited(`events:${clientIp(request)}`, 300)) return done();
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > 2_000) return done();
  let body: { e?: unknown; p?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return done();
  }
  const clean = typeof body.e === "string" ? sanitizeEvent(body.e, body.p) : null;
  if (!clean || SERVER_EVENTS.has(clean.event)) return done();
  await recordEventSafely(clean.event, clean.props, { from: request });
  return done();
}

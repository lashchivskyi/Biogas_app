import { randomUUID } from "node:crypto";

/**
 * Server error reporting without an SDK: one structured, redacted log line (visible in the host's
 * logs) and, when SENTRY_DSN is set, a Sentry envelope. Report tokens and emails are bearer
 * credentials / personal data and must never leave the server in error payloads.
 */
export function redact(text: string): string {
  return text
    .replace(/\/report\/[A-Za-z0-9_-]{16,}/g, "/report/[token]")
    .replace(/([?&](?:token|session_id)=)[^&\s"']+/g, "$1[redacted]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]");
}

type Context = Record<string, string | number | boolean | undefined>;

export function sentryEndpoint(dsn: string): { url: string; key: string } | null {
  try {
    const u = new URL(dsn);
    const parts = u.pathname.split("/").filter(Boolean);
    const project = parts.pop();
    if (!u.username || !project) return null;
    return { url: `${u.protocol}//${u.host}/${[...parts, "api", project, "envelope"].join("/")}/`, key: u.username };
  } catch {
    return null;
  }
}

export async function reportError(error: unknown, context: Context = {}): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const safe = Object.fromEntries(Object.entries(context).map(([k, v]) => [k, typeof v === "string" ? redact(v) : v]));
  const message = redact(err.message);
  const stack = err.stack ? redact(err.stack) : undefined;
  console.error(JSON.stringify({ level: "error", at: new Date().toISOString(), message, type: err.name, ...safe, stack }));

  const target = process.env.SENTRY_DSN ? sentryEndpoint(process.env.SENTRY_DSN) : null;
  if (!target) return;
  const eventId = randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId, timestamp: Date.now() / 1000, platform: "node", level: "error",
    environment: process.env.APP_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    exception: { values: [{ type: err.name, value: message }] },
    tags: Object.fromEntries(Object.entries(safe).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v).slice(0, 200)])),
    extra: { stack },
  };
  const body = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}\n`;
  try {
    await fetch(target.url, {
      method: "POST", body, signal: AbortSignal.timeout(3000),
      headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${target.key}, sentry_client=methalytics/1.0` },
    });
  } catch {
    /* Error reporting must never break the request that failed. */
  }
}

import { createHash, timingSafeEqual } from "node:crypto";

/** HTTP Basic auth for the CRM. Credentials come from env; with none set the CRM is closed in production. */
export type AuthResult = "ok" | "denied" | "disabled";

export function checkBasicAuth(header: string | null): AuthResult {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return process.env.NODE_ENV === "production" ? "disabled" : "ok";
  if (!header?.startsWith("Basic ")) return "denied";
  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return "denied";
  }
  const i = decoded.indexOf(":");
  if (i < 0) return "denied";
  const u = decoded.slice(0, i);
  const p = decoded.slice(i + 1);
  return safeEqual(u, user) && safeEqual(p, pass) ? "ok" : "denied";
}

/** Constant-time comparison that also hides the expected length (hash both sides first). */
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}

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

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

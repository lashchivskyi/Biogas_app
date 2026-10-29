/**
 * Deployment configuration check, run once at server start (src/instrumentation.ts). Errors stop a
 * production/staging server from serving with settings that could give away reports, lose orders or
 * silently drop payments; warnings are logged. APP_ENV=local skips the checks for `next start` previews.
 */
import { SITE } from "@/config/site";

type Env = Record<string, string | undefined>;
export type AppEnv = "production" | "staging" | "local";

export function appEnv(env: Env = process.env): AppEnv {
  if (env.APP_ENV === "production" || env.APP_ENV === "staging" || env.APP_ENV === "local") return env.APP_ENV;
  if (env.VERCEL_ENV === "preview") return "staging";
  if (env.VERCEL_ENV === "development" || env.NODE_ENV !== "production") return "local";
  return "production";
}

const secret = (v: string | undefined) => Boolean(v && v.length >= 32);

export function configProblems(env: Env = process.env, legal: Record<string, string> = SITE.legal): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stage = appEnv(env);
  if (stage === "local") return { errors, warnings };
  const live = stage === "production";
  const need = (ok: boolean, message: string, soft = false) => { if (!ok) (soft ? warnings : errors).push(message); };

  need(!Object.values(legal).some((v) => /fill in/i.test(v)), "SITE.legal in src/config/site.ts still has placeholders: the seller's entity, registration, address and email must be published", !live);
  const site = env.NEXT_PUBLIC_SITE_URL ?? "";
  need(/^https:\/\/[^/]+/.test(site), "NEXT_PUBLIC_SITE_URL must be the public https:// origin (it builds Stripe success/cancel and email links)");

  const provider = env.PAYMENT_PROVIDER ?? "stripe";
  if (provider === "stripe") {
    const key = env.STRIPE_SECRET_KEY ?? "";
    need(Boolean(key), "STRIPE_SECRET_KEY is required while PAYMENT_PROVIDER=stripe");
    if (key) need(live ? /^(sk|rk)_live_/.test(key) : /^(sk|rk)_test_/.test(key), live ? "production requires a live Stripe key (sk_live_/rk_live_)" : "staging must use a Stripe test key (sk_test_/rk_test_)");
    need(/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET ?? ""), "STRIPE_WEBHOOK_SECRET (whsec_…) is required: without it no payment is ever confirmed");
  } else {
    warnings.push(`PAYMENT_PROVIDER=${provider}: online checkout is switched off`);
  }
  need(!(live && env.PAYMENTS_DEMO === "1"), "PAYMENTS_DEMO=1 is forbidden in production: it unlocks paid reports without payment");

  need(secret(env.CHECKOUT_QUOTE_SECRET), "CHECKOUT_QUOTE_SECRET must be a random value of at least 32 characters");
  need(secret(env.LOCATION_SIGNING_SECRET), "LOCATION_SIGNING_SECRET must be a random value of at least 32 characters");
  const secrets = [env.CHECKOUT_QUOTE_SECRET, env.LOCATION_SIGNING_SECRET, env.STRIPE_SECRET_KEY].filter(Boolean);
  need(new Set(secrets).size === secrets.length, "CHECKOUT_QUOTE_SECRET, LOCATION_SIGNING_SECRET and STRIPE_SECRET_KEY must all differ");

  if (env.STORAGE === "json") need(Boolean(env.ORDERS_FILE && env.LEADS_FILE), "STORAGE=json requires ORDERS_FILE and LEADS_FILE on a persistent volume (single instance only)");
  else need(/^postgres(ql)?:\/\//.test(env.DATABASE_URL ?? ""), "DATABASE_URL (postgres://…) is required; set STORAGE=json only for one instance with a persistent volume");

  if (env.ADMIN_USER || env.ADMIN_PASSWORD) need((env.ADMIN_PASSWORD ?? "").length >= 16 && Boolean(env.ADMIN_USER), "ADMIN_USER and an ADMIN_PASSWORD of at least 16 characters are required together");
  else warnings.push("ADMIN_USER/ADMIN_PASSWORD not set: /admin is closed");

  const mail = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM && env.OWNER_EMAIL);
  need(mail, "RESEND_API_KEY, EMAIL_FROM and OWNER_EMAIL are required: customers receive the private report link by email", !live);
  need(Boolean(env.CRON_SECRET), "CRON_SECRET not set: missed payment webhooks are not reconciled automatically", true);
  need(Boolean(env.SENTRY_DSN), "SENTRY_DSN not set: server errors only reach the host logs", true);
  return { errors, warnings };
}

export function assertDeployConfig(env: Env = process.env): void {
  const { errors, warnings } = configProblems(env);
  for (const w of warnings) console.warn(`[config] ${w}`);
  if (errors.length) throw new Error(`Invalid ${appEnv(env)} configuration:\n- ${errors.join("\n- ")}`);
}

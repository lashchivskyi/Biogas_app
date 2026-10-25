/**
 * Single source of truth for brand & SEO strings. Change the name here, not in components.
 * Naming rationale: docs/brand.md. Domain checked free via Verisign RDAP on 2026-10-24
 * (methalytics.com → 404); trademark NOT checked.
 */
export const SITE = {
  name: "Methalytics",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://methalytics.com").replace(/\/$/, ""),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@methalytics.com",
  /** Fill in before launch: shown on the terms page (payment providers require it). */
  legal: {
    entity: "[Legal entity — fill in]",
    registration: "[Company number / VAT ID — fill in]",
    address: "[Registered address — fill in]",
    email: "[email — fill in]",
  },
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;

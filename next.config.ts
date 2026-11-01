import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";
/** Client-side IP country lookup is opt-in (dev or NEXT_PUBLIC_LOCAL_IP_GEO=1); everything else is same-origin. */
const ipGeo = process.env.NEXT_PUBLIC_LOCAL_IP_GEO === "1" || (dev && process.env.NEXT_PUBLIC_LOCAL_IP_GEO !== "0");

/**
 * Security headers. Scripts are limited to this origin, but inline scripts stay allowed: nonces would
 * force every page into dynamic rendering (no static/CDN pages), and Next's inline RSC payload has no
 * build-time hash. The value is that injected markup cannot load foreign code or send data to
 * another host (connect-src). Report URLs carry a bearer token, so they never send a Referer.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${ipGeo ? " https://ipapi.co" : ""}${dev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  experimental: { globalNotFound: true },
  outputFileTracingIncludes: { "/api/cities": ["./src/server/data/*"] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Later entries override the same key for matching paths.
      { source: "/:lang/report/:token*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;

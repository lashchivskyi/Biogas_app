import type { NextConfig } from "next";

/**
 * Baseline security headers. Script/style CSP is not enforced yet (inline framework scripts would
 * need nonces); the directives below do not depend on them. Report URLs carry a bearer token, so
 * they never send a Referer.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
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
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

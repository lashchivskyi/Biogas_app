/**
 * Launch load test (k6). Run against staging, never production with live Stripe:
 *
 *   k6 run -e BASE=https://staging.example.com -e REPORT_TOKEN=<token of a paid test order> scripts/load.k6.js
 *
 * Scenarios: static pages (CDN), the calculator's server work (price quote = one assessment without
 * uncertainty) and a paid report (database read + full server render). The calculator itself runs in
 * the browser, so its load on the server is the page download. On Vercel the quote limit (60/h per IP,
 * src/server/rateLimit.ts) answers 429 after the first minute: that is counted, not failed.
 * Pass -e SPOOF_IP=1 only for a self-hosted target that trusts X-Forwarded-For.
 */
import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE = __ENV.BASE || "http://localhost:3000";
const TOKEN = __ENV.REPORT_TOKEN;
const limited = new Counter("rate_limited");

export const options = {
  scenarios: {
    pages: { executor: "constant-arrival-rate", exec: "pages", rate: 20, timeUnit: "1s", duration: "2m", preAllocatedVUs: 20, maxVUs: 100 },
    quote: { executor: "constant-arrival-rate", exec: "quote", rate: 5, timeUnit: "1s", duration: "2m", preAllocatedVUs: 10, maxVUs: 50 },
    ...(TOKEN ? { report: { executor: "constant-arrival-rate", exec: "report", rate: 5, timeUnit: "1s", duration: "2m", preAllocatedVUs: 10, maxVUs: 50 } } : {}),
  },
  thresholds: {
    "http_req_failed{scenario:pages}": ["rate<0.01"],
    "http_req_duration{scenario:pages}": ["p(95)<800"],
    "http_req_duration{scenario:quote}": ["p(95)<1500"],
    "http_req_duration{scenario:report}": ["p(95)<2500"],
    checks: ["rate>0.99"],
  },
};

const PAGES = ["/en", "/en/calculator", "/de/pricing", "/uk/methodology", "/en/samples/it_whey", "/api/health"];
const LANGS = ["en", "de", "pl", "uk", "es"];
const ip = () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

export function pages() {
  const res = http.get(`${BASE}${PAGES[Math.floor(Math.random() * PAGES.length)]}`);
  check(res, { "page 200": (r) => r.status === 200 });
}

// The "it_whey" sample (src/core/examples.ts): a sellable verdict, so the quote answers 200.
const QUOTE_INPUT = {
  countryCode: "IT", regionId: "lombardia", businessType: "dairy_processor", labAnalysisAvailable: true,
  feedstocks: [
    { id: "a", type: "dairy_whey", quantity: 40000, dryMatterPct: 5.5, vsPctOfDm: 92, methaneYieldLPerKgVs: 340, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 12 },
    { id: "b", type: "dairy_fat_sludge", quantity: 3000, dryMatterPct: 15, vsPctOfDm: 90, methaneYieldLPerKgVs: 550, monthsActive: 12, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 60 },
  ],
  energy: { electricityKwhYear: 9000000, heatNeed: "year_round_process", gasM3Year: 1800000, hasGridConnection: true },
  site: { landHa: 200, existingStorageM3: 10000, gasGridKm: 1 },
};

export function quote() {
  const headers = { "Content-Type": "application/json", ...(__ENV.SPOOF_IP ? { "X-Forwarded-For": ip() } : {}) };
  const body = JSON.stringify({ plan: "report", lang: LANGS[Math.floor(Math.random() * LANGS.length)], input: QUOTE_INPUT });
  const res = http.post(`${BASE}/api/checkout/quote`, body, { headers, responseCallback: http.expectedStatuses(200, 422, 429) });
  if (res.status === 429) limited.add(1);
  check(res, { "quote answered": (r) => [200, 422, 429].includes(r.status) });
}

export function report() {
  const res = http.get(`${BASE}/en/report/${TOKEN}`);
  check(res, { "report 200": (r) => r.status === 200 && r.body.includes("</main>") });
}

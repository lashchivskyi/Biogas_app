/**
 * Paid plans. Two products only (productised-consulting best practice: a clear self-serve product
 * plus a premium human tier; the free screening is the entry point and the anchor).
 *
 * Prices are set by the PROJECT country's tier (CountryAdapter.priceTier), not the visitor's location:
 * the report is about a site in that market, so there is no arbitrage. Amounts are integers in euro
 * cents and are ALWAYS taken from this file on the server — never from the browser.
 *
 * Rationale (docs/pricing.md): a professional desktop pre-feasibility costs several thousand euros
 * (consultant day-rates × 3–10 days); the automated report is priced as a small fraction of that and
 * the expert review well below a consultant study, while covering an engineer's ≈ 1–1.5 days.
 */
export type PlanId = "report" | "expert";
export type PriceTier = "A" | "B" | "C";

export const PLAN_PRICES_EUR_CENTS: Record<PlanId, Record<PriceTier, number>> = {
  report: { A: 39000, B: 29000, C: 19000 },
  expert: { A: 190000, B: 140000, C: 90000 },
};

export const PLAN_IDS: PlanId[] = ["report", "expert"];

export const priceFor = (plan: PlanId, tier: PriceTier) => PLAN_PRICES_EUR_CENTS[plan][tier];

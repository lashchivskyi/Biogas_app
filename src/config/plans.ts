/** Two automated reports. The project country sets the tier; the server sets the price in cents. */
export type PlanId = "standard" | "report";
export type PriceTier = "A" | "B" | "C";

export const PLAN_PRICES_EUR_CENTS: Record<PlanId, Record<PriceTier, number>> = {
  standard: { A: 32000, B: 24000, C: 16000 },
  report: { A: 39000, B: 29000, C: 19000 },
};

export const PLAN_IDS: PlanId[] = ["standard", "report"];

export const priceFor = (plan: PlanId, tier: PriceTier) => PLAN_PRICES_EUR_CENTS[plan][tier];

/** Same commercial price in cards, checkout previews and the signed Stripe quote. */
export function convertedPlanPrice(eurCents: number, currency: string, rate: number): number {
  const minor = Math.round(eurCents * rate);
  return currency === "USD" ? Math.ceil(minor / 1000) * 1000 : minor;
}

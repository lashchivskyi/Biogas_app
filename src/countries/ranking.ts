import type { CountryAdapter } from "@/core/country";

/** Product display priority, not a GDP ranking or a project profitability forecast. */
export const COUNTRY_WEIGHTS = { electricity: 0.4, gas: 0.25, capex: 0.15, discount: 0.15, injection: 0.05 } as const;

export function rankCountries(countries: Record<string, CountryAdapter>) {
  const value = (c: CountryAdapter, id: string) => c.params.find((p) => p.id === id)!.value;
  const inputs = Object.values(countries).map((c) => ({
    code: c.code,
    electricity: value(c, "econ.electricity_retail_eur_kwh"),
    gas: value(c, "econ.gas_price_eur_mwh"),
    capex: -value(c, "econ.capex_factor"),
    discount: -value(c, "econ.discount_rate"),
    injection: c.biomethaneInjection ? 1 : 0,
  }));
  const keys = Object.keys(COUNTRY_WEIGHTS) as (keyof typeof COUNTRY_WEIGHTS)[];
  const bounds = Object.fromEntries(keys.map((key) => [key, [Math.min(...inputs.map((c) => c[key])), Math.max(...inputs.map((c) => c[key]))]]));
  return inputs.map((c) => ({ code: c.code, score: keys.reduce((score, key) => {
    const [lo, hi] = bounds[key];
    return score + COUNTRY_WEIGHTS[key] * (hi === lo ? 0 : (c[key] - lo) / (hi - lo)) * 100;
  }, 0) })).sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
}

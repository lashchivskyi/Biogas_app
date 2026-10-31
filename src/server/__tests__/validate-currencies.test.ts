import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/countries";
import { inputSchema } from "../validate";

const param = (cc: string, id: string) => COUNTRIES[cc].params.find((p) => p.id === id)!.value;

/** Validation bounds are in local currency: a limit tuned for EUR rejects the weakest currencies (VND ≈ 28 500 per €). */
describe.each(Object.keys(COUNTRIES))("validation accepts realistic local-currency amounts %s", (cc) => {
  const fx = param(cc, "econ.fx_local_per_eur");
  const base = { countryCode: cc, regionId: COUNTRIES[cc].regions[0].id, businessType: "food_business", site: {} };

  it("prices at the top of the plausible band, gate fees and disposal costs", () => {
    const r = inputSchema.safeParse({
      ...base,
      feedstocks: [{ id: "a", type: "food_waste", quantity: 1000, delivered: true, distanceKm: 10, purchasePricePerTonneLocal: -250 * fx, currentDisposalCostPerTonneLocal: 400 * fx, opportunityValuePerTonneLocal: 150 * fx }],
      energy: {
        electricityPriceLocalPerKwh: 3 * param(cc, "econ.electricity_retail_eur_kwh") * fx, exportPriceLocalPerKwh: 3 * param(cc, "econ.electricity_retail_eur_kwh") * fx,
        gasPriceLocalPerM3: 3 * param(cc, "econ.heat_value_eur_kwh_th") * 9.5 * fx, heatPriceLocalPerKwh: 3 * param(cc, "econ.heat_value_eur_kwh_th") * fx,
        heatNeed: "none", hasGridConnection: true,
      },
      finance: { operatorWageLocalPerHour: 100 * fx },
    });
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues[0])).toBe(true);
  });

  it("a 60 M€ process budget and a 10 €/Nm³ gas price", () => {
    const r = inputSchema.safeParse({
      ...base, businessType: "energy_offtaker", feedstocks: [],
      process: { kind: "gas", operatingDays: 365, monthsActive: 12, startMonth: 1, uncertaintyPct: 30, processCapexLocal: 60e6 * fx, processOpexLocalYear: 10e6 * fx, residualCostLocalT: 500 * fx, auxiliaryKwhYear: 1e6, auxiliaryHeatKwhYear: 0,
        upgradingCapexLocal: 20e6 * fx, rawGasNm3Hour: 500, methanePct: 60, availabilityPct: 95, declinePctYear: 0, gasPriceLocalNm3: 1 * fx, nitrogenPct: 1, oxygenPct: 0.2, h2sPpm: 500, upgradingRecoveryPct: 97, upgradingKwhNm3: 0.3, productMethanePct: 97 },
      energy: { heatNeed: "none", hasGridConnection: true },
    });
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues[0])).toBe(true);
  });
});

it("requires a supplier quote and its technology together", () => {
  const input = { countryCode: "DE", regionId: COUNTRIES.DE.regions[0].id, businessType: "food_business", site: {}, energy: { heatNeed: "none", hasGridConnection: true }, feedstocks: [{ id: "a", type: "food_waste", quantity: 1000 }] };
  expect(inputSchema.safeParse({ ...input, finance: { capexQuoteLocal: 3e6, capexQuoteRoute: "chp" } }).success).toBe(true);
  expect(inputSchema.safeParse({ ...input, finance: { capexQuoteLocal: 3e6 } }).success).toBe(false);
  expect(inputSchema.safeParse({ ...input, finance: { capexQuoteRoute: "chp" } }).success).toBe(false);
  expect(inputSchema.safeParse({ ...input, finance: { capexQuoteLocal: 3e6, capexQuoteRoute: "wind" } }).success).toBe(false);
});

import { heatDemandProfile } from "./climate";
import type { RunContext } from "./context";

export interface CustomerDemand {
  electricityKwhYear: number;
  electricityKnown: boolean;
  electricityPriceEurKwh: number;
  electricityPriceKnown: boolean;
  /** Annual heat the customer can actually absorb, kWh. 0 when none. */
  heatKwhYear: number;
  heatKnown: boolean;
  heatWanted: boolean; // customer said they need heat
  heatMonthlyKwh: number[];
  heatValueEurKwh: number;
  gasPriceKnown: boolean;
}

export function customerDemand(ctx: RunContext): CustomerDemand {
  const { input, params, fx, scenario, mods } = ctx;
  const e = input.energy;
  const retail = params.get("econ.electricity_retail_eur_kwh");
  const lhv = params.get("eng.natgas_lhv_kwh_m3");
  const boilerEff = params.get("eng.boiler_efficiency");
  const priceMult = scenario.energyPriceMult * mods.energyPrice;

  const electricityKnown = (e.electricityKwhYear ?? 0) > 0;
  const priceKnown = (e.electricityPriceLocalPerKwh ?? 0) > 0;
  const elPrice = (priceKnown ? (e.electricityPriceLocalPerKwh as number) / fx : retail) * priceMult;

  const gasPriceKnown = (e.gasPriceLocalPerM3 ?? 0) > 0;
  const heatValue =
    (gasPriceKnown
      ? (e.gasPriceLocalPerM3 as number) / fx / (lhv * boilerEff)
      : params.get("econ.heat_value_eur_kwh_th")) * priceMult;

  const wanted = e.heatNeed !== "none";
  let heatKwh = 0;
  let heatKnown = false;
  if (wanted) {
    if ((e.heatKwhYear ?? 0) > 0) {
      heatKwh = e.heatKwhYear as number;
      heatKnown = true;
    } else if ((e.gasM3Year ?? 0) > 0) {
      heatKwh = (e.gasM3Year as number) * lhv * boilerEff;
      heatKnown = true;
    }
  }
  const profile = heatDemandProfile(wanted ? e.heatNeed : "none", ctx.region.monthlyTempC);
  return {
    electricityKwhYear: e.electricityKwhYear ?? 0,
    electricityKnown,
    electricityPriceEurKwh: elPrice,
    electricityPriceKnown: priceKnown,
    heatKwhYear: heatKwh,
    heatKnown,
    heatWanted: wanted,
    heatMonthlyKwh: profile.map((w) => w * heatKwh),
    heatValueEurKwh: heatValue,
    gasPriceKnown,
  };
}

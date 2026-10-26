import type { CountryAdapter, Region, RegulatoryRegime, SupportInfo } from "@/core/country";
import { prov } from "@/core/params";
import type { Confidence, Provenance } from "@/core/types";
import { ENGINEERING_MAP } from "@/core/engineeringParams";
import { regulatoryFor } from "./regulatory";
import {
  biomethaneFor, capexFactorFor, haircutFor, labourOfficialFor, operatorRatioFor, spotFor, CLIMATE_SOURCE, climateRegionsFor, debtRateFor, discountFor, electricityFor, electricityVariableShareFor, fertiliserFor, fxFor, gasFor, gridEfFor, labourFor,
  type Sourced,
} from "./sources";

/**
 * National profile → CountryAdapter. Market parameters come from official series in sources.ts; the
 * profile values are only fallbacks, tagged ESTIMATE/LOW where no series was found. The UI then asks the
 * customer for their own prices, and the confidence score is reduced when they are not given (core/quality.ts).
 */
export interface CountryProfile {
  code: string;
  name: string;
  currency: string;
  /** local currency per EUR */
  fx: number;
  tier: "A" | "B" | "C";
  regime: RegulatoryRegime;
  /** biomethane grid injection established */
  inj: boolean;
  /** business electricity, all-in ex VAT, EUR/kWh */
  elec: number;
  /** surplus electricity value without support, EUR/kWh */
  exp: number;
  /** business natural gas, EUR/MWh */
  gas: number;
  labour: number;
  capex: number;
  disc: number;
  debtRate: number;
  tkm: number;
  /** biomethane realised price without support, EUR/Nm³ [cons, base, opt] */
  bm: [number, number, number];
  fertN: number;
  /** grid emission factor tCO2/MWh */
  ef: number;
  regions: Region[];
  support: SupportInfo;
  notes: { en: string[]; uk: string[] };
  nitrateLimit?: number;
  storageMonths?: number;
  maturity?: "operational" | "profile";
  /** Use `bm` as given (transport-fuel markets) instead of deriving it from the gas price (derivation applies to EU grid-injection markets only). */
  bmOverride?: boolean;
  /** Multiplier on world fertiliser prices (e.g. subsidised urea in India). */
  fertFactor?: number;
}

const SRC = "National estimate (project team, 2026-10) — no official series found for this item; your own price overrides it";

/**
 * Market parameters for a country. Every value is taken from an official statistic where one exists
 * (Eurostat, ECB, national regulators, EIA, DESNZ, World Bank, Ember, Damodaran — see sources.ts) and
 * falls back to the profile's ESTIMATE only where none was found. Derived values document their formula.
 */
export function marketParams(c: CountryProfile, regionId?: string): Provenance[] {
  const o = { country: c.code, date: "2026-10-25" };
  const L = "LOW" as const;
  const P = (id: string, label: string, s: Sourced | undefined, fallback: number, unit: string, note?: string) =>
    s
      ? prov(id, label, s.value, unit, s.kind, s.source, s.confidence, { country: c.code, date: s.date, note, evidence: s.evidence, range: s.range })
      : prov(id, label, fallback, unit, "ESTIMATE", SRC, L, { ...o, note });

  const elec = electricityFor(c.code, regionId);
  const gas = gasFor(c.code);
  const gasV = gas?.value ?? c.gas;
  const lab = labourFor(c.code);
  const labV = lab?.value ?? c.labour;
  const disc = discountFor(c.code);
  // Biomethane without support ≈ wholesale gas (≈ 80 % of the business price) + green premium where grid injection & certificates exist.
  const own = c.bmOverride || !(c.inj && c.regime === "EU");
  const productLhv = ENGINEERING_MAP["eng.ch4_lhv_kwh_m3"].value * ENGINEERING_MAP["eng.biomethane_ch4_purity"].value;
  const boilerEff = ENGINEERING_MAP["eng.boiler_efficiency"].value;
  const bmBase = own ? c.bm[1] : ((gasV * 0.8 + (c.inj ? 20 : 0)) * productLhv) / 1000;
  const bmOfficial = own ? biomethaneFor(c.code) : undefined;
  const bmSrc = bmOfficial
    ? bmOfficial.src
    : own
      ? `${SRC}; local market for biomethane / RNG without credits`
      : `CALCULATION: (0.8 × business gas ${gasV} €/MWh LHV${c.inj ? " + 20 €/MWh LHV green-gas premium (uncontracted engineering assumption)" : ""}) × ${productLhv} kWh LHV/Nm³. No guaranteed offtake or certificate eligibility.`;
  const bmConf: Confidence = bmOfficial ? bmOfficial.conf : "LOW";
  const bm: [number, number, number] = bmOfficial ? bmOfficial.v : own ? c.bm : [+(bmBase * 0.8).toFixed(2), bmBase, +(bmBase * 1.35).toFixed(2)];

  const out: Provenance[] = [
    P("econ.fx_local_per_eur", "Exchange rate", fxFor(c.currency), c.fx, `${c.currency}/EUR`),
    P("econ.electricity_retail_eur_kwh", "Business electricity reference, excl. VAT (default if the customer gives none)", elec, c.elec, "EUR/kWh", elec?.evidence?.scope ?? "National reference for a mid-size business — customer tariff and bill take precedence"),
    P("econ.electricity_spot_eur_kwh", "Wholesale electricity price (market average)", spotFor(c.code), +(c.exp / 0.85).toFixed(3), "EUR/kWh", "Official day-ahead or wholesale average where published"),
    prov("econ.export_haircut", "Share of the wholesale price realised for surplus power", haircutFor(c.code).value, "—", "ASSUMPTION", haircutFor(c.code).source, "MEDIUM", o),
    prov("econ.self_consumption_variable_share", "Share of the bill actually avoided by self-generation", electricityVariableShareFor(c.code), "—", "ASSUMPTION", "TOU reference: energy/Ft portion only, demand/service charges retained. Else 85% engineering allowance. User invoice uses the generic allowance until its energy/demand split is known.", "MEDIUM", { ...o, range: electricityVariableShareFor(c.code) === ENGINEERING_MAP["eng.invoice_variable_share"].value ? ENGINEERING_MAP["eng.invoice_variable_share"].range : undefined }),
    prov("econ.heat_value_eur_kwh_th", "Value of useful heat (displaced gas / boiler efficiency)", gasV / 1000 / boilerEff, "EUR/kWh th", "CALCULATION", `Business gas ${gasV} €/MWh LHV ÷ ${boilerEff}`, gas?.confidence ?? L, o),
    P("econ.gas_price_eur_mwh", "Business natural-gas price, excl. VAT, LHV basis", gas, c.gas, "EUR/MWh LHV"),
    prov("econ.biomethane_price_cons_eur_nm3", "Biomethane price without support, conservative", bm[0], "EUR/Nm³", "CALCULATION", `${bmSrc}; conservative scenario reference ${bm[0]} EUR/Nm³`, bmConf, o),
    prov("econ.biomethane_price_base_eur_nm3", "Biomethane price without support, base", bm[1], "EUR/Nm³", "CALCULATION", bmSrc, bmConf, o),
    prov("econ.biomethane_price_opt_eur_nm3", "Biomethane price without support, optimistic", bm[2], "EUR/Nm³", "CALCULATION", `${bmSrc}; optimistic scenario reference ${bm[2]} EUR/Nm³`, bmConf, o),
    P("econ.labour_official_eur_h", "Official hourly labour cost, economy-wide (wages + employer costs)", labourOfficialFor(c.code), +(c.labour / operatorRatioFor(c.code).value).toFixed(1), "EUR/h"),
    prov("econ.operator_wage_ratio", "Plant operator wage relative to the economy-wide average", operatorRatioFor(c.code).value, "—", "ASSUMPTION", operatorRatioFor(c.code).source, "MEDIUM", o),
    prov("econ.transport_eur_tkm", "Road transport of organic feedstock", +(0.06 + 0.003 * labV).toFixed(3), "EUR/(t·km)", "CALCULATION", "0.06 €/t·km vehicle & fuel + 0.003 × driver labour cost (€/h); matches KTBL slurry haulage ≈ 0.12–0.16 €/t·km in Germany", "MEDIUM", o),
    prov("econ.transport_fixed_eur_t", "Loading/unloading per tonne", +(0.6 + 0.02 * labV).toFixed(2), "EUR/t", "CALCULATION", "0.6 €/t pump & loader + 0.02 h/t × labour cost (KTBL Betriebsplanung machine-cost norms, scaled by national labour cost)", lab?.confidence ?? L, o),
    P("econ.capex_factor", "Local CAPEX relative to the German baseline", capexFactorFor(c.code), c.capex, "—", "Equipment (CHP, upgrading, membranes, pumps) is internationally priced; civil works follow local costs"),
    ...(["chp", "boiler", "biomethane"] as const).map((route) => P(`econ.capex_factor_${route}`, `${route}: local CAPEX factor`, capexFactorFor(c.code, route), c.capex, "—", "Route-specific factor; reconstructed project costs are not independently validated quotations")),
    P("econ.discount_rate", "Discount rate (EUR-equivalent, incl. country risk)", disc, c.disc, "—"),
    prov("econ.energy_escalation", "Annual escalation of energy prices (EUR terms)", 0.02, "—", "ASSUMPTION", "At the ECB/Fed inflation target — no real energy-price growth assumed (conservative)", "MEDIUM", o),
    prov("econ.opex_escalation", "Annual escalation of operating costs (EUR terms)", 0.025, "—", "ASSUMPTION", "Inflation target + 0.5 pp wage drift", "MEDIUM", o),
    prov("econ.horizon_years", "Evaluation horizon", 15, "a", "ASSUMPTION", "Shorter than the 20-year technical life — conservative", "MEDIUM", o),
    prov("econ.debt_share", "Debt share for DSCR test", c.tier === "A" ? 0.65 : 0.5, "—", "ASSUMPTION", "Typical agri / project lending (KfW, EBRD, IFC practice)", "MEDIUM", o),
    P("econ.debt_interest", "Debt interest rate (EUR-equivalent)", debtRateFor(c.code), c.debtRate, "—"),
    prov("econ.debt_tenor_years", "Debt tenor", c.tier === "A" ? 10 : 7, "a", "ASSUMPTION", "Typical", "MEDIUM", o),
    P("econ.fert_n_eur_kg", "Mineral nitrogen price", fertiliserFor("N", c.fertFactor ?? 1), c.fertN, "EUR/kg N"),
    P("econ.fert_p2o5_eur_kg", "Mineral phosphorus price", fertiliserFor("P2O5", c.fertFactor ?? 1), +(c.fertN * 1.1).toFixed(2), "EUR/kg P₂O₅"),
    P("econ.fert_k2o_eur_kg", "Mineral potassium price", fertiliserFor("K2O", c.fertFactor ?? 1), +(c.fertN * 0.65).toFixed(2), "EUR/kg K₂O"),
    prov("econ.digestate_handling_eur_t", "Incremental digestate handling on adequate land", +(1.2 + labV * 0.08).toFixed(2), "EUR/t", "CALCULATION", "Pumping & trailing-hose spreading ≈ 1.2 €/t machinery + 0.08 h/t × labour; ≈ 4.8 €/t in Germany, in line with KTBL contractor rates (3–6 €/m³)", lab?.confidence ?? L, o),
    prov("econ.digestate_excess_eur_t", "Digestate that has no adequate land", +(2.5 + labV * 0.22).toFixed(2), "EUR/t", "CALCULATION", "Third-party export of digestate ≈ 2.5 €/t + 0.22 h/t × labour; ≈ 12 €/t in Germany, in line with manure-exchange prices in surplus regions (LWK Niedersachsen Nährstoffbericht: 10–20 €/t)", lab?.confidence ?? L, o),
    P("econ.grid_ef_t_mwh", "Grid emission factor", gridEfFor(c.code), c.ef, "tCO₂/MWh"),
  ];
  if (c.nitrateLimit !== undefined) out.push(prov("eng.nitrates_limit_kg_n_ha", "N application ceiling from organic fertiliser", c.nitrateLimit, "kgN/ha·a", "ASSUMPTION", "National rule / good practice", "MEDIUM", o));
  if (c.storageMonths !== undefined) out.push(prov("eng.storage_months", "Gas-tight digestate storage required", c.storageMonths, "months", "ASSUMPTION", "National closed-season rule / practice", L, o));
  return out;
}

/** Regions with measured climate (ERA5) for the country; the profile's hand-written regions are only a fallback. */
export function regionsFor(code: string, fallback: Region[]): Region[] {
  const sourced = climateRegionsFor(code);
  if (!sourced.length) return fallback;
  return sourced.map((r) => ({
    id: r.id,
    name: r.name,
    names: Object.keys(r.names).length ? r.names : undefined,
    monthlyTempC: r.monthlyTempC,
    tempSource: `${CLIMATE_SOURCE} at ${r.lat}°, ${r.lon}°`,
    altitudeM: r.elevationM,
  }));
}

/** Data status shown to users: official statistics for the key prices, or national estimates. */
export function dataStatus(params: Provenance[], calibrated: boolean): "calibrated" | "official" | "estimated" {
  if (calibrated) return "calibrated";
  const key = ["econ.electricity_retail_eur_kwh", "econ.gas_price_eur_mwh", "econ.discount_rate"];
  const ok = key.every((id) => {
    const p = params.find((x) => x.id === id);
    return p && p.confidence !== "LOW";
  });
  return ok ? "official" : "estimated";
}

export function buildAdapter(c: CountryProfile, regulatory = regulatoryFor(c.regime)): CountryAdapter {
  const params = marketParams(c);
  return {
    code: c.code,
    nameEn: c.name,
    currency: c.currency,
    maturity: c.maturity ?? "profile",
    dataStatus: dataStatus(params, false),
    params,
    paramsForRegion: (regionId) => marketParams(c, regionId).filter((p) => p.id === "econ.electricity_retail_eur_kwh"),
    regions: regionsFor(c.code, c.regions),
    support: c.support,
    regime: c.regime,
    biomethaneInjection: c.inj,
    regulatory,
    approachNotes: c.notes,
    priceTier: c.tier,
  };
}

const NORMALS = "Climate normals 1991–2020 rounded by the project team (not a download); replace with ERA5 / Open-Meteo";
export const region = (id: string, name: string, t: number[], names?: Record<string, string>): Region => ({ id, name, monthlyTempC: t, tempSource: NORMALS, names });

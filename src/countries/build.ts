import type { CountryAdapter, Region, RegulatoryRegime, SupportInfo } from "@/core/country";
import { prov } from "@/core/params";
import type { Provenance } from "@/core/types";
import { regulatoryFor } from "./regulatory";

/**
 * National profile → CountryAdapter. Profiles are ORDER-OF-MAGNITUDE inputs assembled by the
 * project team (2026-10) from public statistics we know of (Eurostat non-household price bands,
 * national regulators, IEA/EBA) — they were NOT each re-verified in a primary source in this build.
 * They are therefore tagged ESTIMATE/LOW, the UI asks the customer for their own prices, and the
 * confidence score is reduced when the customer does not give them (core/quality.ts).
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
}

const SRC = "National profile (project team, 2026-10): order of magnitude from public statistics; NOT verified per item — customer prices override";

export function profileParams(c: CountryProfile): Provenance[] {
  const o = { country: c.code, date: "2026-10-24" };
  const L = "LOW" as const;
  const heat = c.gas / 1000 / 0.9;
  const out: Provenance[] = [
    prov("econ.fx_local_per_eur", "Exchange rate", c.fx, `${c.currency}/EUR`, "ASSUMPTION", "Market rate, rounded (2026-10); update when stale", "MEDIUM", o),
    prov("econ.electricity_retail_eur_kwh", "Business electricity price (default if the customer gives none)", c.elec, "EUR/kWh", "ESTIMATE", SRC, L, o),
    prov("econ.electricity_export_eur_kwh", "Value of surplus electricity without support", c.exp, "EUR/kWh", "ESTIMATE", SRC, L, o),
    prov("econ.self_consumption_variable_share", "Share of the bill actually avoided by self-generation", 0.85, "—", "ASSUMPTION", "Fixed network/capacity charges remain", L, o),
    prov("econ.heat_value_eur_kwh_th", "Value of useful heat (displaced gas / 0.9)", +heat.toFixed(4), "EUR/kWh th", "CALCULATION", `${SRC}; gas ${c.gas} EUR/MWh / 0.9`, L, o),
    prov("econ.gas_price_eur_mwh", "Business natural-gas price", c.gas, "EUR/MWh", "ESTIMATE", SRC, L, o),
    prov("econ.biomethane_price_cons_eur_nm3", "Biomethane price without support, conservative", c.bm[0], "EUR/Nm³", "ESTIMATE", SRC, L, o),
    prov("econ.biomethane_price_base_eur_nm3", "Biomethane price without support, base", c.bm[1], "EUR/Nm³", "ESTIMATE", SRC, L, o),
    prov("econ.biomethane_price_opt_eur_nm3", "Biomethane price without support, optimistic", c.bm[2], "EUR/Nm³", "ESTIMATE", SRC, L, o),
    prov("econ.labour_eur_h", "Fully loaded operator cost", c.labour, "EUR/h", "ESTIMATE", SRC, L, o),
    prov("econ.transport_eur_tkm", "Road transport of organic feedstock", c.tkm, "EUR/(t·km)", "ESTIMATE", SRC, L, o),
    prov("econ.transport_fixed_eur_t", "Loading/unloading per tonne", +(c.tkm * 12).toFixed(2), "EUR/t", "ESTIMATE", SRC, L, o),
    prov("econ.capex_factor", "Local CAPEX relative to the EU baseline", c.capex, "—", "ESTIMATE", SRC + "; civil works & labour local, CHP/upgrading internationally priced", L, o),
    prov("econ.discount_rate", "Discount rate (EUR-equivalent, incl. country risk)", c.disc, "—", "ASSUMPTION", "Project-team WACC-type rate; not a market quote", L, o),
    prov("econ.energy_escalation", "Annual escalation of energy prices (EUR terms)", 0.02, "—", "ASSUMPTION", "Conservative", L, o),
    prov("econ.opex_escalation", "Annual escalation of operating costs (EUR terms)", 0.025, "—", "ASSUMPTION", "Conservative", L, o),
    prov("econ.horizon_years", "Evaluation horizon", 15, "a", "ASSUMPTION", "Shorter than the 20-year technical life — conservative", "MEDIUM", o),
    prov("econ.debt_share", "Debt share for DSCR test", c.tier === "A" ? 0.65 : 0.5, "—", "ASSUMPTION", "Typical project / agri lending", L, o),
    prov("econ.debt_interest", "Debt interest rate (EUR-equivalent)", c.debtRate, "—", "ASSUMPTION", SRC, L, o),
    prov("econ.debt_tenor_years", "Debt tenor", c.tier === "A" ? 10 : 7, "a", "ASSUMPTION", "Typical", L, o),
    prov("econ.fert_n_eur_kg", "Mineral nitrogen price", c.fertN, "EUR/kg N", "ESTIMATE", SRC, L, o),
    prov("econ.fert_p2o5_eur_kg", "Mineral phosphorus price", +(c.fertN * 1.1).toFixed(2), "EUR/kg P₂O₅", "ESTIMATE", SRC, L, o),
    prov("econ.fert_k2o_eur_kg", "Mineral potassium price", +(c.fertN * 0.65).toFixed(2), "EUR/kg K₂O", "ESTIMATE", SRC, L, o),
    prov("econ.digestate_handling_eur_t", "Incremental digestate handling on adequate land", +(1.2 + c.labour * 0.08).toFixed(2), "EUR/t", "ESTIMATE", SRC, L, o),
    prov("econ.digestate_excess_eur_t", "Digestate that has no adequate land", +(2.5 + c.labour * 0.22).toFixed(2), "EUR/t", "ESTIMATE", SRC, L, o),
    prov("econ.grid_ef_t_mwh", "Grid emission factor", c.ef, "tCO₂/MWh", "ESTIMATE", SRC, L, o),
  ];
  if (c.nitrateLimit !== undefined) out.push(prov("eng.nitrates_limit_kg_n_ha", "N application ceiling from organic fertiliser", c.nitrateLimit, "kgN/ha·a", "ASSUMPTION", "National rule / good practice", L, o));
  if (c.storageMonths !== undefined) out.push(prov("eng.storage_months", "Gas-tight digestate storage required", c.storageMonths, "months", "ASSUMPTION", "National closed-season rule / practice", L, o));
  return out;
}

export function buildAdapter(c: CountryProfile, regulatory = regulatoryFor(c.regime)): CountryAdapter {
  return {
    code: c.code,
    nameEn: c.name,
    currency: c.currency,
    maturity: c.maturity ?? "profile",
    params: profileParams(c),
    regions: c.regions,
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

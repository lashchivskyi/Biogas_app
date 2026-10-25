import { prov, toMap } from "./params";
import type { Provenance } from "./types";

/**
 * Country-independent engineering parameters.
 * Anything that depends on a market (prices, wages, discount rate) lives in a CountryAdapter instead.
 *
 * Provenance policy: FACT only where a physical constant or a published number was read in this
 * project; everything else is ASSUMPTION/ESTIMATE with a confidence and must be re-validated.
 */
const FNR08 = "FNR, Biogas Basisdaten Deutschland (2008) — read in full";
const ENG = "Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data";

export const ENGINEERING_PARAMS: Provenance[] = [
  // --- physical constants ---
  prov("eng.ch4_lhv_kwh_m3", "Lower heating value of methane", 9.97, "kWh/m³ CH₄", "FACT", FNR08, "HIGH"),
  prov("eng.gwp_ch4", "Global warming potential of CH₄ (100 y)", 28, "kgCO₂e/kgCH₄", "FACT", "IPCC AR5 (GWP100, without climate feedback)", "HIGH"),
  prov("eng.ch4_density_kg_m3", "Methane density at 0 °C, 1 atm", 0.717, "kg/m³", "FACT", "Physical constant", "HIGH"),
  prov("eng.biogas_density_kg_m3", "Biogas density (≈55 % CH₄)", 1.2, "kg/m³", "ESTIMATE", ENG, "MEDIUM"),
  prov("eng.gas_emission_factor_t_mwh", "Natural-gas combustion emission factor", 0.202, "tCO₂/MWh", "FACT", "IPCC default 56.1 kgCO₂/GJ", "HIGH"),

  prov("eng.natgas_lhv_kwh_m3", "Natural gas lower heating value", 9.5, "kWh/m³", "ASSUMPTION", "Typical pipeline gas; invoice value may differ", "MEDIUM"),
  prov("eng.rampup_year1", "Year-1 output share (biological start-up)", 0.75, "—", "ASSUMPTION", "Typical commissioning curve 3–6 months", "MEDIUM"),

  // --- digester process ---
  prov("eng.digester_temp_c", "Mesophilic digester temperature", 38, "°C", "ASSUMPTION", ENG, "HIGH"),
  prov("eng.cp_substrate_kj_kgk", "Specific heat of substrate", 3.9, "kJ/(kg·K)", "ESTIMATE", "Water 4.18, solids ≈1.5, weighted for 8–25 % DM", "MEDIUM"),
  prov("eng.digester_u_value_w_m2k", "Insulated digester wall/roof U-value", 0.35, "W/(m²·K)", "ESTIMATE", ENG, "MEDIUM", { note: "10 cm mineral wool / equivalent; poor insulation is a main cause of high winter heat demand" }),
  prov("eng.digester_floor_u_value_w_m2k", "Digester floor U-value (to ground)", 0.5, "W/(m²·K)", "ESTIMATE", ENG, "LOW"),
  prov("eng.digester_h_over_d", "Digester height/diameter", 0.45, "—", "ASSUMPTION", ENG, "MEDIUM"),
  prov("eng.headspace_factor", "Total/working volume (gas holder, freeboard)", 1.15, "—", "ASSUMPTION", ENG, "MEDIUM"),
  prov("eng.hrt_manure_days", "Hydraulic retention time, manure-dominated feed", 35, "d", "ASSUMPTION", ENG, "MEDIUM", { note: "Mesophilic CSTR on cattle/pig slurry typically 30–40 d" }),
  prov("eng.hrt_mixed_days", "Hydraulic retention time, manure + co-substrates", 30, "d", "ASSUMPTION", ENG, "MEDIUM"),
  prov("eng.hrt_waste_days", "Hydraulic retention time, easily degradable waste", 25, "d", "ASSUMPTION", ENG, "MEDIUM"),
  prov("eng.hrt_high_rate_days", "Hydraulic retention time, high-rate reactor (UASB/EGSB) on dilute effluent", 6, "d", "ASSUMPTION", "Industrial practice for vinasse/dairy effluent: 2–10 d", "LOW"),
  prov("eng.olr_high_rate_kgvs_m3d", "Max organic loading rate, high-rate reactor", 8, "kgVS/(m³·d)", "ASSUMPTION", "UASB/EGSB on soluble COD: 5–20 kgCOD/(m³·d); VS-basis conservative", "LOW"),
  prov("eng.hrt_lagoon_days", "Hydraulic retention time, covered lagoon (warm climate)", 40, "d", "ASSUMPTION", "Covered lagoons for POME / pig slurry: 30–60 d", "LOW"),
  prov("eng.olr_lagoon_kgvs_m3d", "Max organic loading rate, covered lagoon", 1.0, "kgVS/(m³·d)", "ASSUMPTION", "Low-rate unmixed lagoon", "LOW"),
  prov("eng.olr_max_kgvs_m3d", "Max organic loading rate, mesophilic CSTR", 3.5, "kgVS/(m³·d)", "ASSUMPTION", ENG, "MEDIUM", { note: "Hard cap used for digester volume; poultry/fat-rich mixes use a lower cap" }),
  prov("eng.olr_max_poultry_kgvs_m3d", "Max OLR when poultry/fat > 35 % of VS", 2.5, "kgVS/(m³·d)", "ASSUMPTION", ENG, "LOW"),
  prov("eng.storage_months", "Gas-tight digestate storage required", 6, "months", "ASSUMPTION", "Typical agronomic closed-season requirement; to be set by local law", "MEDIUM"),
  prov("eng.parasitic_base_kwh_t", "Plant electricity use, base", 3.0, "kWh/t FM", "ESTIMATE", ENG, "MEDIUM"),
  prov("eng.parasitic_dm_kwh_t_per_pct", "Plant electricity use per % DM of mix", 0.15, "kWh/t FM per %DM", "ESTIMATE", ENG, "LOW"),
  prov("eng.digestate_n_retention", "Share of feed nitrogen retained in digestate", 0.85, "—", "ESTIMATE", "NH₃ and storage losses 10–20 %", "MEDIUM"),
  prov("eng.biogas_mass_kg_per_m3", "Mass removed with biogas", 1.2, "kg/m³", "ESTIMATE", ENG, "MEDIUM"),

  prov("eng.self_consumption_coincidence", "Share of customer electricity load coinciding with biogas generation", 0.85, "—", "ASSUMPTION", "Biogas CHP runs ≈24/7; barn/cooling/process loads are largely continuous. Without a load profile this is a guess", "LOW"),

  // --- inhibition & mix limits ---
  prov("eng.poultry_inhib_threshold", "Poultry share of VS above which NH₃ inhibition starts", 0.35, "—", "ESTIMATE", "Ammonia inhibition literature, typical 3 g NH₄-N/L", "LOW"),
  prov("eng.poultry_inhib_loss_per_10pct", "Yield loss per 10 pp poultry VS above threshold", 0.04, "—", "ESTIMATE", ENG, "LOW"),
  prov("eng.fat_share_warning", "Fat/grease share of VS above which overload risk", 0.25, "—", "ESTIMATE", ENG, "LOW"),

  // --- CHP ---
  prov("eng.chp_eta_el_25", "CHP electrical efficiency at 25 kW", 0.29, "—", "ESTIMATE", "Typical gas engine data sheets (FNR 2008 range 30–40 %)", "MEDIUM"),
  prov("eng.chp_eta_el_50", "CHP electrical efficiency at 50 kW", 0.33, "—", "ESTIMATE", "Typical gas engine data sheets", "MEDIUM"),
  prov("eng.chp_eta_el_100", "CHP electrical efficiency at 100 kW", 0.36, "—", "ESTIMATE", "Typical gas engine data sheets", "MEDIUM"),
  prov("eng.chp_eta_el_250", "CHP electrical efficiency at 250 kW", 0.39, "—", "ESTIMATE", "Typical gas engine data sheets", "MEDIUM"),
  prov("eng.chp_eta_el_500", "CHP electrical efficiency at 500 kW", 0.41, "—", "ESTIMATE", "Typical gas engine data sheets", "MEDIUM"),
  prov("eng.chp_eta_total", "CHP total efficiency (el + th)", 0.85, "—", "FACT", FNR08 + " (≈85 %)", "HIGH"),
  prov("eng.chp_heat_recovery", "Share of CHP thermal output recoverable to a heating circuit", 0.92, "—", "ESTIMATE", ENG, "MEDIUM"),
  prov("eng.chp_design_hours", "CHP design full-load hours", 8000, "h/a", "FACT", FNR08 + " (7 500–8 000 h)", "HIGH"),
  prov("eng.chp_min_kw", "Smallest CHP the model treats as technically sensible", 25, "kWel", "ASSUMPTION", ENG, "MEDIUM", { note: "Below this, CHP is a hobby-scale installation; model returns NOT RECOMMENDED unless another route works" }),
  prov("eng.chp_overhaul_share", "CHP major overhaul cost, share of CHP CAPEX", 0.22, "—", "ESTIMATE", ENG, "LOW"),
  prov("eng.chp_overhaul_years", "Years between CHP major overhauls", 6, "a", "ESTIMATE", "≈40 000–48 000 h", "MEDIUM"),
  prov("eng.chp_slip_share", "Unburned CH₄ (methane slip) in CHP exhaust", 0.01, "—", "ESTIMATE", "Literature: 0.5–2 % of CH₄ fed to engine", "LOW"),
  prov("eng.boiler_efficiency", "Biogas boiler efficiency", 0.9, "—", "ASSUMPTION", ENG, "HIGH"),

  // --- upgrading / biomethane ---
  prov("eng.upgrade_slip_share", "CH₄ slip in membrane upgrading", 0.007, "—", "ESTIMATE", "Literature 0.1–1 %; membranes toward the top of the range", "LOW"),
  prov("eng.biomethane_ch4_purity", "CH₄ content of biomethane", 0.97, "—", "ASSUMPTION", "Grid-injection quality", "HIGH"),
  prov("eng.upgrade_kwh_per_nm3_raw", "Electricity for upgrading + compression", 0.3, "kWh/Nm³ raw biogas", "ESTIMATE", ENG, "MEDIUM"),
  prov("eng.upgrade_min_nm3h", "Raw-biogas flow below which biomethane is flagged as sub-scale", 60, "Nm³/h", "ASSUMPTION", "EBA: average EU biomethane plant 483 m³/h; operating UA plants start at ~3 Mm³/a (≈400 Nm³/h)", "MEDIUM"),

  // --- engineering CAPEX (EU baseline, 2025 EUR) ---
  prov("eng.capex.digester_eur_m3_1000", "Digester tank incl. insulation, mixers, heating, membrane roof, at 1 000 m³", 190, "EUR/m³ working", "ESTIMATE", "Market check 2026-10: German component data (fermenter 500–1 200 m³ ≈ €80–100k, 2012) inflated ≈ +40 % (DBFZ/Fraunhofer for BMWK 2024) → €120–200/m³; set at the upper end. See docs/capex-benchmark.md", "LOW", { note: "Scales as V^-0.2; replace with 3–5 supplier quotations" }),
  prov("eng.capex.digester_scale_exp", "Digester unit-cost scale exponent", -0.2, "—", "ASSUMPTION", ENG, "LOW"),
  prov("eng.capex.lagoon_eur_m3", "Covered anaerobic lagoon (liner, HDPE gas-tight cover, gas collection)", 30, "EUR/m³", "ESTIMATE", "Order of magnitude from POME/swine lagoon projects (SE Asia, Latin America); TO VERIFY", "LOW"),
  prov("eng.capex.high_rate_eur_m3", "High-rate reactor (UASB/EGSB) incl. equalisation", 650, "EUR/m³ working", "ESTIMATE", "Industrial anaerobic wastewater reactors; TO VERIFY with supplier quotes", "LOW"),
  prov("eng.capex.cover_existing_eur_m3", "Gas-tight cover on an existing lagoon/tank", 12, "EUR/m³", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.storage_new_eur_m3", "New gas-tight covered digestate storage", 45, "EUR/m³", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.chp_eur_kw_100", "CHP unit incl. installation at 100 kWel", 1500, "EUR/kWel", "ESTIMATE", "FNR 2008: 560–900 EUR/kWel (150–500 kW), inflated ≈ ×1.8 to 2025", "LOW"),
  prov("eng.capex.chp_scale_exp", "CHP unit-cost scale exponent", -0.25, "—", "ASSUMPTION", ENG, "LOW"),
  prov("eng.capex.gas_system_fixed", "Gas holder, flare, desulphurisation: fixed part", 30000, "EUR", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.gas_system_per_nm3h", "Gas system variable part", 40, "EUR per Nm³/h raw biogas", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.feed_slurry", "Slurry pit, pumps, pipework", 25000, "EUR", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.feed_solids", "Solids feeder / hopper", 70000, "EUR", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.reception_waste", "Waste reception, crushing, buffer tank", 60000, "EUR", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.pretreatment_eur_per_tpa", "Depackaging / sorting line and enclosed reception for contaminated waste", 45, "EUR per t/a", "ESTIMATE", "Order of magnitude for biowaste / food-waste AD reception halls; TO VERIFY", "LOW"),
  prov("eng.capex.pasteurisation_fixed", "Pasteurisation (70 °C / 1 h) unit, fixed", 70000, "EUR", "ESTIMATE", "EU 142/2011 category 3 treatment; supplier data needed", "LOW"),
  prov("eng.capex.pasteurisation_per_tday", "Pasteurisation unit, variable", 1800, "EUR per t/d", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.heat_network_fixed", "Heat exchangers / pipes to consumer, fixed", 25000, "EUR", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.heat_network_per_kw", "Heat network variable", 100, "EUR/kWth", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.boiler_eur_kw", "Biogas boiler incl. installation", 90, "EUR/kWth", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.electrical_share", "Electrical, I&C, SCADA", 0.06, "of equipment", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.piping_share", "Gas/substrate piping", 0.04, "of equipment", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.civil_share", "Civil works, roads, fencing", 0.06, "of equipment", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.engineering_share", "Engineering, permits, EIA, commissioning", 0.08, "of subtotal", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.contingency_share", "Contingency", 0.1, "of subtotal", "ASSUMPTION", "Typical for pre-FEED estimates (±30 %)", "MEDIUM"),
  prov("eng.capex.grid_connection_fixed", "Electrical grid connection (behind the meter / small export)", 20000, "EUR", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.grid_connection_per_kw", "Grid connection variable", 60, "EUR/kWel", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.upgrade_ref_eur", "Membrane upgrading unit at 250 Nm³/h raw biogas (incl. compression)", 900000, "EUR", "ESTIMATE", "Market check 2026-10: reviews and vendors give 2 500–3 500 EUR per Nm³/h at 250–700 Nm³/h (≈ 3 600 EUR per Nm³/h here incl. small-scale premium); see docs/capex-benchmark.md", "LOW"),
  prov("eng.capex.upgrade_scale_exp", "Upgrading scale exponent", 0.65, "—", "ASSUMPTION", ENG, "LOW"),
  prov("eng.capex.injection_fixed", "Compression, metering, injection station", 350000, "EUR", "ESTIMATE", ENG, "LOW"),
  prov("eng.capex.pipeline_eur_km", "Pipeline to gas main", 200000, "EUR/km", "ESTIMATE", ENG, "LOW"),

  // --- engineering OPEX ---
  prov("eng.opex.labour_min_hours", "Minimum operator time", 750, "h/a", "ASSUMPTION", "FNR 2008: 3–7 h/(kWel·a); ≈ 2 h/day floor for small farm plants (revised 2026-10 from 1 400 h)", "MEDIUM"),
  prov("eng.opex.labour_hours_per_kw", "Operator time per kWel", 5, "h/(kWel·a)", "FACT", FNR08 + " (3–7)", "MEDIUM"),
  prov("eng.opex.chp_service_eur_kwh", "CHP service + oil + spare parts", 0.022, "EUR/kWhel", "ESTIMATE", "Typical 1.5–2.5 ct/kWh", "LOW"),
  prov("eng.opex.maintenance_share", "Maintenance of non-CHP plant", 0.02, "of CAPEX/a", "ESTIMATE", ENG, "LOW"),
  prov("eng.opex.insurance_share", "Insurance", 0.005, "of CAPEX/a", "ESTIMATE", ENG, "LOW"),
  prov("eng.opex.monitoring_fixed", "Lab tests, safety inspections, gas monitoring", 5000, "EUR/a", "ESTIMATE", ENG, "LOW"),
  prov("eng.opex.upgrade_maintenance_share", "Upgrading maintenance", 0.04, "of upgrading CAPEX/a", "ESTIMATE", ENG, "LOW"),
  prov("eng.opex.certification_eur_nm3", "Certification, trading, balancing for biomethane", 0.03, "EUR/Nm³", "ESTIMATE", ENG, "LOW"),

  // --- fertiliser / digestate agronomy ---
  prov("eng.nitrates_limit_kg_n_ha", "N application ceiling from organic fertiliser", 170, "kgN/ha·a", "ASSUMPTION", "EU Nitrates Directive 91/676/EEC; UA alignment pending (EU accession)", "MEDIUM"),
  prov("eng.digestate_n_gain_own_manure", "Extra plant-available N from digesting own manure", 0.15, "of total N", "ESTIMATE", "Digestion raises NH₄ share; literature 10–25 %", "LOW"),
  prov("eng.digestate_n_credit_imported", "Substitution credit for nutrients in imported waste", 0.6, "of total N", "ESTIMATE", "Mineral fertiliser replacement value of organic N", "LOW"),
  prov("eng.digestate_pk_credit_imported", "Substitution credit for P, K in imported waste", 0.5, "of total", "ESTIMATE", ENG, "LOW"),

  // --- safety / thresholds used by scoring ---
  prov("eng.methane_loss_good", "Methane loss share considered good practice", 0.02, "of production", "ASSUMPTION", "DK/DE campaign mean ≈2.0 % (IEA Task 37 2017 summary)", "MEDIUM"),
  prov("eng.methane_loss_high", "Methane loss share that cancels most climate benefit", 0.05, "of production", "ASSUMPTION", "Derived: see docs/economics.md §9", "LOW"),
  prov("eng.dry_digestion_dm_pct", "DM above which high-solids digestion is considered", 22, "%", "ASSUMPTION", ENG, "MEDIUM"),
  prov("eng.wet_solids_feeding_dm_pct", "DM above which a solids feeder / recirculation is needed", 12, "%", "ASSUMPTION", ENG, "MEDIUM"),
];

export const ENGINEERING_MAP = toMap(ENGINEERING_PARAMS);

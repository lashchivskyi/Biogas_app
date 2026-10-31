import { DATA_REVIEW_AS_OF } from "./modelAudit";
import { prov, toMap } from "./params";
import type { Provenance } from "./types";
import { GHG_PARAMS } from "./ghg";

/**
 * Country-independent engineering parameters.
 * Anything that depends on a market (prices, wages, discount rate) lives in a CountryAdapter instead.
 *
 * Provenance policy: FACT only where a physical constant or a published number was read in this
 * project; everything else is ASSUMPTION/ESTIMATE with a confidence and must be re-validated.
 */
const FNR10 = "FNR, Guide to Biogas, 5th ed. 2010";
const FNR10_DATE = "2010-12-31";
/** Values that rest on judgement alone have no publication to date them by: show the last data review. */
const REVIEWED = DATA_REVIEW_AS_OF;
const JUDGEMENT = (basis: string) => `Engineering judgement, no published value: ${basis}`;

/** Paired full-load BIOGAS values, TEDOM 50 Hz catalogue, page 1, edition 03/2025.
 * A screening reference, not equipment selection; 60 Hz sites require a local offer. */
export const CHP_REFERENCE = [
  [20, .297, .614], [30, .309, .608], [44, .326, .583], [83, .350, .506],
  [106, .366, .490], [124, .369, .491], [166, .377, .493], [182, .391, .480],
  [200, .391, .479], [354, .402, .451], [430, .394, .464], [528, .402, .445],
  [600, .427, .436], [800, .431, .433], [999, .426, .464], [1200, .430, .460],
  [1560, .426, .464], [1840, .436, .436], [2300, .434, .434],
] as const;
const CHP_SOURCE = "TEDOM Basic Technical Data, BIOGAS 50 Hz, edition 03/2025, p.1. Full-load reference, ISO 3046-1 fuel tolerance; site gas, temperature, emissions and 60 Hz equipment require supplier guarantees. https://www.tedom.com/wp-content/uploads/2023/12/TEDOM-CHP-Units-50-Hz.pdf";

export const ENGINEERING_PARAMS: Provenance[] = [
  // --- physical constants ---
  prov("eng.ch4_lhv_kwh_m3", "Lower heating value of methane", 9.97, "kWh/Nm³ CH₄", "FACT", "ISO 6976:2016, net calorific value of methane, real gas at 0 °C, 101.325 kPa; NIST WebBook check", "HIGH", { date: "2016-08-01" }),
  prov("eng.gwp_ch4", "Global warming potential of biogenic CH₄ (100 y)", 27, "kgCO₂e/kgCH₄", "FACT", "IPCC AR6 WGI, Ch. 7, Table 7.15 (non-fossil CH₄, GWP100 27.0)", "HIGH", { date: "2021-08-09" }),
  prov("eng.ch4_density_kg_m3", "Methane density at 0 °C, 1 atm", 0.717, "kg/m³", "FACT", "NIST Chemistry WebBook SRD 69, methane at 273.15 K, 101.325 kPa: 0.7175 kg/m³", "HIGH", { date: "1991-12-31" }),
  prov("eng.co2_density_kg_m3", "Dry CO₂ density at 0 °C, 1 atm", 1.977, "kg/Nm³", "FACT", "NIST Chemistry WebBook SRD 69, CO₂ at 273.15 K, 101.325 kPa: 1.9768 kg/m³ (real gas)", "HIGH", { date: "1996-12-31" }),
  prov("eng.gas_emission_factor_t_mwh", "Natural-gas combustion emission factor", 0.202, "tCO₂/MWh", "FACT", "IPCC 2006 Guidelines, Vol. 2, Ch. 2, Table 2.2: natural gas 56.1 tCO₂/TJ (NCV)", "HIGH", { date: "2006-12-31" }),

  prov("eng.natgas_lhv_kwh_m3", "Natural gas lower heating value", 9.5, "kWh/m³", "ASSUMPTION", "ISO 6976:2016 basis; pipeline gas 8.5–10.5 kWh/m³ by grid and metering temperature; invoice value takes precedence", "LOW", { date: "2016-08-01" }),
  prov("eng.gas_hhv_lhv_ratio", "Natural gas HHV/LHV conversion", 1.11, "—", "FACT", "ISO 6976:2016 (methane GCV/NCV 1.110); IEA/Eurostat convention NCV ≈ 0.9 × GCV", "HIGH", { date: "2016-08-01", range: { low: 1.09, high: 1.12, basis: "engineering" } }),
  prov("eng.rampup_year1", "Year-1 output share (biological start-up)", 0.75, "—", "ASSUMPTION", `${FNR10}, §5.3.2: target loading reached ≈ day 110; start-up losses added`, "LOW", { date: FNR10_DATE }),

  // --- digester process ---
  prov("eng.digester_temp_c", "Mesophilic digester temperature", 38, "°C", "ASSUMPTION", `${FNR10}, §2.2.2, p. 23 (mesophilic 37–42 °C)`, "HIGH", { date: FNR10_DATE }),
  prov("eng.cp_substrate_kj_kgk", "Specific heat of substrate", 3.9, "kJ/(kg·K)", "ESTIMATE", "Calculated: water 4.18 (IAPWS-95) and solids ≈ 1.5 kJ/(kg·K), weighted for ≈ 10 % DM", "MEDIUM", { date: "2002-12-31" }),
  prov("eng.digester_u_value_w_m2k", "Insulated digester wall/roof U-value", 0.35, "W/(m²·K)", "ESTIMATE", `${FNR10}, Table 3.30, p. 66 (insulation λ 0.03–0.05, 5–10 cm)`, "MEDIUM", { date: FNR10_DATE, note: "10 cm mineral wool / equivalent; poor insulation is a main cause of high winter heat demand" }),
  prov("eng.digester_floor_u_value_w_m2k", "Digester floor U-value (to ground)", 0.5, "W/(m²·K)", "ESTIMATE", `${FNR10}, Table 3.30 (load-bearing floor insulation); indirect`, "LOW", { date: FNR10_DATE }),
  prov("eng.digester_h_over_d", "Digester height/diameter", 0.45, "—", "ASSUMPTION", JUDGEMENT("typical farm tanks 6–10 m high, 12–30 m diameter (0.25–0.6)"), "LOW", { date: REVIEWED }),
  prov("eng.headspace_factor", "Total/working volume (gas holder, freeboard)", 1.15, "—", "ASSUMPTION", `${FNR10}, Table 8.4, p. 162 (+10 % volume margin) + freeboard`, "LOW", { date: FNR10_DATE }),
  prov("eng.hrt_manure_days", "Hydraulic retention time, manure-dominated feed", 35, "d", "ASSUMPTION", `${FNR10}, Table 8.4, p. 162 (minimum HRT 30 d)`, "MEDIUM", { date: FNR10_DATE, note: "Mesophilic CSTR on cattle/pig slurry typically 30–40 d" }),
  prov("eng.hrt_mixed_days", "Hydraulic retention time, manure + co-substrates", 30, "d", "ASSUMPTION", `${FNR10}, Table 8.4, p. 162 (minimum HRT 30 d)`, "MEDIUM", { date: FNR10_DATE }),
  prov("eng.hrt_waste_days", "Hydraulic retention time, easily degradable waste", 25, "d", "ASSUMPTION", JUDGEMENT("readily degradable waste; below the 30 d farm-plant minimum (FNR 2010)"), "LOW", { date: REVIEWED }),
  prov("eng.hrt_high_rate_days", "Hydraulic retention time, high-rate reactor (UASB/EGSB) on dilute effluent", 2, "d", "ASSUMPTION", "van Lier et al., Rev. Environ. Sci. Biotechnol. 14 (2015): UASB HRT typically hours to 1 d, sizing OLR-driven; 2 d is conservative", "LOW", { date: "2015-12-31" }),
  prov("eng.olr_high_rate_kgvs_m3d", "Max organic loading rate, high-rate reactor", 8, "kgVS/(m³·d)", "ASSUMPTION", "van Lier et al., Rev. Environ. Sci. Biotechnol. 14 (2015): UASB 10–15 kgCOD/(m³·d); low end on VS basis", "LOW", { date: "2015-12-31" }),
  prov("eng.hrt_lagoon_days", "Hydraulic retention time, covered lagoon (warm climate)", 40, "d", "ASSUMPTION", JUDGEMENT("covered lagoons for POME / pig slurry 35–60 d"), "LOW", { date: REVIEWED }),
  prov("eng.olr_lagoon_kgvs_m3d", "Max organic loading rate, covered lagoon", 1.0, "kgVS/(m³·d)", "ASSUMPTION", JUDGEMENT("low-rate unmixed lagoon, warm climate only"), "LOW", { date: REVIEWED }),
  prov("eng.olr_max_kgvs_m3d", "Max organic loading rate, mesophilic CSTR", 3.5, "kgVS/(m³·d)", "ASSUMPTION", `${FNR10}, Table 8.4, p. 162 (≤ 2.5 overall, ≤ 5.0 first stage); upper end for one stage`, "MEDIUM", { date: FNR10_DATE, note: "Hard cap used for digester volume; poultry/fat-rich mixes use a lower cap" }),
  prov("eng.olr_max_poultry_kgvs_m3d", "Max OLR when poultry/fat > 35 % of VS", 2.5, "kgVS/(m³·d)", "ASSUMPTION", `${FNR10}, Table 8.4, p. 162 (conservative cap ≤ 2.5)`, "LOW", { date: FNR10_DATE }),
  prov("eng.storage_months", "Digestate storage required (closed spreading season)", 6, "months", "ASSUMPTION", "Düngeverordnung 2017, §12(2): 6 months (9 without own land); national rules differ", "MEDIUM", { date: "2017-05-26" }),
  prov("eng.storage_months_warm", "Digestate storage where the climate has no closed spreading season (annual mean ≥ 20 °C)", 3, "months", "ASSUMPTION", JUDGEMENT("year-round growing season, so mainly a wet-season / crop-free-day buffer (3 months chosen on the cautious side, not a surveyed rule); local rules and wet-season spreading bans must be checked"), "LOW", { date: REVIEWED }),
  prov("eng.gastight_retention_days", "Gas-tight retention incl. digester (new plants)", 150, "d", "ASSUMPTION", "TA Luft 2021 / VDI 3475-4: ≥ 150 d in a gas-tight system for new plants; small slurry plants may be exempt", "MEDIUM", { date: "2021-08-18" }),
  prov("eng.parasitic_base_kwh_t", "Plant electricity use, minimum per tonne (pumping, mixing of dilute feed)", 3.0, "kWh/t FM", "ESTIMATE", "Naegele et al., Energies 5 (2012): slurry plants; floor for dilute feed with little gas", "LOW", { date: "2012-12-31" }),
  prov("eng.pretreatment_milling_kwh_t", "Mechanical size reduction of straw (milling), electricity", 66.6, "kWh/t FM", "ESTIMATE", "Dell'Omo et al., Methane 4(1) (2025): industrial-scale mill, > 1 t/h, 66.6 kWh per tonne of wheat straw; one device, no steam or alkali pretreatment", "LOW", { date: "2025-03-31", note: "Mill CAPEX and any steam-explosion / alkali step are not modelled" }),
  prov("eng.parasitic_share_gas_energy", "Plant electricity use as a share of methane energy (LHV)", 0.032, "—", "ESTIMATE", "DBFZ 05/2023 reference plants: own use 8 % of electricity at 36–41 % el. efficiency; Naegele 2012: 8.5 %", "MEDIUM", { date: "2023-05-31" }),
  prov("eng.pasteurisation_temp_c", "ABP pasteurisation temperature used in screening", 70, "°C", "FACT", "EU Regulation 142/2011, Annex V, Ch. III: 70 °C for 60 min, particles ≤ 12 mm", "HIGH", { date: "2011-02-25" }),
  prov("eng.pasteurisation_heat_recovery", "Heat recovery from ABP pasteurisation before mesophilic digestion", 0.6, "—", "ASSUMPTION", JUDGEMENT("regenerative heat exchanger 50–75 %; supplier heat balance needed"), "LOW", { date: REVIEWED }),
  prov("eng.digestate_n_retention", "Share of feed nitrogen retained in digestate", 0.95, "—", "ESTIMATE", "Düngeverordnung 2017, Anlage 2: digestate N counted at ≥ 95 % after storage losses", "MEDIUM", { date: "2017-05-26" }),

  prov("eng.self_consumption_coincidence", "Share of customer electricity load coinciding with biogas generation", 0.85, "—", "ASSUMPTION", JUDGEMENT("CHP runs ≈ 24/7; customer load profile needed"), "LOW", { date: REVIEWED }),
  prov("eng.invoice_variable_share", "Avoidable share of an unsplit customer electricity bill", 0.85, "—", "ASSUMPTION", JUDGEMENT("energy share of an unsplit bill; customer tariff sheet takes precedence"), "LOW", { date: REVIEWED, range: { low: 0.7, high: 1, basis: "engineering" } }),

  // --- inhibition & mix limits ---
  prov("eng.poultry_inhib_threshold", "Poultry share of VS above which NH₃ inhibition starts", 0.35, "—", "ESTIMATE", `${FNR10}, Table 2.2, p. 26 (inhibition at NH₄-N > 3.0–3.5 g/L); poultry share is a proxy`, "LOW", { date: FNR10_DATE }),
  prov("eng.poultry_inhib_loss_per_10pct", "Yield loss per 10 pp poultry VS above threshold", 0.04, "—", "ESTIMATE", JUDGEMENT("site-specific; lab BMP and NH₄-N test needed"), "LOW", { date: REVIEWED }),
  prov("eng.fat_share_warning", "Fat/grease share of VS above which overload risk", 0.25, "—", "ESTIMATE", "Long et al., Process Saf. Environ. Prot. 90 (2012): stable FOG co-digestion up to ≈ 30 % of VS", "LOW", { date: "2012-12-31" }),

  // --- CHP ---
  ...CHP_REFERENCE.flatMap(([kw, el, th]) => [
    prov(`eng.chp_eta_el_${kw}`, `CHP reference electrical efficiency at ${kw} kW`, el, "—", "ESTIMATE", CHP_SOURCE, "MEDIUM", { date: "2025-03-01" }),
    prov(`eng.chp_eta_th_${kw}`, `CHP reference thermal efficiency at ${kw} kW`, th, "—", "ESTIMATE", CHP_SOURCE, "MEDIUM", { date: "2025-03-01" }),
  ]),
  prov("eng.chp_heat_recovery", "Heat delivery allowance after rated CHP thermal output", 0.92, "—", "ESTIMATE", JUDGEMENT("5–10 % piping and exchanger losses from CHP to the user"), "LOW", { date: REVIEWED }),
  prov("eng.chp_design_hours", "CHP design full-load hours", 8000, "h/a", "ASSUMPTION", `${FNR10}, Table 8.4, p. 162 (8 000 full-load h/a); flexible operation lowers hours`, "MEDIUM", { date: FNR10_DATE }),
  prov("eng.chp_min_kw", "Smallest CHP the model treats as technically sensible", 25, "kWel", "ASSUMPTION", "TEDOM Basic Technical Data, BIOGAS 50 Hz, 03/2025: smallest unit 20 kWel", "LOW", { date: "2025-03-01", note: "Below this, CHP is a hobby-scale installation; model returns NOT RECOMMENDED unless another route works" }),
  prov("eng.chp_slip_share", "Unburned CH₄ (methane slip) in CHP exhaust", 0.01, "—", "ESTIMATE", "IEA Bioenergy Task 37, Methane emissions from biogas plants, 2017, pp. 32–33 (spark ignition ≈ 1 %)", "MEDIUM", { date: "2017-12-31" }),
  prov("eng.boiler_efficiency", "Biogas boiler efficiency", 0.9, "—", "ASSUMPTION", JUDGEMENT("non-condensing gas boiler 88–92 % (NCV)"), "MEDIUM", { date: REVIEWED }),

  // --- upgrading / biomethane ---
  prov("eng.upgrade_slip_share", "CH₄ slip in membrane upgrading", 0.007, "—", "ESTIMATE", "SGC Rapport 2013:270, Biogas upgrading: review of commercial technologies, §3.3 (membranes ≈ 0.5 %)", "MEDIUM", { date: "2013-12-31" }),
  prov("eng.biomethane_ch4_purity", "CH₄ content of biomethane", 0.97, "—", "ASSUMPTION", "SGC Rapport 2013:270, §2.3; EU grid entry typically 97–98 % CH₄", "MEDIUM", { date: "2013-12-31" }),
  prov("eng.upgrade_kwh_per_nm3_raw", "Electricity for upgrading + compression", 0.3, "kWh/Nm³ raw biogas", "ESTIMATE", "SGC Rapport 2013:270, §2.3, §3.2 (membranes 0.20–0.30 kWh/Nm³ raw)", "MEDIUM", { date: "2013-12-31" }),
  prov("eng.cng_compression_kwh_nm3", "Additional compression of biomethane to ~250 bar for road CNG", 0.15, "kWh/Nm³ biomethane", "ESTIMATE", "Burckhardt Compression, CNG compressor technical sheet, 2022 (≈ 0.13–0.16 kWh/Nm³)", "MEDIUM", { date: "2022-12-31" }),
  prov("eng.upgrade_min_nm3h", "Raw-biogas flow below which biomethane is flagged as sub-scale", 60, "Nm³/h", "ASSUMPTION", JUDGEMENT("smallest commercial membrane units ≈ 50–100 Nm³/h raw"), "LOW", { date: REVIEWED }),

  // --- engineering CAPEX (reconstructed EU baseline; not current supplier quotations) ---
  prov("eng.capex.digester_eur_m3_1000", "Digester tank incl. insulation, mixers, heating, membrane roof, at 1 000 m³", 190, "EUR/m³ working", "ESTIMATE", "German component data 2012 (≈ 83–160 €/m³) × Destatis construction index 2012→2025 (×1.82) = 150–290 €/m³; checked against DBFZ 2023 reference plants", "LOW", { date: "2012-12-31", note: "Scales as V^-0.2; replace with 3–5 current supplier quotations" }),
  prov("eng.capex.digester_scale_exp", "Digester unit-cost scale exponent", -0.2, "—", "ASSUMPTION", JUDGEMENT("concrete tanks cost ∝ V^0.8"), "LOW", { date: REVIEWED }),
  prov("eng.capex.lagoon_eur_m3", "Covered anaerobic lagoon (liner, HDPE gas-tight cover, gas collection)", 30, "EUR/m³", "ESTIMATE", "CDFA dairy digester programme via Energy Institute at Haas, 2024: ≈ $950 per cow (≈ $32/m³)", "LOW", { date: "2024-10-14" }),
  prov("eng.capex.high_rate_eur_m3", "High-rate reactor (UASB/EGSB) incl. equalisation", 650, "EUR/m³ working", "ESTIMATE", JUDGEMENT("industrial UASB/EGSB; vendor quotes needed, proxies range up to ≈ 2×"), "LOW", { date: REVIEWED }),
  prov("eng.capex.cover_existing_eur_m3", "Gas-tight cover on an existing lagoon/tank", 30, "EUR/m³", "ESTIMATE", "top agrar 2012 (manufacturer data): gas-tight roof > 50 % of a 65–110 €/m³ tank, i.e. ≥ 33 €/m³", "LOW", { date: "2012-05-25" }),
  prov("eng.capex.storage_new_eur_m3", "New gas-tight covered digestate storage", 120, "EUR/m³", "ESTIMATE", "top agrar 2012: 65–110 €/m³ for 1 500–5 000 m³ gas-tight tanks × Destatis construction index to 2025 (×1.82); lower end", "LOW", { date: "2012-05-25" }),
  prov("eng.capex.storage_open_share", "Open storage cost relative to gas-tight storage", 0.5, "—", "ESTIMATE", "top agrar 2012 (manufacturer data): the gas-tight roof is > 50 % of the tank cost", "LOW", { date: "2012-05-25" }),
  prov("eng.capex.chp_eur_kw_100", "CHP unit incl. installation at 100 kWel", 2400, "EUR/kWel", "ESTIMATE", "DBFZ/IEE for BMWK 2024: biogas CHP cost +31–40 % 2020→2023 (BHKW-Infozentrum); LWK NRW 2023: ≈ 2 830 €/kW at 30 kW", "LOW", { date: "2024-02-13" }),
  prov("eng.capex.chp_scale_exp", "CHP unit-cost scale exponent", -0.25, "—", "ASSUMPTION", "Danish Energy Agency, Technology Data, sheet 06 biogas engines (EUR2020); fits 30 kW–1 MW costs", "LOW", { date: "2023-08-23" }),
  prov("eng.capex.gas_system_fixed", "Gas holder, flare, desulphurisation: fixed part", 30000, "EUR", "ESTIMATE", "US EPA LMOP, LFGcost-Web v3.4 manual, 2020: flare system fixed part ≈ $26 000", "LOW", { date: "2020-10-31" }),
  prov("eng.capex.gas_system_per_nm3h", "Gas system variable part", 120, "EUR per Nm³/h raw biogas", "ESTIMATE", "US EPA LMOP, LFGcost-Web v3.4 manual, 2020: flare system ≈ $200 per Nm³/h (landfill); biogas flares cheaper", "LOW", { date: "2020-10-31" }),
  prov("eng.capex.feed_slurry", "Slurry pit, pumps, pipework", 25000, "EUR", "ESTIMATE", "LWK NRW, Mini-Biogasanlagen (FNR event), 2023: pumps & mixers 50 k€ for 30 kW incl. digester mixers", "LOW", { date: "2023-11-23" }),
  prov("eng.capex.feed_solids", "Solids feeder / hopper", 70000, "EUR", "ESTIMATE", JUDGEMENT("supplier quotes needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.reception_waste", "Waste reception, crushing, buffer tank", 60000, "EUR", "ESTIMATE", JUDGEMENT("supplier quotes needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.pretreatment_eur_per_tpa", "Depackaging / sorting line and enclosed reception for contaminated waste", 45, "EUR per t/a", "ESTIMATE", JUDGEMENT("biowaste / food-waste reception halls; supplier quotes needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.pasteurisation_fixed", "Pasteurisation (70 °C / 1 h) unit, fixed", 70000, "EUR", "ESTIMATE", JUDGEMENT("EU 142/2011 Cat. 3 unit; supplier quotes needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.pasteurisation_per_tday", "Pasteurisation unit, variable", 1800, "EUR per t/d", "ESTIMATE", JUDGEMENT("supplier quotes needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.heat_network_fixed", "Heat exchangers / pipes to consumer, fixed", 25000, "EUR", "ESTIMATE", JUDGEMENT("depends on pipe length; local quote needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.heat_network_per_kw", "Heat network variable", 100, "EUR/kWth", "ESTIMATE", JUDGEMENT("depends on pipe length; local quote needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.boiler_eur_kw", "Biogas boiler incl. installation", 90, "EUR/kWth", "ESTIMATE", "Danish Energy Agency, Technology Data, sheet 44 gas boilers: 64 €/kWth (EUR2020, 2–3 MW) × 1.3", "LOW", { date: "2023-08-23" }),
  prov("eng.capex.electrical_share", "Electrical, I&C, SCADA", 0.06, "of equipment", "ESTIMATE", "LWK NRW, Mini-Biogasanlagen (FNR event), 2023: ≈ 8.5 % for a 30 kW plant", "LOW", { date: "2023-11-23" }),
  prov("eng.capex.piping_share", "Gas/substrate piping", 0.04, "of equipment", "ESTIMATE", JUDGEMENT("share of equipment cost"), "LOW", { date: REVIEWED }),
  prov("eng.capex.civil_share", "Civil works, roads, fencing", 0.06, "of equipment", "ESTIMATE", "LWK NRW, Mini-Biogasanlagen (FNR event), 2023: earthworks ≈ 10 % for a 30 kW plant", "LOW", { date: "2023-11-23" }),
  prov("eng.capex.engineering_share", "Engineering, permits, EIA, commissioning", 0.08, "of subtotal", "ESTIMATE", "DBFZ/IEE for BMWK, Kostenentwicklung Biomasseanlagen, 2024, Tab. 4-1: planning 8 %", "MEDIUM", { date: "2024-02-13" }),
  prov("eng.capex.contingency_share", "Contingency", 0.1, "of subtotal", "ASSUMPTION", JUDGEMENT("typical for pre-FEED estimates; AACE Class 5 accuracy −20…−50 % / +30…+100 %"), "MEDIUM", { date: REVIEWED }),
  prov("eng.capex.grid_connection_fixed", "Electrical grid connection (behind the meter / small export)", 20000, "EUR", "ESTIMATE", JUDGEMENT("grid operator quote needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.grid_connection_per_kw", "Grid connection variable", 60, "EUR/kWel", "ESTIMATE", JUDGEMENT("grid operator quote needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.upgrade_ref_eur", "Membrane upgrading unit at 250 Nm³/h raw biogas (incl. compression and off-gas treatment)", 1200000, "EUR", "ESTIMATE", "IBKE, Leitfaden Rohbiogas-Sammelleitungen, 2024, Tab. 4: 1.2 M€ at 250 Nm³/h, 2.0 M€ at 750 Nm³/h, incl. off-gas treatment", "MEDIUM", { date: "2024-11-30" }),
  prov("eng.capex.upgrade_scale_exp", "Upgrading scale exponent", 0.65, "—", "ASSUMPTION", "Danish Energy Agency, Renewable Fuels, sheet 91 upgrading (EUR2020); IBKE 2024 ≈ 0.5–0.6", "MEDIUM", { date: "2023-06-30" }),
  prov("eng.capex.injection_fixed", "Compression, metering, injection station", 350000, "EUR", "ESTIMATE", "GRDF connection presentation, 2018: ≈ 0.4–0.5 M€ equivalent; distribution grid only (transmission ≈ 2 M€)", "LOW", { date: "2018-10-03" }),
  prov("eng.capex.cng_fixed", "Bio-CNG off-grid offtake: filling post + 3–4 cascade trailers (≈ 4 000–5 000 Nm³ each)", 450000, "EUR", "ESTIMATE", JUDGEMENT("virtual-pipeline practice; US EPA LFGcost 2020 CNG station gives the same order"), "LOW", { date: REVIEWED }),
  prov("eng.capex.cng_per_nm3h", "Bio-CNG high-pressure (250 bar) compression", 1000, "EUR per Nm³/h biomethane", "ESTIMATE", JUDGEMENT("reciprocating CNG compressors 100–1 000 Nm³/h; supplier quotes needed"), "LOW", { date: REVIEWED }),
  prov("eng.capex.pipeline_eur_km", "Pipeline to gas main", 200000, "EUR/km", "ESTIMATE", "IBKE, Leitfaden Rohbiogas-Sammelleitungen, 2024: PE lines 80–300 €/m", "MEDIUM", { date: "2024-11-30" }),

  // --- engineering OPEX ---
  prov("eng.opex.labour_min_hours", "Minimum operator time", 750, "h/a", "ASSUMPTION", "IEE/DBFZ, EEG-Erfahrungsbericht Biomasse, 2023, Tab. 5-4: 75 kW slurry plant ≈ 500–750 h/a", "LOW", { date: "2023-08-18" }),
  prov("eng.opex.labour_hours_coef", "Operator time at 1 kWel, power-law fit h = a·kWel^b", 22.5, "h/a", "ESTIMATE", "Walla & Schneeberger, Biomass and Bioenergy 32 (2008) 551–557, Table 2 (labour from Keymer & Reinhold; 20 €/h): 12 390 / 23 275 / 39 550 €/a at 100 / 250 / 500 kWel = 620 / 1 164 / 1 978 h/a; fit a = 22.5, b = 0.72 reproduces all three within 2 %", "MEDIUM", { date: "2008-12-31", note: "Maize-silage farm plants 18–1 000 kWel; above 1 MW and for waste plants with reception and pasteurisation the fit is an extrapolation (≈ 3.3 h/kW at 1 MW, 2.1 at 5 MW; IBKE 2024 example ≈ 2.6)" }),
  prov("eng.opex.labour_hours_exp", "Operator time scale exponent b", 0.72, "—", "ESTIMATE", "Fit to Walla & Schneeberger (2008) Table 2: labour grows less than proportionally with size", "MEDIUM", { date: "2008-12-31" }),
  prov("eng.opex.chp_service_eur_kwh", "CHP full-maintenance contract at 100 kWel (oil, spares, overhaul)", 0.026, "EUR/kWhel", "ESTIMATE", "ASUE BHKW-Kenndaten 2011 (biogas full maintenance) escalated by BHKW-Infozentrum data to 2023 (DBFZ/IEE 2024)", "LOW", { date: "2024-02-13" }),
  prov("eng.opex.chp_service_scale_exp", "CHP service cost scale exponent", -0.32, "—", "ESTIMATE", "Fit of 2.6 ct at 100 kW (ASUE 2011, escalated) to ≈ 1.0 ct at 1–10 MW (Danish Energy Agency, sheet 06, 2023)", "LOW", { date: "2023-08-23" }),
  prov("eng.opex.maintenance_share", "Maintenance of non-CHP plant", 0.02, "of CAPEX/a", "ESTIMATE", "IEE/DBFZ, EEG-Erfahrungsbericht Biomasse, 2023, §5.4: 2 % of initial investment", "MEDIUM", { date: "2023-08-18" }),
  prov("eng.opex.insurance_share", "Insurance", 0.005, "of CAPEX/a", "ESTIMATE", "IBKE, Leitfaden Rohbiogas-Sammelleitungen, 2024, Tab. 5: 0.5 % of investment", "MEDIUM", { date: "2024-11-30" }),
  prov("eng.opex.monitoring_fixed", "Lab tests, safety inspections, gas monitoring", 5000, "EUR/a", "ESTIMATE", JUDGEMENT("lab analyses and inspections"), "LOW", { date: REVIEWED }),
  prov("eng.opex.upgrade_maintenance_share", "Upgrading maintenance", 0.04, "of upgrading CAPEX/a", "ESTIMATE", "Danish Energy Agency, Renewable Fuels, sheet 91 (≈ 4.8 %); IBKE 2024 full maintenance ≈ 3.3 %", "MEDIUM", { date: "2023-06-30" }),
  prov("eng.opex.cng_haul_eur_nm3", "Bio-CNG road haulage to the offtaker (30–60 km)", 0.04, "EUR/Nm³", "ESTIMATE", JUDGEMENT("≈ 4 500 Nm³ per trailer trip at 150–200 €; haulier quotes needed"), "LOW", { date: REVIEWED }),
  prov("eng.opex.reject_share_food_waste", "Pre-treatment rejects, packaged food waste", 0.1, "of input mass", "ESTIMATE", "Huber UK via ADBA, 2025: depackaging rejects 7–12 % of food waste", "MEDIUM", { date: "2025-12-31" }),
  prov("eng.opex.reject_share_biowaste", "Pre-treatment rejects, municipal biowaste", 0.2, "of input mass", "ESTIMATE", "Alia / Comune di Prato, 2021: impurities 8–16 %, rejects ≈ 2×; DBFZ 2023 assumes 5 % in Germany", "MEDIUM", { date: "2021-12-31" }),
  prov("eng.opex.reject_disposal_eur_t", "Disposal of pre-treatment rejects (incineration / landfill)", 100, "EUR/t", "ESTIMATE", "IEE/DBFZ, EEG-Erfahrungsbericht Biomasse, 2023, Tab. 5-6: incineration 100 €/t (DE); use local gate fee", "MEDIUM", { date: "2023-08-18" }),
  prov("eng.opex.certification_eur_nm3", "Certification, trading, balancing for biomethane", 0.03, "EUR/Nm³", "ESTIMATE", "IBKE, Leitfaden Rohbiogas-Sammelleitungen, 2024, Tab. 5: ≈ 0.01–0.02 €/Nm³ + trading fees", "LOW", { date: "2024-11-30" }),

  // --- fertiliser / digestate agronomy ---
  prov("eng.nitrates_limit_kg_n_ha", "N application ceiling from organic fertiliser", 170, "kgN/ha·a", "FACT", "Nitrates Directive 91/676/EEC, Annex III(2); UA alignment pending", "HIGH", { date: "1991-12-12" }),
  prov("eng.digestate_n_gain_own_manure", "Extra plant-available N from digesting own manure", 0.15, "of total N", "ESTIMATE", "Möller & Müller, Eng. Life Sci. 12 (2012): digestion raises the NH₄ share (10–25 %)", "LOW", { date: "2012-12-31" }),
  prov("eng.digestate_n_credit_imported", "Substitution credit for nutrients in imported waste", 0.6, "of total N", "ESTIMATE", "Düngeverordnung 2017 (2020), Anlage 3: liquid digestate 60 % N efficiency", "MEDIUM", { date: "2020-04-28" }),
  prov("eng.digestate_pk_credit_imported", "Substitution credit for P, K in imported waste", 0.5, "of total", "ESTIMATE", "AHDB Nutrient Management Guide (RB209), Section 2: P ≈ 50–60 %, K ≈ 80–90 % in year 1", "LOW", { date: "2023-12-31" }),

  // --- safety / thresholds used by scoring ---
  prov("eng.methane_loss_good", "Methane loss share considered good practice", 0.02, "of production", "ASSUMPTION", "IEA Bioenergy Task 37, Methane emissions from biogas plants, 2017, pp. 41–44", "MEDIUM", { date: "2017-12-31" }),
  prov("eng.methane_loss_high", "Methane loss share that cancels most climate benefit", 0.05, "of production", "ASSUMPTION", "IEA Bioenergy Task 37, 2017, pp. 41–44 (biowaste plants lose the benefit at ≈ 3.5–5.5 %)", "MEDIUM", { date: "2017-12-31" }),
  prov("eng.dry_digestion_dm_pct", "DM above which high-solids digestion is considered", 22, "%", "ASSUMPTION", `${FNR10}, §3.1.1, p. 33; Table 8.4 (wet ≤ 12 % in digester; dry 20–30 % feed)`, "MEDIUM", { date: FNR10_DATE }),
  prov("eng.wet_solids_feeding_dm_pct", "DM above which a solids feeder / recirculation is needed", 12, "%", "ASSUMPTION", `${FNR10}, §2.2.1, p. 23 (pumpable up to ≈ 12 % DM)`, "MEDIUM", { date: FNR10_DATE }),

  // --- uncertainty bands used only by the Monte Carlo (never by the verdict) ---
  prov("eng.unc_catalogue_solids", "Relative band of catalogue DM × VS when the client gives no measured value", 0.2, "± share", "ESTIMATE", "IPCC 2006 GL Vol. 4 §10.4.4: Tier 2 manure CH₄ factors, built from VS excretion and B0, carry ±20 %; applied here to catalogue DM × VS only (B0 has its own catalogue range)", "LOW", { date: "2006-12-31" }),
  prov("eng.unc_lab_bmp", "Relative band of a laboratory BMP value", 0.08, "± share", "ESTIMATE", "Hafner et al. 2020, Water 12(6):1752: between-laboratory RSD < 8 % when validation criteria are met (7.5–24 % without them)", "MEDIUM", { date: "2020-06-18" }),
  ...GHG_PARAMS,
];

export const ENGINEERING_MAP = toMap(ENGINEERING_PARAMS);

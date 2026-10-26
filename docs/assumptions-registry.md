# Реєстр припущень (згенеровано)

> Файл генерується командою `npm run docs:registry` з `src/core/engineeringParams.ts`, `src/countries/ua.ts` та `src/core/scenarios.ts`. **Не редагуйте вручну.**
> Тип: FACT — прочитано в джерелі; ASSUMPTION — рішення команди; ESTIMATE — наближена оцінка, яку треба перевірити; CALCULATION — похідне.

Всього параметрів: 158. Довіра LOW: 95, MEDIUM: 53, HIGH: 10.

## Фізика та процес (46)

| id | Параметр | Значення | Одиниця | Тип | Довіра | Джерело | Країна | Дата |
|---|---|---:|---|---|---|---|---|---|
| `eng.ch4_lhv_kwh_m3` | Lower heating value of methane | 9.97 | kWh/Nm³ CH₄ | FACT | HIGH | FNR, Biogas Basisdaten Deutschland (2008) — read in full | GLOBAL | 2008-12-31 |
| `eng.gwp_ch4` | Global warming potential of biogenic CH₄ (100 y) | 27 | kgCO₂e/kgCH₄ | FACT | HIGH | IPCC AR6 WGIII Annex II, Table 9 (biogenic CH₄) | GLOBAL | 2022-04-04 |
| `eng.ch4_density_kg_m3` | Methane density at 0 °C, 1 atm | 0.717 | kg/m³ | FACT | HIGH | Physical constant | GLOBAL | 2026-10-23 |
| `eng.co2_density_kg_m3` | Dry CO₂ density at 0 °C, 1 atm | 1.963 | kg/Nm³ | FACT | HIGH | 44.010 kg/kmol (NIST) ÷ 22.414 Nm³/kmol | GLOBAL | 2026-10-23 |
| `eng.gas_emission_factor_t_mwh` | Natural-gas combustion emission factor | 0.202 | tCO₂/MWh | FACT | HIGH | IPCC default 56.1 kgCO₂/GJ | GLOBAL | 2026-10-23 |
| `eng.natgas_lhv_kwh_m3` | Natural gas lower heating value | 9.5 | kWh/m³ | ASSUMPTION | MEDIUM | Typical pipeline gas; invoice value may differ | GLOBAL | 2026-10-23 |
| `eng.rampup_year1` | Year-1 output share (biological start-up) | 0.75 | — | ASSUMPTION | MEDIUM | Typical commissioning curve 3–6 months | GLOBAL | 2026-10-23 |
| `eng.digester_temp_c` | Mesophilic digester temperature | 38 | °C | ASSUMPTION | HIGH | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.cp_substrate_kj_kgk` | Specific heat of substrate | 3.9 | kJ/(kg·K) | ESTIMATE | MEDIUM | Water 4.18, solids ≈1.5, weighted for 8–25 % DM | GLOBAL | 2026-10-23 |
| `eng.digester_u_value_w_m2k` | Insulated digester wall/roof U-value | 0.35 | W/(m²·K) | ESTIMATE | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data — 10 cm mineral wool / equivalent; poor insulation is a main cause of high winter heat demand | GLOBAL | 2026-10-23 |
| `eng.digester_floor_u_value_w_m2k` | Digester floor U-value (to ground) | 0.5 | W/(m²·K) | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.digester_h_over_d` | Digester height/diameter | 0.45 | — | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.headspace_factor` | Total/working volume (gas holder, freeboard) | 1.15 | — | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.hrt_manure_days` | Hydraulic retention time, manure-dominated feed | 35 | d | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data — Mesophilic CSTR on cattle/pig slurry typically 30–40 d | GLOBAL | 2026-10-23 |
| `eng.hrt_mixed_days` | Hydraulic retention time, manure + co-substrates | 30 | d | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.hrt_waste_days` | Hydraulic retention time, easily degradable waste | 25 | d | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.hrt_high_rate_days` | Hydraulic retention time, high-rate reactor (UASB/EGSB) on dilute effluent | 6 | d | ASSUMPTION | LOW | Industrial practice for vinasse/dairy effluent: 2–10 d | GLOBAL | 2026-10-23 |
| `eng.olr_high_rate_kgvs_m3d` | Max organic loading rate, high-rate reactor | 8 | kgVS/(m³·d) | ASSUMPTION | LOW | UASB/EGSB on soluble COD: 5–20 kgCOD/(m³·d); VS-basis conservative | GLOBAL | 2026-10-23 |
| `eng.hrt_lagoon_days` | Hydraulic retention time, covered lagoon (warm climate) | 40 | d | ASSUMPTION | LOW | Covered lagoons for POME / pig slurry: 30–60 d | GLOBAL | 2026-10-23 |
| `eng.olr_lagoon_kgvs_m3d` | Max organic loading rate, covered lagoon | 1 | kgVS/(m³·d) | ASSUMPTION | LOW | Low-rate unmixed lagoon | GLOBAL | 2026-10-23 |
| `eng.olr_max_kgvs_m3d` | Max organic loading rate, mesophilic CSTR | 3.5 | kgVS/(m³·d) | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data — Hard cap used for digester volume; poultry/fat-rich mixes use a lower cap | GLOBAL | 2026-10-23 |
| `eng.olr_max_poultry_kgvs_m3d` | Max OLR when poultry/fat > 35 % of VS | 2.5 | kgVS/(m³·d) | ASSUMPTION | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.storage_months` | Gas-tight digestate storage required | 6 | months | ASSUMPTION | MEDIUM | Typical agronomic closed-season requirement; to be set by local law | GLOBAL | 2026-10-23 |
| `eng.parasitic_base_kwh_t` | Plant electricity use, base | 3 | kWh/t FM | ESTIMATE | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.parasitic_dm_kwh_t_per_pct` | Plant electricity use per % DM of mix | 0.15 | kWh/t FM per %DM | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.pasteurisation_temp_c` | ABP pasteurisation temperature used in screening | 70 | °C | ASSUMPTION | MEDIUM | EU Regulation 142/2011 Annex V (consolidated 2025-10-29): 70 °C for 60 min for applicable Cat. 3 streams; exemptions and non-EU rules require review | GLOBAL | 2026-10-23 |
| `eng.pasteurisation_heat_recovery` | Heat recovery from ABP pasteurisation before mesophilic digestion | 0.6 | — | ASSUMPTION | LOW | Pre-FEED plate heat exchanger allowance; requires supplier heat balance | GLOBAL | 2026-10-23 |
| `eng.digestate_n_retention` | Share of feed nitrogen retained in digestate | 0.85 | — | ESTIMATE | MEDIUM | NH₃ and storage losses 10–20 % | GLOBAL | 2026-10-23 |
| `eng.self_consumption_coincidence` | Share of customer electricity load coinciding with biogas generation | 0.85 | — | ASSUMPTION | LOW | Biogas CHP runs ≈24/7; barn/cooling/process loads are largely continuous. Without a load profile this is a guess | GLOBAL | 2026-10-23 |
| `eng.poultry_inhib_threshold` | Poultry share of VS above which NH₃ inhibition starts | 0.35 | — | ESTIMATE | LOW | Ammonia inhibition literature, typical 3 g NH₄-N/L | GLOBAL | 2026-10-23 |
| `eng.poultry_inhib_loss_per_10pct` | Yield loss per 10 pp poultry VS above threshold | 0.04 | — | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.fat_share_warning` | Fat/grease share of VS above which overload risk | 0.25 | — | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.boiler_efficiency` | Biogas boiler efficiency | 0.9 | — | ASSUMPTION | HIGH | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.upgrade_slip_share` | CH₄ slip in membrane upgrading | 0.007 | — | ESTIMATE | LOW | Literature 0.1–1 %; membranes toward the top of the range | GLOBAL | 2026-10-23 |
| `eng.biomethane_ch4_purity` | CH₄ content of biomethane | 0.97 | — | ASSUMPTION | HIGH | Grid-injection quality | GLOBAL | 2026-10-23 |
| `eng.upgrade_kwh_per_nm3_raw` | Electricity for upgrading + compression | 0.3 | kWh/Nm³ raw biogas | ESTIMATE | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.cng_compression_kwh_nm3` | Additional compression of biomethane to ~250 bar for road CNG | 0.15 | kWh/Nm³ biomethane | ESTIMATE | LOW | Burckhardt Compression CNG compressor technical sheet (2022), 12–19 bar suction to 251 bar discharge: ~0.13–0.16 kWh/Nm³ shaft power; electrical input and low suction pressure may raise it | GLOBAL | 2026-10-23 |
| `eng.upgrade_min_nm3h` | Raw-biogas flow below which biomethane is flagged as sub-scale | 60 | Nm³/h | ASSUMPTION | MEDIUM | EBA: average EU biomethane plant 483 m³/h; operating UA plants start at ~3 Mm³/a (≈400 Nm³/h) | GLOBAL | 2026-10-23 |
| `eng.nitrates_limit_kg_n_ha` | N application ceiling from organic fertiliser | 170 | kgN/ha·a | ASSUMPTION | MEDIUM | EU Nitrates Directive 91/676/EEC; UA alignment pending (EU accession) | GLOBAL | 2026-10-23 |
| `eng.digestate_n_gain_own_manure` | Extra plant-available N from digesting own manure | 0.15 | of total N | ESTIMATE | LOW | Digestion raises NH₄ share; literature 10–25 % | GLOBAL | 2026-10-23 |
| `eng.digestate_n_credit_imported` | Substitution credit for nutrients in imported waste | 0.6 | of total N | ESTIMATE | LOW | Mineral fertiliser replacement value of organic N | GLOBAL | 2026-10-23 |
| `eng.digestate_pk_credit_imported` | Substitution credit for P, K in imported waste | 0.5 | of total | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.methane_loss_good` | Methane loss share considered good practice | 0.02 | of production | ASSUMPTION | MEDIUM | DK/DE campaign mean ≈2.0 % (IEA Task 37 2017 summary) | GLOBAL | 2026-10-23 |
| `eng.methane_loss_high` | Methane loss share that cancels most climate benefit | 0.05 | of production | ASSUMPTION | LOW | Derived: see docs/economics.md §9 | GLOBAL | 2026-10-23 |
| `eng.dry_digestion_dm_pct` | DM above which high-solids digestion is considered | 22 | % | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.wet_solids_feeding_dm_pct` | DM above which a solids feeder / recirculation is needed | 12 | % | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |

## Когенерація (10)

| id | Параметр | Значення | Одиниця | Тип | Довіра | Джерело | Країна | Дата |
|---|---|---:|---|---|---|---|---|---|
| `eng.chp_eta_el_25` | CHP electrical efficiency at 25 kW | 0.29 | — | ESTIMATE | MEDIUM | Typical gas engine data sheets (FNR 2008 range 30–40 %) | GLOBAL | 2026-10-23 |
| `eng.chp_eta_el_50` | CHP electrical efficiency at 50 kW | 0.33 | — | ESTIMATE | MEDIUM | Typical gas engine data sheets | GLOBAL | 2026-10-23 |
| `eng.chp_eta_el_100` | CHP electrical efficiency at 100 kW | 0.36 | — | ESTIMATE | MEDIUM | Typical gas engine data sheets | GLOBAL | 2026-10-23 |
| `eng.chp_eta_el_250` | CHP electrical efficiency at 250 kW | 0.39 | — | ESTIMATE | MEDIUM | Typical gas engine data sheets | GLOBAL | 2026-10-23 |
| `eng.chp_eta_el_500` | CHP electrical efficiency at 500 kW | 0.41 | — | ESTIMATE | MEDIUM | Typical gas engine data sheets | GLOBAL | 2026-10-23 |
| `eng.chp_eta_total` | CHP total efficiency (el + th) | 0.85 | — | ESTIMATE | MEDIUM | FNR, Biogas Basisdaten Deutschland (2008) — read in full (≈85 %); supplier heat and power guarantees needed | GLOBAL | 2008-12-31 |
| `eng.chp_heat_recovery` | Share of CHP thermal output recoverable to a heating circuit | 0.92 | — | ESTIMATE | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.chp_design_hours` | CHP design full-load hours | 8000 | h/a | ASSUMPTION | MEDIUM | FNR, Biogas Basisdaten Deutschland (2008) — read in full (7 500–8 000 h); availability differs by service contract | GLOBAL | 2008-12-31 |
| `eng.chp_min_kw` | Smallest CHP the model treats as technically sensible | 25 | kWel | ASSUMPTION | MEDIUM | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data — Below this, CHP is a hobby-scale installation; model returns NOT RECOMMENDED unless another route works | GLOBAL | 2026-10-23 |
| `eng.chp_slip_share` | Unburned CH₄ (methane slip) in CHP exhaust | 0.01 | — | ESTIMATE | LOW | Literature: 0.5–2 % of CH₄ fed to engine | GLOBAL | 2026-10-23 |

## CAPEX (база ЄС, 2025 EUR) (32)

| id | Параметр | Значення | Одиниця | Тип | Довіра | Джерело | Країна | Дата |
|---|---|---:|---|---|---|---|---|---|
| `eng.capex.digester_eur_m3_1000` | Digester tank incl. insulation, mixers, heating, membrane roof, at 1 000 m³ | 190 | EUR/m³ working | ESTIMATE | LOW | Market check 2026-10: German component data (fermenter 500–1 200 m³ ≈ €80–100k, 2012) inflated ≈ +40 % (DBFZ/Fraunhofer for BMWK 2024) → €120–200/m³; set at the upper end. See docs/capex-benchmark.md — Scales as V^-0.2; replace with 3–5 supplier quotations | GLOBAL | 2026-10-23 |
| `eng.capex.digester_scale_exp` | Digester unit-cost scale exponent | -0.2 | — | ASSUMPTION | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.lagoon_eur_m3` | Covered anaerobic lagoon (liner, HDPE gas-tight cover, gas collection) | 30 | EUR/m³ | ESTIMATE | LOW | Order of magnitude from POME/swine lagoon projects (SE Asia, Latin America); TO VERIFY | GLOBAL | 2026-10-23 |
| `eng.capex.high_rate_eur_m3` | High-rate reactor (UASB/EGSB) incl. equalisation | 650 | EUR/m³ working | ESTIMATE | LOW | Industrial anaerobic wastewater reactors; TO VERIFY with supplier quotes | GLOBAL | 2026-10-23 |
| `eng.capex.cover_existing_eur_m3` | Gas-tight cover on an existing lagoon/tank | 12 | EUR/m³ | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.storage_new_eur_m3` | New gas-tight covered digestate storage | 45 | EUR/m³ | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.chp_eur_kw_100` | CHP unit incl. installation at 100 kWel | 1500 | EUR/kWel | ESTIMATE | LOW | FNR 2008: 560–900 EUR/kWel (150–500 kW), inflated ≈ ×1.8 to 2025 | GLOBAL | 2026-10-23 |
| `eng.capex.chp_scale_exp` | CHP unit-cost scale exponent | -0.25 | — | ASSUMPTION | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.gas_system_fixed` | Gas holder, flare, desulphurisation: fixed part | 30000 | EUR | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.gas_system_per_nm3h` | Gas system variable part | 40 | EUR per Nm³/h raw biogas | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.feed_slurry` | Slurry pit, pumps, pipework | 25000 | EUR | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.feed_solids` | Solids feeder / hopper | 70000 | EUR | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.reception_waste` | Waste reception, crushing, buffer tank | 60000 | EUR | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.pretreatment_eur_per_tpa` | Depackaging / sorting line and enclosed reception for contaminated waste | 45 | EUR per t/a | ESTIMATE | LOW | Order of magnitude for biowaste / food-waste AD reception halls; TO VERIFY | GLOBAL | 2026-10-23 |
| `eng.capex.pasteurisation_fixed` | Pasteurisation (70 °C / 1 h) unit, fixed | 70000 | EUR | ESTIMATE | LOW | EU 142/2011 category 3 treatment; supplier data needed | GLOBAL | 2026-10-23 |
| `eng.capex.pasteurisation_per_tday` | Pasteurisation unit, variable | 1800 | EUR per t/d | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.heat_network_fixed` | Heat exchangers / pipes to consumer, fixed | 25000 | EUR | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.heat_network_per_kw` | Heat network variable | 100 | EUR/kWth | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.boiler_eur_kw` | Biogas boiler incl. installation | 90 | EUR/kWth | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.electrical_share` | Electrical, I&C, SCADA | 0.06 | of equipment | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.piping_share` | Gas/substrate piping | 0.04 | of equipment | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.civil_share` | Civil works, roads, fencing | 0.06 | of equipment | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.engineering_share` | Engineering, permits, EIA, commissioning | 0.08 | of subtotal | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.contingency_share` | Contingency | 0.1 | of subtotal | ASSUMPTION | MEDIUM | Typical for pre-FEED estimates (±30 %) | GLOBAL | 2026-10-23 |
| `eng.capex.grid_connection_fixed` | Electrical grid connection (behind the meter / small export) | 20000 | EUR | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.grid_connection_per_kw` | Grid connection variable | 60 | EUR/kWel | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.upgrade_ref_eur` | Membrane upgrading unit at 250 Nm³/h raw biogas (incl. compression) | 900000 | EUR | ESTIMATE | LOW | Market check 2026-10: reviews and vendors give 2 500–3 500 EUR per Nm³/h at 250–700 Nm³/h (≈ 3 600 EUR per Nm³/h here incl. small-scale premium); see docs/capex-benchmark.md | GLOBAL | 2026-10-23 |
| `eng.capex.upgrade_scale_exp` | Upgrading scale exponent | 0.65 | — | ASSUMPTION | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.injection_fixed` | Compression, metering, injection station | 350000 | EUR | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.capex.cng_fixed` | Bio-CNG off-grid offtake: filling post + 3–4 cascade trailers (≈ 4 000–5 000 Nm³ each) | 450000 | EUR | ESTIMATE | LOW | Virtual-pipeline practice (IEA Bioenergy Task 37; SATAT CBG plants in India; Brazilian bio-GNV); TO VERIFY with supplier quotes | GLOBAL | 2026-10-23 |
| `eng.capex.cng_per_nm3h` | Bio-CNG high-pressure (250 bar) compression | 1000 | EUR per Nm³/h biomethane | ESTIMATE | LOW | Reciprocating CNG compressors 100–1 000 Nm³/h; TO VERIFY | GLOBAL | 2026-10-23 |
| `eng.capex.pipeline_eur_km` | Pipeline to gas main | 200000 | EUR/km | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |

## OPEX (9)

| id | Параметр | Значення | Одиниця | Тип | Довіра | Джерело | Країна | Дата |
|---|---|---:|---|---|---|---|---|---|
| `eng.opex.labour_min_hours` | Minimum operator time | 750 | h/a | ASSUMPTION | MEDIUM | FNR 2008: 3–7 h/(kWel·a); ≈ 2 h/day floor for small farm plants (revised 2026-10 from 1 400 h) | GLOBAL | 2026-10-23 |
| `eng.opex.labour_hours_per_kw` | Operator time per kWel | 5 | h/(kWel·a) | ESTIMATE | LOW | FNR, Biogas Basisdaten Deutschland (2008) — read in full (3–7); current staffing plan needed | GLOBAL | 2008-12-31 |
| `eng.opex.chp_service_eur_kwh` | CHP service + oil + spare parts | 0.022 | EUR/kWhel | ESTIMATE | LOW | Typical 1.5–2.5 ct/kWh | GLOBAL | 2026-10-23 |
| `eng.opex.maintenance_share` | Maintenance of non-CHP plant | 0.02 | of CAPEX/a | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.opex.insurance_share` | Insurance | 0.005 | of CAPEX/a | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.opex.monitoring_fixed` | Lab tests, safety inspections, gas monitoring | 5000 | EUR/a | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.opex.upgrade_maintenance_share` | Upgrading maintenance | 0.04 | of upgrading CAPEX/a | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |
| `eng.opex.cng_haul_eur_nm3` | Bio-CNG road haulage to the offtaker (30–60 km) | 0.04 | EUR/Nm³ | ESTIMATE | LOW | Cascade trailer ≈ 4 500 Nm³ per trip, ≈ 150–200 € per round trip incl. driver; TO VERIFY with hauliers | GLOBAL | 2026-10-23 |
| `eng.opex.certification_eur_nm3` | Certification, trading, balancing for biomethane | 0.03 | EUR/Nm³ | ESTIMATE | LOW | Engineering judgement, typical ranges (IEA Bioenergy Task 37 / FNR / KTBL); TO VERIFY with supplier data | GLOBAL | 2026-10-23 |

## Ринок країни: Україна (28)

| id | Параметр | Значення | Одиниця | Тип | Довіра | Джерело | Країна | Дата |
|---|---|---:|---|---|---|---|---|---|
| `econ.fx_local_per_eur` | Exchange rate | 47.093 | UAH/EUR | FACT | HIGH | Eurostat ert_bil_eur_a, ECB reference rate, annual average 2025 | UA | 2025-12-31 |
| `econ.electricity_retail_eur_kwh` | Average all-in business electricity price excl. VAT (default if the customer gives none) | 0.17 | EUR/kWh | ESTIMATE | MEDIUM | Market operator day-ahead 5.5–6.9 k UAH/MWh (2025, GMK Center) + Ukrenergo transmission 713–928 UAH/MWh (2026) + distribution & supply; cross-checked with business invoices — Customer-supplied price always overrides | UA | 2026-08-01 |
| `econ.electricity_spot_eur_kwh` | Wholesale electricity price (market average) | 0.132 | EUR/kWh | ESTIMATE | MEDIUM | Day-ahead market average 2025 ≈ 6 200 UAH/MWh (GMK Center) ÷ 47.09 UAH/€ — press-reported, to be confirmed with the market operator | UA | 2025-12-31 |
| `econ.export_haircut` | Share of the wholesale price realised for surplus power | 0.7 | — | ASSUMPTION | MEDIUM | 30 % profile & balancing discount for a small seller (assumption) | UA | 2026-10-23 |
| `econ.self_consumption_variable_share` | Share of the bill actually avoided by self-generation | 0.85 | — | ASSUMPTION | MEDIUM | Capacity & fixed network charges are not avoided (≈ 10–20 % of a business bill, same rule as every market) | UA | 2026-10-23 |
| `econ.gas_price_eur_mwh` | Business natural-gas price | 46 | EUR/MWh | ESTIMATE | MEDIUM | Industrial gas ≈ $498/tcm (Dec 2025, GMK Center) incl. transmission | UA | 2025-12-31 |
| `econ.heat_value_eur_kwh_th` | Value of useful heat (displaced industrial gas / 0.9 boiler efficiency) | 0.0511 | EUR/kWh th | CALCULATION | MEDIUM | Business gas price ÷ 0.9 | UA | 2026-10-23 |
| `econ.biomethane_price_cons_eur_nm3` | Realised biomethane price, conservative (domestic gas, no premium) | 0.4 | EUR/Nm³ | ESTIMATE | LOW | IEA commentary 'From farms to fuel: Ukraine's biomethane opportunity' (2026): domestic gas ≈382 EUR/tcm before the Middle-East conflict | UA | 2026-10-23 |
| `econ.biomethane_price_base_eur_nm3` | Realised biomethane price, base (partly exported/certified) | 0.6 | EUR/Nm³ | ESTIMATE | LOW | IEA commentary 'From farms to fuel: Ukraine's biomethane opportunity' (2026): production cost ≈650 EUR/tcm; profitable price 800–900 | UA | 2026-10-23 |
| `econ.biomethane_price_opt_eur_nm3` | Realised biomethane price, optimistic (EU export with certificates) | 0.85 | EUR/Nm³ | ESTIMATE | LOW | IEA commentary 'From farms to fuel: Ukraine's biomethane opportunity' (2026): top EU markets up to 1 000 EUR/tcm | UA | 2026-10-23 |
| `econ.labour_official_eur_h` | Official hourly labour cost, economy-wide (wages + employer costs) | 4.3 | EUR/h | CALCULATION | MEDIUM | Derzhstat average wage 26.5 k UAH/month (Jul 2025) × 1.22 employer contributions ÷ 160 h ÷ 47.09 UAH/€ | UA | 2026-10-23 |
| `econ.operator_wage_ratio` | Plant operator wage relative to the economy-wide average | 1.14 | — | ASSUMPTION | MEDIUM | Skilled plant operator ≈ 30 k UAH/month gross vs the 26.5 k average → ≈ 4.9 €/h operator cost | UA | 2026-10-23 |
| `econ.transport_eur_tkm` | Road transport of liquid/solid organic feedstock | 0.11 | EUR/(t·km) | ESTIMATE | LOW | Tanker/tipper rate incl. empty return; diesel-driven; TO VERIFY with 3 hauliers | UA | 2026-10-23 |
| `econ.transport_fixed_eur_t` | Loading/unloading per tonne | 0.7 | EUR/t | CALCULATION | MEDIUM | 0.6 €/t pump & loader + 0.02 h/t × 4.9 €/h labour (same KTBL-based formula as every market) | UA | 2026-10-23 |
| `econ.capex_factor` | Local CAPEX relative to EU baseline | 0.85 | — | CALCULATION | MEDIUM | Calibrated on Ukrainian projects: with 0.85 the model is within +8 % of 320 kW and within the market band at 1.3 MW (docs/capex-benchmark.md); imported CHP/upgrading priced as EU, half of plant equipment local (IEA 2026) | UA | 2026-10-23 |
| `econ.discount_rate` | Discount rate (EUR-equivalent, incl. country & war risk) | 0.153 | — | CALCULATION | MEDIUM | 6.0 % mature-market project WACC + 0.6 × country risk premium 15.54 % (Ca; Damodaran, Country Default Spreads and Risk Premiums (ctryprem.xlsx, update of 2026-01-05, ratings 2026-02-16)) | UA | 2026-02-16 |
| `econ.energy_escalation` | Annual real escalation of energy prices (EUR terms) | 0.02 | — | ASSUMPTION | MEDIUM | Conservative; UAH price rises offset by depreciation (EUR terms) | UA | 2026-10-23 |
| `econ.opex_escalation` | Annual escalation of operating costs (EUR terms) | 0.03 | — | ASSUMPTION | MEDIUM | Wage growth > CPI in UA (NBU inflation report) | UA | 2026-10-23 |
| `econ.horizon_years` | Evaluation horizon | 15 | a | ASSUMPTION | MEDIUM | Shorter than the 20-y technical life — conservative | UA | 2026-10-23 |
| `econ.debt_share` | Debt share for DSCR test | 0.5 | — | ASSUMPTION | MEDIUM | Typical EBRD/IFI-style lending for agrifood | UA | 2026-10-23 |
| `econ.debt_interest` | Debt interest rate (EUR) | 0.1 | — | FACT | MEDIUM | EBRD / IFC-backed agri-food credit lines in Ukraine 8–11 % (2025–2026 programmes) | UA | 2026-10-23 |
| `econ.debt_tenor_years` | Debt tenor | 7 | a | ASSUMPTION | MEDIUM | Typical for agri/energy credit lines (EBRD, IFC, EIB programmes) | UA | 2026-10-23 |
| `econ.fert_n_eur_kg` | Mineral nitrogen price | 1.32 | EUR/kg N | CALCULATION | MEDIUM | World Bank Commodity Price Data (Pink Sheet), monthly, 2025M10–2026M09; urea (Middle East), TSP (US Gulf), KCl (Brazil); nutrient content → €/kg × 1.35 farm-gate markup | UA | 2026-09-28 |
| `econ.fert_p2o5_eur_kg` | Mineral phosphorus price | 1.66 | EUR/kg P₂O₅ | CALCULATION | MEDIUM | World Bank Commodity Price Data (Pink Sheet), monthly, 2025M10–2026M09; urea (Middle East), TSP (US Gulf), KCl (Brazil); nutrient content → €/kg × 1.35 farm-gate markup | UA | 2026-09-28 |
| `econ.fert_k2o_eur_kg` | Mineral potassium price | 0.75 | EUR/kg K₂O | CALCULATION | MEDIUM | World Bank Commodity Price Data (Pink Sheet), monthly, 2025M10–2026M09; urea (Middle East), TSP (US Gulf), KCl (Brazil); nutrient content → €/kg × 1.35 farm-gate markup | UA | 2026-09-28 |
| `econ.digestate_handling_eur_t` | Incremental digestate handling on adequate land | 1.6 | EUR/t | CALCULATION | MEDIUM | 1.2 €/t machinery + 0.08 h/t × 4.9 €/h labour (same formula as every market) | UA | 2026-10-23 |
| `econ.digestate_excess_eur_t` | Digestate that has no adequate land | 3.6 | EUR/t | CALCULATION | MEDIUM | 2.5 €/t + 0.22 h/t × 4.9 €/h labour (same formula as every market) | UA | 2026-10-23 |
| `econ.grid_ef_t_mwh` | Grid emission factor | 0.25 | tCO₂/MWh | FACT | HIGH | Ember via Our World in Data, carbon intensity of electricity generation (lifecycle-free, gCO2/kWh), 2022 | UA | 2022-12-31 |

## Сценарії (33)

| id | Параметр | Значення | Одиниця | Тип | Довіра | Джерело | Країна | Дата |
|---|---|---:|---|---|---|---|---|---|
| `scn.conservative.yieldBlend` | Консервативний: yieldBlend | -0.5 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.processRealisation` | Консервативний: processRealisation | 0.85 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.capexMult` | Консервативний: capexMult | 1.2 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.opexMult` | Консервативний: opexMult | 1.15 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.energyPriceMult` | Консервативний: energyPriceMult | 0.85 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.heatUtilisation` | Консервативний: heatUtilisation | 0.6 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.chpHours` | Консервативний: chpHours | 7200 | h/a | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.leakShare` | Консервативний: leakShare | 0.03 | of CH₄ production | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.digestateValueFactor` | Консервативний: digestateValueFactor | 0.5 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.disposalRealisation` | Консервативний: disposalRealisation | 0.8 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.conservative.feedstockAvailability` | Консервативний: feedstockAvailability | 0.9 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.yieldBlend` | Базовий: yieldBlend | 0 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.processRealisation` | Базовий: processRealisation | 0.9 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.capexMult` | Базовий: capexMult | 1 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.opexMult` | Базовий: opexMult | 1 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.energyPriceMult` | Базовий: energyPriceMult | 1 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.heatUtilisation` | Базовий: heatUtilisation | 0.8 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.chpHours` | Базовий: chpHours | 7800 | h/a | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.leakShare` | Базовий: leakShare | 0.015 | of CH₄ production | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.digestateValueFactor` | Базовий: digestateValueFactor | 0.7 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.disposalRealisation` | Базовий: disposalRealisation | 0.95 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.base.feedstockAvailability` | Базовий: feedstockAvailability | 1 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.yieldBlend` | Оптимістичний: yieldBlend | 0.5 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.processRealisation` | Оптимістичний: processRealisation | 0.95 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.capexMult` | Оптимістичний: capexMult | 0.9 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.opexMult` | Оптимістичний: opexMult | 0.95 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.energyPriceMult` | Оптимістичний: energyPriceMult | 1.1 | × | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.heatUtilisation` | Оптимістичний: heatUtilisation | 0.95 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.chpHours` | Оптимістичний: chpHours | 8200 | h/a | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.leakShare` | Оптимістичний: leakShare | 0.005 | of CH₄ production | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.digestateValueFactor` | Оптимістичний: digestateValueFactor | 0.85 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.disposalRealisation` | Оптимістичний: disposalRealisation | 1 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |
| `scn.optimistic.feedstockAvailability` | Оптимістичний: feedstockAvailability | 1 | — | ASSUMPTION | LOW | Project-team scenario design; spread intentionally wider than expected error | GLOBAL | 2026-10-23 |

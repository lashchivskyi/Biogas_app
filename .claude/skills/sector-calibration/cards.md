# Sector cluster cards

Model state as of 2026-11-05 (values from `src/core/feedstockData.ts`, `businesses.ts`, `engineeringParams.ts`; re-read
the code, it wins). Run order: 0 → K → W → G → F → M → S. Each card also lists the countries whose adapters must be checked. Each card: sectors · state · gaps · data · references · countries · ✅.

## 0 · Architecture: evidence matrix, transfer rule, adapters, macro check, other_industry (run first)
- Sources mapped: Eurostat nrg_cb_rw (R5311/R5312/R5319, IPRD, TJ), DUKES 6.1, UNSD EDATA, SENER (DATA-SOURCES).
- Matrix: in `scripts/scorecard.ts` (+ /methodology summary) a derived `SECTOR_IDS` × country table with status V / T / D / G
  (SKILL.md), n, holdout share, median ratio, the reference sets behind each cell. Unit test the derivation rules.
- Transfer rule as code: a cell is T only if the feedstock+technology is V elsewhere, every adapter the sector needs is
  sourced in that country, and the macro check is 0.75–1.25. Widen that cell's scenario band by its LOW adapters.
- Adapters missing today (add with sources, tests, client override): plant availability / gas actually used by country
  practice (explains the US AgSTAR gap; needs operator statistics, not a fudge factor); site altitude → engine derating
  (manufacturer derating curves are vendor data: use a standard such as ISO 3046-1 or a peer-reviewed source); 60 Hz
  engine catalogue (today a warning only); typical technology per country (lagoon vs tank).
- Macro check: official national biogas production by origin (landfill / sewage / other AD) vs the model on official
  activity data; start with EU (Eurostat) and countries with a national series (see DATA-SOURCES › Validation sources).
  Sweden (`se-biogas-statistics.json`, A1s 0.90) is the template.
- `other_industry`: check which streams land here (analytics, no PII); promote frequent ones to sectors; tests: full client
  data passes all checks, partial data gives INSUFFICIENT_DATA. Stays 🟡 by design.
- ✅: matrix + transfer rule + macro check live in the scorecard with tests; adapters listed per country with status.

## K · Key client inputs early in the calculator (after 0)
- State: EVPI ranking exists (`measureFirst`, `src/core/uncertainty.ts`, assess.ts) but only in the paid result; the CAPEX
  quote, O&M contract, heat buyer price, gate fee and lab values sit in step 4 behind "refine" or in collapsed details.
- Build: a "3 numbers that change your result most" block, chosen per project from the live estimate by EVPI (fallback:
  per-sector default list), each linking to its field, showing how the NPV range narrows once filled. Free tier keeps
  only names, not amounts (DECISIONS: paid = how far and how sure). Texts in 25 languages; report-consistency and
  logic-audit tests stay green; no new money on the live panel (DECISIONS 2026-11-02).
- ✅: block shown for every sector; ranking test; usability check that a first-time client finds and fills the top input.

## W · Industrial wastewater: starch_processor, pulp_paper, palm_oil_mill, sugar_ethanol, dairy_processor (wastewater)
- State: wastewater costs are modelled for blank fields (`MODELLED_KINDS`, LOW, no STRONG); starch presets done
  (`src/core/wastewaterPresets.ts`: potato, cereal, cassava). `eng.capex.high_rate_eur_m3` 650 (judgement, LOW);
  `eng.capex.lagoon_eur_m3` 30 (CDFA via Haas 2024, LOW). No presets yet for pulp, POME, vinasse, dairy wastewater; palm
  `pome` (LOW) and sugar `vinasse` / `press_mud` (LOW) still entered as digester feed. Sulphate → H₂S not modelled.
- Sources mapped: EPA GHGRP Subpart II (validation first), CDM PA/PoA index + browser-only monitoring reports (TH/MY/ID).
- Gaps: dated (≥ 2024) UASB/EGSB/IC and covered-lagoon CAPEX/OPEX curve; presets per t product (m³, kg COD, sulphate);
  POME and vinasse as wastewater; cassava cyanide, vinasse/pulp sulphate, pulp calcium; whey acidification and DAF fat
  sludge (dairy, LOW).
- Data: EU BREF Food, Drink and Milk (2019) and Pulp, Paper and Board (2015) for m³ and COD per t; MPOB, Malaysian DOE,
  Indonesia ESDM (POME); EPE, CETESB P4.231, CIBiogás, UNICA (vinasse, season); Thailand DEDE/EPPO (cassava starch);
  CDM ACM0014 / AMS-III.H, IPCC 2019 Vol 5 Ch 6 (methane method); CAPEX ≥ 2024 from official programmes, issuer filings or
  studies with stated scope (CDM documents only for engineering quantities, not cost).
- References: UNFCCC CDM monitoring reports (measured biogas/CH₄ with COD and flow, plant level) for starch, POME,
  vinasse; EIA-923 industrial biogas plants; published UASB plants with stated cost.
- Countries: TH, MY, ID, BR, IN, DE, PL, NL, FI, SE.
- Adapters: ambient temperature for unheated lagoons (tropics), typical reactor per country, 60 Hz engines (BR, MX, US),
  altitude (MX), discharge limits that force post-treatment.
- ✅: modelled wastewater costs for blank fields (shown to the client, LOW/MEDIUM); presets for each sector; sulphate
  check; A1 for COD → CH₄ on ≥ 10 monitored plants; A3 on ≥ 5 cost references.

## G · Existing gas streams: wastewater_treatment, landfill_operator
- Sources mapped: GHGRP Subpart HH + LMOP (landfill, start here); Eurostat R5312 ÷ env_ww_spd, Destatis Klärgas, EEA UWWTD (sewage).
- State WWTP: `sewage_sludge` MEDIUM (DM 5, BMP 200–270–320); routes ad / residue / gas; `eng.chp_sewage_site_factor`;
  A1h AMBER (13 EIA plants); A1w GREY. Primary vs secondary sludge not split; no population-equivalent preset; no
  upgrade CAPEX for an existing digester.
- State landfill: first-order decay, k and L0 from the client; A1l RED (median 1.26 at 50 % collection, n 142, LMOP 2022);
  no collection-system CAPEX/OPEX; `eng.chp_landfill_site_factor` 0.80. STATUS: waste by year, k by precipitation.
- Data: UBA, DWA, Eurostat UWWTD (sludge per PE, sludge split, BMP); Destatis Klärgas by Land; EPA CHP Partnership;
  AP-42 §2.4 and IPCC 2006 Vol 5 Ch 3 (k by climate); EPA LFGcost-Web (version and date) and LMOP for costs.
- References: Destatis Klärgas vs PE served (A1w), EIA-923/860 sewage plants, LMOP projects with waste-in-place.
- Countries: DE, US, SE, UK, PL, IT, FR.
- Adapters: plant availability and collection practice per country, k by climate/precipitation, 60 Hz (US, CA),
  sludge per PE by national sewerage practice.
- ✅: A1w ≥ 80 % within ±25 % (n ≥ 10) or GREY with dated reason; A1l holdout median 0.75–1.25; modelled collection and
  upgrade costs for blank fields.

## F · Food waste and animal by-products: municipal_biowaste, central_biogas_plant, food_business, food_manufacturer, slaughterhouse, dairy_processor (whey, fat sludge)
- Sources mapped: Energimyndigheten 2024 co-digestion rows, ISPRA other years, DREAL Pays de la Loire, ENS DK national total.
- State: `food_waste` MEDIUM (cat3, contaminants → depackaging + pasteurisation CAPEX); `municipal_biowaste` LOW
  (DM 30, VS 70, BMP 220–300–380); `slaughter_residues` LOW, one stream, all cat3; rejects 10 % / 20 % (client field
  exists); gate fees client-only; `econ.digestate_excess_eur_t` national (client field exists); A1f RED 78 % (n 9, ISPRA);
  A2 64 % (n 11). `MANURE_RETURN_HAUL` 1.5 judgement.
- Gaps: kitchen vs garden fraction; impurities by country and collection system; slaughter streams (rumen/gut content
  = Cat 2, blood, flotation fat) with their ABP category; factory sub-types (bakery, confectionery, packaged, meat) —
  non-animal former foodstuffs are not ABP; sugary-waste and whey acidification; gate-fee plausibility bands by country;
  large-plant CAPEX/OPEX.
- Data: Reg. (EC) 1069/2009, Reg. (EU) 142/2011 (categories, hygienisation); EU BREF Slaughterhouses & ABP (2023), Food,
  Drink and Milk (2019), Waste Treatment (2018); KTBL, LfL Biogasausbeuten, DBFZ, ECN; WRAP Gate Fees; ISPRA, Destatis
  Abfallbilanz; Danish Energy Agency Technology Data for Renewable Fuels (large plants).
- References: ISPRA plant-level AD (A1f to n ≥ 10), Energistyrelsen DK plant production, ODRÉ FR (R3), cost references.
- Countries: IT, DE, DK, FR, UK, NL, PL, ES.
- Adapters: collection system → impurities, national ABP implementation, gate-fee and incineration price level,
  digestate outlet rules (nitrates zones).
- ✅: municipal biowaste and slaughter streams ≥ MEDIUM; ABP category per stream from the regulation; A1f ≥ 80 % on
  n ≥ 10; A2 ≥ 70 % including ≥ 5 large plants; gate-fee bands for the top 5 countries.

## M · Livestock: poultry_farm, cattle_farm, aquaculture
- Sources mapped: weak — AgSTAR ≈ 6 poultry plants; expect D for poultry unless national data appears; Eurostat macro check.
- State: `poultry_layer_manure` LOW (DM 27, BMP 170–220–280, N 15); `poultry_broiler_litter` LOW (DM 65, N 28);
  broiler 0.011 t/place LOW; inhibition = poultry VS share > 0.35 (FNR proxy) with 4 %/10 pp loss (judgement), lab N can
  lift it (`eng.ammonium_inhib_g_l` 3.0). `cattle_solid_manure` LOW (DM 25, BMP 167–250–333); `cattle_other` mixes
  suckler cows, fattening bulls, calves (9 t/head, 6–13); seasonal collection 0.55 judgement. Aquaculture: no preset,
  residue route only; salinity (Na⁺) not checked. DECISIONS 2026-11-04: poultry DM/BMP flagged unresolved.
- Gaps: poultry and solid-manure DM/VS/BMP/N; NH₄-N/free-NH₃ inhibition rule with a primary source; cattle categories;
  bedding share; RAS sludge feedstock (fresh/marine) and salinity warning.
- Data: KTBL Faustzahlen Biogas, LfL Biogasausbeuten, DüV Anlage 1, IPCC 2019 Vol 4 Ch 10, national NIR Tier 2;
  peer-reviewed reviews on ammonia and sodium inhibition (read the primary texts); Nofima, Fiskeridirektoratet.
- References: FNR Messprogramm III plants with poultry/solid manure (`bmp3-plants.json`), AgSTAR poultry digesters,
  SE SCB farm plants; published RAS sludge plants.
- Countries: DE, NL, PL, FR, UA, US, NO, DK.
- Adapters: national Tier 2 manure/VS per head, housing period, operation practice (US), climate, 60 Hz (US).
- ✅: all manure types ≥ MEDIUM; inhibition rule sourced; ≥ 10 references with poultry or solid manure (or GREY with
  reason); aquaculture feedstock and preset.

## S · Difficult residues: crop_farm (straw), olive_oil_mill, fish_processor
- Sources mapped: lab data only for straw tonnes/fish/RAS/olive; expect D status; report as such, do not force V.
- State: `crop_straw` LOW (DM 85, BMP 110–160–200, pretreatment assumed done, only milling power costed);
  `olive_pomace` LOW (DM 30, BMP 170–240–310, seasonal, fat); `fish_waste` LOW (DM 25, BMP 330–430–530, N 18, cat3,
  competing use). Nitrogen warning fires for fish.
- Gaps: straw BMP untreated vs pretreated, pretreatment CAPEX/OPEX ≥ 2024, straw price and removal limits; two-phase
  pomace vs three-phase mill wastewater, polyphenol inhibition, season storage, pomace-oil competing use; fish sub-types,
  co-substrate share for the NH₄-N threshold, salinity, fishmeal raw-material price.
- Data: KTBL, DBFZ, IEA Bioenergy Task 37, national agricultural statistics (straw price), issuer filings of operating
  straw-to-biomethane plants; IDAE, ENEA, MAPA, peer-reviewed alperujo/OMW digestion; Nofima, FAO (GLOBEFISH).
  RED III Annex IX: support case only.
- References: operating straw plants (gas per t, cost), ES/IT/GR olive plants, NO/IS/DK fish-waste plants.
- Countries: DE, DK, PL, UA, ES, IT, GR, NO.
- Adapters: harvest/processing season per country, straw removal rules, competing-use prices, salinity (marine).
- ✅: each feedstock ≥ MEDIUM (or sub-types); pretreatment cost in the model; inhibitor and salinity checks sourced;
  references n ≥ 10 per cluster or GREY with reason.

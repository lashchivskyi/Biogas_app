# Market data sources

Values and their provenance live in code: `src/countries/sources.ts` (MANUAL, LOCAL_QUOTES,
REGIONAL), `src/countries/data/*.json`, `src/countries/profiles.ts` (support schemes).
This file records what the code cannot: where to look, what is blocked, how often to refresh.

## Source order

1. National statistics office, regulator, ministry, official gazette, TSO / market operator,
   central bank.
2. International official bodies: Eurostat, ECB, ENTSO-E, IEA, World Bank, IPCC, EPA.
3. Peer-reviewed or recognised technical references: DBFZ, KTBL, FNR, IEA Bioenergy, Danish
   Energy Agency.
4. Utilities' own published tariffs and companies' regulatory filings (SEC, OEB).

Never cite news, brokers, consultancies, tariff-copy sites or private data mirrors as the source
of a number. A Wayback snapshot of an official page is acceptable; state its date.

## Automated (scripts/data/fetch_statistics.py, weekly GitHub workflow)

| Data | Source |
|---|---|
| EU electricity, gas, labour | Eurostat nrg_pc_205, nrg_pc_203, lc_lci_lev |
| Day-ahead prices EU (+ IT zones by hand) | ENTSO-E via Energy-Charts API (rate limited, retries keep old rows) |
| FX | ECB; NBU (UAH), NBM (MDL), NBK (KZT), BCRA (ARS), NBS web-app (RSD) |
| US by state | EIA EPM 5.6.B, EIA industrial gas by state, BLS OEWS 51-8031 + ECEC (API), EIA STEO table 7a (needs openpyxl) |

## Updated by hand

| Item | Official source | Cadence |
|---|---|---|
| VND/EUR | State Bank of Vietnam cross rate (sbv.gov.vn, browser only) | weekly (7-day validity) |
| GB wholesale | Ofgem wholesale indicators chart data (embedded CSV) | quarterly |
| UA spot / gas | OREE DAM index API; Ministry of Economy gas price | monthly |
| MX electricity | CFE GDMTH via DOF (dof.gob.mx) | monthly |
| CA gas | OEB rate orders (Enbridge), FortisBC, SaskEnergy | quarterly |
| IN gas | PPAC notifications (ppac.gov.in, scanned PDFs) | monthly / half-yearly ceiling |
| BR / KZ / TR / MD spot | CCEE open data; RFC single purchaser; EPDK monthly reports; OPEM CSV | quarterly |
| US / CA grid factor | EPA eGRID (state rates); ECCC NIR | yearly |
| Support schemes | legal texts listed in each scheme's `source` | before each release |
| Back-test set | EPA AgSTAR Livestock AD Database xlsx: `python -I scripts/data/extract_agstar.py --write`, then `npx tsx scripts/backtest.ts --write` | when AgSTAR updates (≈ twice a year) |
| US dairy manure per head | USDA NRCS AWMFH ch. 4 Table 4-5 (ASAE D384.2) in the US profile | on a new ASABE D384 edition |
| EU dairy manure per head | IPCC 2019 Refinement Vol. 4 Tab. 10.13A × 10A.5 (VS, applied 2026-11-04); DüV Anlage 9 Tab. 1 via LfL Basisdaten Tab. 4b (volume); next: national Tier 2 VS from each NID | on a new IPCC/DüV edition or NID |
| Silage loss / clamp | KTBL Ernte- und Silomanagement 2021; LfL density guide; clamp €/m³ LOW (no cost study found) | when KTBL publishes building costs |
| RED climate defaults | Directive (EU) 2018/2001 Annex VI (legislation.gov.uk copy; EUR-Lex blocks scripts) in `src/core/ghg.ts` | when Annexes V–VI are revised |

## Blocked or missing (confidence LOW until fixed)

- Elexon BMRS API (403 from this network) — GB wholesale uses Ofgem instead.
- VN wholesale (NSMO), IN wholesale (IEX, CERC, Grid-India) — unreachable.
- VN industrial gas — no official tariff exists; World Bank LNG Japan as import benchmark.
- KZ gas ceilings — adilet.zan.kz renders by JS only; open in a browser.
- CA gas outside ON/BC/SK, MD ANRE tariffs, UA NEURC/Ukrenergo tariffs — sites unreachable.
- Pending: Vietnam retail tariff cut announced for 1 Nov 2026 (check EVN decision).

## Top-5 NPV drivers (tornado 2026-10-31: ±10 % per `econ.*`, mean |ΔNPV| over 39 examples, 33 countries)

Frequency in the per-country top 5: discount rate 33, CAPEX factor CHP 33, CAPEX factor biomethane 24, FX 20,
energy escalation 11, spot electricity 11, export haircut 9; biomethane price is top-3 in ~25 countries.
Spot and export haircut dominate where biomethane is not the best route (RO, GR, BG, RS, MD, TH, KZ, US, AR).

| Driver | Status | What would close it |
|---|---|---|
| FX | Official (ECB, NBU, NBM, NBK, BCRA, SBV), ≤ 2 days | nothing; VN is weekly by hand |
| Spot electricity | EU/RS/BG: ENTSO-E (HIGH). MD OPEM, US EIA STEO MEDIUM. **LOW: TH** (ERC Ft, no spot market), **KZ** (single buyer, June missing), **AR** (Edenor wheeling proxy, Jun 2026; use Res. SE 109/2026 annex GUDI price next) | AR: read SE seasonal annex PDF; TH/KZ: no market exists |
| Discount rate | Damodaran CRP Jul 2026 + λ 0.6 (assumption), range −1/+2 pp | bank term sheets; refresh Jan/Jul |
| CAPEX factors | Engineering (DBFZ/KTBL split), LOW outside DE | supplier quotes per country |
| Biomethane price | LOW everywhere: no official market series (EU formula 0.8 × gas + 20 €/MWh; national estimates elsewhere) | signed offtake; official green-gas tariffs only as support cases |
| Export haircut 0.85 | Assumption, one value for 33 markets, swing = spot swing | marketer/balancing fee quotes; baseload CHP likely < 15 % |
| Grid CO₂ factor | Ember via OWID (secondary; derived from official data); UA 2022 | EEA/IEA/national inventory per country; UA: Ukrenergo/MinEconomy |

## Validation datasets (not market data)

| Data | Source | Refresh |
|---|---|---|
| Operating digesters (A1, R1, R1b) | EPA AgSTAR database, `agstar-backtest.json` | yearly with the AgSTAR release |
| Shut-down digesters with closure reason (D1, D2) | AgSTAR sheet "Shutdown", `agstar-shutdown.json` | same |
| French biomethane, metered output vs plan per site (R3) | ODRÉ "Production annuelle de biométhane par site", `odre-biomethane.json` (export API, no key) | yearly (published ≈ October) |
| Swedish farm plants, gas per tonne of substrate (A1s) | SCB/Energimyndigheten via Energigas Sverige, report 2024 Tab. 3/10/11, `se-biogas-statistics.json` (LHV) | yearly (≈ autumn) |
| US landfills: measured gas collection, engine output (A1l, A1g) | EPA LMOP composite xlsx (epa.gov/system/files/documents/2024-09/lmopcompositedata.xlsx), `lmop-landfills.json` (2024-09, data 2022; MW "actual or estimated") | yearly (≈ September) |
| Accuracy summary on /methodology | all sets above → `accuracy-summary.json` via `npx tsx scripts/accuracy.ts --write` | after any reference or model change (`accuracy.test.ts` fails on drift) |
| Published plant costs (A2, A3, R2) | `capex-benchmarks.json` + `scripts/capex-references.ts`; press and vendor shown, not counted | when a primary cost appears |

Survey of EU/world validation sources (2026-11-03). Per plant = inputs and output per site (what A1e needs).
| Source | What it gives | Use |
|---|---|---|
| FNR Biogas-Messprogramm III (2021, 61 DE plants, data 2016–18) | per plant (ch. 15 data sheets, separate PDFs BGA 01–61): fed t/a and mix, DM/VS, methane, kWh/t, hours, investment | used (A1e, `bmp3-plants.json`, 53 plants; 39 enterable and plausible) |
| Marktstammdatenregister / netztransparenz EEG master data | per unit: capacity, commissioning, energy carrier, EEG category (§ 44 manure ≤ 75 kW) | candidate: real hours of small manure plants if annual kWh per unit is published (not confirmed) |
| ODRÉ (FR) | per site metered injection + "theoretical capacity" | used (R3) |
| SCB/Energimyndigheten (SE) | per plant category: substrate kt and GWh | used (A1s) |
| DBFZ Report 50 (12/2023) | DE national: upgrading capacity, biomethane, flex hours | context: national utilisation ≈ 0.82 vs model 0.91 (one aggregate, not applied) |
| DCA Normtal (DK), LfL Basisdaten (DE) | manure per animal | not applied: DK ex-storage volume overstates digester size (excreted 28.9 t is the candidate); DE volume only |
| EBA/GIE European Biomethane Map | plant list (capacity, main substrate) as PDF; EBA database on request | context only; no CSV |
| IEA Bioenergy Task 37 country reports (10/2024) | national production and plant counts | context only |
| Energistyrelsen (DK) | plant list last updated 2014; current per-plant input not found | not usable |
| Swiss BFE / WSL EnviDat "Biogas aus Hofdünger" | farm plants (≈ 110–125) and TJ | candidate aggregate like SE |
| Ofgem Renewables & CHP Register (GB) | per-station output exists in register reports; register being replaced, no open export found | not usable now |
| ACER CHEST (EU agency) | 2025 biomethane production cost, TTF, GO prices (DK/NL/DE) | context (PRODUCT › EU market); compliance value belongs in support cases |
| EBA Statistical Report 2025, EBA Investment Outlook 7/2026, IEA Outlook for biogas and biomethane 2025 | market size, plant counts, cost ranges | context (PRODUCT.md › EU market) |
| GSE/CIB (IT), CBS (NL), Eurostat nrg_bal | national totals; per-plant not found | not checked in detail |
| Next, ranked (2026-11-03) | what it adds | access |
| KOWR register (PL) | national tonnes per coarse substrate class + biogas | rejected 2026-11-03: classes too coarse to map |
| 2. Ofgem (GB) | output per AD station → real full-load hours | public file ends 2018 (too old); 2024–25 reports only on request to renewable.enquiry@ofgem.gov.uk |
| 3. Energistyrelsen Biomasseindberetning (DK) | per plant biomass input + energy | not public: request to ENS |
| 4. CARB LCFS (US) | pathway table: carbon intensity only; herd and gas only in each application's staff summary, partly projected | not used: no clean per-dairy actuals |
| 5. CRPA / CIB (IT) | residual methane of 16 plants (realisation check), plant data on request | contact |
| 6. Styria benchmarking DB (AT), BOKU monitoring 41–78 plants | per plant substrate and output | old (2004–09) |
| 7. Messprogramm III: 8 sheets in another layout | +8 German plants | skipped: data 2016–18 (the 39 used plants are equally old) |
| 8. Beta clients: meter readings + weighed feedstock | the only blind, current per-plant set | needs clients |


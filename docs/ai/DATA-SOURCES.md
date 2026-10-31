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
| RED climate defaults | Directive (EU) 2018/2001 Annex VI (legislation.gov.uk copy; EUR-Lex blocks scripts) in `src/core/ghg.ts` | when Annexes V–VI are revised |

## Blocked or missing (confidence LOW until fixed)

- Elexon BMRS API (403 from this network) — GB wholesale uses Ofgem instead.
- VN wholesale (NSMO), IN wholesale (IEX, CERC, Grid-India) — unreachable.
- VN industrial gas — no official tariff exists; World Bank LNG Japan as import benchmark.
- KZ gas ceilings — adilet.zan.kz renders by JS only; open in a browser.
- CA gas outside ON/BC/SK, MD ANRE tariffs, UA NEURC/Ukrenergo tariffs — sites unreachable.
- Pending: Vietnam retail tariff cut announced for 1 Nov 2026 (check EVN decision).

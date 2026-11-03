import type { SupportInfo, SupportScheme } from "@/core/country";
import { region, type CountryProfile } from "./build";
import { indiaCbgProcurementPrice } from "./sources";

/**
 * 32 national profiles (Ukraine has a separate adapter in ua.ts; no independent calibration is implied).
 * The market numbers here are FALLBACK estimates only: build.ts replaces each one with an official
 * statistic from sources.ts wherever a series exists, and only the remainder is shown as an estimate.
 * Support schemes are listed only where at least a figure was found in this research or is a
 * widely documented national instrument; all are LOW/MEDIUM confidence and must be checked before use.
 */

const CHECKED = "2026-10-30";
const none = (en: string): SupportInfo => ({ summary: { en }, availableForNewSmallProjects: false, checkedOn: CHECKED, schemes: [] });
const sup = (en: string, schemes: SupportScheme[], open = true, checkedOn = CHECKED): SupportInfo => ({ summary: { en }, availableForNewSmallProjects: open, checkedOn, schemes });
const sch = (s: Omit<SupportScheme, "checkedOn">): SupportScheme => ({ ...s, checkedOn: CHECKED });

const EU_BM: [number, number, number] = [0.4, 0.55, 0.8];
const EU_BM_NEW: [number, number, number] = [0.35, 0.5, 0.75];
const NO_GRID_BM: [number, number, number] = [0.3, 0.4, 0.55];

/**
 * European dairy-cow manure: slurry volume per DüV Anlage 9 Tab. 1 (20 m³ ≈ 20 t a year at 8 000 kg milk) with the dry
 * matter set so that volatile solids match the latest IPCC regional default (2019 Refinement: VS rate × typical mass).
 * A national inventory (Tier 2) value per country should replace it; the regional default does not know herd yield.
 */
export const dairyManure = (vsKgDay: number, region: string, rate: number, massKg: number) => ({
  dairy_cow: { tonnesHeadYear: 20, dryMatterPct: +(vsKgDay * 365 / (20 * 1000 * 0.8) * 100).toFixed(1), vsPctOfDm: 80, confidence: "MEDIUM" as const, date: "2019-05-31",
    source: `IPCC 2019 Refinement Vol. 4 ch. 10, Table 10.13A (${rate} kg VS per 1 000 kg mass·d) × Table 10A.5 (${massKg} kg), ${region}: ${vsKgDay} kg VS/cow·d (regional default, not herd-specific; IPCC 2006 Table 10A-4 gave ${region === "Western Europe" ? "5.1" : "4.5"}); volume 20 m³/a per DüV Anlage 9 Tab. 1 via LfL Basisdaten Tab. 4b (Nov 2024, 8 000 kg milk); DM = VS ÷ (volume × 80 % VS of DM)` },
});
const MANURE_WEST = dairyManure(5.0, "Western Europe", 8.4, 600);
const MANURE_EAST = dairyManure(3.7, "Eastern Europe", 6.7, 550);

export const PROFILES: CountryProfile[] = [
  // ---------------- Central & Eastern Europe ----------------
  {
    code: "PL", name: "Poland", currency: "PLN", fx: 4.25, tier: "B", regime: "EU", inj: true,
    manure: MANURE_EAST,
    elec: 0.19, exp: 0.1, gas: 50, labour: 12, capex: 0.9, disc: 0.085, debtRate: 0.07, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.65,
    regions: [region("wielkopolskie", "Wielkopolska", [-0.9, 0.2, 3.8, 9.3, 14.3, 17.6, 19.7, 19.2, 14.4, 9.2, 4.3, 0.6], { pl: "Wielkopolskie" }), region("podkarpackie", "Podkarpackie (Rzeszów)", [-1.8, -0.6, 3.3, 9.5, 14.4, 17.9, 19.7, 19.2, 14.1, 8.9, 3.9, -0.4], { pl: "Podkarpackie" })],
    support: sup("Small agricultural biogas CHP ≤ 1 MW can still enter FIT/FIP until 31.12.2027 (15 years); biomethane FIP for ≤ 1 MWe-eq.; auctions for larger biomethane plants from 2027.", [
      sch({ id: "pl.fit", name: "FIT/FIP biogaz rolniczy (≤ 1 MW)", status: "open", electricityTariffEurKwh: 0.195, routes: ["chp"], maxKwEl: 1000, note: { en: "FIT < 500 kW: 95 % of the 872 zł/MWh reference price (1 025 with high-efficiency CHP); FIP 90 % for 0.5–1 MW. CPI-indexed." }, source: "MKiŚ regulation 8.11.2023 (Dz.U. 2023 poz. 2440); Ustawa OZE art. 70a–70f", confidence: "MEDIUM" }),
      sch({ id: "pl.bm", name: "FIP biometan (≤ 1 MWe-eq.)", status: "open", biomethaneEurNm3: 1.12, routes: ["biomethane"], note: { en: "Premium up to the 545 zł/MWh reference price (2023); paid share and energy basis still to confirm. First URE certificate 24.09.2026." }, source: "MKiŚ regulation 13.11.2023 (biomethane reference price); URE, 2026-09", confidence: "LOW" }),
    ]),
    notes: { en: ["Permitting (environmental decision, KOWR registration) is the main bottleneck; budget 18–30 months."] },
  },
  {
    code: "CZ", name: "Czechia", currency: "CZK", fx: 24.5, tier: "B", regime: "EU", inj: true,
    manure: MANURE_EAST,
    elec: 0.18, exp: 0.09, gas: 48, labour: 13, capex: 0.9, disc: 0.08, debtRate: 0.065, tkm: 0.12, bm: EU_BM, fertN: 1.15, ef: 0.45,
    regions: [region("vysocina", "Vysočina", [-2.5, -1.5, 2.0, 7.5, 12.5, 15.8, 17.6, 17.2, 12.8, 7.8, 2.8, -1.2], { cs: "Vysočina" }), region("praha", "Central Bohemia (Prague)", [0.0, 1.2, 4.9, 10.2, 14.6, 18.2, 20.1, 19.7, 14.7, 9.6, 4.5, 1.2], { cs: "Středočeský kraj" })],
    support: none("No operating support for new biogas CHP. New biomethane plants bid in MPO auctions (top-up to the bid price; first round awarded 8 Sep 2026, commissioning by 31.12.2029); award prices are not published in a form we could verify, so no value is modelled."),
    notes: { en: ["For existing plants, the key question is life after the tariff: CHP on own use vs conversion to biomethane."] },
  },
  {
    code: "SK", name: "Slovakia", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: true,
    manure: MANURE_EAST,
    elec: 0.19, exp: 0.09, gas: 50, labour: 12, capex: 0.9, disc: 0.085, debtRate: 0.065, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.12,
    regions: [region("nitra", "Nitra region", [-1.0, 1.0, 5.5, 11.5, 16.5, 20.0, 21.8, 21.3, 16.3, 10.8, 5.2, 0.2], { sk: "Nitriansky kraj" })],
    support: sup("New biogas CHP ≤ 500 kW receives a regulated top-up price from ÚRSO (≈ €165/MWh in 2026, manure-based). No operating support for biomethane yet.", [
      sch({ id: "sk.doplatok", name: "Doplatok OZE – bioplyn ≤ 500 kW", status: "open", electricityTariffEurKwh: 0.165, routes: ["chp"], maxKwEl: 500, minManureShareMass: 0.5, note: { en: "Individual ÚRSO price (example €165.39/MWh for 2026); ≥ 50 % heat use or −30 %; unpaid in negative-price hours." }, source: "ÚRSO decision 0078/2026/E-OZ (13.10.2025); Act 309/2009 §3; Decree 154/2024 §44", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["Similar structure to Czechia: large former cooperative farms, good gas grid."] },
  },
  {
    code: "HU", name: "Hungary", currency: "HUF", fx: 395, tier: "B", regime: "EU", inj: true,
    manure: MANURE_EAST,
    elec: 0.16, exp: 0.1, gas: 48, labour: 10, capex: 0.88, disc: 0.095, debtRate: 0.08, tkm: 0.11, bm: EU_BM_NEW, fertN: 1.1, ef: 0.2,
    regions: [region("alfold", "Great Plain (Alföld)", [-0.5, 1.5, 6.5, 12.3, 17.3, 20.8, 22.8, 22.4, 17.2, 11.5, 5.6, 1.0], { hu: "Alföld" })],
    support: sup("The HUF 40 bn biogas/biomethane grant call (45–65 %) is closed and oversubscribed; no new call announced and no open operating tariff for new small plants confirmed.", [
      sch({ id: "hu.grant", name: "Jedlik Ányos – biogáz/biometán (HUF 40 bn)", status: "closed", capexGrantShare: 0.45, routes: ["chp", "biomethane", "boiler"], note: { en: "HUF 40 bn (18 bn for plants < 500 m³/h raw biogas), HUF 200 m – 5 bn per project; 39 bids for > HUF 60 bn; aid intensity 45 % assumed, not confirmed officially." }, source: "Government of Hungary (kormany.hu), Jedlik Ányos programme announcement", confidence: "LOW" }),
    ], false),
    notes: { en: ["Hungary lags its neighbours and is actively funding small plants — timing of grant calls matters more than tariffs."] },
  },
  {
    code: "RO", name: "Romania", currency: "RON", fx: 5.05, tier: "B", regime: "EU", inj: false,
    manure: MANURE_EAST,
    elec: 0.18, exp: 0.1, gas: 45, labour: 9, capex: 0.85, disc: 0.1, debtRate: 0.085, tkm: 0.1, bm: NO_GRID_BM, fertN: 1.05, ef: 0.25,
    regions: [region("baragan", "Bărăgan / Muntenia", [-1.5, 0.6, 5.5, 11.8, 17.3, 21.2, 23.2, 22.7, 17.4, 11.3, 5.3, 0.4], { ro: "Muntenia" }), region("transilvania", "Transylvania (Cluj)", [-3.0, -1.0, 3.8, 9.5, 14.5, 17.8, 19.5, 19.2, 14.6, 9.3, 3.8, -1.3], { ro: "Transilvania" })],
    support: none("No support open for new biogas or biomethane: the PNRR manure-biogas scheme ended in June 2026; OUG 9/2026 only enables future biomethane aid schemes."),
    notes: { en: ["Early-stage market with high potential: first movers face grid-connection and permitting uncertainty."] },
  },
  {
    code: "MD", name: "Moldova", currency: "MDL", fx: 19.5, tier: "C", regime: "GENERIC", inj: false,
    manure: MANURE_EAST,
    elec: 0.15, exp: 0.1, gas: 50, labour: 4, capex: 0.82, disc: 0.13, debtRate: 0.1, tkm: 0.1, bm: NO_GRID_BM, fertN: 1.0, ef: 0.45,
    regions: [region("chisinau", "Central Moldova", [-2.5, -1.2, 3.7, 10.5, 16.2, 20.0, 22.0, 21.4, 16.2, 10.0, 4.3, -0.8], { ro: "Centrul Moldovei" })],
    support: sup("Moldova keeps a fixed biogas tariff (2.37 MDL ≈ €0.12/kWh, 15 years) for small producers; the biogas quota is largely unused (7 MW built of 65 MW).", [
      sch({ id: "md.fit", name: "Tarif fix – biogaz (ANRE)", status: "open", electricityTariffEurKwh: 0.118, routes: ["chp"], maxKwEl: 4000, note: { en: "2.37 MDL/kWh in force for manure and agricultural-waste biogas (ANRE, 07.10.2025); revised yearly per cohort; a 2026 draft is under consultation." }, source: "ANRE decision of 07.10.2025 on fixed tariffs; Law 10/2016", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["High energy-import dependence makes self-consumption valuable; small market."] },
  },
  {
    code: "BG", name: "Bulgaria", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: false,
    manure: MANURE_EAST,
    elec: 0.15, exp: 0.1, gas: 45, labour: 7, capex: 0.82, disc: 0.095, debtRate: 0.075, tkm: 0.1, bm: NO_GRID_BM, fertN: 1.05, ef: 0.4,
    regions: [region("danube", "Danube plain (Pleven)", [-0.8, 1.5, 6.5, 12.5, 17.5, 21.5, 23.8, 23.3, 18.3, 12.2, 6.0, 1.0], { bg: "Дунавска равнина" })],
    support: none("No operating support for new biogas: KEVR sets new feed-in prices only for rooftop PV ≤ 30 kW; biogas prices apply to existing plants only."),
    notes: { en: ["Euro area since 2026; low labour costs, limited sector experience."] },
  },
  {
    code: "RS", name: "Serbia", currency: "RSD", fx: 117, tier: "B", regime: "GENERIC", inj: false,
    manure: MANURE_EAST,
    elec: 0.11, exp: 0.09, gas: 45, labour: 7, capex: 0.82, disc: 0.11, debtRate: 0.08, tkm: 0.1, bm: NO_GRID_BM, fertN: 1.0, ef: 0.7,
    regions: [region("vojvodina", "Vojvodina", [0.0, 2.0, 6.8, 12.3, 17.3, 20.8, 22.6, 22.3, 17.3, 11.9, 6.4, 1.5], { sr: "Vojvodina" })],
    support: none("The law allows a feed-in tariff for biogas < 500 kW and market premiums, but only through quota auctions; no biogas quota or auction is open."),
    notes: { en: ["Vojvodina's large farms and food industry are the natural market."] },
  },
  {
    code: "GR", name: "Greece", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: false,
    manure: MANURE_WEST,
    elec: 0.16, exp: 0.1, gas: 50, labour: 14, capex: 0.92, disc: 0.09, debtRate: 0.07, tkm: 0.12, bm: NO_GRID_BM, fertN: 1.1, ef: 0.35,
    regions: [region("thessaly", "Thessaly (Larissa)", [5.5, 7.0, 10.0, 14.5, 20.0, 25.0, 28.0, 27.5, 22.5, 16.8, 11.0, 6.8], { el: "Θεσσαλία" })],
    support: none("Biogas FiP/FiT under Law 4414/2016 served earlier plants; access for new plants after 2025 is unconfirmed; biomethane support is still a draft."),
    notes: { en: ["Mild winters cut digester heating; small, dispersed livestock farms favour co-digestion hubs."] },
  },
  {
    code: "TR", name: "Türkiye", currency: "TRY", fx: 45, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.11, exp: 0.07, gas: 30, labour: 6, capex: 0.8, disc: 0.15, debtRate: 0.12, tkm: 0.08, bm: NO_GRID_BM, fertN: 0.9, ef: 0.42,
    regions: [region("konya", "Central Anatolia (Konya)", [-0.2, 1.5, 5.8, 11.0, 16.0, 20.4, 23.8, 23.5, 19.0, 12.7, 6.0, 1.6], { tr: "İç Anadolu (Konya)" }), region("aegean", "Aegean (İzmir/Balıkesir)", [7.5, 8.5, 11.0, 15.0, 20.0, 24.8, 27.5, 27.2, 23.0, 18.0, 13.0, 9.0], { tr: "Ege" })],
    support: sup("YEKDEM pays new biogas plants (online by end-2030) a lira tariff held in a USD 81–99/MWh band for 10 years, plus a 5-year local-content bonus. Open to small plants.", [
      sch({ id: "tr.yekdem", name: "YEKDEM – biyometanizasyon", status: "open", electricityTariffEurKwh: 0.08, routes: ["chp"], note: { en: "3.8883 TL/kWh + 0.6474 local-content bonus from 01.10.2025 (≈ €0.080 at the then rate); USD-indexed quarterly; 10 years, bonus 5 years (not included)." }, source: "Presidential Decision 7189 (RG 32177, 2023-05-01); EPİAŞ YEKDEM price notice from 01.10.2025", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["Most plants are 1–4 MW centralised CHP on cattle and poultry manure; only ≈ 11 % of cattle manure is digested."] },
  },
  // ---------------- Baltics & Nordics ----------------
  {
    code: "LT", name: "Lithuania", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: true,
    manure: MANURE_EAST,
    elec: 0.16, exp: 0.09, gas: 45, labour: 12, capex: 0.9, disc: 0.085, debtRate: 0.065, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.15,
    regions: [region("kaunas", "Central Lithuania (Kaunas)", [-3.5, -3.0, 0.8, 7.4, 13.0, 16.3, 18.6, 17.6, 12.8, 7.3, 2.3, -1.6], { lt: "Vidurio Lietuva" })],
    support: none("No open support for new biogas or biomethane found; the 2022 biomethane investment call is closed and policy now targets demand."),
    notes: { en: ["Large farms and an open gas grid favour farm-cluster biomethane."] },
  },
  {
    code: "LV", name: "Latvia", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: true,
    manure: MANURE_EAST,
    elec: 0.16, exp: 0.09, gas: 45, labour: 11, capex: 0.9, disc: 0.085, debtRate: 0.065, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.1,
    regions: [region("zemgale", "Zemgale (Jelgava)", [-3.1, -3.0, 0.6, 6.9, 12.6, 16.1, 18.5, 17.6, 12.9, 7.4, 2.4, -1.3], { lv: "Zemgale" })],
    support: sup("Biomethane-only ALTUM loan with a capital rebate (≈ 50 % of principal, ≤ €4.2 m) is fully booked; no operating support for new small CHP.", [
      sch({ id: "lv.bm", name: "ALTUM biometāna programma", status: "closing", capexGrantShare: 0.35, routes: ["biomethane"], note: { en: "Loan with ≈ 50 % principal write-off (≤ €4.2 m); funds reserved, waiting list only; completion by 31.03.2029." }, source: "ALTUM programme rules 25.11.2025; Cabinet Regulation No. 21 (07.01.2025)", confidence: "MEDIUM" }),
    ], false),
    notes: { en: ["Poultry-manure biomethane (Balticovo) proves the industrial route."] },
  },
  {
    code: "EE", name: "Estonia", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: true,
    manure: MANURE_EAST,
    elec: 0.14, exp: 0.09, gas: 45, labour: 14, capex: 0.92, disc: 0.08, debtRate: 0.065, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.6,
    regions: [region("tartu", "Southern Estonia (Tartu)", [-4.6, -4.9, -1.0, 5.5, 11.6, 15.3, 18.0, 16.7, 11.8, 6.2, 1.0, -2.6], { et: "Lõuna-Eesti" })],
    support: none("No open support for new biogas plants; the 2024 biomethane grant (60 %) is closed and 2026 aid funds only a grid injection point."),
    notes: { en: ["Cold winters: insulation and digester heat demand matter."] },
  },
  {
    code: "DK", name: "Denmark", currency: "DKK", fx: 7.46, tier: "A", regime: "EU", inj: true,
    manure: MANURE_WEST,
    elec: 0.12, exp: 0.07, gas: 45, labour: 38, capex: 1.08, disc: 0.065, debtRate: 0.045, tkm: 0.16, bm: EU_BM, fertN: 1.2, ef: 0.12,
    regions: [region("jutland", "Jutland (Herning)", [1.2, 1.0, 3.0, 6.9, 11.0, 14.1, 16.6, 16.5, 13.2, 9.3, 5.3, 2.4], { da: "Jylland" })],
    support: none("Legacy biogas premiums closed to new plants since 2020; the EU-approved green-gas tender (20-year premium) has not been held, so there is no route for new small plants."),
    notes: { en: ["The Danish model is centralised: dozens of farms supply one large biomethane plant; single-farm CHP is rare."] },
  },
  {
    bmOverride: true, code: "SE", name: "Sweden", currency: "SEK", fx: 11.3, tier: "A", regime: "EU", inj: false,
    manure: MANURE_WEST,
    elec: 0.09, exp: 0.04, gas: 50, labour: 32, capex: 1.05, disc: 0.065, debtRate: 0.045, tkm: 0.16, bm: [0.5, 0.65, 0.85], fertN: 1.2, ef: 0.03,
    regions: [region("skane", "Skåne", [1.4, 1.3, 3.3, 7.2, 11.5, 15.0, 17.6, 17.3, 13.9, 9.6, 5.6, 2.6], { sv: "Skåne" })],
    support: sup("Annual production premium for manure biogas and upgrading (budget-capped, pro-rated), plus competitive Klimatklivet investment grants for farm biogas.", [
      sch({ id: "se.prod", name: "Produktionsstöd biogas", status: "competitive", biomethaneEurNm3: 0.95, routes: ["biomethane"], note: { en: "≤ 0.40 SEK/kWh for manure + ≤ 0.30 for upgrading (≤ 0.45 with liquefaction) on top of the market price; paid only within the annual budget." }, source: "SFS 2022:225 §4–5 (as amended to SFS 2023:596)", confidence: "LOW" }),
      sch({ id: "se.klimatklivet", name: "Klimatklivet – biogas på gård", status: "competitive", capexGrantShare: 0.4, routes: ["chp", "boiler"], note: { en: "Competitive CAPEX grant; 2026 farm awards ≈ 60–65 %, 40 % assumed; next round date not set." }, source: "Naturvårdsverket Klimatklivet; county board notices 2026-05", confidence: "LOW" }),
    ]),
    notes: { en: ["Low electricity prices make CHP unattractive; upgraded biogas for vehicles is the usual route."] },
  },
  {
    bmOverride: true, code: "FI", name: "Finland", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: false,
    manure: MANURE_WEST,
    elec: 0.09, exp: 0.05, gas: 50, labour: 30, capex: 1.05, disc: 0.065, debtRate: 0.045, tkm: 0.16, bm: [0.5, 0.65, 0.85], fertN: 1.2, ef: 0.08,
    regions: [region("ostrobothnia", "Ostrobothnia (Seinäjoki)", [-7.0, -7.3, -3.3, 2.6, 9.3, 14.2, 16.9, 14.8, 9.6, 4.2, -0.6, -4.6], { fi: "Pohjanmaa", sv: "Österbotten" })],
    support: sup("Farms get a 50 % investment grant for biogas plants sized to own energy use (up to half may be sold); no operating tariff; larger biomethane relies on case-by-case energy aid.", [
      sch({ id: "fi.farm", name: "Maatalouden investointituki – biokaasulaitos", status: "open", capexGrantShare: 0.5, routes: ["chp", "boiler"], note: { en: "50 % grant for farm biogas plants sized to own energy use; aid cap €1.5 m per farm per 3 years." }, source: "MMM/Ruokavirasto farm investment aid 2026 (10.12.2025); Government decree 16.01.2026", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["Very cold winters: expect a large share of biogas to heat the digester."] },
    storageMonths: 12,
  },
  // ---------------- Western Europe ----------------
  {
    code: "DE", name: "Germany", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    manure: MANURE_WEST,
    elec: 0.21, exp: 0.08, gas: 50, labour: 30, capex: 1.0, disc: 0.065, debtRate: 0.05, tkm: 0.15, bm: EU_BM, fertN: 1.3, ef: 0.38,
    regions: [region("niedersachsen", "Lower Saxony", [1.5, 2.0, 5.0, 9.0, 13.3, 16.2, 18.3, 17.9, 14.3, 10.0, 5.5, 2.4], { de: "Niedersachsen" }), region("bayern", "Bavaria", [-0.2, 0.8, 4.8, 9.3, 13.6, 17.3, 19.2, 18.8, 14.2, 9.5, 4.1, 0.7], { de: "Bayern" }), region("sachsen", "Saxony", [0.8, 1.8, 5.2, 10.2, 14.4, 17.9, 19.8, 19.5, 14.8, 10.0, 5.2, 2.0], { de: "Sachsen" })],
    support: sup("Small manure plants ≤ 150 kW get a fixed EEG rate (≈ 20 ct/kWh, 20 years, ≥ 80 % manure); larger plants bid in tenders (2026 average award 18.5 ct/kWh) with a flexible-operation duty.", [
      sch({ id: "de.guelle", name: "EEG 2023 Güllekleinanlage", status: "open", electricityTariffEurKwh: 0.202, routes: ["chp"], maxKwEl: 150, minManureShareMass: 0.8, note: { en: "Commissioned 1.7.2026–30.6.2027: 21.67 ct (≤ 75 kW) / 18.72 ct (75–150 kW); 20 years; ≥ 80 % manure (no poultry); unpaid in negative-price hours." }, source: "EEG 2023 §44, §44a (gesetze-im-internet.de): 22/19 ct − 0.5 % each 1 July from 2024", confidence: "MEDIUM" }),
      sch({ id: "de.tender", name: "EEG Ausschreibung Biomasse", status: "competitive", electricityTariffEurKwh: 0.18, routes: ["chp"], minKwEl: 150, note: { en: "Pay-as-bid; April 2026 average award 18.46 ct, ceiling 19.43 ct (new); flexible operation, only capped hours paid." }, source: "BNetzA press release 2026-06-09 (bid date 01.04.2026); EEG §39", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["Mature market (≈ 9 300 CHP plants): German economics are tariff-driven — compare the support case with the no-support verdict."] },
    storageMonths: 9,
  },
  {
    code: "AT", name: "Austria", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    manure: MANURE_WEST,
    elec: 0.18, exp: 0.09, gas: 48, labour: 29, capex: 1.0, disc: 0.065, debtRate: 0.05, tkm: 0.15, bm: EU_BM, fertN: 1.25, ef: 0.1,
    regions: [region("oberoesterreich", "Upper Austria", [-0.5, 1.0, 5.0, 9.8, 14.5, 17.8, 19.7, 19.2, 14.7, 9.5, 4.2, 0.6], { de: "Oberösterreich" })],
    support: sup("New off-grid biogas CHP ≤ 250 kW gets an EAG market premium up to 29.02 ct/kWh for 20 years, but only 1.5 MWel per year is available; the renewable-gas law is still stalled.", [
      sch({ id: "at.eag", name: "EAG Marktprämie Biogas (≤ 250 kW)", status: "open", electricityTariffEurKwh: 0.2902, routes: ["chp"], maxKwEl: 250, minManureShareMass: 0.3, note: { en: "29.02 ct/kWh, 20 years; ≥ 10 km from the gas grid, ≥ 30 % manure, no energy crops, ≈ 2/3 heat use; 1.5 MW/yr." }, source: "EAG-Marktprämienverordnung, BGBl. II Nr. 13/2026, §11–12", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["Small Alpine farms: cluster or co-digestion is usually needed to reach scale."] },
  },
  {
    code: "IT", name: "Italy", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    manure: MANURE_WEST,
    elec: 0.22, exp: 0.11, gas: 50, labour: 24, capex: 0.97, disc: 0.075, debtRate: 0.055, tkm: 0.14, bm: EU_BM, fertN: 1.25, ef: 0.27,
    regions: [region("lombardia", "Lombardy (Po valley)", [1.8, 4.0, 8.5, 12.8, 17.5, 21.8, 24.0, 23.4, 19.0, 13.5, 7.6, 2.8], { it: "Lombardia" }), region("emilia", "Emilia-Romagna", [2.5, 4.5, 8.8, 13.0, 17.8, 22.0, 24.5, 24.0, 19.5, 14.2, 8.3, 3.5], { it: "Emilia-Romagna" })],
    support: sup("Small farm biogas ≤ 300 kW: FER 2 tariff ≈ 226 €/MWh via annual rounds (next expected 2027). The PNRR biomethane incentive closed on 30.06.2026; a new decree is pending.", [
      sch({ id: "it.fer2", name: "DM FER 2 – biogas ≤ 300 kW", status: "competitive", electricityTariffEurKwh: 0.226, routes: ["chp"], maxKwEl: 300, note: { en: "233 €/MWh −3 % (2026), 20 years; all-inclusive tariff only ≤ 200 kW, 200–300 kW premium only; ≥ 80 % by-products; works start after the ranking." }, source: "DM MASE 19.06.2024 (FER 2); GSE Regole Operative FER 2 §3.3, §5", confidence: "MEDIUM" }),
      sch({ id: "it.pnrr", name: "DM 15/9/2022 + PNRR (40 % grant)", status: "closed", capexGrantShare: 0.4, biomethaneEurNm3: 1.05, routes: ["biomethane"], note: { en: "Window closed 30.06.2026; shown for reference. A CfD-type successor decree is being drafted, no tariff yet." }, source: "GSE, DM 15/9/2022; Decree-Law 19/2026", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["Large agricultural biogas fleet in the Po valley; the strategic question is CHP-to-biomethane conversion."] },
  },
  {
    code: "FR", name: "France", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    manure: MANURE_WEST,
    elec: 0.16, exp: 0.06, gas: 45, labour: 30, capex: 1.0, disc: 0.07, debtRate: 0.05, tkm: 0.15, bm: EU_BM, fertN: 1.2, ef: 0.05,
    regions: [region("bretagne", "Brittany", [5.8, 6.2, 8.6, 10.6, 14.0, 17.0, 19.0, 19.0, 16.5, 13.0, 9.0, 6.4], { fr: "Bretagne" }), region("grand-est", "Grand Est", [1.8, 2.8, 6.3, 9.8, 14.0, 17.4, 19.5, 19.1, 15.2, 10.7, 5.6, 2.6], { fr: "Grand Est" })],
    support: sup("Small biomethane injection tariff (≤ 13 GWh/yr, ≈ 1.1–1.25 €/Nm³) for complete requests filed by 31.12.2026; from 2027 new plants go through tenders or biogas production certificates.", [
      sch({ id: "fr.oa", name: "Obligation d'achat biométhane injecté", status: "closing", biomethaneEurNm3: 1.15, routes: ["biomethane"], note: { en: "11.6 → 10.1 c€/kWh HHV for 5–13 GWh/yr, indexed 1 Jan and 1 Jul; a complete request filed by 31.12.2026 keeps the right to a contract." }, source: "Arrêté 10.08.2026 (JORF 14.08.2026) amending arrêté 10.06.2023", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["Collective farm 'méthanisation' with grid injection is the dominant model; units under 200 kWe rarely justify upgrading on their own."] },
  },
  {
    code: "ES", name: "Spain", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    manure: MANURE_WEST,
    elec: 0.13, exp: 0.06, gas: 42, labour: 20, capex: 0.92, disc: 0.075, debtRate: 0.055, tkm: 0.13, bm: EU_BM_NEW, fertN: 1.15, ef: 0.15,
    regions: [region("cataluna", "Catalonia (Lleida)", [5.5, 7.5, 11.0, 13.5, 17.8, 22.3, 25.2, 24.7, 20.5, 15.3, 9.3, 5.6], { es: "Cataluña (Lleida)" }), region("castilla", "Castile and León", [3.5, 5.0, 8.0, 10.0, 13.8, 18.5, 21.6, 21.2, 17.5, 12.5, 7.3, 4.2], { es: "Castilla y León" })],
    support: none("No open support: IDAE biogas grants have no active call, and a biomethane quota (0.5 % in 2028 → 6 % in 2035) is still a draft decree."),
    notes: { en: ["Pig-dense regions (Catalonia, Aragón) face nitrate pressure: digestate treatment can be as important as energy."] },
  },
  {
    code: "NL", name: "Netherlands", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    manure: MANURE_WEST,
    elec: 0.16, exp: 0.08, gas: 45, labour: 32, capex: 1.05, disc: 0.065, debtRate: 0.045, tkm: 0.16, bm: EU_BM, fertN: 1.2, ef: 0.3,
    regions: [region("brabant", "North Brabant", [3.6, 4.0, 6.8, 10.0, 13.8, 16.6, 18.8, 18.4, 15.0, 11.0, 7.0, 4.2], { nl: "Noord-Brabant" })],
    support: sup("SDE++ 2026 is open (27 Oct – 26 Nov) with high base amounts for manure-only digestion, both green gas and CHP (12 years); competitive, a permit is required before applying.", [
      sch({ id: "nl.sde.gas", name: "SDE++ 2026 – monomestvergisting (groen gas)", status: "competitive", biomethaneEurNm3: 1.95, routes: ["biomethane"], note: { en: "Max base amount €0.182/kWh HHV (110–1 500 kW), 12 years; bids may be lower; manure-only, new digester." }, source: "RVO SDE++ 2026; PBL final advice 2026", confidence: "MEDIUM" }),
      sch({ id: "nl.sde.chp", name: "SDE++ 2026 – monomestvergisting (WKK)", status: "competitive", electricityTariffEurKwh: 0.223, routes: ["chp"], note: { en: "€0.288/kWh capped at 5 299 full-load h; blended with the market price over 7 800 h ≈ €0.22/kWh. 12 years." }, source: "RVO SDE++ 2026 (110–1 500 kW); blending: project-team calculation", confidence: "LOW" }),
    ]),
    notes: { en: ["Manure surplus and nitrogen rules make digestate processing a central cost item."] },
  },
  {
    code: "GB", name: "United Kingdom", currency: "GBP", fx: 0.86, tier: "A", regime: "UK", inj: true,
    manure: MANURE_WEST,
    elec: 0.27, exp: 0.09, gas: 58, labour: 26, capex: 1.08, disc: 0.075, debtRate: 0.06, tkm: 0.16, bm: [0.45, 0.6, 0.8], fertN: 1.25, ef: 0.2,
    regions: [region("midlands", "West Midlands / Shropshire", [4.3, 4.5, 6.4, 8.5, 11.5, 14.4, 16.4, 16.1, 13.8, 10.5, 7.0, 4.6]), region("east-anglia", "East Anglia", [4.2, 4.5, 6.7, 9.0, 12.3, 15.3, 17.7, 17.6, 14.9, 11.3, 7.2, 4.6])],
    support: sup("GGSS pays 7.09 p/kWh (2026/27, Tier 1) for 15 years on injected biomethane (≥ 50 % waste feedstock); applications until March 2028, commissioning by March 2030; no CHP tariff for new plants.", [
      sch({ id: "gb.ggss", name: "Green Gas Support Scheme", status: "open", biomethaneEurNm3: 1.18, routes: ["biomethane"], note: { en: "Tier 1 7.09 p/kWh in 2026/27 (CPI-linked) + gas and certificate sales; 15 years, ≥ 50 % waste; budget-capped queue." }, source: "Ofgem GGSS tariff table 2026/27; Ofgem GGSS guidance v3.0 (13.10.2026)", confidence: "MEDIUM" }),
    ]),
    notes: { en: ["High electricity prices make on-site CHP for own use attractive; policy favours food waste over manure."] },
  },
  // ---------------- North America ----------------
  {
    code: "US", name: "United States", currency: "USD", fx: 1.1, tier: "A", regime: "US", inj: true,
    // US Holsteins excrete about twice the catalogue (EU slurry) volatile solids; the AgSTAR back-test confirmed the gap.
    manure: { dairy_cow: { tonnesHeadYear: 22.9, dryMatterPct: 12.8, vsPctOfDm: 84, confidence: "MEDIUM", date: "2008-03-01",
      source: "USDA NRCS Agricultural Waste Management Field Handbook ch. 4 (210-VI-AWMFH, March 2008) Table 4-5(a), from ASAE D384.2 (2005): lactating cow at 75 lb milk/d 148 lb manure, 19 lb TS, 16 lb VS per day; dry cow 85/11/9.3 lb. Herd average with 15 % dry cows (60-day dry period in a ≈ 13-month calving interval, judgement): 22.9 t/a as excreted, 12.8 % TS, VS 84 % of TS (6.8 kg VS/cow·d)" } },
    elec: 0.1, exp: 0.04, gas: 12, labour: 30, capex: 1.1, disc: 0.075, debtRate: 0.065, tkm: 0.14, bm: [0.12, 0.2, 0.35], fertN: 1.1, ef: 0.37,
    regions: [region("wisconsin", "Wisconsin (dairy)", [-8.5, -6.5, -0.5, 7.0, 13.5, 19.0, 21.5, 20.5, 16.0, 9.0, 2.0, -5.0]), region("california", "California Central Valley", [8.0, 10.5, 13.0, 15.8, 20.3, 24.5, 27.8, 27.0, 24.0, 18.5, 11.8, 7.5]), region("iowa", "Iowa (swine)", [-6.0, -3.5, 3.0, 10.0, 16.3, 21.5, 23.5, 22.5, 18.0, 11.0, 3.5, -3.5])],
    support: sup("New RNG used as transport fuel earns federal RFS D3 RINs (realised ≈ $2.45–2.50 in Q2 2026, volatile); manure RNG piped into California can also earn LCFS credits (book-and-claim). The 45Z credit is not final; the biogas ITC and REAP digester support are closed.", [
      sch({ id: "us.rng", name: "RFS D3 RINs", status: "open", biomethaneEurNm3: 0.68, routes: ["biomethane"], note: { en: "$3/MMBtu gas + 75 % of D3 RINs at a conservative $2.00 (11.73 RIN/MMBtu) ≈ $0.75/Nm³; transport-fuel offtake required." }, source: "40 CFR 80.1415; realised D3 $2.45–2.50/RIN in Q2 2026 (Montauk, OPAL SEC filings); EPA EMTS RIN price data", confidence: "MEDIUM" }),
      sch({ id: "us.lcfs", name: "RFS D3 + California LCFS (manure RNG)", status: "open", biomethaneEurNm3: 1.04, minManureShareMass: 0.5, routes: ["biomethane"], note: { en: "Gas $3 + 75 % × (D3 $2.00 + LCFS at CI −150 g/MJ, $70/t, 2027 benchmark) ≈ $1.15/Nm³; range $0.81–2.06. Avoided-methane credit for 2 × 10 years if built before 2030." }, source: "CARB LCFS regulation (2024 amendments, eff. 2025-07-01) §95484, §95486.1, §95488.9; CARB monthly credit reports Oct 2025 – Sep 2026 ($55–81/t)", confidence: "LOW" }),
    ]),
    notes: { en: ["Low gas prices make biogas without credits unattractive; transport-fuel credits, not electricity savings, decide most US projects."] },
  },
  {
    code: "CA", name: "Canada", currency: "CAD", fx: 1.52, tier: "A", regime: "CA", inj: true,
    elec: 0.09, exp: 0.04, gas: 10, labour: 26, capex: 1.1, disc: 0.075, debtRate: 0.06, tkm: 0.14, bm: [0.15, 0.25, 0.4], fertN: 1.1, ef: 0.12,
    regions: [region("ontario", "Ontario (Guelph)", [-7.5, -6.5, -2.0, 5.5, 12.0, 17.0, 19.8, 18.8, 14.5, 8.0, 2.0, -4.0]), region("alberta", "Alberta (Lethbridge)", [-6.5, -4.5, 0.0, 6.5, 11.5, 15.8, 19.0, 18.3, 13.0, 6.8, -1.0, -5.5])],
    support: sup("The RNG business case is negotiated utility offtake (≈ CAD 25–45/GJ); Clean Fuel Regulations credits and the Clean Technology ITC are uncertain extras. No electricity feed-in tariff.", [
      sch({ id: "ca.rng", name: "Utility RNG offtake (FortisBC, Énergir, Enbridge)", status: "competitive", biomethaneEurNm3: 0.62, routes: ["biomethane"], note: { en: "Bilateral 10–20-year contracts; CAD 25/GJ conservative, CAD 30–45/GJ seen for agricultural RNG." }, source: "BC GGRR 102/2012 s.2.2, s.9; Régie de l'énergie R-4320-2025", confidence: "LOW" }),
    ]),
    notes: { en: ["Cold winters and low power prices: RNG contracts are usually the business case."] },
  },
  // ---------------- Latin America ----------------
  {
    code: "MX", name: "Mexico", currency: "MXN", fx: 20.5, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.1, exp: 0.06, gas: 20, labour: 5, capex: 0.8, disc: 0.12, debtRate: 0.1, tkm: 0.08, bm: NO_GRID_BM, fertN: 0.9, ef: 0.43,
    regions: [region("jalisco", "Jalisco highlands", [16.5, 18.0, 20.3, 22.5, 24.3, 23.3, 21.5, 21.5, 21.3, 20.0, 18.3, 16.8], { es: "Altos de Jalisco" })],
    support: none("No operating support for biogas; the 2025 Electricity Sector Law raises the distributed-generation threshold to 0.7 MW and simplifies self-supply permits."),
    notes: { en: ["Warm climate allows covered lagoons for pig and dairy effluent."] },
  },
  {
    code: "AR", name: "Argentina", currency: "ARS", fx: 1450, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.08, exp: 0.05, gas: 12, labour: 6, capex: 0.85, disc: 0.16, debtRate: 0.14, tkm: 0.08, bm: [0.2, 0.28, 0.4], fertN: 0.9, ef: 0.33,
    regions: [region("cordoba", "Córdoba / Pampas", [24.2, 22.8, 21.0, 17.3, 14.0, 10.7, 10.2, 12.0, 15.0, 18.4, 21.2, 23.4], { es: "Córdoba / Pampa" })],
    support: none("No support scheme for new small biogas: RenovAr has had no rounds since 2019; only private PPAs (MATER) and self-supply. Very high currency risk."),
    notes: { en: ["Feedlots and dairy in the Pampas; currency risk dominates the discount rate."] },
  },
  {
    code: "BR", name: "Brazil", currency: "BRL", fx: 6.2, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.13, exp: 0.05, gas: 45, labour: 6, capex: 0.8, disc: 0.12, debtRate: 0.11, tkm: 0.08, bm: [0.35, 0.45, 0.6], fertN: 0.95, ef: 0.08,
    regions: [region("santa-catarina", "West Santa Catarina / Paraná (pigs & poultry)", [22.5, 22.3, 21.3, 18.5, 15.5, 13.8, 13.5, 15.2, 16.5, 19.0, 20.8, 22.0], { pt: "Oeste catarinense / Paraná" }), region("sao-paulo", "São Paulo interior (sugarcane)", [24.0, 24.3, 23.8, 22.5, 20.0, 18.8, 19.0, 21.0, 22.8, 23.8, 23.8, 24.0], { pt: "Interior de São Paulo" })],
    support: none("No price support: biomethane relies on the new mandate market (0.5 % in 2026) and small CHP on distributed-generation net metering; CBIOs add little."),
    notes: { en: ["Sugar-ethanol vinasse and press mud are the largest feedstock; covered lagoons dominate in the warm South."] },
  },
  // ---------------- Asia ----------------
  {
    code: "IN", name: "India", currency: "INR", fx: 95, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.09, exp: 0.05, gas: 40, labour: 3, capex: 0.6, disc: 0.12, debtRate: 0.1, tkm: 0.05, bm: [0.35, 0.45, 0.6], fertN: 0.5, fertFactor: 0.45, ef: 0.71,
    regions: [region("punjab", "Punjab", [12.8, 15.8, 20.8, 27.0, 31.3, 32.5, 30.5, 29.8, 28.8, 25.3, 19.3, 14.3]), region("maharashtra", "Maharashtra (Pune)", [20.8, 22.5, 25.5, 28.5, 29.0, 26.5, 24.8, 24.3, 24.5, 24.8, 22.5, 20.5])],
    support: sup("GOBARdhan (Cabinet, 6 Aug 2026): administered CBG price ₹2,110/MMBtu for at least ten years (FY2026-27 to FY2035-36) with CGD purchase obligations; capital aid up to ₹2 crore per TPD (not modelled). No biogas-power tariff.", [
      { id: "in.cbg", name: "GOBARdhan administered CBG price", status: "open", biomethaneEurNm3: indiaCbgProcurementPrice(), routes: ["biomethane"], note: { en: "₹2,110/MMBtu (≈ ₹105/kg CBG), at least ten years; CGD purchase obligation 3 % / 4 % / 5 % from FY27 / FY28 / FY29. Capital aid not added." }, source: "PIB GOBARdhan backgrounder 2026-08-06", confidence: "MEDIUM", checkedOn: "2026-10-30" },
    ], true, "2026-10-30"),
    notes: { en: ["Dung collection from many small holdings is the main logistics challenge; urea is subsidised, so digestate N has low cash value."] },
  },
  {
    code: "TH", name: "Thailand", currency: "THB", fx: 38, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.11, exp: 0.07, gas: 35, labour: 4, capex: 0.7, disc: 0.09, debtRate: 0.07, tkm: 0.06, bm: NO_GRID_BM, fertN: 0.9, ef: 0.47,
    regions: [region("central", "Central Thailand", [26.5, 28.0, 29.3, 30.3, 29.8, 29.0, 28.6, 28.4, 28.0, 27.8, 27.3, 26.0], { th: "ภาคกลาง" }), region("south", "Southern Thailand (palm oil)", [26.0, 26.8, 27.8, 28.6, 28.6, 28.2, 27.8, 27.8, 27.4, 27.0, 26.4, 26.0], { th: "ภาคใต้" })],
    support: sup("The biogas feed-in tariff (2.07 THB/kWh) awarded no biogas projects in the 2022 round and no new round is open; industrial biogas runs on self-use.", [
      sch({ id: "th.fit", name: "VSPP/SPP biogas FiT 2022–2030", status: "closed", electricityTariffEurKwh: 0.055, routes: ["chp"], note: { en: "2.0724 THB/kWh (+0.50 in southern border provinces); shown for reference — no open round." }, source: "ERC 2022 RE FiT procurement regulation", confidence: "MEDIUM" }),
    ], false),
    notes: { en: ["POME covered lagoons at palm-oil mills are the standard industrial application."] },
  },
  {
    code: "VN", name: "Vietnam", currency: "VND", fx: 28500, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.08, exp: 0.05, gas: 35, labour: 3, capex: 0.65, disc: 0.11, debtRate: 0.09, tkm: 0.05, bm: NO_GRID_BM, fertN: 0.85, ef: 0.6,
    regions: [region("mekong", "Mekong Delta", [25.8, 26.5, 27.8, 28.9, 28.5, 27.8, 27.4, 27.3, 27.2, 27.1, 26.9, 25.9], { vi: "Đồng bằng sông Cửu Long" }), region("red-river", "Red River Delta", [16.4, 17.0, 20.2, 23.7, 27.3, 28.8, 29.1, 28.6, 27.5, 24.9, 21.5, 18.2], { vi: "Đồng bằng sông Hồng" })],
    support: none("No feed-in tariff for new biogas; EVN prices are negotiated under MOIT ceilings (biomass ≈ VND 2 092/kWh in 2025). Self-use is the realistic route."),
    notes: { en: ["Hundreds of thousands of small household digesters; commercial pig-farm and food-industry plants are the growth segment."] },
  },
  {
    code: "KZ", name: "Kazakhstan", currency: "KZT", fx: 560, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.06, exp: 0.03, gas: 8, labour: 5, capex: 0.8, disc: 0.13, debtRate: 0.12, tkm: 0.07, bm: [0.1, 0.15, 0.2], fertN: 0.8, ef: 0.6,
    regions: [region("north", "Northern Kazakhstan (Kostanay)", [-15.5, -14.5, -7.5, 5.5, 13.5, 19.5, 21.0, 19.0, 12.5, 4.5, -5.0, -12.5]), region("south", "Almaty region", [-5.0, -3.5, 3.5, 11.5, 16.5, 21.5, 24.0, 23.0, 17.5, 10.0, 2.5, -3.0])],
    support: none("The only route is competitive RES auctions with small, irregular biogas lots (last confirmed November 2024); no open fixed tariff."),
    notes: { en: ["Very cheap gas and power make biogas hard to justify on energy alone; waste treatment and fertiliser drive the case."] },
  },
];

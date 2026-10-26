import type { Confidence, DataKind } from "@/core/types";
import climate from "./data/climate.json";
import risk from "./data/country-risk.json";
import fert from "./data/fertiliser.json";
import gridEf from "./data/grid-ef.json";
import stats from "./data/statistics.json";
import calibration from "./data/capex-calibration.json";

/**
 * Sourced market data. Generated JSON (scripts/data/*.py) holds the official statistics;
 * this module turns them into the numbers the model uses and documents every derivation.
 * Where no official series exists, MANUAL holds a value read in a named national source.
 */
export interface Sourced {
  value: number;
  kind: DataKind;
  confidence: Confidence;
  source: string;
  date: string;
}

type Stats = {
  fetchedOn: string;
  electricity: Record<string, { eurKwh: number; periods: string[] }>;
  gas: Record<string, { eurMwh: number; periods: string[] }>;
  labour: Record<string, { eurH: number; year: string }>;
  fx: Record<string, { perEur: number; year: string }>;
  dayAhead: Record<string, { eurMwh?: number; bzn: string; from?: string; to?: string }>;
};
const S = stats as unknown as Stats;
const CAL = calibration as unknown as { countries: Record<string, { factor?: number; n: number; confidence: Confidence; ids: string[] }> };
const R = risk as { source: string; countries: Record<string, { rating: string; crp: number }> };
const EF = gridEf as { source: string; countries: Record<string, { year: number; tCo2Mwh: number }> };
const FERT = fert as { source: string; period: string[]; eurPerKg: { N: number; P2O5: number; K2O: number } };

const per = (p: string[]) => p.join(" & ");

/**
 * Values read in national primary sources for countries outside the Eurostat price surveys (checked 2026-10-25/26).
 * `lab` is the final operator cost in €/h (method in labourFor); `capex` overrides the labour-based factor only
 * where a market benchmark shows the formula is off.
 */
type Manual = { v: number; src: string; conf: Confidence; date: string; ratio?: number };
const MANUAL: Record<string, Partial<Record<"elec" | "gas" | "spot" | "lab" | "capex", Manual>>> = {
  UA: {
    spot: { v: 0.132, src: "Day-ahead market average 2025 ≈ 6 200 UAH/MWh (GMK Center) ÷ 47.09 UAH/€ — press-reported, to be confirmed with the market operator", conf: "MEDIUM", date: "2025-12-31" },
    lab: { v: 4.3, ratio: 1.14, src: "Derzhstat average wage 26.5 k UAH/month (Jul 2025) × 1.22 employer contributions ÷ 160 h ÷ 47.09 UAH/€; skilled operator premium 1.14", conf: "MEDIUM", date: "2025-12-31" },
    elec: { v: 0.17, src: "Market operator day-ahead 5.5–6.9 k UAH/MWh (2025, GMK Center) + Ukrenergo transmission 713–928 UAH/MWh (2026) + distribution & supply; cross-checked with business invoices", conf: "MEDIUM", date: "2026-08-01" },
    gas: { v: 46, src: "Industrial gas ≈ $498/tcm (Dec 2025, GMK Center) incl. transmission", conf: "MEDIUM", date: "2025-12-31" },
  },
  GB: {
    spot: { v: 0.095, src: "GB day-ahead mean 2025 £81.2/MWh (Electricity Maps, from EPEX/N2EX) ÷ 0.85679 £/€", conf: "MEDIUM", date: "2025-12-31" },
    lab: { v: 30.9, ratio: 0.7, src: "ONS ASHE 2025 (prov.) median hourly pay £19.67 × 1.17 mean/median × 1.15 employer NI (from Apr 2025) + pension ≈ £26.5/h ÷ 0.85679 £/€", conf: "MEDIUM", date: "2025-04-30" },
    elec: { v: 0.286, src: "DESNZ Quarterly Energy Prices, table 3.4.1 (excl. CCL & VAT), medium non-domestic consumers, mean of 2025 Q3 – 2026 Q2 (24.5 p/kWh)", conf: "HIGH", date: "2026-09-29" },
    gas: { v: 47.1, src: "DESNZ QEP table 3.4.1, medium non-domestic gas, mean of 2025 Q3 – 2026 Q2 (4.03 p/kWh)", conf: "HIGH", date: "2026-09-29" },
  },
  US: {
    spot: { v: 0.042, src: "EIA STEO (Oct 2026): load-weighted average of 11 U.S. wholesale hubs ≈ $47/MWh in 2025 ÷ 1.13 $/€", conf: "HIGH", date: "2026-10-01" },
    lab: { v: 40.8, ratio: 0.7, src: "BLS Employer Costs for Employee Compensation, private industry, Dec 2025: $46.15 per hour worked ÷ 1.13 $/€", conf: "HIGH", date: "2025-12-31" },
    elec: { v: 0.102, src: "EIA Electric Power Monthly table 5.6.A: U.S. commercial 14.5 ¢ and industrial 9.6 ¢/kWh (Aug 2026); farms/processors taken at ≈ 11.5 ¢ — state prices differ by ×3 (CA ≈ 24–30 ¢)", conf: "MEDIUM", date: "2026-10-01" },
    gas: { v: 15.2, src: "EIA Natural Gas Prices: industrial $5.23/Mcf (2025 annual) → $17.2/MWh", conf: "HIGH", date: "2026-06-30" },
    capex: { v: 1.12, src: "Labour formula gives 0.97, but US EPA AgSTAR cost data ($1 100–1 500 per cow at 500 cows) sit ≈ 15–25 % above the model at factor 1.0 (docs/capex-benchmark.md, point 9): higher engineering, permitting and interconnection cost", conf: "MEDIUM", date: "2026-10-24" },
  },
  CA: {
    spot: { v: 0.028, src: "Alberta Electric System Operator / MSA Q4 2025 report: 2025 average pool price CAD 43.68/MWh ÷ 1.5787 CAD/€", conf: "HIGH", date: "2025-12-31" },
    lab: { v: 30.5, ratio: 0.7, src: "Statistics Canada LFS average hourly wage 2024 CAD 35.20 × 1.035 (2025) × 1.10 paid/worked × 1.20 employer costs = CAD 48.1/h ÷ 1.5787 CAD/€", conf: "MEDIUM", date: "2025-12-31" },
    elec: { v: 0.068, src: "Hydro-Québec, Comparison of Electricity Prices in Major North American Cities (rates 1 Apr 2025, excl. tax), large power: Montréal 5.83, Calgary 8.02, Edmonton 10.17, Ottawa 12.75, Toronto 12.80 ¢/kWh → mean 9.9 ¢ + 8 % for a medium-size load = 10.7 ¢ CAD; Intratec industrial 9.8 ¢ (Jan 2026) cross-check", conf: "MEDIUM", date: "2025-04-01" },
    gas: { v: 11.4, src: "AECO-C 2025 ≈ CAD 1.6–2.7/GJ (Alberta Energy Regulator; Alberta gas reference price) + ≈ CAD 3/GJ transport & distribution for a mid-size industrial user (assumption) → ≈ CAD 5/GJ = 18 CAD/MWh", conf: "LOW", date: "2025-12-31" },
  },
  TR: {
    spot: { v: 0.057, src: "EPİAŞ market clearing price (PTF) 2025 ≈ 2 550 TL/MWh (monthly values) ÷ 44.8161 TL/€", conf: "MEDIUM", date: "2025-12-31" },
    lab: { v: 7.4, src: "TÜİK labour cost 2024: 248.1 TL/h ÷ 44.8161 TL/€ × 1.34 (labour-input index, 2025 y/y, +34.2 %)", conf: "MEDIUM", date: "2025-12-25" },
  },
  MD: {
    spot: { v: 0.130, src: "ANRE: Energocom average purchase price 2.54 MDL/kWh (2026 tariff note) ÷ 19.59 MDL/€ — regulated price, not a spot quote", conf: "MEDIUM", date: "2026-03-31" },
    lab: { v: 6.5, src: "NBS Moldova: average gross wage 2025 15 472 MDL/month × 12 × 1.24 employer contributions ÷ 1 800 h = 128 MDL/h ÷ 19.59 MDL/€", conf: "MEDIUM", date: "2025-12-31" },
  },
  KZ: {
    spot: { v: 0.020, src: "Ministry of Energy ceiling generation tariffs 2025 (≈ 12 KZT/kWh typical) ÷ 589.9 KZT/€ — ceiling, not a market price", conf: "LOW", date: "2025-02-01" },
    lab: { v: 5.6, src: "Bureau of National Statistics: average nominal wage 2025 443 315 KZT/month × 12 × 1.14 employer contributions ÷ 1 850 h = 3 278 KZT/h ÷ 589.9 KZT/€", conf: "MEDIUM", date: "2025-12-31" },
    elec: { v: 0.054, src: "Almaty Energosbyt: average price for customers 31.85 KZT/kWh excl. VAT from 15 Jul 2025 (regional tariffs differ; Astana-REK applied for 31.67)", conf: "MEDIUM", date: "2025-07-15" },
  },
  MX: {
    spot: { v: 0.041, src: "Day-ahead price SIN Jan–Oct 2025 880 MXN/MWh (IMCO, citing CENACE data) ÷ 21.67 MXN/€ — press-reported", conf: "MEDIUM", date: "2025-10-31" },
    lab: { v: 6.1, src: "IMSS: average contribution salary Dec 2025 627.9 MXN/day × 365 × 1.30 employer contributions ÷ 2 250 h = 132 MXN/h ÷ 21.67 MXN/€", conf: "MEDIUM", date: "2025-12-31" },
    elec: { v: 0.085, src: "CFE GDMTH: average energy charge 1.06 MXN/kWh (2023) + ≈ 20 % tariff increases 2024–25 + demand, capacity & distribution charges ≈ 0.5 MXN/kWh → ≈ 1.8 MXN/kWh; no official 2025 average published", conf: "LOW", date: "2025-12-31" },
    gas: { v: 15.1, src: "Henry Hub 2025 average $3.52/MMBtu (EIA) + ≈ $1.5/MMBtu pipeline & marketing to Mexican industry (CRE IPGN is Henry-Hub-indexed) = $5.0/MMBtu → 17.1 $/MWh", conf: "MEDIUM", date: "2025-12-31" },
  },
  AR: {
    spot: { v: 0.044, src: "Secretaría de Energía Res. 110/2025: stabilised energy price for CAMMESA ≈ 61 500 ARS/MWh ÷ 1 409 ARS/€ — regulated, official", conf: "HIGH", date: "2025-03-01" },
    lab: { v: 8.9, src: "RIPTE 2025 average 1 469 932 ARS/month (SIPA stable workers) × 13 × 1.24 employer contributions ÷ 1 900 h = 12 470 ARS/h ÷ 1 409 ARS/€", conf: "MEDIUM", date: "2025-12-31" },
    elec: { v: 0.069, src: "Secretaría de Energía Res. 110/2025 (GUDI ≥ 300 kW): stabilised energy ≈ 61 500 ARS/MWh + capacity 5.44 M ARS/MW-month (≈ 10 600 ARS/MWh at 70 % load factor) + distribution ≈ 35 % (assumption) → ≈ 97 000 ARS/MWh", conf: "LOW", date: "2025-03-01" },
  },
  BR: {
    spot: { v: 0.042, src: "CCEE PLD Sudeste/Centro-Oeste, mid-2025 mean R$ 262.6/MWh (InformaCCEE Jun 2025) ÷ 6.3072 BRL/€ — partial year, to be replaced by the full-year mean", conf: "MEDIUM", date: "2025-06-25" },
    lab: { v: 5.2, src: "IBGE PNAD Contínua: average habitual income from work 2025 R$ 3 560/month × 13.33 × 1.358 employer costs ÷ 1 950 h = 33 R$/h ÷ 6.3072 BRL/€", conf: "MEDIUM", date: "2025-12-31" },
    gas: { v: 44.9, src: "Gasmig industrial tariff R$ 3.089/m³ (Minas Gerais, 2025 revision) at 10.9 kWh/m³ (GCV) = 283 R$/MWh; CNI: industrial gas ≈ US$ 20/MMBtu incl. taxes (2025) — state tariffs differ", conf: "MEDIUM", date: "2025-12-31" },
    capex: { v: 0.95, src: "BNDES-financed 2.15 MW biogas plant, Elias Fausto (SP): R$ 56.2 M ≈ 4 150 €/kW — at German level despite low labour cost (import duties on engines, upgrading and membranes); single project", conf: "LOW", date: "2024-03-01" },
  },
  TH: {
    lab: { v: 2.4, src: "Average monthly wage ≈ 15 700 THB (secondary source, NSO table not verified) × 12 × 1.05 social security ÷ 2 200 h ÷ 37.1 THB/€", conf: "LOW", date: "2025-12-31" },
    elec: { v: 0.106, src: "ERC: average tariff 3.95 THB/kWh excl. VAT (base 3.78 + Ft 0.1623), May–Aug 2026", conf: "HIGH", date: "2026-05-01" },
  },
  VN: {
    lab: { v: 2.2, src: "National Statistics Office LFS: salaried employees ≈ 9.4 M VND/month × 12 × 1.215 employer contributions ÷ 2 100 h = 65 300 VND/h ÷ 29 639 VND/€", conf: "MEDIUM", date: "2025-09-30" },
    elec: { v: 0.074, src: "EVN Decision 599/QĐ-EVN (7 May 2025): average retail price 2 204.07 VND/kWh excl. VAT from 10 May 2025 ÷ 29 639 VND/€ — all-customer average, not the business band (press-reported; verify on evn.com.vn)", conf: "MEDIUM", date: "2025-05-10" },
  },
  IN: {
    spot: { v: 0.039, src: "IEX day-ahead market average FY 2025-26 Rs 3.86/kWh ÷ 98.52 INR/€", conf: "HIGH", date: "2026-03-31" },
    lab: { v: 1.3, src: "MoSPI PLFS: regular wage/salaried employees ≈ Rs 22 000/month (2025) × 12 × 1.15 employer EPF/ESI ÷ 2 300 h = 132 INR/h ÷ 98.52 INR/€", conf: "MEDIUM", date: "2025-12-31" },
    // PPAC domestic gas price 2025 ≈ $6.4–7.0/MMBtu (FIPI / PPAC monthly series) + ≈ $1.5/MMBtu transport & distribution to an industrial user (assumption) → €/MWh
    gas: { v: 24.8, src: "PPAC domestic natural-gas price 2025, monthly $6.25–7.02/MMBtu (average ≈ $6.7; FIPI Policy & Economic Reports) + $1.5/MMBtu pipeline & distribution adder (assumption) = $8.2/MMBtu × 3.412 MWh/MMBtu ÷ 1.13 $/€", conf: "MEDIUM", date: "2026-01-31" },
    elec: { v: 0.076, src: "Industrial ≈ 6.7 INR/kWh (Intratec index, Dec 2025) + demand charges ≈ 0.8 INR/kWh; state tariffs 5.5–9 INR/kWh (CEA tariff report 2026)", conf: "LOW", date: "2025-12-31" },
    capex: { v: 0.55, src: "SATAT CBG plant, Bagalkot (Karnataka): ₹ 42 crore for 10.2 t/day CBG from 200 t/day press mud ≈ 1 000 Nm³/h raw biogas → ≈ €4.3 M vs ≈ €8 M for the same plant at German prices; Indian-made digesters and upgrading. Single project — check against SATAT tenders", conf: "LOW", date: "2025-06-30" },
  },
};

/** Biomethane / bio-CNG prices read in official sources for markets outside EU grid injection: [conservative, base, optimistic] €/Nm³. */
const BIOMETHANE: Record<string, { v: [number, number, number]; src: string; conf: Confidence; date: string }> = {
  IN: { v: [0.39, 0.5, 0.55], src: "MoPNG SATAT procurement price Rs 1 478/MMBtu excl. GST from 1 Jun 2025 (85 % of average CNG retail) = Rs 48.8/Nm³ → 0.50 €/Nm³; conservative = floor Rs 54/kg (≈ Rs 38.8/Nm³); optimistic = direct industrial/CNG-station sale", conf: "MEDIUM", date: "2025-06-01" },
};
export function biomethaneFor(code: string) {
  return BIOMETHANE[code];
}

export function fxFor(currency: string): Sourced | undefined {
  if (currency === "EUR") return { value: 1, kind: "FACT", confidence: "HIGH", source: "Euro", date: S.fetchedOn };
  const f = S.fx[currency];
  return f && { value: +f.perEur.toFixed(f.perEur > 100 ? 0 : 3), kind: "FACT", confidence: "HIGH", source: `Eurostat ert_bil_eur_a, ECB reference rate, annual average ${f.year}`, date: `${f.year}-12-31` };
}

export function electricityFor(code: string): Sourced | undefined {
  const e = S.electricity[code];
  // Published official statistic for a defined consumer band — used directly, so HIGH (the band average, not the customer's own tariff).
  if (e) return { value: e.eurKwh, kind: "FACT", confidence: "HIGH", source: `Eurostat nrg_pc_205: non-household electricity, band IC (500–1 999 MWh/a), excl. VAT & recoverable taxes, mean of ${per(e.periods)}`, date: S.fetchedOn };
  const m = MANUAL[code]?.elec;
  return m && { value: m.v, kind: m.conf === "HIGH" ? "FACT" : "ESTIMATE", confidence: m.conf, source: m.src, date: m.date };
}

export function gasFor(code: string): Sourced | undefined {
  const g = S.gas[code];
  if (g) return { value: g.eurMwh, kind: "FACT", confidence: "HIGH", source: `Eurostat nrg_pc_203: non-household gas, band I3 (10 000–99 999 GJ/a), excl. VAT & recoverable taxes, mean of ${per(g.periods)}`, date: S.fetchedOn };
  const m = MANUAL[code]?.gas;
  return m && { value: m.v, kind: m.conf === "HIGH" ? "FACT" : "ESTIMATE", confidence: m.conf, source: m.src, date: m.date };
}

/** Wholesale electricity price, €/kWh: the official day-ahead average where published (ENTSO-E via Energy-Charts), else the country's own published value. */
export function spotFor(code: string): Sourced | undefined {
  const d = S.dayAhead[code];
  if (d?.eurMwh) return { value: +(d.eurMwh / 1000).toFixed(3), kind: "FACT", confidence: "HIGH", source: `Day-ahead average ${d.eurMwh} €/MWh, bidding zone ${d.bzn}, ${d.from} – ${d.to} (Energy-Charts / ENTSO-E)`, date: S.fetchedOn };
  const m = MANUAL[code]?.spot;
  return m && { value: m.v, kind: m.conf === "HIGH" && !["AR", "MD", "KZ"].includes(code) ? "FACT" : "ESTIMATE", confidence: m.conf, source: m.src, date: m.date };
}

/** Share of the wholesale price a small seller realises for surplus power (shape & balancing discount). */
const HAIRCUT: Record<string, { v: number; src: string }> = {
  UA: { v: 0.7, src: "30 % profile & balancing discount for a small seller (assumption; Ukrainian market prices are volatile and include a 2026 price-cap regime)" },
};
export function haircutFor(code: string): Sourced {
  const h = HAIRCUT[code];
  return h
    ? { value: h.v, kind: "ASSUMPTION", confidence: "MEDIUM", source: h.src, date: "2026-10-26" }
    : { value: 0.85, kind: "ASSUMPTION", confidence: "MEDIUM", source: "15 % profile & balancing discount for a small seller (assumption, same for all markets)", date: "2026-10-26" };
}

/** Operator wage relative to the economy-wide average: 0.70 in high-income economies (skilled services inflate the average), 1.0 elsewhere unless the country sets its own. */
export function operatorRatioFor(code: string): Sourced {
  const m = MANUAL[code]?.lab;
  const value = m?.ratio ?? (S.labour[code] ? 0.7 : 1);
  return { value, kind: "ASSUMPTION", confidence: "MEDIUM", source: value === 0.7 ? "Plant operator ≈ 70 % of the economy-wide average hourly cost (high-income economy)" : m?.ratio ? "Skilled plant operator premium (see labour source)" : "Plant operator ≈ economy-wide average (middle-income economy; no premium)", date: "2026-10-26" };
}

/** Official hourly labour cost, economy-wide (wages + employer costs) — HIGH where Eurostat publishes it. */
export function labourOfficialFor(code: string): Sourced | undefined {
  const l = S.labour[code];
  if (l) return { value: l.eurH, kind: "FACT", confidence: "HIGH", source: `Eurostat lc_lci_lev: hourly labour cost (wages + employer costs), industry, construction & services, ${l.year}`, date: `${l.year}-12-31` };
  const m = MANUAL[code]?.lab;
  return m && { value: m.v, kind: m.conf === "HIGH" ? "FACT" : "CALCULATION", confidence: m.conf, source: m.src, date: m.date };
}

/** Plant operator cost, €/h = official labour cost × operator ratio. */
export function labourFor(code: string): Sourced | undefined {
  const o = labourOfficialFor(code);
  if (!o) return undefined;
  const r = operatorRatioFor(code);
  const value = +(o.value * r.value).toFixed(1);
  return { value, kind: "CALCULATION", confidence: o.confidence === "LOW" ? "LOW" : "MEDIUM", source: `${o.value} €/h official labour cost × ${r.value} operator ratio`, date: o.date };
}

/** Local CAPEX factor: 72 % of a plant is internationally priced equipment, 28 % civil works & installation scaled by local operator cost (Germany = 1). */
export function capexFactorFor(code: string): Sourced | undefined {
  const m = MANUAL[code]?.capex;
  if (m) return { value: m.v, kind: "CALCULATION", confidence: m.conf, source: m.src, date: m.date };
  // Published plant costs (scripts/calibrate-capex.ts): only MEDIUM calibrations are applied; LOW ones are kept for the record.
  const cal = CAL.countries[code];
  if (cal?.factor !== undefined && cal.confidence === "MEDIUM") {
    return { value: cal.factor, kind: "CALCULATION", confidence: "MEDIUM", source: `Calibrated to ${cal.n} published CHP plant costs (${cal.ids.join(", ")}); see docs/capex-benchmark.md, section 6`, date: "2026-10-26" };
  }
  const l = labourFor(code);
  const de = labourFor("DE");
  if (!l || !de) return undefined;
  const f = +Math.min(1.12, Math.max(0.78, 0.72 + 0.28 * (l.value / de.value))).toFixed(2);
  // The 72 % traded-equipment share holds for markets that import their plant (EU, GB, CA); where local manufacturers
  // or import duties dominate, the formula is only indicative until a project benchmark exists.
  const benchmarked = Boolean(S.labour[code]) || code === "GB" || code === "CA";
  return { value: f, kind: "CALCULATION", confidence: benchmarked && l.confidence !== "LOW" ? "MEDIUM" : "LOW", source: `0.72 traded equipment + 0.28 × local/German operator labour cost (${l.value}/${de.value} €/h); cost split after DBFZ/Fraunhofer cost study (2024)${benchmarked ? "" : "; no national cost benchmark found — supplier quotes needed"}`, date: l.date };
}

/** EUR-equivalent project discount rate = 6.0 % mature-market project WACC + 0.6 × Damodaran country risk premium (λ-approach), capped at 16 %. */
export const BASE_WACC = 0.06;
export const COUNTRY_RISK_LAMBDA = 0.6;
export function discountFor(code: string): Sourced | undefined {
  const c = R.countries[code];
  if (!c) return undefined;
  const v = +Math.min(0.16, BASE_WACC + COUNTRY_RISK_LAMBDA * c.crp).toFixed(3);
  return { value: v, kind: "CALCULATION", confidence: "MEDIUM", source: `${(BASE_WACC * 100).toFixed(1)} % mature-market project WACC + ${COUNTRY_RISK_LAMBDA} × country risk premium ${(c.crp * 100).toFixed(2)} % (${c.rating}; ${R.source})`, date: "2026-02-16" };
}

export function debtRateFor(code: string): Sourced | undefined {
  const d = discountFor(code);
  if (!d) return undefined;
  const value = +Math.max(0.045, d.value - 0.015).toFixed(3);
  // Low-risk markets: cross-checked against ECB MFI interest-rate statistics (new loans to non-financial
  // corporations > €1 M ≈ 4–5 % in 2025) plus a project-finance margin. High-risk markets stay LOW.
  return { value, kind: "CALCULATION", confidence: value <= 0.065 ? "MEDIUM" : "LOW", source: `Discount rate − 1.5 pp (senior debt is cheaper than blended project capital)${value <= 0.065 ? "; consistent with ECB MIR corporate loan rates + project margin" : ""}; a bank term sheet replaces this`, date: d.date };
}

export function gridEfFor(code: string): Sourced | undefined {
  const e = EF.countries[code];
  return e && { value: e.tCo2Mwh, kind: "FACT", confidence: "HIGH", source: `${EF.source}, ${e.year}`, date: `${e.year}-12-31` };
}

export function fertiliserFor(nutrient: "N" | "P2O5" | "K2O", factor = 1): Sourced {
  return { value: +(FERT.eurPerKg[nutrient] * factor).toFixed(2), kind: "CALCULATION", confidence: "MEDIUM", source: `${FERT.source}; nutrient content → €/kg × 1.35 farm-gate markup${factor !== 1 ? ` × ${factor} national subsidy factor` : ""}`, date: `${FERT.period[1].slice(0, 4)}-${FERT.period[1].slice(5)}-28` };
}

export interface ClimateRegion {
  country: string;
  id: string;
  name: string;
  names: Record<string, string>;
  lat: number;
  lon: number;
  elevationM?: number;
  monthlyTempC: number[];
}
const C = climate as unknown as { source: string; fetchedOn: string; regions: Record<string, ClimateRegion> };
export const CLIMATE_SOURCE = C.source;
export const climateRegionsFor = (code: string): ClimateRegion[] => Object.values(C.regions).filter((r) => r.country === code);

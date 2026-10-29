import type { Confidence, DataKind, ParameterEvidence, ParameterRange, RouteId } from "@/core/types";
import climate from "./data/climate.json";
import risk from "./data/country-risk.json";
import fert from "./data/fertiliser.json";
import gridEf from "./data/grid-ef.json";
import stats from "./data/statistics.json";
import calibration from "./data/capex-calibration.json";
import observations from "./data/market-observations.json";
import { ENGINEERING_MAP } from "@/core/engineeringParams";
import { periodEnd } from "@/core/modelAudit";

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
  evidence?: ParameterEvidence;
  range?: ParameterRange;
}

type PriceRow = { periods: string[]; sourceUpdated?: string; fetchedOn?: string; url?: string };
type Stats = {
  fetchedOn: string;
  electricity: Record<string, PriceRow & { eurKwh: number; bands?: Record<string, PriceRow & { eurKwh: number }> }>;
  gas: Record<string, PriceRow & { eurMwh: number; bands?: Record<string, PriceRow & { eurMwh: number }> }>;
  labour: Record<string, { eurH: number; year: string }>;
  fx: Record<string, { perEur: number; year: string }>;
  fxReference?: { asOf: string; fetchedOn: string; url: string; rates: Record<string, number> };
  fxNational?: Record<string, { perEur: number; asOf: string; fetchedOn: string; url: string }>;
  dayAhead: Record<string, { eurMwh?: number; bzn: string; from?: string; to?: string; fetchedOn?: string; url?: string }>;
};
const S = stats as unknown as Stats;
const CAL = calibration as unknown as { countries: Record<string, { factor?: number; n: number; confidence: Confidence; applied?: boolean; ids: string[]; biomethane?: { factor: number; n: number } }> };
const R = risk as { source: string; observedThrough: string; publishedOn: string; checkedOn: string; url: string; countries: Record<string, { rating: string; crp: number }> };
const EF = gridEf as { source: string; countries: Record<string, { year: number; tCo2Mwh: number }> };
const FERT = fert;

const per = (p: string[]) => p.join(" & ");

interface Observation {
  country: string;
  parameter: "elec" | "lab";
  currency: string;
  unit: string;
  value?: number;
  regionalValues?: Record<string, number>;
  regionIds?: string[];
  bounds?: number[];
  period: string;
  scope: string;
  method: string;
  urls: string[];
  confidence: Confidence;
  validFrom?: string;
  validUntil?: string;
  wage?: { monthly: number; employerMultiplier: number; annualHours: number };
  timeOfUse?: { rates: number[]; weeklyHours: number[]; fuelAdjustment: number; monthlyDemand: number; billingKw: number; monthlyKwh: number; monthlyService: number };
}
const OBSERVATIONS = observations.observations as Observation[];

/** Convert a checked local observation without disguising load/cost assumptions as measured data. */
export function observedMarketValue(code: string, item: "elec" | "lab", regionId?: string): Sourced | undefined {
  const row = OBSERVATIONS.find((r) => r.country === code && r.parameter === item);
  if (!row) return undefined;
  const fx = fxFor(row.currency);
  if (!fx || fx.value <= 0) return undefined;
  const tou = row.timeOfUse;
  const wage = row.wage;
  const local = tou
    ? tou.rates.reduce((sum, rate, i) => sum + rate * tou.weeklyHours[i], 0) / tou.weeklyHours.reduce((a, b) => a + b, 0)
      + tou.fuelAdjustment + (tou.monthlyDemand * tou.billingKw + tou.monthlyService) / tou.monthlyKwh
    : wage ? wage.monthly * 12 * wage.employerMultiplier / wage.annualHours
    : regionId ? row.regionalValues?.[regionId] ?? row.value : row.value;
  if (local === undefined) return undefined;
  const divisor = fx.value * (row.unit === "local/MWh" ? 1000 : 1);
  const regionalProxy = row.regionIds && (!regionId || !row.regionIds.includes(regionId));
  const scope = `${row.scope}${regionId && row.regionalValues?.[regionId] ? ` Selected macro-region reference for ${regionId}.` : ""}`;
  const source = `${scope} ${row.method} FX: ${fx.source}. ${row.urls.join("; ")}`;
  const year = row.period.slice(0, 4);
  const components: NonNullable<ParameterEvidence["components"]> = [
    { name: `FX (${fx.date})`, value: fx.value, unit: `${row.currency}/EUR`, origin: "MARKET_DATA" },
  ];
  if (tou) {
    tou.rates.forEach((rate, i) => {
      components.push({ name: `TOU rate ${i + 1}`, value: rate, unit: `${row.currency}/kWh`, origin: "MARKET_DATA" });
      components.push({ name: `Reference load weight ${i + 1}`, value: tou.weeklyHours[i], unit: "h/week", origin: "ENGINEERING_ASSUMPTION" });
    });
    components.push(
      { name: "Fuel adjustment", value: tou.fuelAdjustment, unit: `${row.currency}/kWh`, origin: tou.fuelAdjustment ? "MARKET_DATA" : "ENGINEERING_ASSUMPTION" },
      { name: "Demand charge", value: tou.monthlyDemand, unit: `${row.currency}/kW/month`, origin: tou.monthlyDemand ? "MARKET_DATA" : "ENGINEERING_ASSUMPTION" },
      { name: "Service charge", value: tou.monthlyService, unit: `${row.currency}/month`, origin: tou.monthlyService ? "MARKET_DATA" : "ENGINEERING_ASSUMPTION" },
      { name: "Reference billing demand", value: tou.billingKw, unit: "kW", origin: "ENGINEERING_ASSUMPTION" },
      { name: "Reference monthly electricity", value: tou.monthlyKwh, unit: "kWh/month", origin: "ENGINEERING_ASSUMPTION" },
    );
  } else if (wage) components.push(
    { name: "Monthly employee wage", value: wage.monthly, unit: `${row.currency}/month`, origin: "MARKET_DATA" },
    { name: "Employer multiplier", value: wage.employerMultiplier, unit: "—", origin: "ENGINEERING_ASSUMPTION" },
    { name: "Annual working hours", value: wage.annualHours, unit: "h/year", origin: "ENGINEERING_ASSUMPTION" },
  );
  else components.push({ name: "Published local tariff", value: local, unit: row.unit.replace("local", row.currency), origin: "MARKET_DATA" });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(row.period) ? row.period
    : row.period.includes("Q2") ? `${year}-06-30`
    : /^\d{4}-\d{2}$/.test(row.period) ? `${row.period}-01` : `${year}-09-01`;
  return {
    value: local / divisor,
    kind: "CALCULATION",
    confidence: regionalProxy ? "LOW" : row.confidence,
    source,
    date,
    evidence: { checkedOn: observations.checkedOn, period: row.period, observedThrough: row.period.includes("/") ? row.period.slice(0, 7) + "-01" : periodEnd(row.period), validFrom: row.validFrom, validUntil: row.validUntil, urls: row.urls, scope, method: `${row.method} ${observations.valuation}`, components, assumptions: tou ? ["Reference weekly load and billing demand; customer invoice takes precedence"] : wage ? ["Employer multiplier and annual working hours are assumed; specialist pay may differ"] : undefined },
    range: row.bounds ? { low: row.bounds[0] / divisor, high: row.bounds[1] / divisor, basis: "observed" } : undefined,
  };
}

/** Energy/Ft charges only: a generator does not automatically reduce billed peak demand. */
export function electricityVariableShareFor(code: string): number {
  const row = OBSERVATIONS.find((r) => r.country === code && r.parameter === "elec");
  const tou = row?.timeOfUse;
  if (!tou) return ENGINEERING_MAP["eng.invoice_variable_share"].value;
  const energy = tou.rates.reduce((sum, rate, i) => sum + rate * tou.weeklyHours[i], 0) / tou.weeklyHours.reduce((a, b) => a + b, 0) + tou.fuelAdjustment;
  return energy / (energy + (tou.monthlyDemand * tou.billingKw + tou.monthlyService) / tou.monthlyKwh);
}

/**
 * Values read in national primary sources for countries outside the Eurostat price surveys (checked 2026-10-25/26).
 * `lab` is the final operator cost in €/h (method in labourFor); `capex` overrides the labour-based factor only
 * where a market benchmark shows the formula is off.
 */
type Manual = { v: number; src: string; conf: Confidence; date: string; ratio?: number; route?: RouteId; gasBasis?: "HHV" | "LHV" };
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
    capex: { v: 1.12, route: "chp", src: "Labour formula gives 0.97, but US EPA AgSTAR cost data ($1 100–1 500 per cow at 500 cows) sit ≈ 15–25 % above the model at factor 1.0: higher engineering, permitting and interconnection cost", conf: "MEDIUM", date: "2026-10-24" },
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
    gas: { v: 44.9, gasBasis: "HHV", src: "Gasmig industrial tariff R$ 3.089/m³ (Minas Gerais, 2025 revision) at 10.9 kWh/m³ (GCV) = 283 R$/MWh; CNI: industrial gas ≈ US$ 20/MMBtu incl. taxes (2025) — state tariffs differ", conf: "MEDIUM", date: "2025-12-31" },
    capex: { v: 0.95, route: "chp", src: "BNDES-financed 2.15 MW biogas plant, Elias Fausto (SP): R$ 56.2 M ≈ 4 150 €/kW — at German level despite low labour cost (import duties on engines, upgrading and membranes); single project", conf: "LOW", date: "2024-03-01" },
  },
  TH: {
  },
  VN: {
    lab: { v: 2.2, src: "National Statistics Office LFS: salaried employees ≈ 9.4 M VND/month × 12 × 1.215 employer contributions ÷ 2 100 h = 65 300 VND/h ÷ 29 639 VND/€", conf: "MEDIUM", date: "2025-09-30" },
  },
  IN: {
    spot: { v: 0.039, src: "IEX day-ahead market average FY 2025-26 Rs 3.86/kWh ÷ 98.52 INR/€", conf: "HIGH", date: "2026-03-31" },
    lab: { v: 1.3, src: "MoSPI PLFS: regular wage/salaried employees ≈ Rs 22 000/month (2025) × 12 × 1.15 employer EPF/ESI ÷ 2 300 h = 132 INR/h ÷ 98.52 INR/€", conf: "MEDIUM", date: "2025-12-31" },
    // PPAC domestic gas price 2025 ≈ $6.4–7.0/MMBtu (FIPI / PPAC monthly series) + ≈ $1.5/MMBtu transport & distribution to an industrial user (assumption) → €/MWh
    gas: { v: 24.8, src: "PPAC domestic natural-gas price 2025, monthly $6.25–7.02/MMBtu (average ≈ $6.7; FIPI Policy & Economic Reports) + $1.5/MMBtu pipeline & distribution adder (assumption) = $8.2/MMBtu × 3.412 MMBtu/MWh ÷ 1.13 $/€", conf: "MEDIUM", date: "2026-01-31" },
    elec: { v: 0.076, src: "Industrial ≈ 6.7 INR/kWh (Intratec index, Dec 2025) + demand charges ≈ 0.8 INR/kWh; state tariffs 5.5–9 INR/kWh (CEA tariff report 2026)", conf: "LOW", date: "2025-12-31" },
    capex: { v: 0.55, route: "biomethane", src: "SATAT CBG plant, Bagalkot (Karnataka): ₹ 42 crore for 10.2 t/day CBG from 200 t/day press mud ≈ 1 000 Nm³/h raw biogas → ≈ €4.3 M vs ≈ €8 M for the same plant at German prices; Indian-made digesters and upgrading. Single project — check against SATAT tenders", conf: "LOW", date: "2025-06-30" },
  },
};

/** Nominal quotes already documented above, retained in their original currency.
 * Revaluing FX never updates the underlying tariff/wage observation period. */
const LOCAL_QUOTES: Record<string, Partial<Record<"elec" | "gas" | "spot" | "lab", [number, string, string]>>> = {
  UA: { spot: [6.2, "UAH", "2025-12-31"], lab: [26500 * 1.22 / 160, "UAH", "2025-07-31"], gas: [498 / 9.5, "USD", "2025-12-31"] },
  GB: { spot: [.0812, "GBP", "2025-12-31"], elec: [.245, "GBP", "2026-06-30"], gas: [40.3, "GBP", "2026-06-30"], lab: [26.5, "GBP", "2025-04-30"] },
  US: { spot: [.047, "USD", "2025-12-31"], elec: [.115, "USD", "2026-08-31"], gas: [17.2, "USD", "2025-12-31"], lab: [46.15, "USD", "2025-12-31"] },
  CA: { spot: [.04368, "CAD", "2025-12-31"], elec: [.107, "CAD", "2025-04-01"], gas: [18, "CAD", "2025-12-31"], lab: [48.1, "CAD", "2025-12-31"] },
  TR: { spot: [2.55, "TRY", "2025-12-31"], lab: [248.1 * 1.34, "TRY", "2025-12-25"] },
  MD: { spot: [2.54, "MDL", "2026-03-31"], lab: [128, "MDL", "2025-12-31"] },
  KZ: { spot: [12, "KZT", "2025-02-01"], lab: [3278, "KZT", "2025-12-31"] },
  MX: { spot: [.88, "MXN", "2025-10-31"], elec: [1.8, "MXN", "2025-12-31"], gas: [17.1, "USD", "2025-12-31"], lab: [132, "MXN", "2025-12-31"] },
  AR: { spot: [61.5, "ARS", "2025-03-01"], elec: [97, "ARS", "2025-03-01"], lab: [12470, "ARS", "2025-12-31"] },
  BR: { spot: [.2626, "BRL", "2025-06-25"], gas: [283, "BRL", "2025-12-31"], lab: [33, "BRL", "2025-12-31"] },
  VN: { lab: [65300, "VND", "2025-09-30"] },
  IN: { spot: [3.86, "INR", "2026-03-31"], elec: [7.5, "INR", "2025-12-31"], gas: [8.2 * 3.412, "USD", "2025-12-31"], lab: [132, "INR", "2025-12-31"] },
};

function manualValue(code: string, item: "elec" | "gas" | "spot" | "lab"): Sourced | undefined {
  const m = MANUAL[code]?.[item];
  if (!m) return undefined;
  const quote = LOCAL_QUOTES[code]?.[item];
  const fx = quote && fxFor(quote[1]);
  const observed = quote?.[2] ?? m.date;
  return {
    value: quote && fx ? quote[0] / fx.value : m.v,
    kind: "CALCULATION", confidence: m.conf === "LOW" || fx?.confidence === "LOW" ? "LOW" : "MEDIUM",
    date: observed,
    source: `${m.src}. Historical quote/estimate retained; ${quote && fx ? `original nominal amount ${quote[0]} ${quote[1]} per model unit / dated FX ${fx.value} (${fx.date}); replaces the historical EUR conversion above` : "original historical EUR conversion retained; current local quotation unavailable"}. No claim of a current customer contract or a verified latest tariff.`,
    evidence: { checkedOn: "undated", period: observed, observedThrough: observed, urls: [], scope: "Historical national/regional reference; latest publication and customer applicability require verification", method: "Preserve original observation period; revalue only the documented nominal quote at dated FX when available", components: quote && fx ? [
      { name: "Documented nominal reference (may include estimated adders)", value: quote[0], unit: quote[1], origin: "ENGINEERING_ASSUMPTION" },
      { name: `FX (${fx.date})`, value: fx.value, unit: `${quote[1]}/EUR`, origin: "MARKET_DATA" },
    ] : undefined },
  };
}

/** Unsubsidised gas-parity reference; procurement eligibility is never inferred from the country. */
export function biomethaneFor(code: string): { v: [number, number, number]; src: string; conf: Confidence; date: string } | undefined {
  if (code !== "IN") return undefined;
  const gas = gasFor(code);
  if (!gas) return undefined;
  const base = gas.value / 1000 * ENGINEERING_MAP["eng.ch4_lhv_kwh_m3"].value * ENGINEERING_MAP["eng.biomethane_ch4_purity"].value;
  return { v: [base * 0.8, base, base * 1.3], src: `Uncontracted industrial gas-parity reference: ${gas.value} EUR/MWh LHV × product LHV; engineering range 80–130% of parity, not observed transactions. ${gas.source}. GOBARdhan procurement is conditional and shown only as a separate support case; buyer quotation and logistics required.`, conf: "LOW", date: "2026-10-26" };
}

/** Conditional producer procurement price, not a universal commercial offtake or a capital grant. */
export function indiaCbgProcurementPrice(): number {
  const productLhv = ENGINEERING_MAP["eng.ch4_lhv_kwh_m3"].value * ENGINEERING_MAP["eng.biomethane_ch4_purity"].value;
  return 2110 * productLhv * ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value / 293.0710701722222 / fxFor("INR")!.value;
}

export function fxFor(currency: string): Sourced | undefined {
  if (currency === "EUR") return { value: 1, kind: "FACT", confidence: "HIGH", source: "Euro", date: S.fetchedOn };
  const national = S.fxNational?.[currency];
  const reference = S.fxReference;
  const rate = national?.perEur ?? reference?.rates[currency];
  const date = national?.asOf ?? reference?.asOf;
  const url = national?.url ?? reference?.url;
  if (rate && date && url) return {
    value: rate, kind: "FACT", confidence: "HIGH", source: `Dated official EUR reference rate ${date}; not a bank execution quote. ${url}`, date,
    evidence: { checkedOn: national?.fetchedOn ?? reference!.fetchedOn, period: date, observedThrough: date, urls: [url], scope: `${currency} per EUR; dated reference, not a guaranteed transaction rate`, method: "Direct official reference quotation; observation date is preserved" },
  };
  const f = S.fx[currency];
  return f && { value: f.perEur, kind: "FACT", confidence: "LOW", source: `Eurostat ert_bil_eur_a, annual average ${f.year}; historical fallback, current valuation rate unavailable`, date: `${f.year}-12-31` };
}

export function electricityFor(code: string, regionId?: string, annualKwh?: number): Sourced | undefined {
  const observed = observedMarketValue(code, "elec", regionId);
  if (observed) return observed;
  const national = S.electricity[code];
  const mwh = annualKwh === undefined || annualKwh <= 0 ? undefined : annualKwh / 1000;
  const band = mwh === undefined ? "MWH500-1999" : mwh < 20 ? "MWH_LT20" : mwh < 500 ? "MWH20-499" : mwh < 2000 ? "MWH500-1999" : mwh < 20000 ? "MWH2000-19999" : mwh < 70000 ? "MWH20000-69999" : mwh < 150000 ? "MWH70000-149999" : "MWH_GE150000";
  const e = national?.bands?.[band] ?? national;
  // Published official statistic for a defined consumer band — used directly, so HIGH (the band average, not the customer's own tariff).
  if (e) return { value: e.eurKwh, kind: "FACT", confidence: national.bands?.[band] || band === "MWH500-1999" ? "HIGH" : "LOW", source: `Eurostat nrg_pc_205: non-household electricity, ${national.bands?.[band] ? band : "MWH500-1999 reference fallback"}, excl. VAT & recoverable taxes, latest published ${per(e.periods)}; population statistic, not a customer tariff`, date: periodEnd(e.periods.join(" ")) ?? "undated", evidence: { checkedOn: e.fetchedOn ?? S.fetchedOn, period: per(e.periods), observedThrough: periodEnd(e.periods.join(" ")), publishedOn: e.sourceUpdated?.slice(0, 10), urls: [e.url ?? "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table"], scope: `Consumer band ${band}; ${mwh === undefined ? "customer load unknown, reference band assumed" : `${mwh} MWh/year customer load`}; existing-site load, new plant auxiliary load may change the applicable band`, method: "Latest published semester for the selected band, without averaging older semesters" } };
  return manualValue(code, "elec");
}

export function gasFor(code: string, annualGasM3?: number): Sourced | undefined {
  const gj = annualGasM3 === undefined || annualGasM3 <= 0 ? undefined : annualGasM3 * ENGINEERING_MAP["eng.natgas_lhv_kwh_m3"].value * ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value * 0.0036;
  const band = gj === undefined ? "GJ10000-99999" : gj < 1000 ? "GJ_LT1000" : gj < 10000 ? "GJ1000-9999" : gj < 100000 ? "GJ10000-99999" : gj < 1000000 ? "GJ100000-999999" : gj < 4000000 ? "GJ1000000-3999999" : "GJ_GE4000000";
  const national = S.gas[code];
  const g = national?.bands?.[band] ?? national;
  const ratio = ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value;
  const conversion = `EUR/MWh HHV × ${ratio} → EUR/MWh LHV; composition-dependent engineering conversion, not a new measured tariff. Eurostat gas prices use GCV: https://ec.europa.eu/eurostat/documents/3859598/7787004/KS-GQ-16-006-N.pdf/23fb64e3-0bc0-4812-9294-3034cf640af3`;
  if (g) return { value: g.eurMwh * ratio, kind: "CALCULATION", confidence: national.bands?.[band] || band === "GJ10000-99999" ? "MEDIUM" : "LOW", source: `Eurostat nrg_pc_203: non-household gas, ${national.bands?.[band] ? band : "GJ10000-99999 reference fallback"}, excl. VAT & recoverable taxes, latest published ${per(g.periods)}. ${conversion}`, date: periodEnd(g.periods.join(" ")) ?? "undated", evidence: { checkedOn: g.fetchedOn ?? S.fetchedOn, period: per(g.periods), observedThrough: periodEnd(g.periods.join(" ")), publishedOn: g.sourceUpdated?.slice(0, 10), urls: [g.url ?? "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_203/default/table"], scope: `${band}; ${gj === undefined ? "reference band, customer gas use unknown" : "annual gas input converted to GJ HHV with assumed calorific value"}`, method: conversion } };
  const m = MANUAL[code]?.gas;
  const reference = manualValue(code, "gas");
  const hhv = m?.gasBasis === "HHV" || ["GB", "US", "CA", "MX", "IN"].includes(code);
  return reference && { ...reference, value: reference.value * (hhv ? ratio : 1), source: `${reference.source}. ${hhv ? conversion : "Original volumetric-gas estimate retained on the model LHV basis; verify invoice calorific value."}` };
}

/** Wholesale electricity price, €/kWh: the official day-ahead average where published (ENTSO-E via Energy-Charts), else the country's own published value. */
export function spotFor(code: string): Sourced | undefined {
  const d = S.dayAhead[code];
  if (d?.eurMwh) return { value: d.eurMwh / 1000, kind: "FACT", confidence: "HIGH", source: `Day-ahead average ${d.eurMwh} €/MWh, bidding zone ${d.bzn}, ${d.from} – ${d.to} (Energy-Charts / ENTSO-E)`, date: d.to?.slice(0, 10) ?? "undated", evidence: { checkedOn: d.fetchedOn ?? "undated", period: `${d.from} / ${d.to}`, observedThrough: d.to?.slice(0, 10), urls: [d.url ?? "https://api.energy-charts.info/"], scope: `Wholesale bidding zone ${d.bzn}; not a guaranteed export PPA`, method: "Observed interval average; preserve observation and last successful download dates even when a later refresh fails" } };
  const m = manualValue(code, "spot");
  const proxy = ["AR", "MD", "KZ"].includes(code);
  return m && { ...m, confidence: proxy ? "LOW" : m.confidence, source: `${m.source}${proxy ? "; regulated purchase/ceiling price is not a generator export offer — confirm a PPA" : ""}` };
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
  const observed = observedMarketValue(code, "lab");
  if (observed) return observed;
  const l = S.labour[code];
  if (l) return { value: l.eurH, kind: "FACT", confidence: "HIGH", source: `Eurostat lc_lci_lev: hourly labour cost (wages + employer costs), industry, construction & services, ${l.year}`, date: `${l.year}-12-31` };
  return manualValue(code, "lab");
}

/** Plant operator cost, €/h = official labour cost × operator ratio. */
export function labourFor(code: string): Sourced | undefined {
  const o = labourOfficialFor(code);
  if (!o) return undefined;
  const r = operatorRatioFor(code);
  const value = +(o.value * r.value).toFixed(1);
  return { value, kind: "CALCULATION", confidence: o.confidence === "LOW" ? "LOW" : "MEDIUM", source: `${o.value} €/h official labour cost × ${r.value} assumed operator ratio. ${o.source}`, date: o.date, evidence: o.evidence, range: o.range ? { ...o.range, low: o.range.low * r.value, high: o.range.high * r.value } : undefined };
}

/** Local CAPEX factor: 72 % of a plant is internationally priced equipment, 28 % civil works & installation scaled by local operator cost (Germany = 1). */
export function capexFactorFor(code: string, route: RouteId = "chp"): Sourced | undefined {
  const m = MANUAL[code]?.capex;
  if (m && route === (m.route ?? "chp")) return { value: m.v, kind: "CALCULATION", confidence: "LOW", source: `${route} only. ${m.src}. Reconstructed single-project/historical benchmark, not independently validated.`, date: m.date, range: { low: m.v * 0.7, high: m.v * 1.3, basis: "engineering" } };
  // Published plant costs (scripts/calibrate-capex.ts): only MEDIUM calibrations are applied; LOW ones are kept for the record.
  const cal = CAL.countries[code];
  if (route === "chp" && cal?.applied === true && cal.factor !== undefined && cal.confidence === "MEDIUM") {
    return { value: cal.factor, kind: "CALCULATION", confidence: "LOW", source: `Provisional CHP fit to ${cal.n} published costs (${cal.ids.join(", ")}); reconstructed feedstock/configuration, no independent validation`, date: "2026-10-26", range: { low: cal.factor * 0.7, high: cal.factor * 1.3, basis: "engineering" } };
  }
  const l = labourFor(code);
  const de = labourFor("DE");
  if (!l || !de) return undefined;
  const f = +Math.min(1.12, Math.max(0.78, 0.72 + 0.28 * (l.value / de.value))).toFixed(2);
  // The 72 % traded-equipment share holds for markets that import their plant (EU, GB, CA); where local manufacturers
  // or import duties dominate, the formula is only indicative until a project benchmark exists.
  const benchmarked = Boolean(S.labour[code]) || code === "GB" || code === "CA";
  const budget = route === "biomethane" ? cal?.biomethane : undefined;
  return { value: f, kind: "CALCULATION", confidence: benchmarked && l.confidence !== "LOW" && !budget ? "MEDIUM" : "LOW", source: `${route}: unvalidated location-cost assumption, not a route-specific project calibration. 0.72 traded equipment + 0.28 × local/German operator labour cost (${l.value}/${de.value} €/h); assumed cost split informed by DBFZ/Fraunhofer (2024); supplier quotes needed${budget ? `. Published project budgets/model ratio ≈ ${budget.factor} at comparable size, not an as-built calibration; broader upper sensitivity bound retained.` : ""}`, date: l.date, range: { low: f * 0.7, high: Math.max(f * 1.3, budget ? budget.factor * 1.2 : 0), basis: "engineering" } };
}

/** EUR-equivalent project discount rate = 6.0 % mature-market project WACC + 0.6 × Damodaran country risk premium (λ-approach), capped at 16 %. */
export const BASE_WACC = 0.06;
export const COUNTRY_RISK_LAMBDA = 0.6;
export function discountFor(code: string): Sourced | undefined {
  const c = R.countries[code];
  if (!c) return undefined;
  const v = +Math.min(0.16, BASE_WACC + COUNTRY_RISK_LAMBDA * c.crp).toFixed(3);
  return { value: v, kind: "CALCULATION", confidence: "MEDIUM", source: `${(BASE_WACC * 100).toFixed(1)} % assumed mature-market project WACC + ${COUNTRY_RISK_LAMBDA} assumed exposure × rating-based country risk premium ${(c.crp * 100).toFixed(4)} % (${c.rating}; ${R.source}). Not a project-specific WACC or bank offer. ${R.url}`, date: R.observedThrough, evidence: { checkedOn: R.checkedOn, period: R.observedThrough, observedThrough: R.observedThrough, publishedOn: R.publishedOn, urls: [R.url], scope: "Rating-based CRP; baseline WACC and lambda are engineering/financial assumptions", method: "6% + 0.6 × CRP, capped at 16%; does not replace project financing terms" } };
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
  const commodity = { N: "urea", P2O5: "tsp", K2O: "kcl" }[nutrient] as "urea" | "tsp" | "kcl";
  const fx = fxFor("USD")!;
  const scale = FERT.farmGateMarkup * factor / 1000 / FERT.nutrientShares[nutrient] / fx.value;
  const references = [...Object.values(FERT.quarterlyUsdPerT).map((q) => q[commodity]), FERT.latestUsdPerT[commodity]];
  const observedThrough = periodEnd(FERT.latestMonth)!;
  return { value: FERT.usdPerT[commodity] * scale, kind: "CALCULATION", confidence: "MEDIUM", source: `${FERT.source}; trailing 12-month reference, not latest-month or local delivered quote. USD/t / nutrient share / dated USD/EUR × assumed ${FERT.farmGateMarkup} farm-gate markup${factor !== 1 ? ` × assumed ${factor} national factor (not verified eligibility)` : ""}. ${FERT.url}`, date: observedThrough,
    evidence: { checkedOn: FERT.checkedOn, period: FERT.period.join(" / "), observedThrough, publishedOn: FERT.publishedOn, urls: [FERT.url], scope: "World commodity reference; actual digestate nutrient substitution and local fertiliser price require confirmation", method: "Trailing-year mean retained to reduce short-term volatility; range spans recent quarterly/latest-month commodity prices at the same valuation FX", components: [
      { name: "Trailing-year commodity reference", value: FERT.usdPerT[commodity], unit: "USD/t product", origin: "MARKET_DATA" },
      { name: `Latest-month reference (${FERT.latestMonth})`, value: FERT.latestUsdPerT[commodity], unit: "USD/t product", origin: "MARKET_DATA" },
      { name: `FX (${fx.date})`, value: fx.value, unit: "USD/EUR", origin: "MARKET_DATA" },
      { name: "Farm-gate markup", value: FERT.farmGateMarkup, unit: "—", origin: "ENGINEERING_ASSUMPTION" },
    ] }, range: { low: Math.min(...references) * scale, high: Math.max(...references) * scale, basis: "observed" },
  };
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
  source?: string;
  period?: [string, string];
  fetchedOn?: string;
}
const C = climate as unknown as { source: string; fetchedOn: string; regions: Record<string, ClimateRegion> };
export const CLIMATE_SOURCE = C.source;
export const climateRegionsFor = (code: string): ClimateRegion[] => Object.values(C.regions).filter((r) => r.country === code);

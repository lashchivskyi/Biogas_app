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
  fxNational?: Record<string, { perEur: number; asOf: string; fetchedOn: string; url: string; source?: string; confidence?: Confidence }>;
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
  const source = `${scope} ${row.method} Converted at ${+fx.value.toPrecision(6)} ${row.currency}/EUR (${fx.date}).`;
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
 * Values read in national primary sources for countries outside the Eurostat price surveys (checked 2026-10-30).
 * `lab` is the final operator cost in €/h (method in labourFor); `capex` overrides the labour-based factor only
 * where a market benchmark shows the formula is off.
 */
type Manual = { v: number; src: string; conf: Confidence; date: string; ratio?: number; route?: RouteId; gasBasis?: "HHV" | "LHV" };
const MANUAL: Record<string, Partial<Record<"elec" | "gas" | "spot" | "lab" | "capex", Manual>>> = {
  UA: {
    spot: { v: 0.125, src: "Market Operator (OREE), day-ahead BASE index, IPS of Ukraine, Oct 2025 – Sep 2026: 6 350 UAH/MWh excl. VAT", conf: "HIGH", date: "2026-09-30" },
    lab: { v: 4.3, ratio: 1.14, src: "Derzhstat average wage 26.5 k UAH/month (Jul 2025) × 1.22 employer contributions ÷ 160 h; skilled operator premium 1.14", conf: "MEDIUM", date: "2025-07-31" },
    elec: { v: 0.192, src: "OREE day-ahead ≈ 6.64 + Ukrenergo transmission 0.74 + dispatch 0.11 + DSO class 2 (DTEK Kyiv Regions) 2.22 UAH/kWh, Oct 2025 – Sep 2026, excl. VAT and supplier margin", conf: "MEDIUM", date: "2026-09-30" },
    gas: { v: 43.1, src: "Ministry of Economy: actual gas sale price at the Ukrainian VTP, Sep 2026: 20 764 UAH/1 000 m³ excl. VAT; wholesale, excl. transmission exit and distribution", conf: "MEDIUM", date: "2026-09-30" },
  },
  GB: {
    spot: { v: 0.095, src: "GB day-ahead mean 2025 £81.2/MWh (Electricity Maps, from EPEX/N2EX)", conf: "MEDIUM", date: "2025-12-31" },
    lab: { v: 30.9, ratio: 0.7, src: "ONS ASHE 2025 (prov.) median hourly pay £19.67 × 1.17 mean/median × 1.15 employer NI + pension ≈ £26.5/h", conf: "MEDIUM", date: "2025-04-30" },
    elec: { v: 0.286, src: "DESNZ Quarterly Energy Prices, table 3.4.1 (excl. CCL & VAT), medium non-domestic consumers, mean of 2025 Q3 – 2026 Q2 (24.5 p/kWh)", conf: "HIGH", date: "2026-09-29" },
    gas: { v: 47.1, src: "DESNZ QEP table 3.4.1, medium non-domestic gas, mean of 2025 Q3 – 2026 Q2 (4.03 p/kWh)", conf: "HIGH", date: "2026-09-29" },
  },
  US: {
    spot: { v: 0.047, src: "EIA STEO Oct 2026: average of 11 U.S. wholesale hubs, 2026 (actuals + forecast) ≈ $52/MWh", conf: "HIGH", date: "2026-10-06" },
    lab: { v: 40.8, ratio: 0.7, src: "BLS Employer Costs for Employee Compensation, private industry, Dec 2025: $46.15 per hour worked", conf: "HIGH", date: "2025-12-31" },
    elec: { v: 0.102, src: "EIA Electric Power Monthly table 5.6.A: U.S. commercial 14.5 ¢ and industrial 9.6 ¢/kWh (Aug 2026); farms/processors taken at ≈ 11.5 ¢ — state prices differ by ×3 (CA ≈ 24–30 ¢)", conf: "MEDIUM", date: "2026-10-01" },
    gas: { v: 15.2, src: "EIA Natural Gas Prices: industrial $5.23/Mcf (2025 annual) → $17.2/MWh", conf: "HIGH", date: "2026-06-30" },
    capex: { v: 1.12, route: "chp", src: "Labour formula gives 0.97, but US EPA AgSTAR cost data ($1 100–1 500 per cow at 500 cows) sit ≈ 15–25 % above the model at factor 1.0: higher engineering, permitting and interconnection cost", conf: "MEDIUM", date: "2026-10-24" },
  },
  CA: {
    spot: { v: 0.028, src: "Alberta Electric System Operator / MSA Q4 2025 report: 2025 average pool price CAD 43.68/MWh", conf: "HIGH", date: "2025-12-31" },
    lab: { v: 30.5, ratio: 0.7, src: "Statistics Canada LFS average hourly wage 2024 CAD 35.20 × 1.035 (2025) × 1.10 paid/worked × 1.20 employer costs = CAD 48.1/h", conf: "MEDIUM", date: "2025-12-31" },
    elec: { v: 0.068, src: "Hydro-Québec, Comparison of Electricity Prices in Major North American Cities (rates 1 Apr 2025, excl. tax), large power: mean of 5 cities 9.9 ¢ + 8 % for a medium-size load = 10.7 ¢ CAD", conf: "MEDIUM", date: "2025-04-01" },
    gas: { v: 16.2, src: "Enbridge Gas Rate 6 (Ontario, EGD zone), OEB rate order EB-2026-0221 from 01.10.2026, excl. HST: ≈ 24.1 ¢/m³ all-in at 30 000 m³/month; Alberta is cheaper", conf: "MEDIUM", date: "2026-10-01" },
  },
  TR: {
    spot: { v: 0.044, src: "EPİAŞ day-ahead clearing price (PTF), Q4 2025 – Q3 2026: ≈ 2 183 TL/MWh ≈ USD 48.5/MWh (quoted in USD to avoid TL inflation bias)", conf: "MEDIUM", date: "2026-09-30" },
    lab: { v: 7.4, src: "TÜİK labour cost 2024: 248.1 TL/h × 1.34 (labour-input index, 2025 y/y, +34.2 %)", conf: "MEDIUM", date: "2025-12-25" },
  },
  MD: {
    spot: { v: 0.126, src: "ANRE: Energocom average purchase price 2.54 MDL/kWh (2026 tariff note) — regulated price, not a spot quote", conf: "MEDIUM", date: "2026-03-31" },
    lab: { v: 6.4, src: "NBS Moldova: average gross wage 2025 15 472 MDL/month × 12 × 1.24 employer contributions ÷ 1 800 h = 128 MDL/h", conf: "MEDIUM", date: "2025-12-31" },
  },
  KZ: {
    spot: { v: 0.030, src: "Single buyer (Settlement-Financial Centre) selling price from 15.07.2026 ≈ 15 KZT/kWh excl. VAT (press, citing a Ministry of National Economy order)", conf: "LOW", date: "2026-07-15" },
    lab: { v: 6.4, src: "Bureau of National Statistics: average nominal wage 2025 443 315 KZT/month × 12 × 1.14 employer contributions ÷ 1 850 h = 3 278 KZT/h", conf: "MEDIUM", date: "2025-12-31" },
    gas: { v: 15.9, src: "Ministry of Energy Order 249-n/k: wholesale gas ceiling, large commercial users, Almaty/Zhetysu, Jul 2026 – Jun 2027: 76 686 KZT/1 000 m³ excl. VAT; excl. distribution, regions differ up to ×6", conf: "LOW", date: "2026-07-01" },
  },
  MX: {
    spot: { v: 0.042, src: "Day-ahead price SIN Jan–Oct 2025 880 MXN/MWh (IMCO, citing CENACE data) — press-reported", conf: "MEDIUM", date: "2025-10-31" },
    lab: { v: 6.3, src: "IMSS: average contribution salary Dec 2025 627.9 MXN/day × 365 × 1.30 employer contributions ÷ 2 250 h = 132 MXN/h", conf: "MEDIUM", date: "2025-12-31" },
    elec: { v: 0.132, src: "CFE GDMTH Bajío, Oct 2026, excl. VAT: energy 1.02 / 1.81 / 2.06 MXN/kWh + capacity & distribution 475 MXN/kW-month; ref. 300 kW, 120 MWh/month ≈ 2.76 MXN/kWh (secondary copy of CFE tariffs)", conf: "LOW", date: "2026-10-01" },
    gas: { v: 15.1, src: "Henry Hub 2025 average $3.52/MMBtu (EIA) + ≈ $1.5/MMBtu pipeline & marketing to Mexican industry (CRE IPGN is Henry-Hub-indexed) = $5.0/MMBtu → $17.1/MWh", conf: "MEDIUM", date: "2025-12-31" },
  },
  AR: {
    spot: { v: 0.056, src: "ENRE Edenor tariff, Jun 2026: wholesale energy component for users > 300 kW ≈ 95.8 ARS/kWh (T3 energy 103.22 − wheeling 7.40); regulated proxy, not a CAMMESA average", conf: "LOW", date: "2026-06-01" },
    lab: { v: 7.3, src: "RIPTE 2025 average 1 469 932 ARS/month (SIPA stable workers) × 13 × 1.24 employer contributions ÷ 1 900 h = 12 470 ARS/h", conf: "MEDIUM", date: "2025-12-31" },
    elec: { v: 0.088, src: "ENRE Edenor tariff T3 medium voltage > 300 kW, Jun 2026, excl. VAT: energy 103.5 + demand 46.2 + fixed 1.0 ≈ 150.7 ARS/kWh (ref. 400 kW, 175 MWh/month; Greater Buenos Aires)", conf: "LOW", date: "2026-06-01" },
    gas: { v: 12.9, gasBasis: "HHV", src: "Secretaría de Energía Res. 23/2026: uniform gas price at PIST 2026 ≈ USD 3.80/MMBtu (HHV); commodity only, excl. transport and distribution", conf: "LOW", date: "2026-01-26" },
  },
  BR: {
    spot: { v: 0.038, src: "CCEE PLD monthly mean, Sudeste/Centro-Oeste, Oct 2025 – Sep 2026: 227.9 BRL/MWh", conf: "HIGH", date: "2026-09-30" },
    lab: { v: 5.8, src: "IBGE PNAD Contínua: average habitual income from work 2025 R$ 3 560/month × 13.33 × 1.358 employer costs ÷ 1 950 h = 33 R$/h", conf: "MEDIUM", date: "2025-12-31" },
    gas: { v: 44.9, gasBasis: "HHV", src: "Gasmig industrial tariff R$ 3.089/m³ (Minas Gerais, 2025 revision) at 10.9 kWh/m³ (GCV) = 283 R$/MWh; CNI: industrial gas ≈ US$ 20/MMBtu incl. taxes (2025) — state tariffs differ", conf: "MEDIUM", date: "2025-12-31" },
    capex: { v: 0.95, route: "chp", src: "BNDES-financed 2.15 MW biogas plant, Elias Fausto (SP): R$ 56.2 M ≈ 4 150 €/kW — at German level despite low labour cost (import duties on engines, upgrading and membranes); single project", conf: "LOW", date: "2024-03-01" },
  },
  TH: {
    spot: { v: 0.070, src: "ERC Ft filings 2026: fuel + power-purchase cost per kWh, single-buyer system ≈ 2.62 THB/kWh (no spot market; incl. ≈ 8–9 % capacity payments)", conf: "LOW", date: "2026-07-31" },
    gas: { v: 32.2, gasBasis: "HHV", src: "ERC Ft filings 2026: pool-gas price for power ≈ 356 THB/MMBtu (HHV); no industrial pipeline adder", conf: "LOW", date: "2026-07-31" },
  },
  VN: {
    lab: { v: 2.2, src: "National Statistics Office LFS: salaried employees ≈ 9.4 M VND/month × 12 × 1.215 employer contributions ÷ 2 100 h = 65 300 VND/h", conf: "MEDIUM", date: "2025-09-30" },
    spot: { v: 0.040, src: "EVN/NSMO full market price ≈ 1 200 VND/kWh, Q4 2025 – Q3 2026 (VCBS and PV Power reports; approximate)", conf: "LOW", date: "2026-07-31" },
    gas: { v: 36.8, gasBasis: "HHV", src: "LNG/industrial gas ≈ USD 12/MMBtu (HHV), analyst assumption (KBSV 2024); no official industrial tariff found", conf: "LOW", date: "2024-10-31" },
  },
  IN: {
    spot: { v: 0.036, src: "IEX day-ahead market average FY 2025-26 Rs 3.86/kWh", conf: "HIGH", date: "2026-03-31" },
    lab: { v: 1.2, src: "MoSPI PLFS: regular wage/salaried employees ≈ Rs 22 000/month (2025) × 12 × 1.15 employer EPF/ESI ÷ 2 300 h = 132 INR/h", conf: "MEDIUM", date: "2025-12-31" },
    gas: { v: 24.8, src: "PPAC domestic natural-gas price 2025, monthly $6.25–7.02/MMBtu (average ≈ $6.7; FIPI) + $1.5/MMBtu pipeline & distribution adder (assumption) = $8.2/MMBtu", conf: "MEDIUM", date: "2026-01-31" },
    elec: { v: 0.071, src: "Industrial ≈ 6.7 INR/kWh (Intratec index, Dec 2025) + demand charges ≈ 0.8 INR/kWh; state tariffs differ: MERC-approved HT-industry average billing rate FY 2026-27 Rs 9.00/kWh (Maharashtra)", conf: "LOW", date: "2025-12-31" },
    capex: { v: 0.55, route: "biomethane", src: "SATAT CBG plant, Bagalkot (Karnataka): ₹ 42 crore for 10.2 t/day CBG from 200 t/day press mud ≈ 1 000 Nm³/h raw biogas → ≈ €4.3 M vs ≈ €8 M for the same plant at German prices; Indian-made digesters and upgrading. Single project — check against SATAT tenders", conf: "LOW", date: "2025-06-30" },
  },
};

/** Nominal quotes in their original currency and observation date; revaluing FX never moves the observation period. */
const LOCAL_QUOTES: Record<string, Partial<Record<"elec" | "gas" | "spot" | "lab", [number, string, string]>>> = {
  UA: { spot: [6.35, "UAH", "2026-09-30"], elec: [9.71, "UAH", "2026-09-30"], lab: [26500 * 1.22 / 160, "UAH", "2025-07-31"], gas: [20764.15 / 9.5, "UAH", "2026-09-30"] },
  GB: { spot: [.0812, "GBP", "2025-12-31"], elec: [.245, "GBP", "2026-06-30"], gas: [40.3, "GBP", "2026-06-30"], lab: [26.5, "GBP", "2025-04-30"] },
  US: { spot: [.052, "USD", "2026-10-06"], elec: [.115, "USD", "2026-08-31"], gas: [17.2, "USD", "2025-12-31"], lab: [46.15, "USD", "2025-12-31"] },
  CA: { spot: [.04368, "CAD", "2025-12-31"], elec: [.107, "CAD", "2025-04-01"], gas: [241 / (9.5 * 1.11), "CAD", "2026-10-01"], lab: [48.1, "CAD", "2025-12-31"] },
  TR: { spot: [.0485, "USD", "2026-09-30"], lab: [248.1 * 1.34, "TRY", "2025-12-25"] },
  MD: { spot: [2.54, "MDL", "2026-03-31"], lab: [128, "MDL", "2025-12-31"] },
  KZ: { spot: [15, "KZT", "2026-07-15"], lab: [3278, "KZT", "2025-12-31"], gas: [76686 / 9.5, "KZT", "2026-07-01"] },
  MX: { spot: [.88, "MXN", "2025-10-31"], elec: [2.76, "MXN", "2026-10-01"], gas: [17.1, "USD", "2025-12-31"], lab: [132, "MXN", "2025-12-31"] },
  AR: { spot: [95.8, "ARS", "2026-06-01"], elec: [150.7, "ARS", "2026-06-01"], lab: [12470, "ARS", "2025-12-31"], gas: [3.8 * 3.412, "USD", "2026-01-26"] },
  BR: { spot: [.22787, "BRL", "2026-09-30"], gas: [283, "BRL", "2025-12-31"], lab: [33, "BRL", "2025-12-31"] },
  TH: { spot: [2.62, "THB", "2026-07-31"], gas: [356 * 3.412, "THB", "2026-07-31"] },
  VN: { lab: [65300, "VND", "2025-09-30"], spot: [1200, "VND", "2026-07-31"], gas: [12 * 3.412, "USD", "2024-10-31"] },
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
    source: `${m.src}${quote && fx ? `; converted at ${+fx.value.toPrecision(6)} ${quote[1]}/EUR (${fx.date})` : ""}`,
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
    value: rate, kind: national?.source ? "CALCULATION" : "FACT", confidence: national?.confidence ?? "HIGH", source: national?.source ?? `Official EUR reference rate, ${date}`, date,
    evidence: { checkedOn: national?.fetchedOn ?? reference!.fetchedOn, period: date, observedThrough: date, urls: [url], scope: `${currency} per EUR; dated reference, not a guaranteed transaction rate`, method: "Direct official reference quotation; observation date is preserved" },
  };
  const f = S.fx[currency];
  return f && { value: f.perEur, kind: "FACT", confidence: "LOW", source: `Eurostat ert_bil_eur_a, annual average ${f.year} (no current official rate)`, date: `${f.year}-12-31` };
}

export function electricityFor(code: string, regionId?: string, annualKwh?: number): Sourced | undefined {
  const observed = observedMarketValue(code, "elec", regionId);
  if (observed) return observed;
  const national = S.electricity[code];
  const mwh = annualKwh === undefined || annualKwh <= 0 ? undefined : annualKwh / 1000;
  const band = mwh === undefined ? "MWH500-1999" : mwh < 20 ? "MWH_LT20" : mwh < 500 ? "MWH20-499" : mwh < 2000 ? "MWH500-1999" : mwh < 20000 ? "MWH2000-19999" : mwh < 70000 ? "MWH20000-69999" : mwh < 150000 ? "MWH70000-149999" : "MWH_GE150000";
  const e = national?.bands?.[band] ?? national;
  // Published official statistic for a defined consumer band — used directly, so HIGH (the band average, not the customer's own tariff).
  if (e) return { value: e.eurKwh, kind: "FACT", confidence: national.bands?.[band] || band === "MWH500-1999" ? "HIGH" : "LOW", source: `Eurostat nrg_pc_205, non-household, ${national.bands?.[band] ? band : "MWH500-1999 (reference band)"}, excl. VAT, ${per(e.periods)}`, date: periodEnd(e.periods.join(" ")) ?? "undated", evidence: { checkedOn: e.fetchedOn ?? S.fetchedOn, period: per(e.periods), observedThrough: periodEnd(e.periods.join(" ")), publishedOn: e.sourceUpdated?.slice(0, 10), urls: [e.url ?? "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table"], scope: `Consumer band ${band}; ${mwh === undefined ? "customer load unknown, reference band assumed" : `${mwh} MWh/year customer load`}; existing-site load, new plant auxiliary load may change the applicable band`, method: "Latest published semester for the selected band, without averaging older semesters" } };
  return manualValue(code, "elec");
}

export function gasFor(code: string, annualGasM3?: number): Sourced | undefined {
  const gj = annualGasM3 === undefined || annualGasM3 <= 0 ? undefined : annualGasM3 * ENGINEERING_MAP["eng.natgas_lhv_kwh_m3"].value * ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value * 0.0036;
  const band = gj === undefined ? "GJ10000-99999" : gj < 1000 ? "GJ_LT1000" : gj < 10000 ? "GJ1000-9999" : gj < 100000 ? "GJ10000-99999" : gj < 1000000 ? "GJ100000-999999" : gj < 4000000 ? "GJ1000000-3999999" : "GJ_GE4000000";
  const national = S.gas[code];
  const g = national?.bands?.[band] ?? national;
  const ratio = ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value;
  const conversion = `EUR/MWh HHV × ${ratio} → EUR/MWh LHV; composition-dependent engineering conversion, not a new measured tariff. Eurostat gas prices use GCV: https://ec.europa.eu/eurostat/documents/3859598/7787004/KS-GQ-16-006-N.pdf/23fb64e3-0bc0-4812-9294-3034cf640af3`;
  if (g) return { value: g.eurMwh * ratio, kind: "CALCULATION", confidence: national.bands?.[band] || band === "GJ10000-99999" ? "MEDIUM" : "LOW", source: `Eurostat nrg_pc_203, non-household, ${national.bands?.[band] ? band : "GJ10000-99999 (reference band)"}, excl. VAT, ${per(g.periods)}; HHV × ${ratio} → LHV`, date: periodEnd(g.periods.join(" ")) ?? "undated", evidence: { checkedOn: g.fetchedOn ?? S.fetchedOn, period: per(g.periods), observedThrough: periodEnd(g.periods.join(" ")), publishedOn: g.sourceUpdated?.slice(0, 10), urls: [g.url ?? "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_203/default/table"], scope: `${band}; ${gj === undefined ? "reference band, customer gas use unknown" : "annual gas input converted to GJ HHV with assumed calorific value"}`, method: conversion } };
  const m = MANUAL[code]?.gas;
  const reference = manualValue(code, "gas");
  const hhv = m?.gasBasis === "HHV" || ["GB", "US", "CA", "MX", "IN"].includes(code);
  return reference && { ...reference, value: reference.value * (hhv ? ratio : 1), source: `${reference.source}${hhv ? `; HHV × ${ratio} → LHV` : ""}` };
}

/** Wholesale electricity price, €/kWh: the official day-ahead average where published (ENTSO-E via Energy-Charts), else the country's own published value. */
export function spotFor(code: string): Sourced | undefined {
  const d = S.dayAhead[code];
  if (d?.eurMwh) return { value: d.eurMwh / 1000, kind: "FACT", confidence: "HIGH", source: `ENTSO-E day-ahead (via Energy-Charts), zone ${d.bzn}, average ${d.eurMwh.toFixed(1)} €/MWh, ${d.from} – ${d.to}`, date: d.to?.slice(0, 10) ?? "undated", evidence: { checkedOn: d.fetchedOn ?? "undated", period: `${d.from} / ${d.to}`, observedThrough: d.to?.slice(0, 10), urls: [d.url ?? "https://api.energy-charts.info/"], scope: `Wholesale bidding zone ${d.bzn}; not a guaranteed export PPA`, method: "Observed interval average; preserve observation and last successful download dates even when a later refresh fails" } };
  const m = manualValue(code, "spot");
  const proxy = ["AR", "MD", "KZ"].includes(code);
  return m && { ...m, confidence: proxy ? "LOW" : m.confidence, source: `${m.source}${proxy ? "; regulated price, not an export offer — confirm a PPA" : ""}` };
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
  return { value, kind: "CALCULATION", confidence: o.confidence === "LOW" ? "LOW" : "MEDIUM", source: `${o.value.toFixed(1)} €/h official labour cost × ${r.value} operator ratio. ${o.source}`, date: o.date, evidence: o.evidence, range: o.range ? { ...o.range, low: o.range.low * r.value, high: o.range.high * r.value } : undefined };
}

/** Local CAPEX factor: 72 % of a plant is internationally priced equipment, 28 % civil works & installation scaled by local operator cost (Germany = 1). */
export function capexFactorFor(code: string, route: RouteId = "chp"): Sourced | undefined {
  const m = MANUAL[code]?.capex;
  if (m && route === (m.route ?? "chp")) return { value: m.v, kind: "CALCULATION", confidence: "LOW", source: `${route} only. ${m.src}`, date: m.date, range: { low: m.v * 0.7, high: m.v * 1.3, basis: "engineering" } };
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
  return { value: f, kind: "CALCULATION", confidence: benchmarked && l.confidence !== "LOW" && !budget ? "MEDIUM" : "LOW", source: `0.72 traded equipment + 0.28 × local/German labour cost (${l.value}/${de.value} €/h); split after DBFZ/Fraunhofer 2024; supplier quotes needed${budget ? `. Published budgets ≈ ${budget.factor} × model at similar size` : ""}`, date: l.date, range: { low: f * 0.7, high: Math.max(f * 1.3, budget ? budget.factor * 1.2 : 0), basis: "engineering" } };
}

/** EUR-equivalent project discount rate = 6.0 % mature-market project WACC + 0.6 × Damodaran country risk premium (λ-approach), capped at 16 %. */
export const BASE_WACC = 0.06;
export const COUNTRY_RISK_LAMBDA = 0.6;
export function discountFor(code: string): Sourced | undefined {
  const c = R.countries[code];
  if (!c) return undefined;
  const v = +Math.min(0.16, BASE_WACC + COUNTRY_RISK_LAMBDA * c.crp).toFixed(3);
  return { value: v, kind: "CALCULATION", confidence: "MEDIUM", source: `${(BASE_WACC * 100).toFixed(1)} % mature-market WACC + ${COUNTRY_RISK_LAMBDA} × country risk premium ${(c.crp * 100).toFixed(2)} % (${c.rating}; Damodaran, ${R.observedThrough.slice(0, 7)}); not a bank offer`, date: R.observedThrough, evidence: { checkedOn: R.checkedOn, period: R.observedThrough, observedThrough: R.observedThrough, publishedOn: R.publishedOn, urls: [R.url], scope: "Rating-based CRP; baseline WACC and lambda are engineering/financial assumptions", method: "6% + 0.6 × CRP, capped at 16%; does not replace project financing terms" } };
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
  return { value: FERT.usdPerT[commodity] * scale, kind: "CALCULATION", confidence: "MEDIUM", source: `World Bank Pink Sheet, 12-month mean ${FERT.period.join("–")}; ÷ nutrient share × ${FERT.farmGateMarkup} farm-gate markup${factor !== 1 ? ` × ${factor} national factor` : ""}`, date: observedThrough,
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

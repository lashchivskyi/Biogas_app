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

/** United States by state (scripts/data/fetch_statistics.py): prices and wages differ ×2–3 between states. */
type UsStates = {
  names: Record<string, string>;
  electricity: { period: string; periodEnd: string; url: string; fetchedOn: string; values: Record<string, { commercial: number; industrial: number }> };
  gas: { url: string; fetchedOn: string; method: string; values: Record<string, number>; months: Record<string, [string, string, number]> };
  operator: { occupation: string; year: string; url: string; fetchedOn: string; meanHourlyWage: Record<string, number>; ecec: { period: string; totalUsdH: number; wagesUsdH: number; url: string } };
  wholesale: { from: string; to: string; url: string; table: string; fetchedOn: string; hubs: Record<string, { name: string; usdMwh: number }>; states: Record<string, string> };
};
const US = (stats as unknown as { usStates?: UsStates }).usStates;
const PRESETS = Object.values((climate as unknown as { regions: Record<string, { country: string; id: string; admin?: string }> }).regions);

/** admin1 code ("US.WI") of a preset region id or of an admin1 code passed through; undefined for the national level. */
export function adminFor(code: string, key?: string): string | undefined {
  if (!key) return undefined;
  if (/^[A-Z]{2}\.[A-Z0-9]+$/.test(key)) return key.startsWith(`${code}.`) ? key : undefined;
  return PRESETS.find((r) => r.country === code && r.id === key)?.admin;
}
const stateName = (admin: string) => US?.names[admin] ?? admin;
const CAL = calibration as unknown as { countries: Record<string, { factor?: number; n: number; confidence: Confidence; applied?: boolean; ids: string[]; biomethane?: { factor: number; n: number } }> };
const R = risk as { source: string; observedThrough: string; publishedOn: string; checkedOn: string; url: string; countries: Record<string, { rating: string; crp: number }> };
const EF = gridEf as { source: string; countries: Record<string, { year: number; tCo2Mwh: number }>; regions?: Record<string, { source: string; year: number; url: string; values: Record<string, number> }> };
const FERT = fert;

const per = (p: string[]) => p.join(" & ");

interface Observation {
  country: string;
  parameter: "elec" | "lab" | "gas";
  currency: string;
  unit: string;
  value?: number;
  regionalValues?: Record<string, number>;
  regionIds?: string[];
  bounds?: number[];
  regionalBounds?: Record<string, number[]>;
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
export function observedMarketValue(code: string, item: Observation["parameter"], regionId?: string): Sourced | undefined {
  const row = OBSERVATIONS.find((r) => r.country === code && r.parameter === item);
  if (!row) return undefined;
  const admin = adminFor(code, regionId);
  const area = admin && row.regionalValues?.[admin] !== undefined ? admin : regionId;
  const fx = fxFor(row.currency);
  if (!fx || fx.value <= 0) return undefined;
  const tou = row.timeOfUse;
  const wage = row.wage;
  const local = tou
    ? tou.rates.reduce((sum, rate, i) => sum + rate * tou.weeklyHours[i], 0) / tou.weeklyHours.reduce((a, b) => a + b, 0)
      + tou.fuelAdjustment + (tou.monthlyDemand * tou.billingKw + tou.monthlyService) / tou.monthlyKwh
    : wage ? wage.monthly * 12 * wage.employerMultiplier / wage.annualHours
    : area ? row.regionalValues?.[area] ?? row.value : row.value;
  if (local === undefined) return undefined;
  // Electricity is modelled per kWh, gas per MWh.
  const divisor = fx.value * (row.unit === "local/MWh" && item === "elec" ? 1000 : 1);
  const regionalProxy = row.regionIds && (!regionId || !row.regionIds.includes(regionId));
  const bounds = (area && row.regionalBounds?.[area]) || row.bounds;
  const scope = `${row.scope}${area && row.regionalValues?.[area] ? ` Regional reference: ${area}.` : ""}`;
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
    range: bounds ? { low: bounds[0] / divisor, high: bounds[1] / divisor, basis: "observed" } : undefined,
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
    spot: { v: 0.126, src: "Market Operator (OREE), DAM BASE index, IPS of Ukraine, mean of monthly values Oct 2025 – Sep 2026: 6 377 UAH/MWh excl. VAT", conf: "HIGH", date: "2026-09-30" },
    lab: { v: 5.0, ratio: 1.14, src: "Derzhstat: average wage of full-time employees Sep 2026 33 153 UAH/month × 1.22 employer contributions ÷ 160 h; skilled operator premium 1.14", conf: "MEDIUM", date: "2026-09-30" },
    elec: { v: 0.192, src: "OREE day-ahead ≈ 6.64 + Ukrenergo transmission 0.74 + dispatch 0.11 + DSO class 2 (DTEK Kyiv Regions) 2.22 UAH/kWh, Oct 2025 – Sep 2026, excl. VAT and supplier margin", conf: "MEDIUM", date: "2026-09-30" },
    gas: { v: 43.1, src: "Ministry of Economy: actual gas sale price at the Ukrainian VTP, Sep 2026: 20 764 UAH/1 000 m³ excl. VAT; wholesale, excl. transmission exit and distribution", conf: "MEDIUM", date: "2026-09-30" },
  },
  GB: {
    spot: { v: 0.102, src: "Ofgem wholesale market indicators: GB day-ahead baseload, monthly average weighted by volume (broker data), Jul 2025 – Jun 2026 mean £85.63/MWh", conf: "MEDIUM", date: "2026-06-30" },
    lab: { v: 33.5, ratio: 0.7, src: "ONS ASHE 2026 (provisional, Apr 2026): full-time median hourly pay £20.81 × 1.17 mean/median × 1.15 employer NI (15 %) and pension ≈ £28.0/h", conf: "MEDIUM", date: "2026-04-30" },
    elec: { v: 0.286, src: "DESNZ Quarterly Energy Prices, table 3.4.1 (excl. CCL & VAT), medium non-domestic consumers, mean of 2025 Q3 – 2026 Q2 (24.5 p/kWh)", conf: "HIGH", date: "2026-09-29" },
    gas: { v: 47.1, src: "DESNZ QEP table 3.4.1, medium non-domestic gas, mean of 2025 Q3 – 2026 Q2 (4.03 p/kWh)", conf: "HIGH", date: "2026-09-29" },
  },
  US: {
    spot: { v: 0.047, src: "EIA STEO Oct 2026: average of 11 U.S. wholesale hubs, 2026 (actuals + forecast) ≈ $52/MWh", conf: "HIGH", date: "2026-10-06" },
    capex: { v: 1.12, route: "chp", src: "Labour formula gives 0.97, but US EPA AgSTAR cost data ($1 100–1 500 per cow at 500 cows) sit ≈ 15–25 % above the model at factor 1.0: higher engineering, permitting and interconnection cost", conf: "MEDIUM", date: "2026-10-24" },
  },
  CA: {
    spot: { v: 0.022, src: "AESO pool price, hourly time-weighted mean Oct 2025 – Sep 2026: CAD 35.07/MWh (Alberta; other provinces have no market)", conf: "HIGH", date: "2026-09-30" },
    lab: { v: 30.5, ratio: 0.7, src: "Statistics Canada LFS average hourly wage 2024 CAD 35.20 × 1.035 (2025) × 1.10 paid/worked × 1.20 employer costs = CAD 48.1/h", conf: "MEDIUM", date: "2025-12-31" },
    gas: { v: 16.9, src: "OEB rate order EB-2026-0221 (24.09.2026), Enbridge Gas Rate 6 EGD zone from 01.10.2026, excl. HST: flat 5 000 GJ/yr user ≈ 25.2 ¢/m³ all-in = CAD 6.63/GJ", conf: "HIGH", date: "2026-10-01" },
  },
  TR: {
    spot: { v: 0.049, src: "EPDK monthly electricity market reports: volume-weighted PTF Sep 2025 – Aug 2026 (mean 2 513 TL/MWh), each month at its Eurostat EUR/TRY average = €48.8/MWh", conf: "MEDIUM", date: "2026-08-31" },
    lab: { v: 7.4, src: "TÜİK Labour Cost Survey 2024: 248.1 TL/h × 1.34 (labour-input index y/y; index value not read from the official bulletin)", conf: "LOW", date: "2025-12-25" },
  },
  MD: {
    spot: { v: 0.136, src: "OPEM day-ahead market (PZU) base price, Jul – Sep 2026 (first liquid months): 2 732 MDL/MWh", conf: "MEDIUM", date: "2026-09-30" },
    lab: { v: 6.9, src: "NBS Moldova: average gross monthly earnings Q2 2026 16 895.7 MDL × 12 × 1.24 employer contributions ÷ 1 800 h", conf: "MEDIUM", date: "2026-06-30" },
  },
  KZ: {
    spot: { v: 0.060, src: "RFC for RES (single purchaser): actual base price Oct 2025 – Sep 2026 (11 months, June not published) 30.43 KZT/kWh excl. VAT — cost-based single-buyer price", conf: "MEDIUM", date: "2026-09-30" },
    lab: { v: 7.1, src: "Bureau of National Statistics: average nominal wage Q2 2026 486 388 KZT/month × 12 × 1.14 employer contributions ÷ 1 850 h", conf: "MEDIUM", date: "2026-06-30" },
    gas: { v: 15.9, src: "Ministry of Energy wholesale gas ceilings from 01.07.2026, Almaty/Zhetysu 76 686 KZT/1 000 m³ excl. VAT — read from a legal-database copy; the official adilet.zan.kz text could not be opened and the consumer category is unconfirmed", conf: "LOW", date: "2026-07-01" },
  },
  MX: {
    spot: { v: 0.036, src: "CENACE day-ahead market (MDA) zonal prices (PND), unweighted mean of 96 SIN load zones, Oct 2025 – Sep 2026: 760.45 MXN/MWh", conf: "MEDIUM", date: "2026-09-30" },
    lab: { v: 6.7, src: "IMSS/STPS: average daily contribution salary Sep 2026 666.0 MXN × 365 × 1.30 employer contributions ÷ 2 250 h", conf: "MEDIUM", date: "2026-09-30" },
    gas: { v: 15.1, src: "Henry Hub 2025 average $3.52/MMBtu (EIA) + ≈ $1.5/MMBtu pipeline & marketing to Mexican industry (CRE IPGN is Henry-Hub-indexed) = $5.0/MMBtu → $17.1/MWh", conf: "MEDIUM", date: "2025-12-31" },
  },
  AR: {
    spot: { v: 0.056, src: "ENRE Edenor tariff, Jun 2026: wholesale energy component for users > 300 kW ≈ 95.8 ARS/kWh (T3 energy 103.22 − wheeling 7.40); regulated proxy, not a CAMMESA average", conf: "LOW", date: "2026-06-01" },
    lab: { v: 9.8, src: "RIPTE Aug 2026 1 982 518 ARS/month (Secretaría de Seguridad Social) × 13 × 1.24 employer contributions ÷ 1 900 h", conf: "MEDIUM", date: "2026-08-31" },
    elec: { v: 0.088, src: "ENRE Edenor tariff T3 medium voltage > 300 kW, Jun 2026, excl. VAT: energy 103.5 + demand 46.2 + fixed 1.0 ≈ 150.7 ARS/kWh (ref. 400 kW, 175 MWh/month; Greater Buenos Aires)", conf: "LOW", date: "2026-06-01" },
    gas: { v: 12.9, gasBasis: "HHV", src: "Secretaría de Energía Res. 23/2026: uniform gas price at PIST 2026 ≈ USD 3.80/MMBtu (HHV); commodity only, excl. transport and distribution", conf: "LOW", date: "2026-01-26" },
  },
  BR: {
    spot: { v: 0.038, src: "CCEE PLD monthly mean, Sudeste/Centro-Oeste, Oct 2025 – Sep 2026: 227.9 BRL/MWh", conf: "HIGH", date: "2026-09-30" },
    lab: { v: 5.8, src: "IBGE PNAD Contínua (SIDRA 5436), 2Q2026: average habitual income, all jobs, R$ 3 738/month × 13.33 × 1.358 employer costs ÷ 1 950 h", conf: "MEDIUM", date: "2026-06-30" },
    gas: { v: 44.9, gasBasis: "HHV", src: "Gasmig industrial tariff R$ 3.089/m³ (Minas Gerais, 2025 revision) at 10.9 kWh/m³ (GCV) = 283 R$/MWh; CNI: industrial gas ≈ US$ 20/MMBtu incl. taxes (2025) — state tariffs differ", conf: "MEDIUM", date: "2025-12-31" },
    capex: { v: 0.95, route: "chp", src: "BNDES-financed 2.15 MW biogas plant, Elias Fausto (SP): R$ 56.2 M ≈ 4 150 €/kW — at German level despite low labour cost (import duties on engines, upgrading and membranes); single project", conf: "LOW", date: "2024-03-01" },
  },
  TH: {
    spot: { v: 0.070, src: "ERC Ft filings 2026: fuel + power-purchase cost per kWh, single-buyer system ≈ 2.62 THB/kWh (no spot market; incl. ≈ 8–9 % capacity payments)", conf: "LOW", date: "2026-07-31" },
    gas: { v: 32.2, gasBasis: "HHV", src: "ERC Ft filings 2026: pool-gas price for power ≈ 356 THB/MMBtu (HHV); no industrial pipeline adder", conf: "LOW", date: "2026-07-31" },
  },
  VN: {
    lab: { v: 2.4, src: "NSO Vietnam: average monthly income of wage/salaried employees, 9 months 2026, 10.1 M VND × 12 × 1.215 employer contributions ÷ 2 100 h", conf: "MEDIUM", date: "2026-09-30" },
    spot: { v: 0.040, src: "EVN/NSMO full market price ≈ 1 200 VND/kWh, Q4 2025 – Q3 2026, taken from non-official broker reports (VCBS, PV Power); no official NSMO series could be retrieved", conf: "LOW", date: "2026-07-31" },
    gas: { v: 38.7, gasBasis: "HHV", src: "No official industrial gas tariff exists (PV GAS sells under contracts): World Bank Pink Sheet Oct 2026, LNG import price Japan (cif), mean Q4 2025 – Q3 2026 US$ 12.62/MMBtu, used as the import-parity benchmark; replace with your gas contract", conf: "LOW", date: "2026-09-30" },
  },
  IN: {
    spot: { v: 0.036, src: "IEX day-ahead market average FY 2025-26 Rs 3.86/kWh", conf: "HIGH", date: "2026-03-31" },
    lab: { v: 1.2, src: "MoSPI PLFS Annual Report 2025 (press note 27.03.2026): regular wage/salaried earnings, men Rs 24 217, women Rs 18 353/month; ≈ Rs 22 000 all persons × 12 × 1.15 employer EPF/ESI ÷ 2 300 h", conf: "MEDIUM", date: "2025-12-31" },
    gas: { v: 34.0, src: "PPAC notification 30.09.2026: gas price ceiling (market-priced deepwater/HPHT gas) US$ 9.89/MMBtu GCV for Oct 2026 – Mar 2027 (APM price Oct 2026 US$ 11.22, Sep 9.00) + US$ 1.5/MMBtu pipeline & distribution adder (assumption) = US$ 11.39/MMBtu", conf: "MEDIUM", date: "2026-09-30" },
    capex: { v: 0.55, route: "biomethane", src: "SATAT CBG plant, Bagalkot (Karnataka): ₹ 42 crore for 10.2 t/day CBG from 200 t/day press mud ≈ 1 000 Nm³/h raw biogas → ≈ €4.3 M vs ≈ €8 M for the same plant at German prices; Indian-made digesters and upgrading. Single project — check against SATAT tenders", conf: "LOW", date: "2025-06-30" },
  },
};

/** Nominal quotes in their original currency and observation date; revaluing FX never moves the observation period. */
const LOCAL_QUOTES: Record<string, Partial<Record<"elec" | "gas" | "spot" | "lab", [number, string, string]>>> = {
  UA: { spot: [6.377, "UAH", "2026-09-30"], elec: [9.71, "UAH", "2026-09-30"], lab: [33153 * 1.22 / 160, "UAH", "2026-09-30"], gas: [20764.15 / 9.5, "UAH", "2026-09-30"] },
  GB: { spot: [.08563, "GBP", "2026-06-30"], elec: [.245, "GBP", "2026-06-30"], gas: [40.3, "GBP", "2026-06-30"], lab: [20.81 * 1.17 * 1.15, "GBP", "2026-04-30"] },
  US: { spot: [.052, "USD", "2026-10-06"] },
  CA: { spot: [.03507, "CAD", "2026-09-30"], gas: [251.7 / (9.5 * 1.11), "CAD", "2026-10-01"], lab: [48.1, "CAD", "2025-12-31"] },
  TR: { spot: [.04881, "EUR", "2026-08-31"], lab: [248.1 * 1.34, "TRY", "2025-12-25"] },
  MD: { spot: [2.7323, "MDL", "2026-09-30"], lab: [16895.7 * 12 * 1.24 / 1800, "MDL", "2026-06-30"] },
  KZ: { spot: [30.43, "KZT", "2026-09-30"], lab: [486388 * 12 * 1.14 / 1850, "KZT", "2026-06-30"], gas: [76686 / 9.5, "KZT", "2026-07-01"] },
  MX: { spot: [.76045, "MXN", "2026-09-30"], gas: [17.1, "USD", "2025-12-31"], lab: [666.0 * 365 * 1.3 / 2250, "MXN", "2026-09-30"] },
  AR: { spot: [95.8, "ARS", "2026-06-01"], elec: [150.7, "ARS", "2026-06-01"], lab: [1982518 * 13 * 1.24 / 1900, "ARS", "2026-08-31"], gas: [3.8 * 3.412, "USD", "2026-01-26"] },
  BR: { spot: [.22787, "BRL", "2026-09-30"], gas: [283, "BRL", "2025-12-31"], lab: [3738 * 13.33 * 1.358 / 1950, "BRL", "2026-06-30"] },
  TH: { spot: [2.62, "THB", "2026-07-31"], gas: [356 * 3.412, "THB", "2026-07-31"] },
  VN: { lab: [10.1e6 * 12 * 1.215 / 2100, "VND", "2026-09-30"], spot: [1200, "VND", "2026-07-31"], gas: [12.62 * 3.412, "USD", "2026-09-30"] },
  IN: { spot: [3.86, "INR", "2026-03-31"], gas: [11.39 * 3.412, "USD", "2026-09-30"], lab: [132, "INR", "2025-12-31"] },
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

function usElectricity(admin?: string): Sourced {
  const e = US!.electricity, own = admin ? e.values[admin] : undefined, v = own ?? e.values.US, fx = fxFor("USD")!;
  const where = own ? stateName(admin!) : "U.S. average";
  const mid = (v.commercial + v.industrial) / 2;
  return { value: mid / fx.value, kind: "CALCULATION", confidence: "MEDIUM", source: `EIA Electric Power Monthly 5.6.B, ${where}, ${e.period}: commercial ${(v.commercial * 100).toFixed(2)} ¢, industrial ${(v.industrial * 100).toFixed(2)} ¢/kWh → midpoint for farms and food processors, excl. taxes; converted at ${fx.value} USD/EUR`,
    date: e.periodEnd, range: { low: Math.min(v.commercial, v.industrial) / fx.value, high: Math.max(v.commercial, v.industrial) / fx.value, basis: "observed" },
    evidence: { checkedOn: e.fetchedOn, period: e.period, observedThrough: e.periodEnd, urls: [e.url], scope: `${where}; sector averages, not the customer's tariff`, method: "Midpoint of the commercial and industrial year-to-date state prices" } };
}

function usGas(admin?: string): Sourced {
  const g = US!.gas, own = admin ? g.values[admin] : undefined, v = own ?? g.values.US, fx = fxFor("USD")!;
  const ratio = ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value, [from, to, n] = g.months[own ? admin! : "US"];
  return { value: v / fx.value * ratio, kind: "CALCULATION", confidence: "MEDIUM", source: `EIA industrial natural-gas price, ${own ? stateName(admin!) : "U.S."}, ${from} – ${to} (${n} months): $${v}/MWh HHV × ${ratio} → LHV; converted at ${fx.value} USD/EUR; covers only part of industrial deliveries`,
    date: periodEnd(to) ?? to, evidence: { checkedOn: g.fetchedOn, period: `${from} / ${to}`, observedThrough: periodEnd(to), urls: [g.url], scope: own ? stateName(admin!) : "U.S. average", method: g.method } };
}

type Factors = { src: string; date: string; factors: Record<string, number> };
/** Official regional relatives applied to a national reference, where only relative regional data are comparable. */
const REGIONAL: Record<string, Partial<Record<"gas" | "lab" | "spot", Factors>>> = {
  IT: {
    spot: { src: "ENTSO-E day-ahead by Italian market zone (via Energy-Charts), mean Nov 2025 – Oct 2026 (NORD 148.6, CNOR 149.1, CSUD 146.7, SUD 143.2, CALA 142.5, SICI 148.6, SARD 141.3 €/MWh) ÷ NORD", date: "2026-10-30",
      factors: Object.fromEntries([
        ...["19", "12", "08", "09", "17", "20", "06", "05", "15"].map((c) => [`IT.${c}`, 1]),
        ...["16", "10"].map((c) => [`IT.${c}`, 149.14 / 148.61]),
        ...["18", "07", "01", "04"].map((c) => [`IT.${c}`, 146.69 / 148.61]),
        ...["11", "13", "02"].map((c) => [`IT.${c}`, 143.18 / 148.61]),
        ["IT.03", 142.52 / 148.61], ["IT.14", 141.34 / 148.61],
      ]) },
  },
  BR: {
    gas: { src: "MME Boletim Mensal de Acompanhamento da Indústria de Gás Natural, Sep 2025 (latest published), industrial price by state distributor at 20 000 m³/d incl. taxes ÷ Gasmig (MG) US$ 17.4/MMBtu, the national reference tariff", date: "2025-09-30",
      factors: { "BR.02": 16.0 / 17.4, "BR.04": 14.3 / 17.4, "BR.05": 15.7 / 17.4, "BR.06": 19.9 / 17.4, "BR.08": 18.8 / 17.4, "BR.11": 17.4 / 17.4, "BR.15": 1, "BR.17": 19.0 / 17.4, "BR.18": 18.5 / 17.4, "BR.21": 20.7 / 17.4, "BR.22": 21.2 / 17.4, "BR.23": 21.2 / 17.4, "BR.26": 18.7 / 17.4, "BR.27": 17.9 / 17.4, "BR.28": 18.7 / 17.4, "BR.30": 17.4 / 17.4 } },
    lab: { src: "IBGE PNAD Contínua (SIDRA 5436), 2Q2026: average habitual income by state ÷ Brazil R$ 3 738/month", date: "2026-06-30",
      factors: { "BR.01": 0.842, "BR.02": 0.690, "BR.03": 0.838, "BR.04": 0.741, "BR.05": 0.686, "BR.06": 0.730, "BR.07": 1.651, "BR.08": 0.973, "BR.11": 1.027, "BR.13": 0.611, "BR.14": 1.107, "BR.15": 0.926, "BR.16": 0.694, "BR.17": 0.749, "BR.18": 1.125, "BR.20": 0.681, "BR.21": 1.112, "BR.22": 0.765, "BR.23": 1.115, "BR.24": 1.016, "BR.25": 0.955, "BR.26": 1.170, "BR.27": 1.190, "BR.28": 0.814, "BR.29": 1.056, "BR.30": 0.741, "BR.31": 0.936 } },
    spot: { src: "CCEE PLD monthly mean by submarket, Oct 2025 – Sep 2026: S 245.95, NE 208.71, N 212.14 ÷ SE/CO 227.87 R$/MWh", date: "2026-09-30",
      factors: Object.fromEntries([...["18", "23", "26"].map((c) => [`BR.${c}`, 245.95 / 227.87]), ...["02", "05", "06", "17", "20", "22", "28", "30"].map((c) => [`BR.${c}`, 208.71 / 227.87]), ...["03", "04", "13", "16", "25", "31"].map((c) => [`BR.${c}`, 212.14 / 227.87])]) },
  },
  CA: {
    gas: { src: "FortisBC Rate 3 from 01.07.2026 (BCUC G-50-26) CAD 9.62/GJ ÷ Enbridge Rate 6 CAD 6.63/GJ; SaskEnergy Large Commercial schedule as posted by SaskEnergy (effective 01.10.2023) CAD 5.57/GJ; other provinces: no official tariff retrieved, Ontario reference used", date: "2026-07-01",
      factors: { "CA.02": 9.62 / 6.63, "CA.08": 1, "CA.11": 5.57 / 6.63 } },
    lab: { src: "Job Bank NOC 92101 water and waste treatment plant operators, median wage by province (Nov 2025) × StatCan 36-10-0205 employer contributions ÷ CAD 48.1/h ÷ 0.7", date: "2025-11-19",
      factors: { "CA.01": 1.3894, "CA.02": 1.2383, "CA.03": 0.9556, "CA.04": 1.0463, "CA.05": 1.1303, "CA.07": 1.0573, "CA.08": 1.3005, "CA.09": 1.0337, "CA.10": 1.0846, "CA.11": 1.0685, "CA.12": 1.1803, "CA.13": 1.168, "CA.14": 1.1638 } },
  },
};

function regional(code: string, item: "gas" | "lab" | "spot", regionId: string | undefined, s: Sourced | undefined): Sourced | undefined {
  const r = REGIONAL[code]?.[item], admin = adminFor(code, regionId), f = admin ? r?.factors[admin] : undefined;
  if (!s || !r || f === undefined) return s;
  return { ...s, value: s.value * f, confidence: s.confidence === "HIGH" ? "MEDIUM" : s.confidence, source: `${s.source}; × ${f.toFixed(3)} for ${admin} (${r.src})`, range: s.range && { ...s.range, low: s.range.low * f, high: s.range.high * f } };
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
  if (code === "US" && US) return usElectricity(adminFor(code, regionId));
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

export function gasFor(code: string, annualGasM3?: number, regionId?: string): Sourced | undefined {
  if (code === "US" && US) return usGas(adminFor(code, regionId));
  const observed = observedMarketValue(code, "gas", regionId);
  if (observed) {
    const hhvRatio = ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value;
    return { ...observed, value: observed.value * hhvRatio, source: `${observed.source}; HHV × ${hhvRatio} → LHV`, range: observed.range && { ...observed.range, low: observed.range.low * hhvRatio, high: observed.range.high * hhvRatio } };
  }
  const gj = annualGasM3 === undefined || annualGasM3 <= 0 ? undefined : annualGasM3 * ENGINEERING_MAP["eng.natgas_lhv_kwh_m3"].value * ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value * 0.0036;
  const band = gj === undefined ? "GJ10000-99999" : gj < 1000 ? "GJ_LT1000" : gj < 10000 ? "GJ1000-9999" : gj < 100000 ? "GJ10000-99999" : gj < 1000000 ? "GJ100000-999999" : gj < 4000000 ? "GJ1000000-3999999" : "GJ_GE4000000";
  const national = S.gas[code];
  const g = national?.bands?.[band] ?? national;
  const ratio = ENGINEERING_MAP["eng.gas_hhv_lhv_ratio"].value;
  const conversion = `EUR/MWh HHV × ${ratio} → EUR/MWh LHV; composition-dependent engineering conversion, not a new measured tariff. Eurostat gas prices use GCV: https://ec.europa.eu/eurostat/documents/3859598/7787004/KS-GQ-16-006-N.pdf/23fb64e3-0bc0-4812-9294-3034cf640af3`;
  if (g) return { value: g.eurMwh * ratio, kind: "CALCULATION", confidence: national.bands?.[band] || band === "GJ10000-99999" ? "MEDIUM" : "LOW", source: `Eurostat nrg_pc_203, non-household, ${national.bands?.[band] ? band : "GJ10000-99999 (reference band)"}, excl. VAT, ${per(g.periods)}; HHV × ${ratio} → LHV`, date: periodEnd(g.periods.join(" ")) ?? "undated", evidence: { checkedOn: g.fetchedOn ?? S.fetchedOn, period: per(g.periods), observedThrough: periodEnd(g.periods.join(" ")), publishedOn: g.sourceUpdated?.slice(0, 10), urls: [g.url ?? "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_203/default/table"], scope: `${band}; ${gj === undefined ? "reference band, customer gas use unknown" : "annual gas input converted to GJ HHV with assumed calorific value"}`, method: conversion } };
  const m = MANUAL[code]?.gas;
  const reference = regional(code, "gas", regionId, manualValue(code, "gas"));
  const hhv = m?.gasBasis === "HHV" || ["GB", "US", "CA", "MX", "IN"].includes(code);
  return reference && { ...reference, value: reference.value * (hhv ? ratio : 1), source: `${reference.source}${hhv ? `; HHV × ${ratio} → LHV` : ""}` };
}

/** Wholesale electricity price, €/kWh: the official day-ahead average where published (ENTSO-E via Energy-Charts), else the country's own published value. */
export function spotFor(code: string, regionId?: string): Sourced | undefined {
  const admin = adminFor(code, regionId);
  const hub = code === "US" && admin ? US?.wholesale.states[admin] : undefined;
  if (hub && US) {
    const w = US.wholesale, h = w.hubs[hub], fx = fxFor("USD")!;
    return { value: h.usdMwh / 1000 / fx.value, kind: "CALCULATION", confidence: "MEDIUM", source: `EIA STEO table 7a: ${h.name}, ${w.from.slice(0, 7)} – ${w.to.slice(0, 7)} mean $${h.usdMwh}/MWh (hub serving ${stateName(admin!)}); converted at ${fx.value} USD/EUR`, date: w.to,
      evidence: { checkedOn: w.fetchedOn, period: `${w.from} / ${w.to}`, observedThrough: w.to, urls: [w.url], scope: `Wholesale hub assigned to ${stateName(admin!)}; not a guaranteed export price`, method: "12-month mean of monthly hub prices; state-to-hub assignment by grid operator footprint" } };
  }
  const d = S.dayAhead[code];
  if (d?.eurMwh) return regional(code, "spot", regionId, { value: d.eurMwh / 1000, kind: "FACT", confidence: "HIGH", source: `ENTSO-E day-ahead (via Energy-Charts), zone ${d.bzn}, average ${d.eurMwh.toFixed(1)} €/MWh, ${d.from} – ${d.to}`, date: d.to?.slice(0, 10) ?? "undated", evidence: { checkedOn: d.fetchedOn ?? "undated", period: `${d.from} / ${d.to}`, observedThrough: d.to?.slice(0, 10), urls: [d.url ?? "https://api.energy-charts.info/"], scope: `Wholesale bidding zone ${d.bzn}; not a guaranteed export PPA`, method: "Observed interval average; preserve observation and last successful download dates even when a later refresh fails" }  });
  const m = regional(code, "spot", regionId, manualValue(code, "spot"));
  const proxy = ["AR", "KZ"].includes(code);
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
export function operatorRatioFor(code: string, regionId?: string): Sourced {
  const m = MANUAL[code]?.lab;
  if (code === "US" && US) {
    const o = US.operator, admin = adminFor(code, regionId);
    const own = admin ? o.meanHourlyWage[admin] : undefined;
    const wage = own ?? o.meanHourlyWage.US;
    // Operator cost = wage × (ECEC compensation ÷ wages); the economy-wide cost is ECEC compensation, so the ratio is wage ÷ ECEC wages.
    return { value: +(wage / o.ecec.wagesUsdH).toFixed(4), kind: "CALCULATION", confidence: "MEDIUM", source: `BLS OEWS May ${o.year}, water & wastewater treatment plant operators, ${own ? stateName(admin!) : "U.S."}: mean $${wage}/h ÷ ECEC private-industry wages $${o.ecec.wagesUsdH}/h (${o.ecec.period})`, date: `${o.year}-05-31` };
  }
  const base = m?.ratio ?? (S.labour[code] ? 0.7 : 1);
  const r = REGIONAL[code]?.lab, admin = adminFor(code, regionId), f = admin ? r?.factors[admin] : undefined;
  if (r && f !== undefined) return { value: +(base * f).toFixed(4), kind: "CALCULATION", confidence: "MEDIUM", source: `${base} national operator ratio × ${f} regional wage relative for ${admin} (${r.src})`, date: r.date };
  const value = base;
  return { value, kind: "ASSUMPTION", confidence: "MEDIUM", source: value === 0.7 ? "Plant operator ≈ 70 % of the economy-wide average hourly cost (high-income economy)" : m?.ratio ? "Skilled plant operator premium (see labour source)" : "Plant operator ≈ economy-wide average (middle-income economy; no premium)", date: "2026-10-26" };
}

/** Official hourly labour cost, economy-wide (wages + employer costs) — HIGH where Eurostat publishes it. */
export function labourOfficialFor(code: string): Sourced | undefined {
  if (code === "US" && US) {
    const e = US.operator.ecec, fx = fxFor("USD")!, [year, q] = e.period.split("-Q");
    return { value: e.totalUsdH / fx.value, kind: "CALCULATION", confidence: "HIGH", source: `BLS Employer Costs for Employee Compensation, private industry, ${e.period}: $${e.totalUsdH} per hour worked; converted at ${fx.value} USD/EUR`, date: periodEnd(`${year}-Q${Number(q)}`) ?? `${year}-12-31` };
  }
  const observed = observedMarketValue(code, "lab");
  if (observed) return observed;
  const l = S.labour[code];
  if (l) return { value: l.eurH, kind: "FACT", confidence: "HIGH", source: `Eurostat lc_lci_lev: hourly labour cost (wages + employer costs), industry, construction & services, ${l.year}`, date: `${l.year}-12-31` };
  return manualValue(code, "lab");
}

/** Plant operator cost, €/h = official labour cost × operator ratio. */
export function labourFor(code: string, regionId?: string): Sourced | undefined {
  const o = labourOfficialFor(code);
  if (!o) return undefined;
  const r = operatorRatioFor(code, regionId);
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

export function gridEfFor(code: string, regionId?: string): Sourced | undefined {
  const r = EF.regions?.[code];
  const admin = adminFor(code, regionId);
  const v = admin ? r?.values[admin] : undefined;
  if (r && v !== undefined) return { value: v, kind: "FACT", confidence: "MEDIUM", source: `${r.source}: ${code === "US" ? stateName(admin!) : admin}`, date: `${r.year}-12-31` };
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

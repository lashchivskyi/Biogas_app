import { canonicalBusiness, defaultProcess } from "@/core/businesses";
import { processSchema, type ProcessInput, type ProcessKind } from "@/core/processes";
import { BUSINESS_TYPES, FEEDSTOCKS } from "@/core/feedstockData";
import type { CountryAdapter } from "@/core/country";
import type { AnimalKind, BusinessTypeId, FeedstockLineInput, FeedstockTypeId, HandlingId, HeatNeed, Housing, ProjectInput, RouteId } from "@/core/types";
import { INTL_TAG, type Locale } from "@/i18n/config";
import { parseLocalizedNumber } from "./localized-number";
import { cityRegionId, validCity, type CityClimate } from "@/core/location";

/** Questionnaire state. Everything is a string so empty ≠ 0 (an empty field is "unknown"). Money in the project's local currency. */
export interface FormLine {
  id: string;
  kind: "animal" | "type";
  animal?: AnimalKind;
  type?: FeedstockTypeId;
  quantity: string;
  housing: Housing;
  dryMatterPct: string;
  vsPctOfDm: string;
  methaneYieldLPerKgVs: string;
  monthsActive: string;
  startMonth: string;
  delivered: boolean;
  distanceKm: string;
  handling: HandlingId | "";
  disposalCost: string;
  opportunityValue: string;
  purchasePrice: string; // negative = gate fee received
}

export interface FormState {
  numberLocale?: Locale;
  countryCode: string;
  regionId: string;
  city?: CityClimate;
  businessType: BusinessTypeId;
  processKind?: "ad" | ProcessKind;
  processFields?: Record<string, string>;
  projectRole?: ProjectInput["projectRole"];
  lines: FormLine[];
  elecBillMonthly: string;
  elecKwhYear: string;
  elecPrice: string;
  gasUsed: boolean;
  gasBillMonthly: string;
  gasM3Year: string;
  gasPrice: string;
  heatNeed: HeatNeed;
  heatKwhYear: string;
  hasGrid: boolean;
  landHa: string;
  existingStorageM3: string;
  gasGridKm: string;
  neighbours: boolean;
  protectedArea: boolean;
  /** The client opted to enter contract and financing terms; while false, the fields below are ignored (like `gasUsed`). */
  refineOpen?: boolean;
  /** Optional refinements the client may know; empty = use the national estimate. Prices in local currency, rates in %. */
  exportPrice?: string;
  heatPrice?: string;
  operatorWage?: string;
  debtSharePct?: string;
  debtRatePct?: string;
  debtTenorYears?: string;
  /** Supplier's installed price for ONE technology; both fields are needed, otherwise the quote is ignored. */
  capexQuote?: string;
  capexQuoteRoute?: "" | RouteId;
}

const formNumber = (s: string, locale?: Locale) => locale
  ? parseLocalizedNumber(s, locale)
  : parseLocalizedNumber(s.replace(/\s/g, "").replace(",", "."), "uk");

/** Do not silently omit an invalid stream or price when calculating the remaining inputs. */
export function invalidNumberStep(f: FormState): 1 | 2 | 3 | null {
  const invalid = (s: string | undefined) => Boolean(s?.trim()) && formNumber(s!, f.numberLocale) === undefined;
  if (Object.entries(f.processFields ?? {}).filter(([k]) => !k.startsWith("basis") && k !== "reactorTechnology").some(([,v]) => invalid(v))) return 1;
  if ((f.processKind ?? defaultProcess(f.businessType)) === "ad" && f.lines.some((l) => [l.quantity, l.dryMatterPct, l.vsPctOfDm, l.methaneYieldLPerKgVs, l.monthsActive, l.startMonth, l.delivered ? l.distanceKm : "", l.disposalCost, l.opportunityValue, l.purchasePrice].some(invalid))) return 1;
  if ([f.elecBillMonthly, f.elecKwhYear, f.elecPrice, f.gasUsed ? f.gasBillMonthly : "", f.gasUsed ? f.gasM3Year : "", f.gasUsed ? f.gasPrice : "", f.heatKwhYear, f.exportPrice, f.heatPrice].some(invalid)) return 2;
  if ([(f.processKind ?? defaultProcess(f.businessType)) === "ad" ? f.landHa : "", (f.processKind ?? defaultProcess(f.businessType)) === "ad" ? f.existingStorageM3 : "", f.gasGridKm, ...(f.refineOpen ? [f.operatorWage, f.capexQuote, f.debtSharePct, f.debtRatePct, f.debtTenorYears] : [])].some(invalid)) return 3;
  return null;
}

const param = (c: CountryAdapter, id: string, fallback: number) => c.params.find((p) => p.id === id)?.value ?? fallback;

/** Defaults used only to convert a monthly bill into kWh / m³ when the customer does not know the unit price. */
export function uiDefaults(c: CountryAdapter) {
  const fx = param(c, "econ.fx_local_per_eur", 1);
  const elec = param(c, "econ.electricity_retail_eur_kwh", 0.15) * fx;
  const gas = param(c, "econ.gas_price_eur_mwh", 45) * 0.0095 * fx; // EUR/MWh → local per m³ (≈ 9.5 kWh/m³)
  return { fx, electricityPerKwh: elec, gasPerM3: gas };
}

let counter = 0;
export const newId = () => `l${Date.now().toString(36)}${(counter++).toString(36)}`;

export function emptyLine(kind: "animal" | "type", key: AnimalKind | FeedstockTypeId): FormLine {
  const base: FormLine = {
    id: newId(), kind, quantity: "", housing: "year_round", dryMatterPct: "", vsPctOfDm: "", methaneYieldLPerKgVs: "", monthsActive: "", startMonth: "", delivered: false,
    distanceKm: "", handling: "", disposalCost: "", opportunityValue: "", purchasePrice: "",
  };
  if (kind === "animal") return { ...base, animal: key as AnimalKind };
  return { ...base, type: key as FeedstockTypeId, handling: FEEDSTOCKS[key as FeedstockTypeId].defaultHandling };
}

export function linesForBusiness(b: BusinessTypeId): FormLine[] {
  return BUSINESS_TYPES[b].suggested.map((s) => (s.animal ? emptyLine("animal", s.animal) : emptyLine("type", s.type as FeedstockTypeId)));
}

export function initialForm(businessType: BusinessTypeId, countryCode: string, regionId: string, locale: Locale = "en"): FormState {
  return {
    numberLocale: locale,
    countryCode, regionId, businessType: canonicalBusiness(businessType), processKind: defaultProcess(businessType), processFields: {}, projectRole: BUSINESS_TYPES[businessType].role,
    lines: linesForBusiness(businessType),
    elecBillMonthly: "", elecKwhYear: "", elecPrice: "",
    gasUsed: false, gasBillMonthly: "", gasM3Year: "", gasPrice: "",
    heatNeed: "none", heatKwhYear: "", hasGrid: true,
    landHa: "", existingStorageM3: "", gasGridKm: "",
    neighbours: false, protectedArea: false,
  };
}

/** Keep physical/unfinished inputs across locale changes; never reinterpret old local invoices in a new market. */
export function recontextualizeForm(f: FormState, country: CountryAdapter, regionId: string | undefined, locale: Locale, projectCity?: CityClimate): FormState {
  const nf = new Intl.NumberFormat(INTL_TAG[locale], { useGrouping: false, maximumFractionDigits: 20 });
  const reformat = (value: string) => { const n = formNumber(value ?? "", f.numberLocale); return n === undefined ? value ?? "" : nf.format(n); };
  const changed = f.countryCode !== country.code;
  const city = validCity(projectCity, country.code) && regionId === cityRegionId(projectCity) ? projectCity : undefined;
  const next = { ...f, businessType: canonicalBusiness(f.businessType), processKind: f.processKind ?? defaultProcess(f.businessType), numberLocale: locale, countryCode: country.code,
    regionId: city ? cityRegionId(city) : country.regions.some((r) => r.id === regionId) ? regionId! : "", city,
    processFields: Object.fromEntries(Object.entries(f.processFields ?? {}).map(([k,v]) => [k, changed && (k.includes("Local") || k.startsWith("basis")) ? "" : k.startsWith("basis") ? v : reformat(v)])),
    lines: f.lines.map((line) => ({ ...line })),
  };
  const numbers = ["elecBillMonthly", "elecKwhYear", "elecPrice", "gasBillMonthly", "gasM3Year", "gasPrice", "heatKwhYear", "landHa", "existingStorageM3", "gasGridKm", "debtSharePct", "debtRatePct", "debtTenorYears"] as const;
  for (const key of numbers) next[key] = reformat(f[key] ?? "");
  for (const key of ["exportPrice", "heatPrice", "operatorWage", "capexQuote"] as const) next[key] = reformat(f[key] ?? "");
  for (const line of next.lines) for (const key of ["quantity", "dryMatterPct", "vsPctOfDm", "methaneYieldLPerKgVs", "monthsActive", "startMonth", "distanceKm", "disposalCost", "opportunityValue", "purchasePrice"] as const) line[key] = reformat(line[key]);
  if (changed) {
    for (const key of ["elecBillMonthly", "elecPrice", "gasBillMonthly", "gasPrice", "exportPrice", "heatPrice", "operatorWage", "capexQuote"] as const) next[key] = "";
    for (const line of next.lines) for (const key of ["disposalCost", "opportunityValue", "purchasePrice"] as const) line[key] = "";
  }
  return next;
}

export function formToInput(f: FormState, country: CountryAdapter, lang: "en" | "uk"): ProjectInput {
  // Drafts saved before numberLocale existed used a dot or comma as the decimal mark,
  // never locale-specific grouping. Preserve that meaning when opening an old draft.
  const num = (s: string) => formNumber(s, f.numberLocale);
  const def = uiDefaults(country);
  const feedstocks: FeedstockLineInput[] = [];
  for (const l of f.lines) {
    const q = num(l.quantity);
    if (!q || q <= 0) continue;
    const line: FeedstockLineInput = { id: l.id, quantity: q };
    if (l.kind === "animal") {
      line.animal = l.animal;
      line.housing = l.housing;
    } else line.type = l.type;
    const dm = num(l.dryMatterPct);
    if (dm && dm > 0 && dm <= 95) line.dryMatterPct = dm;
    const vs = num(l.vsPctOfDm ?? "");
    if (vs && vs > 0 && vs <= 100) line.vsPctOfDm = vs;
    const bmp = num(l.methaneYieldLPerKgVs ?? "");
    if (bmp && bmp > 0 && bmp <= 1200) line.methaneYieldLPerKgVs = bmp;
    const months = num(l.monthsActive);
    if (months && l.kind === "type") line.monthsActive = Math.min(12, Math.max(1, months));
    const start = num(l.startMonth ?? "");
    if (start && l.kind === "type") line.startMonth = Math.min(12, Math.max(1, Math.round(start)));
    if (l.delivered) {
      line.delivered = true;
      line.distanceKm = num(l.distanceKm);
    }
    if (l.handling) line.handling = l.handling;
    const dc = num(l.disposalCost);
    if (dc && dc > 0) line.currentDisposalCostPerTonneLocal = dc;
    const ov = num(l.opportunityValue);
    if (ov && ov > 0) line.opportunityValuePerTonneLocal = ov;
    const pp = num(l.purchasePrice);
    if (pp !== undefined && pp !== 0) line.purchasePricePerTonneLocal = pp;
    feedstocks.push(line);
  }

  const positive = (s: string | undefined) => { const n = num(s ?? ""); return n !== undefined && n > 0 ? n : undefined; };
  const pct = (s: string | undefined, max: number) => { const n = positive(s); return n !== undefined && n <= max ? n / 100 : undefined; };
  const rf = f.refineOpen ? f : undefined; // terms are ignored until the client ticks the box
  const tenor = positive(rf?.debtTenorYears);
  const finance: NonNullable<ProjectInput["finance"]> = {
    debtShare: pct(rf?.debtSharePct, 90), debtRate: pct(rf?.debtRatePct, 60),
    debtTenorYears: tenor !== undefined && tenor <= 30 ? Math.round(tenor) : undefined, operatorWageLocalPerHour: positive(rf?.operatorWage),
  };
  const quote = positive(rf?.capexQuote);
  if (quote !== undefined && rf?.capexQuoteRoute && (f.processKind ?? defaultProcess(f.businessType)) === "ad") { finance.capexQuoteLocal = quote; finance.capexQuoteRoute = rf.capexQuoteRoute; }
  for (const k of Object.keys(finance) as (keyof typeof finance)[]) if (finance[k] === undefined) delete finance[k];
  const price = num(f.elecPrice);
  const kwh = num(f.elecKwhYear) ?? (num(f.elecBillMonthly) ? ((num(f.elecBillMonthly) as number) * 12) / (price ?? def.electricityPerKwh) : undefined);
  const gasPrice = num(f.gasPrice);
  const gasM3 = f.gasUsed ? num(f.gasM3Year) ?? (num(f.gasBillMonthly) ? ((num(f.gasBillMonthly) as number) * 12) / (gasPrice ?? def.gasPerM3) : undefined) : undefined;
  const city = validCity(f.city, country.code) && f.regionId === cityRegionId(f.city) ? f.city : undefined;
  const region = city ? cityRegionId(city) : country.regions.some((r) => r.id === f.regionId) ? f.regionId : "";

  return {
    countryCode: country.code,
    regionId: region,
    ...(city ? { city } : {}),
    businessType: f.businessType,
    lang,
    feedstocks: (f.processKind ?? defaultProcess(f.businessType)) === "ad" ? feedstocks : [],
    ...((f.processKind ?? defaultProcess(f.businessType)) !== "ad" ? { process: processFromForm(f) as ProcessInput } : {}),
    projectRole: f.projectRole ?? BUSINESS_TYPES[f.businessType].role,
    energy: {
      electricityKwhYear: kwh,
      electricityPriceLocalPerKwh: price,
      gasM3Year: gasM3,
      gasPriceLocalPerM3: f.gasUsed ? gasPrice : undefined,
      heatNeed: f.heatNeed,
      heatKwhYear: num(f.heatKwhYear),
      hasGridConnection: f.hasGrid,
      exportPriceLocalPerKwh: positive(f.exportPrice),
      heatPriceLocalPerKwh: f.heatNeed !== "none" ? positive(f.heatPrice) : undefined,
    },
    ...(Object.keys(finance).length ? { finance } : {}),
    site: {
      landHa: (f.processKind ?? defaultProcess(f.businessType)) === "ad" ? num(f.landHa) : undefined,
      existingStorageM3: (f.processKind ?? defaultProcess(f.businessType)) === "ad" ? num(f.existingStorageM3) : undefined,
      gasGridKm: num(f.gasGridKm),
      neighboursWithin300m: f.neighbours,
      nearProtectedOrWaterArea: f.protectedArea,
    },
  };
}

export function inputToForm(i: ProjectInput, locale: Locale = "en"): FormState {
  const nf = new Intl.NumberFormat(INTL_TAG[locale], { useGrouping: false, maximumFractionDigits: 20 });
  const s = (v: number | undefined) => v === undefined ? "" : nf.format(v);
  const lines: FormLine[] = i.feedstocks.map((l) => {
    const base = emptyLine(l.animal ? "animal" : "type", (l.animal ?? l.type) as AnimalKind | FeedstockTypeId);
    return {
      ...base,
      id: l.id + newId(),
      quantity: s(l.quantity),
      housing: l.housing ?? "year_round",
      dryMatterPct: s(l.dryMatterPct),
      vsPctOfDm: s(l.vsPctOfDm),
      methaneYieldLPerKgVs: s(l.methaneYieldLPerKgVs),
      monthsActive: s(l.monthsActive),
      startMonth: s(l.startMonth),
      delivered: !!l.delivered,
      distanceKm: s(l.distanceKm),
      handling: l.handling ?? base.handling,
      disposalCost: s(l.currentDisposalCostPerTonneLocal),
      opportunityValue: s(l.opportunityValuePerTonneLocal),
      purchasePrice: s(l.purchasePricePerTonneLocal),
    };
  });
  return {
    numberLocale: locale,
    processKind: i.process?.kind ?? "ad",
    processFields: i.process ? Object.fromEntries(Object.entries(i.process).filter(([k]) => k !== "kind").map(([k,v]) => [k,typeof v === "string" ? v : s(v as number)])) : {},
    projectRole: i.projectRole ?? BUSINESS_TYPES[i.businessType].role,
    countryCode: i.countryCode,
    regionId: i.regionId,
    ...(i.city ? { city: i.city } : {}),
    businessType: canonicalBusiness(i.businessType),
    lines,
    elecBillMonthly: "",
    elecKwhYear: s(i.energy.electricityKwhYear),
    elecPrice: s(i.energy.electricityPriceLocalPerKwh),
    gasUsed: (i.energy.gasM3Year ?? 0) > 0,
    gasBillMonthly: "",
    gasM3Year: s(i.energy.gasM3Year),
    gasPrice: s(i.energy.gasPriceLocalPerM3),
    heatNeed: i.energy.heatNeed,
    heatKwhYear: s(i.energy.heatKwhYear),
    hasGrid: i.energy.hasGridConnection,
    landHa: s(i.site.landHa),
    existingStorageM3: s(i.site.existingStorageM3),
    gasGridKm: s(i.site.gasGridKm),
    neighbours: !!i.site.neighboursWithin300m,
    protectedArea: !!i.site.nearProtectedOrWaterArea,
    refineOpen: Object.keys(i.finance ?? {}).length > 0,
    exportPrice: s(i.energy.exportPriceLocalPerKwh),
    heatPrice: s(i.energy.heatPriceLocalPerKwh),
    operatorWage: s(i.finance?.operatorWageLocalPerHour),
    debtSharePct: s(i.finance?.debtShare === undefined ? undefined : +(i.finance.debtShare * 100).toFixed(6)),
    debtRatePct: s(i.finance?.debtRate === undefined ? undefined : +(i.finance.debtRate * 100).toFixed(6)),
    debtTenorYears: s(i.finance?.debtTenorYears),
    capexQuote: s(i.finance?.capexQuoteLocal),
    capexQuoteRoute: i.finance?.capexQuoteRoute ?? "",
  };
}

export function processFromForm(f: FormState) {
  return { kind: f.processKind ?? defaultProcess(f.businessType), ...Object.fromEntries(Object.entries(f.processFields ?? {}).map(([k,v]) => [k, (k.startsWith("basis") || k === "reactorTechnology") ? v.trim() || undefined : formNumber(v, f.numberLocale)])) };
}
export function processIssues(f: FormState): string[] {
  if ((f.processKind ?? defaultProcess(f.businessType)) === "ad") return [];
  const result = processSchema.safeParse(processFromForm(f));
  return result.success ? [] : [...new Set(result.error.issues.map(i => String(i.path[0])))];
}

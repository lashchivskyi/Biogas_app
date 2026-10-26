import { BUSINESS_TYPES, FEEDSTOCKS } from "@/core/feedstockData";
import type { CountryAdapter } from "@/core/country";
import type { AnimalKind, BusinessTypeId, FeedstockLineInput, FeedstockTypeId, HandlingId, HeatNeed, Housing, ProjectInput } from "@/core/types";
import { INTL_TAG, type Locale } from "@/i18n/config";
import { parseLocalizedNumber } from "./localized-number";

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
  businessType: BusinessTypeId;
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
    countryCode, regionId, businessType,
    lines: linesForBusiness(businessType),
    elecBillMonthly: "", elecKwhYear: "", elecPrice: "",
    gasUsed: false, gasBillMonthly: "", gasM3Year: "", gasPrice: "",
    heatNeed: "none", heatKwhYear: "", hasGrid: true,
    landHa: "", existingStorageM3: "", gasGridKm: "",
    neighbours: false, protectedArea: false,
  };
}

export function formToInput(f: FormState, country: CountryAdapter, lang: "en" | "uk", locale: Locale = lang): ProjectInput {
  // Drafts saved before numberLocale existed used a dot or comma as the decimal mark,
  // never locale-specific grouping. Preserve that meaning when opening an old draft.
  const num = (s: string) => f.numberLocale
    ? parseLocalizedNumber(s, f.numberLocale)
    : parseLocalizedNumber(s.replace(/\s/g, "").replace(",", "."), "uk");
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

  const price = num(f.elecPrice);
  const kwh = num(f.elecKwhYear) ?? (num(f.elecBillMonthly) ? ((num(f.elecBillMonthly) as number) * 12) / (price ?? def.electricityPerKwh) : undefined);
  const gasPrice = num(f.gasPrice);
  const gasM3 = f.gasUsed ? num(f.gasM3Year) ?? (num(f.gasBillMonthly) ? ((num(f.gasBillMonthly) as number) * 12) / (gasPrice ?? def.gasPerM3) : undefined) : undefined;
  const region = country.regions.some((r) => r.id === f.regionId) ? f.regionId : country.regions[0].id;

  return {
    countryCode: country.code,
    regionId: region,
    businessType: f.businessType,
    lang,
    feedstocks,
    energy: {
      electricityKwhYear: kwh,
      electricityPriceLocalPerKwh: price,
      gasM3Year: gasM3,
      gasPriceLocalPerM3: f.gasUsed ? gasPrice : undefined,
      heatNeed: f.heatNeed,
      heatKwhYear: num(f.heatKwhYear),
      hasGridConnection: f.hasGrid,
    },
    site: {
      landHa: num(f.landHa),
      existingStorageM3: num(f.existingStorageM3),
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
    countryCode: i.countryCode,
    regionId: i.regionId,
    businessType: i.businessType,
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
  };
}

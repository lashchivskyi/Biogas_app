import type { CoreLang } from "./i18n";
import type { Confidence, Provenance, RegulatoryItem, RouteId } from "./types";

/**
 * Contract between the country-independent core and a market.
 * The core only sees this interface; src/countries/* implement it.
 *
 * What a country decides: climate, prices, wages, discount rate, regulation, support rules.
 * What a country must NOT decide: digestion kinetics, heat balance, sizing logic.
 */
export interface Region {
  id: string;
  /** English (or international) name. */
  name: string;
  /** Optional local-language names by UI locale, e.g. { uk: "Львівська область" }. */
  names?: Record<string, string>;
  /** Monthly mean air temperature, °C, Jan..Dec. */
  monthlyTempC: number[];
  tempSource: string;
  altitudeM?: number;
}

export interface RegulatoryContext {
  route: RouteId;
  kwElEquivalent: number;
  tonnesYear: number;
  abpTonnesYear: number;
  digestateTonnesYear: number;
  neighboursWithin300m: boolean;
  nearProtectedOrWaterArea: boolean;
  exportsElectricity: boolean;
  gasGridInjection: boolean;
  lang: CoreLang;
}

/**
 * A national support instrument the project MIGHT obtain. Modelled as a separate case, never in
 * the base verdict: tariffs get cut, auctions fail, grant calls close.
 */
export interface SupportScheme {
  id: string;
  /** Name in the local/official form, e.g. "EEG 2023 Güllekleinanlage". */
  name: string;
  status: "open" | "competitive" | "closing" | "closed" | "uncertain";
  /** All net electricity paid at this tariff (feed-in / CfD-like). */
  electricityTariffEurKwh?: number;
  /** Realised biomethane price incl. the support (EUR/Nm³). */
  biomethaneEurNm3?: number;
  /** Share of CAPEX covered by a non-repayable grant or tax credit. */
  capexGrantShare?: number;
  routes: RouteId[];
  maxKwEl?: number;
  minKwEl?: number;
  /** Minimum manure share of fresh mass (e.g. German 80 % rule). */
  minManureShareMass?: number;
  note: { en: string; uk: string };
  source: string;
  confidence: Confidence;
  checkedOn: string;
}

export interface SupportInfo {
  /** Short statement of what is available to NEW projects — shown in the report. */
  summary: { en: string; uk: string };
  /** True only if a mechanism is open and reliably awardable to new small projects. */
  availableForNewSmallProjects: boolean;
  checkedOn: string;
  schemes: SupportScheme[];
}

export type RegulatoryRegime = "EU" | "UA" | "UK" | "US" | "CA" | "GENERIC";

export interface CountryAdapter {
  code: string;
  nameEn: string;
  /** ISO 4217 code of the local currency. */
  currency: string;
  /** "operational": prices calibrated against local projects & invoices; "profile": built from national statistics. */
  maturity: "operational" | "profile";
  /** What backs the key prices: calibrated (local invoices + projects), official statistics, or national estimates. */
  dataStatus: "calibrated" | "official" | "estimated";
  params: Provenance[];
  regions: Region[];
  support: SupportInfo;
  regime: RegulatoryRegime;
  /** Is grid injection of biomethane an established pathway (≥ several plants injecting)? */
  biomethaneInjection: boolean;
  regulatory(ctx: RegulatoryContext): RegulatoryItem[];
  /** Country-specific remarks that change the approach (shown in the report). */
  approachNotes: { en: string[]; uk: string[] };
  /** Pricing tier of our paid products for projects located in this country. */
  priceTier: "A" | "B" | "C";
}

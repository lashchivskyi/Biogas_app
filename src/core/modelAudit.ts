import { ANIMALS, FEEDSTOCKS } from "./feedstockData";
import { SCENARIOS } from "./scenarios";
import type { Assessment, Provenance } from "./types";

export const MODEL_VERSION = "0.6.0";
/** Deterministic fallback for static examples. Live evaluations pass an explicit date. */
export const DATA_REVIEW_AS_OF = "2026-10-29";
type Check = NonNullable<Assessment["dataAudit"]>["checks"][number];
const PHYSICAL_CONSTANTS = new Set(["eng.ch4_lhv_kwh_m3", "eng.ch4_density_kg_m3", "eng.co2_density_kg_m3", "eng.gwp_ch4", "eng.gas_emission_factor_t_mwh"]);

export function isoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/** A period's end is distinct from publication, download or review dates. */
export function periodEnd(period: string): string | undefined {
  const parts = period.match(/\d{4}(?:-S[12]|-Q[1-4]|-\d{2}(?:-\d{2})?)?/g) ?? [];
  const ends = parts.map((part) => {
    if (isoDate(part)) return part;
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return "";
    const year = Number(part.slice(0, 4));
    const semester = part.match(/-S([12])$/);
    const quarter = part.match(/-Q([1-4])$/);
    const month = semester ? Number(semester[1]) * 6 : quarter ? Number(quarter[1]) * 3 : part.length === 7 ? Number(part.slice(5)) : 12;
    if (month < 1 || month > 12) return "";
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  }).filter(Boolean);
  return ends.sort().at(-1);
}

export function checkEvidence(p: Provenance, asOfDate: string): Check {
  if (!isoDate(asOfDate)) throw new Error("Invalid assessment date");
  const evidence = p.evidence;
  const observed = evidence?.observedThrough ?? (evidence?.period ? periodEnd(evidence.period) : undefined) ?? (isoDate(p.date) ? p.date : undefined);
  const result = (status: Check["status"], reason: string): Check => ({ parameterId: p.id, status, observedThrough: observed, publishedOn: evidence?.publishedOn, checkedOn: evidence?.checkedOn, validUntil: evidence?.validUntil, reason });
  if (PHYSICAL_CONSTANTS.has(p.id)) return result("CONSTANT", "Physical/scientific reference; age alone does not invalidate the constant or its stated conditions");
  if (evidence?.validFrom && asOfDate < evidence.validFrom) return result("EXPIRED", "Tariff is not yet effective at the assessment date");
  if (evidence?.validUntil && asOfDate > evidence.validUntil) return result("EXPIRED", "Published validity period ended; a newer applicable tariff or customer contract is required");
  if (evidence?.publishedOn && evidence.publishedOn > asOfDate) return result("REVIEW_REQUIRED", "Source publication is later than the assessment date");
  if (p.origin === "USER_INPUT") return result("REVIEW_REQUIRED", "Customer input; invoice date, contract and validity not independently verified");
  if (p.id === "econ.fx_local_per_eur" && p.unit === "EUR/EUR") return result("CONSTANT", "EUR reporting currency; no currency conversion");
  if (p.kind === "ASSUMPTION" || p.kind === "ESTIMATE" || p.id.startsWith("eng.") || p.id.startsWith("econ.capex_factor")) {
    return result("ASSUMPTION", "Engineering estimate or reconstructed cost; a recent review date does not establish current market validity");
  }
  if (!observed) return result("UNDATED", "Observation period is missing; no recent date is inferred from record creation");
  if (observed > asOfDate) return result("REVIEW_REQUIRED", "Observation period ends after the assessment date");
  const age = (Date.parse(`${asOfDate}T00:00:00Z`) - Date.parse(`${observed}T00:00:00Z`)) / 86400000;
  if (p.id === "econ.fx_local_per_eur" && /annual average/i.test(p.source)) return result("REVIEW_REQUIRED", "Annual-average FX is a historical valuation basis, not the current reference rate");
  // Review policy, not evidence that the newest available publication was independently checked.
  const maxAge = p.id === "econ.fx_local_per_eur" ? 7 : /labour|wage|operator/.test(p.id) ? 730 : /electricity_spot/.test(p.id) ? 60 : 400;
  return age > maxAge ? result("REVIEW_REQUIRED", `Observation is ${Math.floor(age)} days old; exceeds the ${maxAge}-day review policy`) : result("WITHIN_REVIEW_WINDOW", `Within the ${maxAge}-day review policy; applicability and latest publication must still be checked`);
}

/** Stable change identifier; this is not a cryptographic signature or an accuracy certificate. */
export function fingerprint(value: unknown): string {
  const canonical = (item: unknown): string => {
    if (Array.isArray(item)) return `[${item.map(canonical).join(",")}]`;
    if (item && typeof item === "object") return `{${Object.entries(item).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`).join(",")}}`;
    return JSON.stringify(item) ?? "null";
  };
  const text = canonical(value);
  let first = 2166136261, second = 5381;
  for (let i = 0; i < text.length; i++) {
    first = Math.imul(first ^ text.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ text.charCodeAt(i);
  }
  return (first >>> 0).toString(16).padStart(8, "0") + (second >>> 0).toString(16).padStart(8, "0");
}

export const CATALOG_VERSION = fingerprint({ feedstocks: FEEDSTOCKS, animals: ANIMALS, scenarios: SCENARIOS });

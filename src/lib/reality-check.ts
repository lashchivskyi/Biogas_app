import type { ProjectInput } from "@/core/types";
import accuracy from "@/countries/data/accuracy-summary.json";

/** Feedstocks the FNR Messprogramm III plants were fed (`BMP3_TYPES` in scripts/accuracy-references.ts; a test keeps them equal). */
export const FNR_TYPES = ["dairy_slurry", "cattle_solid_manure", "pig_slurry", "poultry_layer_manure", "poultry_broiler_litter", "maize_silage",
  "potato_processing", "grass_silage", "whole_crop_silage", "cereal_grain", "sugar_beet"] as const;

export type RealityCheck = { copy: "field" | "fieldDe" | "fieldLandfill"; count: number; lo: number; hi: number } | { copy: "fieldNone" };

/**
 * The real-plant set the report quotes is the one that matches how the project is entered: a herd count (AgSTAR, where the
 * collected manure is the main unknown), weighed farm feedstock (FNR metered plants), a landfill (LMOP closed sites). Food
 * residues, wastewater and existing gas streams have no open plant-level data, and the report says so instead of borrowing
 * a farm range. Bands are p10–p90 of model ÷ real, so the real output is 1/p90 … 1/p10 × the estimate.
 */
export function realityCheck(input: ProjectInput): RealityCheck {
  const kind = input.process?.kind;
  const id = kind === "landfill" ? "us_landfill_gas"
    : kind ? undefined
    : input.feedstocks.some((l) => l.animal) ? "us_farm_all"
    : input.feedstocks.length && input.feedstocks.every((l) => l.type && (FNR_TYPES as readonly string[]).includes(l.type)) ? "de_farm_methane"
    : undefined;
  const s = accuracy.sets.find((x) => x.id === id);
  if (!s) return { copy: "fieldNone" };
  return { copy: id === "us_landfill_gas" ? "fieldLandfill" : id === "de_farm_methane" ? "fieldDe" : "field", count: s.n, lo: 1 / s.p90, hi: 1 / s.p10 };
}

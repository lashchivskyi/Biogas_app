import type { ProcessInput } from "./processes";

type Wastewater = Extract<ProcessInput, { kind: "wastewater" }>;
/** Fields a preset fills; flow comes from the client's raw-material throughput, costs stay blank (modelled or entered). */
type PresetFields = Pick<Wastewater, "reactorTechnology" | "codMgL" | "removalPct" | "methanePct" | "methaneRecoveryPct" | "biomassCodPct" | "sludgeTsPct" | "sludgeVsPct" | "hrtDays" | "olr" | "inletTempC" | "heatRecoveryPct" | "operatingDays" | "monthsActive" | "startMonth" | "uncertaintyPct">;

export interface WastewaterPreset {
  id: "potato_starch" | "cereal_starch" | "cassava_starch";
  /** Specific wastewater discharge, m³ per tonne of raw material (gross tonnage, as the BAT conclusions count it). */
  m3PerTRaw: number;
  fields: PresetFields;
  /** Short client-facing source line, stored as the process basis reference (ENGINEERING_ASSUMPTION). */
  source: string;
  url: string;
}

// Shared engineering assumptions (LOW): CH4 capture, sludge yield and sludge solids as in the reference wastewater examples.
const common = { methaneRecoveryPct: 95, biomassCodPct: 8, sludgeTsPct: 5, sludgeVsPct: 80, uncertaintyPct: 50 } as const;
// High-rate sizing: OLR 10 kg COD/(m³·d), the low end of UASB practice (van Lier et al. 2015, 10–15) and below the 12 g/(L·d)
// held on starch wastewater by Siller & Winter (1998); feed/effluent heat exchange 50 % (judgement).
const highRate = { reactorTechnology: "high_rate", hrtDays: 0.5, olr: 10, heatRecoveryPct: 50 } as const;
const BAT = "https://eur-lex.europa.eu/eli/dec_impl/2019/2031/oj";

/**
 * Starch-plant wastewater per tonne of raw material. EU flows are the BAT indicative specific discharge (Commission
 * Implementing Decision (EU) 2019/2031, Table 17.26, yearly averages, midpoint of the range); there is no official COD per
 * tonne, so EU strength uses the starch-industry mean of IEA Bioenergy Task 37 (2025, Table 1, after Pesta 2024: 5.7 kg COD/m³;
 * 1.5–2.3 m³/t product). Anaerobic COD removal on starch effluent 50–80 % (FDM BREF 2019, §14.2.6). Cassava: measured at eight
 * Thai plants (Chavalparit & Ongwandee, J. Clean. Prod. 17, 2009: 19 m³ wastewater and 4.21 t roots per t starch;
 * 11 000–13 500 mg COD/L) and a covered lagoon (Lerdlattaporn et al. 2021: 12 200 mg/L, 92 % removal, 55 % CH₄, V/Q 25 d).
 */
export const WASTEWATER_PRESETS: Record<WastewaterPreset["id"], WastewaterPreset> = {
  potato_starch: {
    id: "potato_starch", m3PerTRaw: 0.78,
    // Campaign August–January as at the Emsland plants (examples `de_starch`); 30 °C inlet is a judgement.
    fields: { ...common, ...highRate, codMgL: 5700, removalPct: 75, methanePct: 60, inletTempC: 30, operatingDays: 170, monthsActive: 6, startMonth: 8 },
    source: "Typical potato-starch values: EU BAT conclusions 2019/2031 (0.4–1.15 m³/t potatoes, midpoint); COD 5.7 g/L starch-industry mean, IEA Bioenergy Task 37 2025; removal 75 % within FDM BREF 2019 50–80 %. Replace with the plant's own flow and COD records.",
    url: BAT,
  },
  cereal_starch: {
    id: "cereal_starch", m3PerTRaw: 2.5,
    fields: { ...common, ...highRate, codMgL: 5700, removalPct: 75, methanePct: 60, inletTempC: 30, operatingDays: 340, monthsActive: 12, startMonth: 1 },
    source: "Typical wheat/maize-starch values: EU BAT conclusions 2019/2031 (1.1–3.9 m³/t grain, midpoint); COD 5.7 g/L starch-industry mean, IEA Bioenergy Task 37 2025; removal 75 % within FDM BREF 2019 50–80 %. Replace with the plant's own flow and COD records.",
    url: BAT,
  },
  cassava_starch: {
    id: "cassava_starch", m3PerTRaw: 4.5,
    fields: { ...common, reactorTechnology: "covered_lagoon", codMgL: 12000, removalPct: 90, methanePct: 55, hrtDays: 25, olr: 0.5, inletTempC: 28, heatRecoveryPct: 0, operatingDays: 330, monthsActive: 12, startMonth: 1 },
    source: "Typical cassava-starch values: 19 m³/t starch ÷ 4.21 t roots/t starch and 11–13.5 g COD/L measured at eight Thai plants (Chavalparit & Ongwandee 2009); covered lagoon 25 d, 90 % removal, 55 % CH₄ (Lerdlattaporn et al. 2021). Replace with the plant's own flow and COD records.",
    url: "https://doi.org/10.1016/j.jclepro.2008.03.001",
  },
};
export const STARCH_PRESET_IDS = Object.keys(WASTEWATER_PRESETS) as WastewaterPreset["id"][];
export const PRESET_REVIEWED = "2026-11-05";

/** Wastewater inputs for a raw-material throughput (t/day while operating). Cost fields and avoided treatment stay blank. */
export function presetProcess(id: WastewaterPreset["id"], rawTonnesDay: number): Omit<Wastewater, "avoidedTreatmentLocalM3"> {
  const preset = WASTEWATER_PRESETS[id];
  return { kind: "wastewater", ...preset.fields, flowM3Day: preset.m3PerTRaw * rawTonnesDay,
    basisOrigin: "ENGINEERING_ASSUMPTION", basisReference: preset.source, basisDate: PRESET_REVIEWED };
}

import { describe, expect, it } from "vitest";
import { assess } from "../assess";
import { COUNTRIES } from "../../countries";
import { processSchema } from "../processes";
import { presetProcess, STARCH_PRESET_IDS, WASTEWATER_PRESETS } from "../wastewaterPresets";
import { EXAMPLES } from "../examples";
import type { ProjectInput } from "../types";

const project = (process: ProjectInput["process"], country = "TH"): ProjectInput => ({
  countryCode: country, regionId: COUNTRIES[country].regions[0].id, businessType: "starch_processor", feedstocks: [], process,
  energy: { heatNeed: "year_round_process", hasGridConnection: true }, site: {},
});

describe("starch wastewater presets", () => {
  it.each(STARCH_PRESET_IDS)("%s gives a valid wastewater input with blank costs", (id) => {
    const p = { ...presetProcess(id, 500), avoidedTreatmentLocalM3: 0 };
    expect(processSchema.safeParse(p).success).toBe(true);
    expect(p.processCapexLocal).toBeUndefined();
    expect(p.basisOrigin).toBe("ENGINEERING_ASSUMPTION");
    expect(p.flowM3Day).toBeCloseTo(WASTEWATER_PRESETS[id].m3PerTRaw * 500);
  });
  it("keeps the published per-tonne bases", () => {
    // BAT 2019/2031 Table 17.26 midpoints, m³ per t raw material.
    expect(WASTEWATER_PRESETS.potato_starch.m3PerTRaw).toBeCloseTo((0.4 + 1.15) / 2, 1);
    expect(WASTEWATER_PRESETS.cereal_starch.m3PerTRaw).toBeCloseTo((1.1 + 3.9) / 2, 1);
    // Chavalparit & Ongwandee 2009: 19 m³ wastewater and 4.21 t roots per t starch → ≈ 230 kg COD per t starch at 12 g/L.
    const cassava = WASTEWATER_PRESETS.cassava_starch;
    expect(cassava.m3PerTRaw).toBeCloseTo(19 / 4.21, 1);
    expect(cassava.m3PerTRaw * 4.21 * cassava.fields.codMgL / 1000).toBeGreaterThan(200);
    expect(cassava.m3PerTRaw * 4.21 * cassava.fields.codMgL / 1000).toBeLessThan(260);
  });
  it("a cassava preset runs on modelled costs, warns about cyanide and cannot be STRONG", () => {
    const a = assess(project({ ...presetProcess("cassava_starch", 1000), avoidedTreatmentLocalM3: 0 }), COUNTRIES.TH);
    expect(a.financialsAvailable).toBe(true);
    expect(a.verdict.id).not.toBe("INSUFFICIENT_DATA");
    expect(a.verdict.id).not.toBe("STRONG");
    expect(a.warnings.some((w) => w.includes("cyanide"))).toBe(true);
    expect(a.scenarios.base.process!.provenance.some((r) => r.id === "process.model.processCapexLocal" && r.confidence === "LOW")).toBe(true);
  });
  it("an entered reactor budget replaces the model estimate and lifts the cap", () => {
    const base = { ...presetProcess("cereal_starch", 800), avoidedTreatmentLocalM3: 0 };
    const modelled = assess(project(base, "DE"), COUNTRIES.DE);
    const quoted = assess(project({ ...base, processCapexLocal: 4_000_000, processOpexLocalYear: 120_000, residualCostLocalT: 20, auxiliaryKwhYear: 300_000, auxiliaryHeatKwhYear: 0 }, "DE"), COUNTRIES.DE);
    // The cap adds a factor only when the score was above it; the gap is always listed.
    const gap = (x: typeof modelled) => x.missingData.some((m) => m.includes("anaerobic reactor"));
    expect(gap(modelled)).toBe(true);
    expect(gap(quoted)).toBe(false);
    expect(modelled.confidence.level).toBe("LOW");
    expect(quoted.scenarios.base.process!.capexEur).toBeCloseTo(4_000_000, -3);
    expect(quoted.scenarios.base.process!.modelledCosts).toEqual([]);
  });
  it("records the published Thai lagoon output as a held-out check, not a calibration", () => {
    // Lerdlattaporn et al. 2021: 41 000 m³ biogas/d reported; the gas normalisation is not stated.
    const e = EXAMPLES.find((x) => x.id === "th_starch_cod")!;
    const a = assess(e.input, COUNTRIES.TH);
    const biogasPerDay = a.scenarios.base.feed.biogasM3Year / e.input.process!.operatingDays;
    expect(biogasPerDay / 41000).toBeGreaterThan(0.75);
    expect(biogasPerDay / 41000).toBeLessThan(1.25);
  });
});

import { describe, expect, it } from "vitest";
import { assess } from "@/core";
import { buildParams } from "@/core/assess";
import { ANIMALS, FEEDSTOCKS } from "@/core/feedstockData";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { formToInput, inputToForm } from "@/lib/form";
import { reportSheets } from "@/lib/report-export";
import type { ProjectInput } from "@/core/types";

/**
 * Logic audit 2026-11-02: every prompt must be answerable by a form field, the standard path must not be warned about,
 * and the same project must give the same answer in the calculator, the sample page and the spreadsheet.
 */
const example = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;
const run = (input: ProjectInput) => assess(input, getCountry(input.countryCode), { uncertainty: false });

describe("calculator form gives the published answer", () => {
  it("every example has the same verdict, data score and NPV after a round trip through the form", () => {
    for (const e of EXAMPLES) {
      const direct = run(e.input);
      const viaForm = run(formToInput(inputToForm(e.input, "en"), getCountry(e.input.countryCode), "en"));
      expect(viaForm.verdict.id, e.id).toBe(direct.verdict.id);
      expect(viaForm.confidence.score, e.id).toBe(direct.confidence.score);
      expect(viaForm.scenarios.base.fin.npvEur, e.id).toBeCloseTo(direct.scenarios.base.fin.npvEur, 0);
    }
  });

  it("lab DM, VS and BMP typed into the form count as a laboratory analysis", () => {
    const input = example("dairy_400");
    const form = inputToForm(input, "en");
    form.lines = form.lines.map((l) => ({ ...l, dryMatterPct: "8", vsPctOfDm: "80", methaneYieldLPerKgVs: "210" }));
    const withLab = formToInput(form, getCountry(input.countryCode), "en");
    expect(withLab.labAnalysisAvailable).toBe(true);
    expect(run(withLab).confidence.factors?.some((f) => f.id === "lab")).toBe(false);
    expect(formToInput(inputToForm(input, "en"), getCountry(input.countryCode), "en").labAnalysisAvailable).toBeUndefined();
  });

  it("0 % debt and 0 % interest are answers, not blanks", () => {
    const input = example("it_whey");
    const form = { ...inputToForm(input, "en"), refineOpen: true, debtSharePct: "0", debtRatePct: "0" };
    const next = formToInput(form, getCountry(input.countryCode), "en");
    expect(next.finance?.debtShare).toBe(0);
    expect(next.finance?.debtRate).toBe(0);
  });
});

describe("verdict", () => {
  it("an all-equity project is not blocked from STRONG by a missing DSCR", () => {
    const input = example("it_whey");
    const levered = run(input);
    expect(levered.verdict.id).toBe("STRONG_CANDIDATE");
    const equity = run({ ...input, finance: { ...input.finance, debtShare: 0 } });
    expect(equity.scenarios.base.fin.dscrMin).toBeNull();
    expect(equity.verdict.id).toBe("STRONG_CANDIDATE");
    expect(equity.verdict.reasons[0]).toContain("DSCR —");
    expect(equity.scenarios.base.fin.npvEur).toBeCloseTo(levered.scenarios.base.fin.npvEur, 0);
  });
});

describe("prompts the client can answer", () => {
  it("asks for a disposal cost only for a stream the client pays to get rid of", () => {
    const input = example("md_winery");
    expect(input.feedstocks[0].handling).toBe("field_spreading");
    expect(run(input).missingDataCodes).not.toContain("disposal");
    const paid = { ...input, feedstocks: input.feedstocks.map((f) => ({ ...f, handling: "paid_disposal" as const, currentDisposalCostPerTonneLocal: undefined })) };
    expect(run(paid).missingDataCodes).toContain("disposal");
  });

  it("asks for a sale value only where the field exists and a price is missing", () => {
    const base = example("dairy_400");
    const line = (extra: Partial<ProjectInput["feedstocks"][number]>) => ({ ...base, feedstocks: [{ id: "x", type: "maize_silage" as const, quantity: 3000, ...extra }] });
    const asks = (input: ProjectInput) => run(input).scenarios.base.feed.lines[0].warnings.some((w) => w.includes("enter its sale price"));
    expect(asks(line({}))).toBe(true);
    expect(asks(line({ purchasePricePerTonneLocal: 35 }))).toBe(false);
    expect(asks(line({ delivered: true, distanceKm: 5 }))).toBe(false);
    // Whey the factory pays to dispose of has no sale value to ask for.
    expect(asks({ ...base, feedstocks: [{ id: "w", type: "dairy_whey", quantity: 20000, handling: "paid_disposal" }] })).toBe(false);
  });

  it("does not call the client's own electricity price market data to review", () => {
    for (const e of EXAMPLES.filter((x) => (x.input.energy.electricityPriceLocalPerKwh ?? 0) > 0)) {
      expect(run(e.input).warnings.join(" "), e.id).not.toContain("econ.electricity_retail_eur_kwh");
    }
  });
});

describe("spreadsheet follows the page", () => {
  it("exports no money when the page withholds the economics", () => {
    const e = EXAMPLES.map((x) => ({ x, a: run(x.input) })).find(({ a }) => a.financialsAvailable === false);
    expect(e, "a process example without budgets").toBeDefined();
    const sheets = reportSheets(e!.a, { currency: "EUR", access: "full" });
    const text = JSON.stringify(sheets.map((s) => s.rows));
    expect(sheets.map((s) => s.name)).not.toContain("Cash flow");
    expect(text).not.toContain('"NPV"');
    expect(text).not.toContain("IRR");
    expect(text).toContain("Biogas, m³/year");
  });
});

describe("data quality: every client deduction can be closed in the form (audit 2026-11-02)", () => {
  /** Every field the calculator offers, filled with values at the national market level (no unit-slip flags). */
  function filled(input: ProjectInput): ProjectInput {
    const c = getCountry(input.countryCode);
    const params = buildParams(c, input.regionId, input.energy, input.city);
    const fx = params.get("econ.fx_local_per_eur");
    const kwhHhvNm3 = params.get("eng.ch4_lhv_kwh_m3") * params.get("eng.biomethane_ch4_purity") * params.get("eng.gas_hhv_lhv_ratio");
    let next: ProjectInput = {
      ...input,
      labAnalysisAvailable: true,
      feedstocks: input.feedstocks.map((f) => {
        const t = FEEDSTOCKS[f.animal ? ANIMALS[f.animal].feedstock : f.type!];
        const paid = ["paid_disposal", "landfill"].includes(f.handling ?? t.defaultHandling);
        return { ...f, dryMatterPct: f.dryMatterPct ?? t.dryMatterPct, vsPctOfDm: f.vsPctOfDm ?? t.vsPctOfDm, methaneYieldLPerKgVs: f.methaneYieldLPerKgVs ?? t.yieldTyp,
          ...(f.delivered && f.distanceKm === undefined ? { distanceKm: 0 } : {}),
          ...(!f.delivered && paid && !f.currentDisposalCostPerTonneLocal ? { currentDisposalCostPerTonneLocal: 40 * fx } : {}) };
      }),
      energy: {
        ...input.energy,
        electricityKwhYear: input.energy.electricityKwhYear ?? 300_000,
        electricityPriceLocalPerKwh: input.energy.electricityPriceLocalPerKwh ?? params.get("econ.electricity_retail_eur_kwh") * fx,
        ...(input.energy.heatNeed !== "none" ? { heatKwhYear: input.energy.heatKwhYear ?? 500_000, heatPriceLocalPerKwh: input.energy.heatPriceLocalPerKwh ?? params.get("econ.heat_value_eur_kwh_th") * fx } : {}),
        ...(input.energy.hasGridConnection ? { exportPriceLocalPerKwh: input.energy.exportPriceLocalPerKwh ?? params.get("econ.electricity_spot_eur_kwh") * fx } : {}),
        biomethanePriceLocalPerMwhHhv: input.energy.biomethanePriceLocalPerMwhHhv ?? params.get("econ.biomethane_price_base_eur_nm3") / kwhHhvNm3 * 1000 * fx,
      },
      site: { ...input.site, landHa: input.site.landHa ?? 500 },
    };
    // The supplier quote must be for the route the model picks, so pick it twice.
    for (let i = 0; i < 2; i++) {
      const a = run(next);
      next = { ...next, finance: { ...next.finance, capexQuoteLocal: Math.round((a.scenarios.base.capex.modelledEur ?? a.scenarios.base.capex.totalEur) * fx), capexQuoteRoute: a.bestRoute } };
    }
    return next;
  }

  it("leaves no client-owned deduction once every form field is answered, in the core and through the form", () => {
    for (const e of EXAMPLES.filter((x) => !x.input.process)) {
      const full = filled(e.input);
      const viaForm = formToInput(inputToForm(full, "en"), getCountry(full.countryCode), "en");
      for (const input of [full, viaForm]) {
        const left = (run(input).confidence.factors ?? []).filter((f) => f.owner === "client").map((f) => f.id);
        expect(left, e.id).toEqual([]);
      }
    }
  });

  it("does not deduct for the standard ways of answering", () => {
    const dairy = example("dairy_400");
    const ids = (input: ProjectInput) => (run(input).confidence.factors ?? []).map((f) => f.id);
    // Head counts × national/IPCC per-head values.
    expect(ids(dairy)).not.toContain("head_counts");
    // Gas used for something biogas heat does not replace.
    expect(ids({ ...dairy, energy: { ...dairy.energy, heatNeed: "none", gasM3Year: 20_000 } })).not.toContain("heat_need");
    // A delivered stream from the next-door site.
    const near = { ...dairy, feedstocks: [...dairy.feedstocks, { id: "n", type: "food_waste" as const, quantity: 500, delivered: true, distanceKm: 0, purchasePricePerTonneLocal: -10 }] };
    expect(run(near).missingDataCodes).not.toContain("distance");
    // A delivered stream never earns an avoided-disposal credit, so its disposal cost is never asked for.
    const delivered = { ...dairy, feedstocks: [...dairy.feedstocks, { id: "d", type: "food_waste" as const, quantity: 500, delivered: true, distanceKm: 5 }] };
    expect(run(delivered).missingDataCodes).not.toContain("disposal");
  });

  it("measured manure tonnes reach the model and replace the per-head estimate", () => {
    const dairy = example("dairy_400");
    const herd = dairy.feedstocks.find((f) => f.animal)!;
    const form = inputToForm(dairy, "en");
    form.lines = form.lines.map((l) => (l.kind === "animal" && l.animal === herd.animal ? { ...l, measuredTonnes: "5000" } : l));
    const input = formToInput(form, getCountry(dairy.countryCode), "en");
    const line = run(input).scenarios.base.feed.lines.find((l) => input.feedstocks.find((f) => f.id === l.id)?.animal === herd.animal)!;
    expect(line.tonnesYear).toBeCloseTo(5000, 6);
    expect(formToInput(inputToForm(input, "en"), getCountry(dairy.countryCode), "en").feedstocks.find((f) => f.animal === herd.animal)?.measuredTonnesYear).toBe(5000);
  });

  it("drops the low-confidence catalogue warning once the stream has lab values", () => {
    const base = example("dairy_400");
    const warns = (extra: object) => run({ ...base, feedstocks: [{ id: "h", type: "poultry_layer_manure", quantity: 3000, ...extra }] }).scenarios.base.feed.lines[0].warnings.join(" ");
    expect(warns({})).toContain("low confidence");
    expect(warns({ dryMatterPct: 27, vsPctOfDm: 70, methaneYieldLPerKgVs: 220 })).not.toContain("low confidence");
  });
});

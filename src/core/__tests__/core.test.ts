import { describe, expect, it } from "vitest";
import { assess } from "../assess";
import { ENGINEERING_PARAMS } from "../engineeringParams";
import { EXAMPLES } from "../examples";
import { ANIMALS, BUSINESS_TYPES, FEEDSTOCKS } from "../feedstockData";
import { npv, irr } from "../finance";
import { QUALITY_START } from "../quality";
import type { Assessment, ProjectInput } from "../types";
import { COUNTRIES, getCountry, UA } from "@/countries";

const DE = COUNTRIES.DE;
const UK = { lang: "uk" as const };
const run = (i: ProjectInput) => assess(i, getCountry(i.countryCode));
/** Ukrainian finishing-pig farm used as a model fixture (not a published sample). */
const PIG_UA: ProjectInput = {
  countryCode: "UA", regionId: "ternopil", businessType: "pig_farm",
  feedstocks: [{ id: "a", animal: "pig_finisher", quantity: 5000 }],
  energy: { electricityKwhYear: 700000, electricityPriceLocalPerKwh: 8.3, heatNeed: "seasonal_buildings", heatKwhYear: 450000, hasGridConnection: true },
  site: { landHa: 1200, existingStorageM3: 4000, gasGridKm: 8 },
};
const UA_FX = UA.params.find((p) => p.id === "econ.fx_local_per_eur")!.value;

const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;

function allNumbers(obj: unknown, path = "", out: Array<[string, number]> = []): Array<[string, number]> {
  if (typeof obj === "number") out.push([path, obj]);
  else if (Array.isArray(obj)) obj.forEach((v, i) => allNumbers(v, `${path}[${i}]`, out));
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) allNumbers(v, `${path}.${k}`, out);
  return out;
}

describe("feedstock-first model", () => {
  it("converts heads to tonnes with the collection factor", () => {
    const a = assess(
      { ...ex("dairy_400"), feedstocks: [{ id: "x", animal: "dairy_cow", quantity: 100, housing: "year_round" }] },
      UA,
    );
    const expected = 100 * ANIMALS.dairy_cow.tonnesPerHeadYear * ANIMALS.dairy_cow.collectYearRound;
    expect(a.scenarios.base.feed.tonnesYear).toBeCloseTo(expected, 6);
  });

  it("seasonal grazing collects less manure than year-round housing", () => {
    const mk = (housing: "year_round" | "seasonal") =>
      assess({ ...ex("dairy_400"), feedstocks: [{ id: "x", animal: "dairy_cow", quantity: 100, housing }] }, UA).scenarios.base.feed.tonnesYear;
    expect(mk("seasonal")).toBeLessThan(mk("year_round"));
  });

  it("gives slurry a realistic 6–16 m³ CH₄ per tonne", () => {
    const a = assess({ ...ex("dairy_400"), feedstocks: [{ id: "x", animal: "dairy_cow", quantity: 500 }] }, UA);
    const f = a.scenarios.base.feed;
    const perT = f.ch4M3Year / f.tonnesYear;
    expect(perT).toBeGreaterThan(6);
    expect(perT).toBeLessThan(16);
  });

  it("scales gas linearly with feedstock quantity", () => {
    const one = assess({ ...ex("slaughter_5000"), feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 1000 }] }, UA).scenarios.base.feed.biogasM3Year;
    const two = assess({ ...ex("slaughter_5000"), feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 2000 }] }, UA).scenarios.base.feed.biogasM3Year;
    expect(two / one).toBeCloseTo(2, 6);
  });

  it("uses the customer's dry matter, not only the catalogue default", () => {
    const mk = (dm: number) =>
      assess({ ...PIG_UA, feedstocks: [{ id: "a", animal: "pig_finisher", quantity: 1000, dryMatterPct: dm }] }, UA).scenarios.base.feed.ch4M3Year;
    expect(mk(8)).toBeGreaterThan(mk(4));
  });

  it("does not default to energy crops", () => {
    // maize silage exists as an explicit, flagged co-substrate — but no business template suggests it
    expect(FEEDSTOCKS.maize_silage.flags).toContain("energy_crop");
    expect(Object.values(BUSINESS_TYPES).some((b) => b.suggested.some((s) => s.type === "maize_silage"))).toBe(false);
  });

  it("penalises poultry-dominated mixes (ammonia inhibition)", () => {
    const a = assess(ex("layers_200k"), UA, UK);
    expect(a.scenarios.base.feed.inhibitionFactor).toBeLessThan(1);
    expect(a.warnings.join(" ")).toMatch(/аміак/i);
  });
});

describe("energy balance", () => {
  for (const e of EXAMPLES) {
    it(`conserves energy: ${e.id}`, () => {
      const a = run(e.input);
      for (const route of ["chp", "boiler", "biomethane"] as const) {
        const r = a.routesBase[route].energy;
        const gas = r.gasEnergyKwh;
        const out = r.elGrossKwh + r.heatProducedKwh + r.biomethaneNm3 * 9.97 * 0.97 + r.flaredKwh;
        // outputs can never exceed the gas energy that was available
        expect(out).toBeLessThanOrEqual(gas * 1.0001 + 1);
        expect(r.heatUsefulKwh).toBeLessThanOrEqual(r.heatNetAvailableKwh + 1e-6);
        expect(r.elNetKwh).toBeGreaterThanOrEqual(0);
        expect(r.elSelfConsumedKwh + r.elExportedKwh).toBeLessThanOrEqual(r.elNetKwh + 1e-6);
      }
    });
  }

  it("never credits more useful heat than the customer can absorb", () => {
    const a = assess(ex("dairy_400"), UA);
    const demand = ex("dairy_400").energy.heatKwhYear!;
    expect(a.scenarios.base.energy.heatUsefulKwh).toBeLessThanOrEqual(demand);
  });

  it("separates produced heat from economically useful heat", () => {
    const e = assess(PIG_UA, UA).scenarios.base.energy;
    expect(e.heatProducedKwh).toBeGreaterThan(e.heatUsefulKwh);
  });

  it("colder region needs more digester heat", () => {
    const lviv = assess({ ...ex("dairy_400"), regionId: "lviv" }, UA).scenarios.base.design.heatDemandKwhYear;
    const ifr = assess({ ...ex("dairy_400"), regionId: "ivano-frankivsk" }, UA).scenarios.base.design.heatDemandKwhYear;
    const zak = assess({ ...ex("dairy_400"), regionId: "zakarpattia" }, UA).scenarios.base.design.heatDemandKwhYear;
    expect(ifr).toBeGreaterThan(zak);
    expect(lviv).toBeGreaterThan(zak);
  });
});

describe("economics", () => {
  const dairyProc = assess(ex("ua_sugar"), UA);
  const base = dairyProc.scenarios.base;

  it("orders scenarios sensibly", () => {
    expect(dairyProc.scenarios.conservative.fin.npvEur).toBeLessThan(base.fin.npvEur);
    expect(dairyProc.scenarios.optimistic.fin.npvEur).toBeGreaterThan(base.fin.npvEur);
    expect(dairyProc.scenarios.conservative.capex.totalEur).toBeGreaterThan(dairyProc.scenarios.optimistic.capex.totalEur);
  });

  it("uncontracted legacy subsidies never change the base verdict", () => {
    expect(base.opexRev.revenue.some((r) => r.id === "support")).toBe(false);
    expect(dairyProc.supportIncluded).toBe(false);
    const withSupport = assess({ ...ex("ua_sugar"), assumedSupportEurPerKwh: 0.05 }, UA, UK);
    expect(withSupport.supportIncluded).toBe(false);
    expect(withSupport.scenarios.base.fin.npvEur).toBeCloseTo(base.fin.npvEur);
    expect(withSupport.warnings.join(" ")).toMatch(/виключено/);
  });

  it("matches NPV / IRR definitions", () => {
    const cf = base.fin.cashFlows;
    expect(base.fin.npvEur).toBeCloseTo(npv(UA.params.find((p) => p.id === "econ.discount_rate")!.value, cf), 4);
    const r = irr([-100, 60, 60, 60]);
    expect(r).not.toBeNull();
    expect(npv(r!, [-100, 60, 60, 60])).toBeCloseTo(0, 3);
  });

  it("sensitivity: worse inputs reduce NPV", () => {
    const get = (id: string) => dairyProc.sensitivity.find((s) => s.id === id)!;
    for (const id of ["yield", "capex", "maintenance", "energy_price", "heat_use", "feedstock", "downtime"]) {
      expect(get(id).deltaNpvEur, id).toBeLessThanOrEqual(0);
    }
    expect(get("yield").deltaNpvEur).toBeLessThan(0);
    expect(get("capex").deltaNpvEur).toBeLessThan(0);
  });

  it("CAPEX is built from named components that sum to the total", () => {
    const s = base.capex.lines.reduce((a, l) => a + l.eur, 0);
    expect(s).toBeCloseTo(base.capex.totalEur, 4);
    expect(base.capex.lines.some((l) => l.id === "digester")).toBe(true);
  });

  it("weak manure-only farms are called weak, not sold", () => {
    const a = assess(ex("dairy_400"), UA);
    expect(["WEAK_ECONOMICS", "NOT_RECOMMENDED_AT_SCALE"]).toContain(a.verdict.id);
  });

  it("micro scale without heat gives NOT RECOMMENDED AT CURRENT SCALE", () => {
    expect(assess(ex("mixed_80"), UA).verdict.id).toBe("NOT_RECOMMENDED_AT_SCALE");
  });

  it("waste-based plants beat manure-only ones on payback", () => {
    const waste = assess(ex("slaughter_5000"), UA).scenarios.base.fin.simplePaybackYears!;
    const manure = assess(ex("dairy_400"), UA).scenarios.base.fin.simplePaybackYears!;
    expect(waste).toBeLessThan(manure);
  });
});

describe("logistics", () => {
  it("flags slurry hauled over long distances as critical", () => {
    const input: ProjectInput = {
      ...PIG_UA,
      feedstocks: [
        { id: "a", animal: "pig_finisher", quantity: 3000 },
        { id: "b", animal: "dairy_cow", quantity: 300, delivered: true, distanceKm: 60 },
      ],
    };
    const a = assess(input, UA, UK);
    const l = a.logistics.perLine.find((x) => x.id === "b")!;
    expect(l.level).toBe("CRITICAL");
    expect(a.warnings.join(" ")).toMatch(/біля джерела/);
  });

  it("an on-site stream has no transport cost", () => {
    const a = assess(PIG_UA, UA);
    expect(a.scenarios.base.feed.lines[0].transportCostEurYear).toBe(0);
  });
});

describe("country adapter independence", () => {
  it("same feedstock → identical gas regardless of country; economics differ", () => {
    const base: ProjectInput = {
      ...ex("slaughter_5000"),
      countryCode: "DE",
      regionId: "sachsen",
    };
    const ua = assess({ ...base, countryCode: "UA", regionId: "lviv" }, UA);
    const de = assess(base, DE);
    expect(de.scenarios.base.feed.ch4M3Year).toBeCloseTo(ua.scenarios.base.feed.ch4M3Year, 6);
    expect(de.scenarios.base.capex.totalEur).not.toBeCloseTo(ua.scenarios.base.capex.totalEur, -2);
  });

  it("every adapter defines the same set of economic parameters", () => {
    const ids = (c: { params: { id: string }[] }) => new Set(c.params.map((p) => p.id).filter((id) => id.startsWith("econ.")));
    const ref = ids(UA);
    for (const c of Object.values(COUNTRIES)) {
      expect([...ids(c)].sort()).toEqual([...ref].sort());
    }
  });
});

describe("data quality and honesty", () => {
  it("every parameter has provenance (source, kind, confidence, date)", () => {
    for (const p of [...ENGINEERING_PARAMS, ...UA.params]) {
      expect(p.source.length, p.id).toBeGreaterThan(5);
      expect(["FACT", "ASSUMPTION", "CALCULATION", "ESTIMATE"]).toContain(p.kind);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(p.confidence);
      expect(p.date, p.id).toMatch(/^(\d{4}-\d{2}-\d{2}|undated)$/);
      expect(p.unit.length, p.id).toBeGreaterThan(0);
    }
  });

  it("confidence is never HIGH without a laboratory analysis", () => {
    for (const e of EXAMPLES) expect(run(e.input).confidence.level).not.toBe("HIGH");
  });

  it("missing electricity and heat data lowers confidence and is listed", () => {
    const complete = assess(ex("slaughter_5000"), UA);
    const bare = assess(
      { ...ex("slaughter_5000"), energy: { heatNeed: "year_round_process", hasGridConnection: true }, site: {} },
      UA,
      UK,
    );
    expect(bare.confidence.score).toBeLessThan(complete.confidence.score);
    expect(bare.missingData.join(" ")).toMatch(/електроенергії/);
    expect(bare.missingData.join(" ")).toMatch(/теплоспоживання/);
  });

  it("every point lost from the data-quality score is itemised and owned by the client or the model", () => {
    for (const e of EXAMPLES) {
      const a = run(e.input);
      const factors = a.confidence.factors!;
      const lost = factors.reduce((s, x) => s + x.points, 0);
      expect(a.confidence.score, e.id).toBe(Math.max(0, QUALITY_START - lost));
      for (const x of factors) expect(x.points, `${e.id} ${x.id}`).toBeGreaterThan(0);
      // Each "what to clarify" item is something the client can supply.
      for (const id of a.missingDataCodes) expect(factors.find((x) => x.gap === id)?.owner, `${e.id} ${id}`).toBe("client");
    }
  });

  it("laboratory DM, VS and BMP replace a low-confidence catalogue entry in the quality score", () => {
    const stream = { id: "p", type: "poultry_layer_manure" as const, quantity: 3000, dryMatterPct: 27, vsPctOfDm: 70, methaneYieldLPerKgVs: 220 };
    const typed = assess({ ...PIG_UA, feedstocks: [stream] }, UA);
    const lab = assess({ ...PIG_UA, feedstocks: [stream], labAnalysisAvailable: true }, UA);
    expect(typed.confidence.factors!.map((x) => x.id)).toContain("low_catalogue");
    expect(lab.confidence.factors!.map((x) => x.id)).not.toContain("low_catalogue");
    expect(lab.confidence.factors!.map((x) => x.id)).not.toContain("lab");
    expect(lab.confidence.score).toBe(typed.confidence.score + 27);
  });

  it("returns INSUFFICIENT DATA for an empty questionnaire", () => {
    const a = assess({ ...ex("dairy_400"), feedstocks: [] }, UA);
    expect(a.verdict.id).toBe("INSUFFICIENT_DATA");
  });

  it("no NaN/Infinity anywhere in a result", () => {
    for (const e of EXAMPLES) {
      const a = run(e.input);
      const bad = allNumbers(a as Assessment).filter(([, n]) => !Number.isFinite(n));
      // the only legitimate infinity is the methane-loss/displacement ratio when nothing is displaced
      const unexpected = bad.filter(([p]) => !p.endsWith("methane.ratio"));
      expect(unexpected, e.id).toEqual([]);
    }
  });

  it("separates the seven scores and does not invent one magic number", () => {
    const a = assess(ex("ua_sugar"), UA);
    expect(a.scores.map((s) => s.id).sort()).toEqual(["economics", "energy", "environmental", "feedstock", "location", "regulatory", "technical"]);
    expect(a.overall.explanation.length).toBeGreaterThan(0);
  });

  it("reports digestate as a liability when there is no land", () => {
    const a = assess(ex("ua_sugar"), UA);
    expect(["SHORT", "OK", "UNKNOWN"]).toContain(a.digestate.adequacy);
    const noLand = assess({ ...ex("ua_sugar"), site: { landHa: 0 } }, UA);
    expect(noLand.digestate.adequacy).toBe("SHORT");
  });

  it("shows methane loss next to the climate benefit", () => {
    const a = assess(ex("slaughter_5000"), UA, UK);
    expect(a.methane.lossShare).toBeGreaterThan(0);
    expect(a.methane.advice.join(" ")).toMatch(/Газонепроникні/);
  });

  it("lists the safety register with the professional-review requirement elsewhere", () => {
    const a = assess(ex("slaughter_5000"), UA);
    expect(a.safety.map((s) => s.id)).toEqual(expect.arrayContaining(["methane_explosion", "h2s", "confined_space", "biological"]));
  });
});

describe("templates produce distinct, explained outcomes (regression: 'always weak 57/100')", async () => {
  const { keyDriver } = await import("@/lib/whatif");
  it("the reference archetypes span several verdicts and confidence scores", () => {
    const results = EXAMPLES.map((e) => run(e.input));
    expect(new Set(results.map((r) => r.verdict.id)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(results.map((r) => r.confidence.score)).size).toBeGreaterThanOrEqual(4);
  });
  it("a manure-only dairy farm is weak because of scale, and the reason says so", () => {
    const a = assess(ex("dairy_400"), UA, UK);
    expect(a.verdict.id).toBe("WEAK_ECONOMICS");
    expect(keyDriver(a)).toMatch(/масштаб/);
  });
  it("adding a gate-fee co-substrate shortens the dairy farm payback", async () => {
    const { LEVERS } = await import("@/lib/whatif");
    const base = assess(ex("dairy_400"), UA).scenarios.base.fin.simplePaybackYears!;
    const co = assess(LEVERS.find((l) => l.id === "cosubstrate")!.apply(ex("dairy_400"), UA_FX), UA).scenarios.base.fin.simplePaybackYears!;
    // At a €6/t gate fee the gain is small: food waste needs hygienisation, reception and disposal of ≈ 10 % packaging rejects.
    expect(co).toBeLessThan(base);
  });
});

describe("robustness of the answer", () => {
  it("is clear only when every scenario agrees on the NPV sign", () => {
    for (const e of EXAMPLES) {
      const a = run(e.input);
      const [lo, , hi] = a.ranges.npvEur;
      const expected = a.verdict.id === "INSUFFICIENT_DATA" ? "insufficient" : lo > 0 ? "clear_go" : hi <= 0 ? "clear_no" : "grey";
      expect(a.robustness, e.id).toBe(expected);
      expect(a.drivers.length, e.id).toBeLessThanOrEqual(3);
    }
  });
  it("covers clear go, clear no and grey cases among the templates", () => {
    const set = new Set(EXAMPLES.map((e) => run(e.input).robustness));
    expect([...set]).toEqual(expect.arrayContaining(["clear_go", "clear_no", "grey"]));
    expect([...set].every((s) => ["clear_go", "clear_no", "grey", "insufficient"].includes(s))).toBe(true);
  });
});

describe("international model", () => {
  it("assesses the same project in every country without NaN and with the country's currency/lang", () => {
    for (const c of Object.values(COUNTRIES)) {
      const a = assess({ ...ex("slaughter_5000"), countryCode: c.code, regionId: c.regions[0].id }, c);
      expect(Number.isFinite(a.scenarios.base.fin.npvEur), c.code).toBe(true);
      expect(a.lang).toBe("en");
    }
  });

  it("support schemes are separate cases and never change the verdict", () => {
    const input = ex("de_nawaro");
    const a = assess(input, DE);
    expect(a.supportIncluded).toBe(false);
    expect(a.supportCases.length).toBeGreaterThan(0);
    const g = a.supportCases.find((s) => s.schemeId === "de.tender");
    expect(g).toBeDefined();
    if (g?.eligible) expect(g.npvEur).toBeGreaterThan(a.scenarios.base.fin.npvEur);
  });

  it("warm climates get an unheated covered lagoon for dilute effluent", () => {
    const a = run(ex("th_pome"));
    expect(a.scenarios.base.design.tech.digestion).toBe("covered_lagoon");
  });

  it("English is the default model language", () => {
    const a = assess(ex("layers_200k"), UA);
    expect(a.warnings.join(" ")).toMatch(/ammonia/i);
  });
});

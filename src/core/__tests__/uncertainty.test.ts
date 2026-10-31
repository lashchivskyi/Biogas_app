import { describe, expect, it } from "vitest";
import { assess } from "../assess";
import { EXAMPLES } from "../examples";
import { evpi, latinHypercube, MC_DIMS, sampleScenario, triangular } from "../uncertainty";
import { getCountry } from "@/countries";

const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;

describe("uncertainty tools", () => {
  it("draws a stratified, reproducible sample with the right triangular shape", () => {
    const a = latinHypercube(100, 3);
    expect(latinHypercube(100, 3)).toEqual(a);
    for (let d = 0; d < 3; d++) {
      const col = a.map((r) => r[d]).sort((x, y) => x - y);
      col.forEach((u, i) => expect(Math.floor(u * 100)).toBe(i)); // one draw per stratum
    }
    expect(triangular(0.5, 0, 0.5, 1)).toBeCloseTo(0.5, 12);
    expect(triangular(0.125, 0, 0.5, 1)).toBeCloseTo(0.25, 12);
    expect(triangular(0, 2, 3, 5)).toBe(2);
    expect(triangular(1, 2, 3, 5)).toBe(5);
  });

  it("values perfect information only when the range crosses NPV = 0", () => {
    // NPV = 100·x with x triangular(−1, 0, 1): E[max(NPV, 0)] = 100 ∫₀¹ x(1 − x) dx = 50/3, E[NPV] = 0.
    expect(evpi({ low: [-1, -100], base: [0, 0], high: [1, 100] }).evpi).toBeCloseTo(50 / 3, 1);
    expect(evpi({ low: [0.8, 10], base: [1, 20], high: [1.2, 30] }).evpi).toBe(0);
    expect(evpi({ low: [0.8, -30], base: [1, -20], high: [1.2, -10] }).evpi).toBe(0);
  });

  it("gives ordered, reproducible Monte Carlo percentiles inside the scenario range", () => {
    for (const id of ["it_whey", "es_olive", "th_pome"]) {
      const input = ex(id);
      const a = assess(input, getCountry(input.countryCode));
      const mc = a.monteCarlo!;
      expect(mc.p10NpvEur, id).toBeLessThanOrEqual(mc.p50NpvEur);
      expect(mc.p50NpvEur, id).toBeLessThanOrEqual(mc.p90NpvEur);
      expect(mc.p10NpvEur, id).toBeGreaterThanOrEqual(a.ranges.npvEur[0]);
      expect(mc.p90NpvEur, id).toBeLessThanOrEqual(a.ranges.npvEur[2]);
      expect(assess(input, getCountry(input.countryCode)).monteCarlo).toEqual(mc);
    }
  });

  it("ranks what to verify first and leaves out what the client already measured", () => {
    const input = ex("th_pome"); // grey project: the range crosses zero
    const a = assess(input, getCountry(input.countryCode));
    const items = a.measureFirst!;
    expect(items.length).toBeGreaterThan(2);
    expect(items[0].flips).toBe(true);
    expect(items[0].evpiEur).toBeGreaterThan(0);
    for (let i = 1; i < items.length; i++) expect(items[i - 1].evpiEur).toBeGreaterThanOrEqual(items[i].evpiEur);
    // Every stream of this example has a lab yield, so yield is not an open question.
    expect(input.feedstocks.every((f) => f.methaneYieldLPerKgVs !== undefined)).toBe(true);
    expect(items.some((m) => m.kind === "yield")).toBe(false);
  });

  it("can be switched off for bulk runs", () => {
    const input = ex("dairy_400");
    const a = assess(input, getCountry(input.countryCode), { uncertainty: false });
    expect(a.monteCarlo).toBeUndefined();
    expect(a.measureFirst).toBeUndefined();
  });
});

describe("what to verify first, one line per action", () => {
  it("lists each kind of check once", () => {
    for (const { id, input } of EXAMPLES.filter((e) => !e.input.process).slice(0, 8)) {
      const kinds = assess(input, getCountry(input.countryCode)).measureFirst!.map((m) => m.kind);
      expect(new Set(kinds).size, id).toBe(kinds.length);
    }
  }, 30_000);
});

describe("Monte Carlo inputs beyond the scenario table", () => {
  it("moves the biomethane price with the energy-price draw", () => {
    const rows = latinHypercube(50, MC_DIMS).map(sampleScenario);
    const byPrice = [...rows].sort((x, y) => x.scenario.energyPriceMult - y.scenario.energyPriceMult);
    for (let i = 1; i < byPrice.length; i++) expect(byPrice[i].biomethaneU).toBeGreaterThanOrEqual(byPrice[i - 1].biomethaneU);
  });

  it("widens the range for catalogue dry matter and still varies a lab BMP", () => {
    // Every dk_cluster stream has lab DM, VS and BMP: only the ±8 % lab band is added.
    const lab = ex("dk_cluster");
    const strip = { ...lab, feedstocks: lab.feedstocks.map((f) => ({ ...f, dryMatterPct: undefined, vsPctOfDm: undefined })) };
    const width = (input: typeof lab) => { const mc = assess(input, getCountry(input.countryCode)).monteCarlo!; return mc.p90NpvEur - mc.p10NpvEur; };
    expect(width(strip)).toBeGreaterThan(width(lab));
  });
});

describe("buyer's biomethane offer", () => {
  const input = ex("dk_cluster");
  const offered = { ...input, energy: { ...input.energy, biomethanePriceLocalPerMwhHhv: 600 } }; // DKK per MWh HHV
  const country = getCountry(input.countryCode);

  it("replaces the national estimate, converted from MWh HHV to Nm³, and is shown as the client's own data", () => {
    const a = assess(offered, country);
    const p = a.marketEvidence!.find((e) => e.id === "econ.biomethane_price_base_eur_nm3")!;
    const fx = a.marketEvidence!.find((e) => e.id === "econ.fx_local_per_eur")?.value ?? country.params.find((x) => x.id === "econ.fx_local_per_eur")!.value;
    expect(p.origin).toBe("USER_INPUT");
    expect(p.value).toBeCloseTo(600 / fx / 1000 * 9.97 * 0.97 * 1.11, 3);
    expect(a.measureFirst!.some((m) => m.kind === "offtake")).toBe(false);
  });

  it("flags a likely unit slip and drops confidence to LOW", () => {
    const a = assess({ ...offered, energy: { ...offered.energy, biomethanePriceLocalPerMwhHhv: 600_000 } }, country);
    expect(a.confidence.level).toBe("LOW");
    expect(a.warnings.join(" ")).toMatch(/biomethane price/);
  });
});

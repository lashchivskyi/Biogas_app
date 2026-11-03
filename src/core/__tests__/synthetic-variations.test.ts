import { describe, expect, it, vi } from "vitest";
import { assess, FEEDSTOCKS } from "@/core";
import { COUNTRIES, COUNTRY_ORDER, getCountry } from "@/countries";
import { CORE_LOCALES } from "@/i18n/config";
import { displayUnit } from "@/lib/format";
import { EXAMPLES } from "../examples";
import type { CountryAdapter } from "../country";
import type { Assessment, FeedstockLineInput, ProjectInput } from "../types";
import { physicalViolations } from "./scenario-matrix";

/**
 * Synthetic variations of the 39 reference projects: size, data completeness, country and seasonality, drawn with a fixed
 * seed. Every variation must keep the balances closed and the units physical, and five metamorphic relations must hold:
 *   size      — all feedstock × k ⇒ fresh mass, VS and methane potential × k exactly (the feed model is linear);
 *   complete  — typing the catalogue's own DM, VS and BMP gives the same base result as leaving them empty;
 *   season    — a year-round feed started in another month gives the same annual methane;
 *   language  — every number is identical in all 25 report languages (only text changes);
 *   currency  — FX × k with every local-currency input × k gives the same EUR result; the display conversion EUR → USD
 *               multiplies amounts and divides per-EUR rates by the same rate.
 * ≥ 2 000 assessments in total. Raise SYNTH_N locally for a deeper hunt (SYNTH_N=3000 npx vitest run …).
 */
vi.setConfig({ testTimeout: 600_000 });
const N = Number(process.env.SYNTH_N ?? 520);
const SEED = 20261104;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = rng(SEED);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const logUniform = (lo: number, hi: number) => Math.exp(Math.log(lo) + rand() * (Math.log(hi) - Math.log(lo)));

const AD = EXAMPLES.filter((e) => !e.input.process && e.input.feedstocks.length > 0);
const LOCAL_FIELDS = ["purchasePricePerTonneLocal", "currentDisposalCostPerTonneLocal", "opportunityValuePerTonneLocal"] as const;
const ENERGY_LOCAL = ["electricityPriceLocalPerKwh", "gasPriceLocalPerM3", "exportPriceLocalPerKwh", "heatPriceLocalPerKwh", "biomethanePriceLocalPerMwhHhv"] as const;
const FINANCE_LOCAL = ["operatorWageLocalPerHour", "capexQuoteLocal"] as const;

const scaleLines = (lines: FeedstockLineInput[], k: number) => lines.map((l) => ({ ...l, quantity: l.quantity * k }));
/** Minimal data: what a client knows on day one — quantities only, no lab values, no prices. */
const minimal = (i: ProjectInput): ProjectInput => ({
  ...i, feedstocks: i.feedstocks.map(({ id, type, animal, quantity, monthsActive, startMonth, delivered, distanceKm, housing }) =>
    ({ id, type, animal, quantity, monthsActive, startMonth, delivered, distanceKm, housing }) as FeedstockLineInput),
  energy: { heatNeed: i.energy.heatNeed, hasGridConnection: i.energy.hasGridConnection, electricityKwhYear: i.energy.electricityKwhYear, heatKwhYear: i.energy.heatKwhYear },
  finance: undefined,
});
/** The catalogue's own DM, VS and BMP written into every typed line (animal lines carry country manure data: left as they are). */
const explicitCatalogue = (i: ProjectInput): ProjectInput => ({
  ...i, feedstocks: i.feedstocks.map((l) => (l.type && !l.animal ? { ...l, dryMatterPct: FEEDSTOCKS[l.type].dryMatterPct, vsPctOfDm: FEEDSTOCKS[l.type].vsPctOfDm, methaneYieldLPerKgVs: FEEDSTOCKS[l.type].yieldTyp } : l)),
});
const withoutLab = (i: ProjectInput): ProjectInput => ({
  ...i, feedstocks: i.feedstocks.map((l) => { const c = { ...l }; delete c.dryMatterPct; delete c.vsPctOfDm; delete c.methaneYieldLPerKgVs; return c; }),
});
const seasonal = (i: ProjectInput): ProjectInput => ({
  ...i, feedstocks: i.feedstocks.map((l) => (l.animal || rand() < 0.5 ? l : { ...l, monthsActive: 3 + Math.floor(rand() * 10), startMonth: 1 + Math.floor(rand() * 12) })),
});
const scaleLocal = (i: ProjectInput, k: number): ProjectInput => {
  const scale = <T extends object>(o: T | undefined, keys: readonly string[]) => o && Object.fromEntries(Object.entries(o).map(([key, v]) => [key, keys.includes(key) && typeof v === "number" ? v * k : v])) as T;
  return { ...i, feedstocks: i.feedstocks.map((l) => scale(l, LOCAL_FIELDS)!), energy: scale(i.energy, ENERGY_LOCAL)!, finance: scale(i.finance, FINANCE_LOCAL) };
};
const withFx = (c: CountryAdapter, k: number): CountryAdapter => ({ ...c, params: c.params.map((p) => (p.id === "econ.fx_local_per_eur" ? { ...p, value: p.value * k } : p)) });

const run = (input: ProjectInput, country = getCountry(input.countryCode)) => assess(input, country, { uncertainty: false });
const near = (x: number, y: number, rel = 1e-9, abs = 1e-6) => Math.abs(x - y) <= Math.max(abs, rel * Math.max(Math.abs(x), Math.abs(y)));
/** Every number in the result tree, in a fixed order; text is left out. */
function numbers(x: unknown, out: number[] = []): number[] {
  if (typeof x === "number") out.push(x);
  else if (Array.isArray(x)) for (const v of x) numbers(v, out);
  else if (x && typeof x === "object") for (const k of Object.keys(x).sort()) if (k !== "dataAudit") numbers((x as Record<string, unknown>)[k], out);
  return out;
}

/** Units and bases on top of the balance audit: VS ≤ DM ≤ FM, CH4 ≤ biogas, electricity ≤ methane energy, N not created. */
function unitViolations(a: Assessment): string[] {
  const bad: string[] = [];
  for (const route of ["chp", "boiler", "biomethane"] as const) {
    const r = a.routesBase[route], { feed, energy } = r, t = route;
    if (feed.vsTonnesYear > feed.tonnesYear * feed.dryMatterPct / 100 * (1 + 1e-9) + 1e-9) bad.push(`${t}: VS above DM`);
    if (feed.ch4M3Year > feed.biogasM3Year * (1 + 1e-9) + 1e-9) bad.push(`${t}: CH4 above biogas`);
    if (energy.rawBiogasCh4Share > 1 || (feed.biogasM3Year > 0 && energy.rawBiogasCh4Share < 0.3)) bad.push(`${t}: CH4 share ${energy.rawBiogasCh4Share}`);
    if (energy.elGrossKwh > energy.ch4ToChpM3 * 9.97 * 0.5 + 1e-6) bad.push(`${t}: electricity above 50 % of the CHP fuel`);
    if (energy.heatUsefulKwh > energy.heatNetAvailableKwh * (1 + 1e-9) + 1e-6) bad.push(`${t}: useful heat above surplus`);
    if (energy.biomethaneNm3 * 0.9 > energy.ch4ToUpgraderM3 + 1e-6) bad.push(`${t}: biomethane above its methane`);
    if (r.design.workingVolumeM3 < 0 || r.design.hrtDays < 0) bad.push(`${t}: negative digester size`);
  }
  if (a.digestate.nKgYear > a.routesBase.chp.feed.nKgYear * (1 + 1e-9) + 1e-6) bad.push("digestate N above feed N");
  if (a.digestate.landRequiredHa < 0) bad.push("negative land requirement");
  return bad;
}

describe("synthetic variations: invariants and metamorphic relations", () => {
  it(`hold over ≥ 2 000 assessments (seed ${SEED})`, () => {
    let evaluations = 0;
    const fails: string[] = [];
    const check = (id: string, issues: string[]) => { if (issues.length) fails.push(`${id}: ${issues.slice(0, 3).join("; ")}`); };
    for (let s = 0; s < N && fails.length < 10; s++) {
      const e = pick(AD), code = pick(COUNTRY_ORDER), country = COUNTRIES[code];
      const completeness = pick(["minimal", "as_entered"] as const);
      let input: ProjectInput = { ...e.input, countryCode: code, regionId: pick(country.regions).id, city: undefined };
      if (completeness === "minimal") input = minimal(input);
      input = { ...input, feedstocks: scaleLines(input.feedstocks, logUniform(0.05, 20)) };
      if (rand() < 0.5) input = seasonal(input);
      const id = `#${s} ${e.id}@${code}/${completeness}`;
      let a: Assessment;
      try { a = run(input); } catch (x) { fails.push(`${id}: throws ${(x as Error).message}`); continue; }
      evaluations++;
      check(id, [...physicalViolations(a), ...unitViolations(a)]);

      // size: the feed model is linear in the quantities.
      const k = pick([0.5, 2, 3]);
      const scaled = run({ ...input, feedstocks: scaleLines(input.feedstocks, k) }); evaluations++;
      const f0 = a.routesBase.chp.feed, f1 = scaled.routesBase.chp.feed;
      check(`${id} ×${k}`, [
        ...(near(f1.tonnesYear, f0.tonnesYear * k) ? [] : [`fresh mass ${f1.tonnesYear} ≠ ${k} × ${f0.tonnesYear}`]),
        ...(near(f1.vsTonnesYear, f0.vsTonnesYear * k) ? [] : ["VS not linear"]),
        ...(near(f1.ch4M3Year, f0.ch4M3Year * k, 1e-9, 1e-3) ? [] : [`methane ${f1.ch4M3Year} ≠ ${k} × ${f0.ch4M3Year}`]),
      ]);

      // completeness: explicit catalogue values = empty fields (base scenario sits on the catalogue's typical yield).
      if (s % 3 === 0) {
        const empty = run(withoutLab(input)), typed = run(explicitCatalogue(withoutLab(input))); evaluations += 2;
        check(`${id} catalogue typed`, (["chp", "boiler", "biomethane"] as const).flatMap((r) => [
          ...(near(typed.routesBase[r].feed.ch4M3Year, empty.routesBase[r].feed.ch4M3Year, 1e-9, 1e-3) ? [] : [`${r} methane changes when catalogue values are typed`]),
          ...(near(typed.routesBase[r].fin.npvEur, empty.routesBase[r].fin.npvEur, 1e-9, 1e-2) ? [] : [`${r} NPV ${typed.routesBase[r].fin.npvEur} ≠ ${empty.routesBase[r].fin.npvEur}`]),
        ]));
      }

      // season: a year-round feed started in another month gives the same annual methane.
      if (s % 3 === 1) {
        const yearRound = { ...input, feedstocks: input.feedstocks.map((l) => ({ ...l, monthsActive: 12, startMonth: 1 })) };
        const r1 = run(yearRound), r2 = run({ ...yearRound, feedstocks: yearRound.feedstocks.map((l) => ({ ...l, startMonth: 1 + Math.floor(rand() * 12) })) }); evaluations += 2;
        check(`${id} season`, near(r1.routesBase.chp.feed.ch4M3Year, r2.routesBase.chp.feed.ch4M3Year, 1e-9, 1e-3) ? [] : ["annual methane depends on the start month of a year-round feed"]);
      }

      // language: identical numbers in another report language.
      if (s % 3 === 2) {
        const lang = pick(CORE_LOCALES.filter((l) => l !== "en"));
        const en = run({ ...input, lang: "en" }), other = run({ ...input, lang }); evaluations += 2;
        const [x, y] = [numbers(en), numbers(other)];
        check(`${id} lang ${lang}`, x.length === y.length && x.every((v, i) => Object.is(v, y[i]) || near(v, y[i], 1e-12, 1e-12)) && en.verdict.id === other.verdict.id ? [] : ["numbers differ between languages"]);
      }

      // currency: FX × k and every local input × k leave the EUR result unchanged.
      if (s % 4 === 0) {
        const fxK = pick([0.37, 4.2, 25]);
        const base = run(input), moved = run(scaleLocal(input, fxK), withFx(getCountry(code), fxK)); evaluations += 2;
        const tol = 1e-6 * Math.max(1, base.routesBase[base.bestRoute].fin.capexEur);
        check(`${id} fx ×${fxK}`, [
          ...(base.verdict.id === moved.verdict.id ? [] : [`verdict ${base.verdict.id} → ${moved.verdict.id}`]),
          ...(["chp", "boiler", "biomethane"] as const).flatMap((r) => (Math.abs(base.routesBase[r].fin.npvEur - moved.routesBase[r].fin.npvEur) <= tol ? [] : [`${r} NPV moves with FX`])),
        ]);
        const rate = 1.08 + rand();
        const npv = base.routesBase[base.bestRoute].fin.npvEur;
        check(`${id} display USD`, [
          ...(near(displayUnit(npv, "EUR", { currency: "USD", rate }).value, npv * rate, 1e-12) ? [] : ["EUR amount not multiplied by the rate"]),
          ...(near(displayUnit(0.12, "EUR/kWh", { currency: "USD", rate }).value, 0.12 * rate, 1e-12) ? [] : ["EUR/kWh not converted"]),
          ...(near(displayUnit(40, "UAH/EUR", { currency: "USD", rate }).value, 40 / rate, 1e-12) ? [] : ["local/EUR rate not divided"]),
          ...(displayUnit(npv, "kWh", { currency: "USD", rate }).value === npv ? [] : ["a non-money unit was converted"]),
        ]);
      }
    }
    expect(fails, fails.join("\n")).toEqual([]);
    expect(evaluations).toBeGreaterThanOrEqual(2000);
  });
});

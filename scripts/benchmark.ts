/**
 * CAPEX benchmark: runs the model on configurations that mirror published reference plants
 * and prints model CAPEX next to the published figure.
 * Usage: npx tsx scripts/benchmark.ts
 */
import { assess } from "../src/core";
import type { ProjectInput } from "../src/core/types";
import { getCountry } from "../src/countries";
import { EXAMPLES } from "../src/core/examples";
import { PLANT_COST_CASES as cases } from "./capex-references";

const eur = (n: number) => `€${(n / 1e6).toFixed(2)}M`;

console.log("case | model CAPEX | model €/kW | published range | position");
for (const c of cases) {
  const a = assess(c.input, c.country);
  const b = c.route ? a.routesBase[c.route] : a.scenarios.base;
  const kw = Math.max(1, b.energy.chpKwEl || b.kwElEquivalent);
  const cap = b.capex.totalEur;
  const pos = cap < c.low ? "BELOW" : cap > c.high ? "ABOVE" : "within";
  console.log(`${c.name} | ${eur(cap)} | ${Math.round(cap / kw)} €/kW @ ${Math.round(kw)} kW | ${c.published} | ${pos} (${Math.round((cap / ((c.low + c.high) / 2) - 1) * 100)} % vs mid)`);
}

/* Free competitor tools run on the same inputs (2026-10-31). Tool outputs are recorded here, the model is re-run, so
 * drift shows up. "Like-for-like" removes scope the tool leaves out. Divergence > 15 % is explained in PRODUCT.md › Market. */
const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;
const lineSum = (r: ReturnType<typeof assess>["routesBase"]["chp"], ids: string[]) => r.capex.lines.filter((l) => ids.includes(l.id)).reduce((a, l) => a + l.eur, 0);
interface ToolRun { tool: string; input: ProjectInput; rows: [string, number, (a: ReturnType<typeof assess>) => number][] }
const fiDairy: ProjectInput = { ...ex("dairy_400"), countryCode: "FI", regionId: "ostrobothnia",
  energy: { ...ex("dairy_400").energy, electricityPriceLocalPerKwh: 0.12, heatPriceLocalPerKwh: 0.07, exportPriceLocalPerKwh: 0.05 } };
const runs: ToolRun[] = [
  { tool: "KTBL Wirtschaftlichkeitsrechner Biogas (Preisstand 2025; maize 8 163 t 33 % TM, slurry 4 500 t 10.8 % TM, 7 800 h)", input: ex("de_nawaro"), rows: [
    ["CH4 m³/a (KTBL standard yield, no realisation)", 1_001_876, (a) => a.routesBase.chp.feed.ch4M3Year],
    ["electricity kWh/a", 3_978_252, (a) => a.routesBase.chp.energy.elGrossKwh],
    ["CAPEX € without storage and silage clamp (KTBL 2 869 936 − 589 775 storage)", 2_280_161, (a) => a.routesBase.chp.capex.totalEur - lineSum(a.routesBase.chp, ["silage_clamp", "storage_open", "storage_cover"])],
    ["OPEX € without feedstock, haulage, digestate (KTBL incl. purchased plant power)", 204_226, (a) => { const r = a.routesBase.chp; return r.opexRev.opex.filter((o) => !["feedstock", "transport", "digestate_handling"].includes(o.id)).reduce((s, o) => s + o.eur, 0) + r.energy.elParasiticKwh * 0.094; }],
  ] },
  { tool: "Luke Biogas Tool v3 (25.09.2026; cattle slurry 9 225 t, 10.81 % TS, BMP 198.4, no grant)", input: fiDairy, rows: [
    ["BMP m³ CH4/a (before realisation)", 158_279, (a) => a.routesBase.chp.feed.lines.reduce((s, l) => s + l.ch4M3Year, 0)],
    ["electricity kWh/a (Luke burns 25 % of gas in a boiler for digester heat)", 300_879, (a) => a.routesBase.chp.energy.elGrossKwh],
    ["digester heat kWh/a", 278_069, (a) => a.routesBase.chp.energy.heatDigesterKwh],
    ["CAPEX € without digestate storage", 809_400, (a) => a.routesBase.chp.capex.totalEur - lineSum(a.routesBase.chp, ["storage_open", "storage_cover"])],
    ["OPEX €/a (Luke: 0.5 h/d labour, 13 €/MWh CHP service)", 23_773, (a) => a.routesBase.chp.fin.opexEurYear],
  ] },
  { tool: "WSU/USDA-ERS AD Budget Calculator v2-48 (12/2018, 2013 $ × CEPCI 1.41 / 1.15 $/€; 3 000 WCE)", input: ex("us_dairy_rng"), rows: [
    ["CH4 m³/a (0.23 m³/kg VS, no realisation)", 1_709_054, (a) => a.routesBase.chp.feed.ch4M3Year],
    ["CAPEX € digester + CHP", (2_290_669 + 1_476_008) * 1.41 / 1.15, (a) => a.routesBase.chp.capex.totalEur],
    ["CAPEX € digester + RNG (incl. $1.02 M injection point)", (2_290_669 + 2_744_667) * 1.41 / 1.15, (a) => a.routesBase.biomethane.capex.totalEur],
  ] },
];
console.log("\ntool | quantity | tool value | model | model ÷ tool");
for (const r of runs) {
  const a = assess(r.input, getCountry(r.input.countryCode), { uncertainty: false });
  for (const [label, tool, model] of r.rows) {
    const m = model(a), q = m / tool;
    console.log(`${r.tool} | ${label} | ${Math.round(tool)} | ${Math.round(m)} | ${q.toFixed(2)}${Math.abs(q - 1) > 0.15 ? "  > 15 %" : ""}`);
  }
}

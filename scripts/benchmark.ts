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
  /* EPA/GMI AD Screening Tool v2.2 (03/2022), wet mesophilic, run 2026-11-04 on the example's own VS (t/a). Tool: CH4 = VS ×
   * table yield ("theoretical maximum"), × 0.40–0.73 = IQR of measured ÷ modelled on > 100 EPA digesters (manual §2.3). Its
   * factor also absorbs collection, downtime and flaring, which our chain models separately, so the calibrated row is scope, not bias. */
  ...([
    ["dairy_400", "lactating cow + heifer 148 m³/t VS; 483.8 + 129.6 t VS", 612.4 * 148],
    ["ro_pig_complex", "adolescent pigs 356, gestating sows 275 m³/t VS; 1 689.8 + 603.5 t VS", 1689.8 * 356 + 603.5 * 275],
    ["gb_food", "diverted municipal food waste 445 m³/t VS; 10 560 t VS", 10_560 * 445],
    ["it_whey", "sweet-cheese whey 550 m³/t VS (also for DAF fat: no closer item); 2 024 + 405 t VS", 2429 * 550],
  ] as const).map(([id, what, theo]): ToolRun => ({ tool: `EPA AD Screening Tool v2.2 (${id}; ${what})`, input: ex(id), rows: [
    ["CH4 m³/a theoretical (no calibration) vs model BMP", theo, (a) => a.routesBase.chp.feed.ch4M3Year],
    ["CH4 m³/a calibrated mid (× 0.566; IQR 0.40–0.73) vs model base", theo * (0.4008 + 0.7304) / 2, (a) => a.routesBase.chp.energy.ch4ProducedM3],
  ] })),
  /* EPA LMOP LFGcost-Web v3.6 (09/2023), standard engine and RNG sheets, run 2026-11-04 on the example's engine size and gas.
   * 2013/2019 $ → 2025 with CEPCI ≈ 800 (× 1.41 / × 1.32) and CPI-U × 1.38 for O&M, 1.15 $/€ as above; the tool's own 8 %/a
   * equipment escalation is not used. Collection (wells, flare) is the client's `processCapexLocal` here, so it is excluded. */
  { tool: "EPA LFGcost-Web v3.6 (us_closed_landfill; 1 400 kW standard engine, 342 cfm LFG at 50 % CH4)", input: ex("us_closed_landfill"), rows: [
    ["gross kWh per m³ CH4 to the engine (tool 11 250 Btu/kWh HHV)", 35.3147 * 1012 / 11_250, (a) => a.routesBase.chp.energy.elGrossKwh / a.routesBase.chp.energy.ch4ToChpM3],
    ["CAPEX € engine, treatment, site, interconnect ($1 300/kW + $1.1 M + $0.25 M, 2013)", (1300 * 1400 + 1_350_000) * 1.41 / 1.15, (a) => a.routesBase.chp.capex.totalEur - lineSum(a.routesBase.chp, ["process"])],
    ["O&M € per gross kWh ($0.025/kWh, 2013; model: all non-collection OPEX)", 0.025 * 1.38 / 1.15, (a) => { const r = a.routesBase.chp; return r.opexRev.opex.filter((o) => o.id !== "process_operation").reduce((s, o) => s + o.eur, 0) / r.energy.elGrossKwh; }],
    ["CAPEX € RNG plant + interconnect + < 1 mile pipeline ($6 M·e^(0.0003·cfm) + $1 M, 2019; tool range 1 000–6 000 cfm)", (6e6 * Math.exp(0.0003 * 342) + 1e6) * 1.32 / 1.15, (a) => a.routesBase.biomethane.capex.totalEur - lineSum(a.routesBase.biomethane, ["process"])],
  ] },
];
console.log("\ntool | quantity | tool value | model | model ÷ tool");
for (const r of runs) {
  const a = assess(r.input, getCountry(r.input.countryCode), { uncertainty: false });
  for (const [label, tool, model] of r.rows) {
    const m = model(a), q = m / tool;
    const f = (n: number) => (Math.abs(tool) < 100 ? n.toFixed(3) : String(Math.round(n)));
    console.log(`${r.tool} | ${label} | ${f(tool)} | ${f(m)} | ${q.toFixed(2)}${Math.abs(q - 1) > 0.15 ? "  > 15 %" : ""}`);
  }
}

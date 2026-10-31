/**
 * CAPEX benchmark: runs the model on configurations that mirror published reference plants
 * and prints model CAPEX next to the published figure.
 * Usage: npx tsx scripts/benchmark.ts
 */
import { assess } from "../src/core";
import type { ProjectInput } from "../src/core/types";
import { getCountry } from "../src/countries";
import { EXAMPLES } from "../src/core/examples";

const DE = getCountry("DE");
const UA = getCountry("UA");
const eur = (n: number) => `€${(n / 1e6).toFixed(2)}M`;

function dairy(code: "DE" | "UA", cows: number, young: number, opts: { existingStorage?: number } = {}): ProjectInput {
  return {
    countryCode: code, regionId: code === "DE" ? "sachsen" : "lviv", businessType: "dairy_farm",
    feedstocks: [{ id: "a", animal: "dairy_cow", quantity: cows }, ...(young ? [{ id: "b", animal: "cattle_other" as const, quantity: young }] : [])],
    energy: { electricityKwhYear: cows * 1000, heatNeed: "year_round_process", heatKwhYear: cows * 300, hasGridConnection: true },
    site: { landHa: cows * 2, existingStorageM3: opts.existingStorage },
  };
}

function slaughter(code: "DE" | "UA", t: number): ProjectInput {
  return {
    countryCode: code, regionId: code === "DE" ? "sachsen" : "lviv", businessType: "slaughterhouse",
    feedstocks: [{ id: "a", type: "slaughter_residues", quantity: t, handling: "paid_disposal", currentDisposalCostPerTonneLocal: 700 }],
    energy: { electricityKwhYear: t * 900, heatNeed: "year_round_process", heatKwhYear: t * 600, hasGridConnection: true },
    site: { landHa: 500, gasGridKm: 1 },
  };
}

/** BMWK/Fraunhofer IEE/DBFZ/ESE-Consult, Kurzfristanalyse Kostenentwicklungen Biomasseanlagen, 13.02.2024, Tab. 4-1: new plant,
 * 510 kW rated (3 942 h at 1 135 kW installed, two engines, flexible), 70 % energy crops (30–40 % maize silage) + 30 % cattle
 * slurry, 50 €/t maize silage. Sized here to the same gross electricity (510 kW × 8 760 h) with maize as the only crop. */
function nawaro510(): ProjectInput {
  return {
    countryCode: "DE", regionId: "sachsen", businessType: "dairy_farm",
    feedstocks: [
      { id: "crop", type: "maize_silage", quantity: 12071, monthsActive: 12, purchasePricePerTonneLocal: 50 },
      { id: "slurry", type: "dairy_slurry", quantity: 5173, monthsActive: 12 },
    ],
    energy: { electricityKwhYear: 0, heatNeed: "none", hasGridConnection: true },
    site: { landHa: 400, existingStorageM3: 0, gasGridKm: 5 },
  };
}

interface Case { route?: "chp" | "boiler" | "biomethane"; name: string; input: ProjectInput; country: typeof DE; published: string; low: number; high: number; note: string }

const cases: Case[] = [
  { name: "DE 22 kW, 120 cows + young, existing storage", input: dairy("DE", 120, 100, { existingStorage: 1e6 }), country: DE, published: "€210k (2021) → ≈€0.27M at 2025 prices (+30 %)", low: 0.21e6, high: 0.3e6, note: "topagrar 2023" },
  { name: "DE ≈75 kW manure-only, existing storage, no solids", input: dairy("DE", 750, 0, { existingStorage: 1e6 }), country: DE, published: "≈€0.5M (≈2014) → ≈€0.68M (2025)", low: 0.5e6, high: 0.75e6, note: "LWK Niedersachsen; +35–40 % CHP/plant inflation (DBFZ/Fraunhofer for BMWK 2024)" },
  { name: "DE ≈75 kW manure-only, new digestate storage", input: dairy("DE", 750, 0), country: DE, published: "≈€0.75M (≈2014) → ≈€1.0M; 'conventional > €1M' (Hohenheim 2026)", low: 0.75e6, high: 1.1e6, note: "LWK Niedersachsen; agrarheute 2026; C.A.R.M.E.N. up to €10k/kW" },
  { name: "US-style 500-cow dairy (as DE costs)", input: dairy("DE", 500, 0, { existingStorage: 1e6 }), country: DE, published: "$1,100–1,500/cow (2012) → ≈€0.7–0.95M", low: 0.7e6, high: 0.95e6, note: "AgSTAR via Cornell; US CPI ≈ +40 %" },
  { route: "chp", name: "DE 510 kW rated NawaRo + slurry, flexible (1 135 kWe installed)", input: nawaro510(), country: DE, published: "7 521 €/kW rated (2023) = €3.84M; 8 517 €/kW (2026 est.) = €4.34M, incl. 8 % planning and flexibilisation", low: 3.84e6, high: 4.34e6, note: "BMWK/IEE/DBFZ 2024 Tab. 4-1; model plant has no flexibility engine (≈ +€0.7M at its own CHP curve) and the report does not say whether silo and digestate storage are included" },
  { name: "UA slaughter residues 10 000 t/a (≈300 kW)", input: slaughter("UA", 10000), country: UA, published: "UA vendors 1 MW ≈ €3.5k/kW; 333 kW ≈ €4.5k/kW (older)", low: 300 * 3500, high: 300 * 6000, note: "Zorg quote (unverified), Ecodevelop" },
];

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

/**
 * CAPEX benchmark: runs the model on configurations that mirror published reference plants
 * and prints model CAPEX next to the published figure.
 * Usage: npx tsx scripts/benchmark.ts
 */
import { assess } from "../src/core";
import type { ProjectInput } from "../src/core/types";
import { getCountry } from "../src/countries";

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

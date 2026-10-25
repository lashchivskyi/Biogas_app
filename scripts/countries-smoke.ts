import { assess } from "../src/core";
import { COUNTRIES, COUNTRY_ORDER } from "../src/countries";
import type { ProjectInput } from "../src/core";

const cases: Record<string, (c: string, r: string) => ProjectInput> = {
  dairy1000: (c, r) => ({ countryCode: c, regionId: r, businessType: "dairy_farm", feedstocks: [{ id: "a", animal: "dairy_cow", quantity: 1000 }], energy: { electricityKwhYear: 900000, heatNeed: "year_round_process", heatKwhYear: 400000, hasGridConnection: true }, site: { landHa: 1500, existingStorageM3: 8000, gasGridKm: 3 } }),
  slaughter: (c, r) => ({ countryCode: c, regionId: r, businessType: "slaughterhouse", feedstocks: [{ id: "a", type: "slaughter_residues", quantity: 8000, handling: "paid_disposal" }], energy: { electricityKwhYear: 5000000, heatNeed: "year_round_process", heatKwhYear: 3000000, hasGridConnection: true }, site: { landHa: 200, gasGridKm: 2 } }),
};
const f = (n: number) => (Math.round(n / 1000)).toString().padStart(6);
for (const name of Object.keys(cases)) {
  console.log("\n#", name);
  for (const code of COUNTRY_ORDER) {
    const c = COUNTRIES[code];
    const a = assess(cases[name](code, c.regions[0].id), c);
    const b = a.scenarios.base;
    const sc = a.supportCases.map((s) => `${s.schemeId}${s.eligible ? "" : "(x)"}:${f(s.npvEur)}`).join(" ");
    console.log(`${code} ${a.bestRoute.padEnd(10)} kW${String(Math.round(b.kwElEquivalent)).padStart(5)} capex${f(b.capex.totalEur)}k pb ${(b.fin.simplePaybackYears ?? NaN).toFixed(1).padStart(5)} npv${f(b.fin.npvEur)}k ${a.verdict.id.padEnd(24)} ${b.design.tech.digestion.padEnd(14)} ${sc}`);
  }
}

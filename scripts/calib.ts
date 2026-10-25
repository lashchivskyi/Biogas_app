import { assess } from "../src/core";
import { getCountry } from "../src/countries";
import type { ProjectInput } from "../src/core/types";

// Calibration anchor: IEA Bioenergy Task 37 slide (P. Kornatz): 200 kW cattle-manure-only plant ≈ 1.81 M EUR.
const country = getCountry(process.argv[2] ?? "DE");
const region = country.regions[0].id;
for (const cows of [800, 1800, 3000]) {
  const input: ProjectInput = {
    countryCode: country.code, regionId: region, businessType: "dairy_farm",
    feedstocks: [{ id: "a", animal: "dairy_cow", quantity: cows }],
    energy: { electricityKwhYear: 1e6, heatNeed: "none", hasGridConnection: true },
    site: { landHa: 3000 },
  };
  const a = assess(input, country);
  const b = a.scenarios.base;
  console.log(`${cows} cows -> chp ${b.energy.chpKwEl} kW, capex ${Math.round(b.capex.totalEur)} (${Math.round(b.capex.totalEur / Math.max(1, b.energy.chpKwEl))} EUR/kW), digester ${Math.round(b.design.workingVolumeM3)} m3`);
}

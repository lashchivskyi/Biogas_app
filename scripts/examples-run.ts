import { assess } from "../src/core";
import { EXAMPLES } from "../src/core/examples";
import { getCountry } from "../src/countries";
const f = (n: number) => Math.round(n / 1000).toString().padStart(7);
for (const e of EXAMPLES) {
  const a = assess(e.input, getCountry(e.input.countryCode));
  const b = a.scenarios.base;
  const sc = a.supportCases.map((s) => `${s.schemeId}${s.eligible ? "" : "(x)"}:${f(s.npvEur)}k pb ${(s.paybackYears ?? NaN).toFixed(1)}`).join(" | ");
  console.log(`${e.id.padEnd(16)} ${e.input.countryCode} ${a.bestRoute.padEnd(10)} kW${String(Math.round(b.kwElEquivalent)).padStart(6)} Nm3h${String(Math.round(a.routesBase.biomethane.energy.rawBiogasNm3PerHour)).padStart(5)} capex${f(b.capex.totalEur)}k pb ${(b.fin.simplePaybackYears ?? NaN).toFixed(1).padStart(5)} npv${f(b.fin.npvEur)}k ${a.verdict.id.padEnd(24)} ${b.design.tech.digestion.padEnd(14)} conf ${a.confidence.score} ${b.plantClass}\n    ${sc}`);
}

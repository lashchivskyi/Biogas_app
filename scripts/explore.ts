import { assess } from "../src/core";
import { EXAMPLES } from "../src/core/examples";
import { getCountry } from "../src/countries";

const only = process.argv[2];
const eur = (n: number) => Math.round(n).toLocaleString("en-US");
for (const ex of EXAMPLES) {
  if (only && ex.id !== only) continue;
  const a = assess(ex.input, getCountry("UA"));
  const b = a.scenarios.base;
  console.log(`\n=== ${ex.title} [${ex.id}] ===`);
  console.log(`route=${a.bestRoute}  verdict=${a.verdict.id}  conf=${a.confidence.level}(${a.confidence.score})  overall=${a.overall.value}`);
  console.log(`feed ${eur(b.feed.tonnesYear)} t/y, DM ${b.feed.dryMatterPct.toFixed(1)}%, CH4 ${eur(b.feed.ch4M3Year)} m3/y, biogas ${eur(b.feed.biogasM3Year)} m3/y, ${Math.round(b.feed.energyDensityKwhPerTonne)} kWh/t`);
  console.log(`digester ${eur(b.design.workingVolumeM3)} m3 (HRT ${b.design.hrtDays}, OLR ${b.design.olrKgVsM3Day.toFixed(1)}), heat ${eur(b.design.heatDemandKwhYear / 1000)} MWh/y, storage ${eur(b.design.storageVolumeM3)} m3`);
  const en = b.energy;
  console.log(`chp ${en.chpKwEl} kW (eta ${en.chpEtaEl.toFixed(2)}), el net ${eur(en.elNetKwh / 1000)} MWh, self ${eur(en.elSelfConsumedKwh / 1000)}, exp ${eur(en.elExportedKwh / 1000)}; heat net ${eur(en.heatNetAvailableKwh / 1000)} useful ${eur(en.heatUsefulKwh / 1000)} MWh; ext heat ${eur(en.heatExternalPurchasedKwh / 1000)}; flare ${eur(en.flaredKwh / 1000)} MWh; loss ${(en.methaneLossShare * 100).toFixed(1)}%`);
  for (const r of ["chp", "boiler", "biomethane"] as const) {
    const s = a.routesBase[r];
    console.log(`  [${r}] capex ${eur(s.capex.totalEur)} ebitda ${eur(s.fin.ebitdaEurYear)} payback ${s.fin.simplePaybackYears?.toFixed(1)} npv ${eur(s.fin.npvEur)} irr ${s.fin.irr?.toFixed(3)} dscr ${s.fin.dscrMin?.toFixed(2)}${r === "biomethane" ? ` bm ${eur(s.energy.biomethaneNm3)} Nm3 raw ${Math.round(s.energy.rawBiogasNm3PerHour)} Nm3/h` : ""}`);
  }
  console.log("  scenarios NPV:", (["conservative", "base", "optimistic"] as const).map((k) => `${k}=${eur(a.scenarios[k].fin.npvEur)}`).join("  "));
  console.log("  revenue:", b.opexRev.revenue.map((r) => `${r.id}=${eur(r.eur)}`).join(" "));
  console.log("  opex:", b.opexRev.opex.map((r) => `${r.id}=${eur(r.eur)}`).join(" "));
  console.log("  capex:", b.capex.lines.map((r) => `${r.id}=${eur(r.eur)}`).join(" "));
  console.log("  scores:", a.scores.map((s) => `${s.id}=${s.value}`).join(" "));
  console.log("  verdict:", a.verdict.reasons.join(" | "));
}

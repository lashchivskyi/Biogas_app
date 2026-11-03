/**
 * "How accurate we are": every real-plant reference set, the model's error on it and the micro-level reason behind each large
 * miss. Prints the diagnosis; --write stores the summary shown on /methodology (`accuracy-summary.json`, checked for drift by
 * `src/countries/__tests__/accuracy.test.ts`). Usage: npx tsx scripts/accuracy.ts [--write]
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { accuracySummary, agstarPlants, bmp3Plants, likeForLike, lmopEngines, lmopLandfills, quantile } from "./accuracy-references";
import { capexReferenceRows } from "./capex-references";

const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "—");
const dist = (xs: number[]) => `n ${xs.length}, median ${f2(quantile(xs, 0.5))}, p10–p90 ${f2(quantile(xs, 0.1))}–${f2(quantile(xs, 0.9))}`;
const group = <T>(rows: T[], key: (r: T) => string, ratio: (r: T) => number) => {
  const g = new Map<string, number[]>();
  for (const r of rows) g.set(key(r), [...(g.get(key(r)) ?? []), ratio(r)]);
  return [...g].map(([k, v]) => `    ${k.padEnd(34)} ${dist(v)}`).join("\n");
};

console.log("US farm digesters (AgSTAR, reported electricity) — model ÷ reported");
const ag = agstarPlants();
console.log(group(ag, (p) => `technology: ${p.heatedTank ? "heated tank" : p.row.digester}`, (p) => p.ratio));
console.log(group(ag, (p) => `gas use: ${p.soleUse ? "electricity only" : "also CNG / pipeline / boiler"}`, (p) => p.ratio));
console.log(group(ag, (p) => `reported ${p.aboveCeiling ? "ABOVE" : "below"} manure ceiling`, (p) => p.ratio));
console.log(group(ag, (p) => p.row.animal, (p) => p.ratio));
console.log(`  like-for-like: ${dist(ag.filter(likeForLike).map((p) => p.ratio))}`);
console.log("  largest misses, like-for-like (model > 1.5 × reported = plant runs well below its herd's gas: downtime, partial collection):");
for (const p of ag.filter(likeForLike).filter((x) => x.ratio > 1.5 || x.ratio < 0.67)) console.log(`    ${f2(p.ratio)} ${p.row.name} (${p.row.state}, ${p.row.head} head, ${p.row.digester}, ${Math.round(p.realKwhHead)} kWh/head vs model ${Math.round(p.modelKwhHead)}, ceiling ${Math.round(p.ceilingKwhHead)})`);

console.log("\nGerman farm plants (Messprogramm III, metered) — model ÷ measured methane");
const bp = bmp3Plants().plants;
console.log(group(bp, (p) => `manure share of fresh mass ${p.manureShareFm >= 0.5 ? "≥ 50 %" : "< 50 %"}`, (p) => p.ratio));
for (const p of bp.filter((x) => Math.abs(x.ratio - 1) > 0.25)) console.log(`    ${f2(p.ratio)} ${p.id}: measured ${Math.round(p.measuredLPerKgVs)} L CH4/kg VS vs model ${Math.round(p.modelLPerKgVs)}, HRT ${Math.round(p.hrtDays)} d, OLR ${f2(p.olr)}`);

console.log("\nLandfills (LMOP 2022, closed sites) — model ÷ measured collected methane");
for (const pct of [75, 50]) console.log(`  collection ${pct} %: ${dist(lmopLandfills(pct).filter((x) => x.closed).map((x) => x.captured))}`);
const lf = lmopLandfills(50);
console.log(`  generation, model ÷ EPA estimate: ${dist(lf.map((x) => x.method))}`);
console.log(`  methane recovered ÷ EPA generation: closed ${dist(lf.filter((x) => x.closed).map((x) => x.methaneRecovery))}; open ${dist(lf.filter((x) => !x.closed).map((x) => x.methaneRecovery))}`);
console.log(`  CH4 in collected gas: closed ${dist(lf.filter((x) => x.closed).map((x) => x.ch4Pct / 100))}`);
const en = lmopEngines();
console.log(`  engines, real ÷ datasheet: ${dist(en.map((x) => x.ratio))}; fitted half ${f2(quantile(en.filter((x) => x.i % 2 === 0).map((x) => x.ratio), 0.5))}, other half ${f2(quantile(en.filter((x) => x.i % 2 === 1).map((x) => x.ratio), 0.5))}`);

console.log("\nCAPEX — model ÷ published");
const capex = capexReferenceRows().filter((r) => r.counted);
for (const r of capex) console.log(`  ${f2(r.modelEur / r.publishedEur)} ${r.id}`);

const summary = { generatedOn: new Date().toISOString().slice(0, 10), ...accuracySummary(capex.map((r) => r.modelEur / r.publishedEur)) };
console.log("\n" + summary.sets.map((s) => `${s.id.padEnd(20)} n ${String(s.n).padStart(3)}  median ${f2(s.median)}  p10–p90 ${f2(s.p10)}–${f2(s.p90)}  within ±${s.tolerance * 100} % ${Math.round(s.withinShare * 100)} %`).join("\n"));
if (process.argv.includes("--write")) {
  writeFileSync(resolve(import.meta.dirname ?? ".", "../src/countries/data/accuracy-summary.json"), JSON.stringify(summary, null, 1) + "\n");
  console.log("written");
}

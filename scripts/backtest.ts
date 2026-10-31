/**
 * Production back-test against EPA AgSTAR (see src/countries/backtest.ts). Prints the error band and the worst cases;
 * --write stores the summary shown on /methodology. Usage: npx tsx scripts/backtest.ts [--write]
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runAgstarBacktest } from "../src/countries/backtest";

const { rows, ...summary } = runAgstarBacktest();
console.log(JSON.stringify(summary, null, 1));
const show = (key: "electricityRatio" | "biogasRatio") => {
  const s = rows.filter((r) => r[key] !== undefined).sort((a, b) => a[key]! - b[key]!);
  for (const r of [...s.slice(0, 4), ...s.slice(-4)]) console.log(key, r[key]!.toFixed(2), r.row.state, r.row.animal, r.row.head, r.row.digester, r.row.name);
};
show("electricityRatio");
show("biogasRatio");
if (process.argv.includes("--write")) {
  writeFileSync(resolve(import.meta.dirname ?? ".", "../src/countries/data/backtest-summary.json"), JSON.stringify(summary, null, 1) + "\n");
  console.log("written");
}

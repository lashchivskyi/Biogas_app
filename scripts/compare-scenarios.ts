/**
 * Before/after evidence for any data or formula change: every example in every country.
 * Usage: npx tsx scripts/compare-scenarios.ts --save <file.json>
 *        npx tsx scripts/compare-scenarios.ts --diff <before.json> <after.json>
 * Keep snapshots in the system temp folder, not in the repository.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { assess } from "../src/core";
import { EXAMPLES } from "../src/core/examples";
import { COUNTRIES, COUNTRY_ORDER } from "../src/countries";

type Row = { route?: string; npv?: number; irr?: number | null; capex?: number; verdict?: string; confidence?: number; error?: string };

function snapshot(): Record<string, Row> {
  const out: Record<string, Row> = {};
  for (const e of EXAMPLES) for (const code of COUNTRY_ORDER) {
    const c = COUNTRIES[code];
    try {
      const a = assess({ ...e.input, countryCode: code, regionId: c.regions[0]?.id }, c);
      const f = a.scenarios.base.fin;
      out[`${e.id}|${code}`] = { route: a.bestRoute, npv: Math.round(f.npvEur), irr: f.irr === null ? null : +f.irr.toFixed(4), capex: Math.round(f.capexEur), verdict: a.verdict.id, confidence: a.confidence.score };
    } catch (err) {
      out[`${e.id}|${code}`] = { error: String(err).slice(0, 120) };
    }
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

function diff(before: Record<string, Row>, after: Record<string, Row>) {
  const byCountry = new Map<string, number[]>();
  const verdicts: string[] = [];
  for (const [key, b] of Object.entries(before)) {
    const a = after[key];
    if (!a || b.npv === undefined || a.npv === undefined) continue;
    const code = key.split("|")[1];
    byCountry.set(code, [...(byCountry.get(code) ?? []), a.npv - b.npv]);
    if (a.verdict !== b.verdict) verdicts.push(`${key}: ${b.verdict} → ${a.verdict} (NPV ${b.npv} → ${a.npv})`);
  }
  console.log("Median NPV change by country (EUR), where any case moved:");
  for (const [code, d] of [...byCountry].sort((x, y) => Math.abs(median(y[1])) - Math.abs(median(x[1]))))
    if (d.some((v) => Math.abs(v) > 1)) console.log(`  ${code}: median ${Math.round(median(d))}, min ${Math.min(...d)}, max ${Math.max(...d)}`);
  console.log(`Verdict changes: ${verdicts.length} of ${Object.keys(before).length}`);
  for (const v of verdicts) console.log(`  ${v}`);
}

const [mode, ...files] = process.argv.slice(2);
if (mode === "--save" && files[0]) {
  const s = snapshot();
  writeFileSync(files[0], JSON.stringify(s));
  console.log(`Saved ${Object.keys(s).length} cases to ${files[0]}`);
} else if (mode === "--diff" && files[1]) {
  diff(JSON.parse(readFileSync(files[0], "utf8")), JSON.parse(readFileSync(files[1], "utf8")));
} else {
  console.error("Usage: --save <file.json> | --diff <before.json> <after.json>");
  process.exit(1);
}

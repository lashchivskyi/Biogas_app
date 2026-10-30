/**
 * Data-quality audit of every parameter shown on the methodology page: LOW confidence, missing or
 * stale dates, and source texts that point to non-official origins.
 * Usage: npx tsx scripts/audit-sources.ts [--country UA] [--stale-days 400]
 */
import { allProvenance } from "../src/core";
import { DATA_REVIEW_AS_OF, isoDate } from "../src/core/modelAudit";
import { COUNTRIES, COUNTRY_ORDER } from "../src/countries";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const only = arg("--country");
const staleDays = Number(arg("--stale-days") ?? 400);
// Words that signal a value was not taken from an official or primary source.
const SECONDARY = /\b(press|news|broker|analyst|estimate|non-official|aggregator|mirror|blog|copy)\b/i;
const age = (date: string) => (Date.parse(`${DATA_REVIEW_AS_OF}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000;

for (const code of only ? [only] : COUNTRY_ORDER) {
  const findings = allProvenance(COUNTRIES[code])
    .filter((p) => p.id.startsWith("econ."))
    .flatMap((p) => {
      const issues = [
        p.confidence === "LOW" && "LOW",
        !isoDate(p.date) && "undated",
        isoDate(p.date) && age(p.date) > staleDays && `stale ${Math.round(age(p.date))} d`,
        SECONDARY.test(p.source) && "secondary source",
      ].filter(Boolean);
      return issues.length ? [`  ${p.id} [${issues.join(", ")}] ${p.source.slice(0, 110)}`] : [];
    });
  const schemes = COUNTRIES[code].support.schemes.filter((s) => s.confidence === "LOW").map((s) => `  support ${s.id} [LOW] ${s.source.slice(0, 110)}`);
  if (findings.length || schemes.length) console.log(`${code}\n${[...findings, ...schemes].join("\n")}`);
}

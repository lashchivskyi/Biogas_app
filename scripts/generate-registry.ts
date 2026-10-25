import { writeFileSync } from "node:fs";
import { allProvenance } from "../src/core";
import { UA } from "../src/countries";

const rows = allProvenance(UA);
const groups: Array<[string, (id: string) => boolean]> = [
  ["Фізика та процес", (id) => id.startsWith("eng.") && !/^eng\.(capex|opex|chp)/.test(id)],
  ["Когенерація", (id) => id.startsWith("eng.chp")],
  ["CAPEX (база ЄС, 2025 EUR)", (id) => id.startsWith("eng.capex")],
  ["OPEX", (id) => id.startsWith("eng.opex")],
  ["Ринок країни: Україна", (id) => id.startsWith("econ.")],
  ["Сценарії", (id) => id.startsWith("scn.")],
];
const esc = (s: string) => s.replace(/\|/g, "\|");
let md = `# Реєстр припущень (згенеровано)\n\n> Файл генерується командою \`npm run docs:registry\` з \`src/core/engineeringParams.ts\`, \`src/countries/ua.ts\` та \`src/core/scenarios.ts\`. **Не редагуйте вручну.**\n> Тип: FACT — прочитано в джерелі; ASSUMPTION — рішення команди; ESTIMATE — наближена оцінка, яку треба перевірити; CALCULATION — похідне.\n\nВсього параметрів: ${rows.length}. Довіра LOW: ${rows.filter((r) => r.confidence === "LOW").length}, MEDIUM: ${rows.filter((r) => r.confidence === "MEDIUM").length}, HIGH: ${rows.filter((r) => r.confidence === "HIGH").length}.\n`;
for (const [title, test] of groups) {
  const g = rows.filter((r) => test(r.id));
  if (!g.length) continue;
  md += `\n## ${title} (${g.length})\n\n| id | Параметр | Значення | Одиниця | Тип | Довіра | Джерело | Країна | Дата |\n|---|---|---:|---|---|---|---|---|---|\n`;
  for (const r of g) md += `| \`${r.id}\` | ${esc(r.label)} | ${r.value} | ${esc(r.unit)} | ${r.kind} | ${r.confidence} | ${esc(r.source)}${r.note ? " — " + esc(r.note) : ""} | ${r.country} | ${r.date} |\n`;
}
writeFileSync("docs/assumptions-registry.md", md);
console.log(`wrote docs/assumptions-registry.md (${rows.length} parameters)`);

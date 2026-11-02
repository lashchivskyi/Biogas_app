/**
 * Translator brief: every interface string of the English dictionary with the context a translator needs
 * (where it is shown, placeholders, length budget). Writes CSV (RFC 4180, UTF-8 with BOM) to the folder in argv[2]
 * (default: system temp), never into the repo.   npm run l10n:export -- <folder>
 *
 * Length budget: +40 % over English is expected; a button or tab label must stay ≤ +60 % (QA reports more).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import en from "../src/i18n/dict/en";
import { messageArgs } from "../src/i18n/message";

type Tree = { [k: string]: unknown };
const CONTEXT: Record<string, string> = {
  meta: "Search result title/description and social preview: keep the main search phrase of the language first",
  nav: "Header navigation and buttons: very short, no full stop",
  hero: "Home page headline: [accent]…[/accent] marks the highlighted words, keep it in the same place",
  faq: "Question and answer, also published as structured data (FAQPage)",
  pricing: "Pricing page: plans, prices, FAQ",
  checkout: "Checkout form: legal consent lines and the payment button. Needs lawyer sign-off",
  calc: "Calculator form: step titles, field labels, buttons",
  result: "Free result page: verdict, ranges, warnings",
  report: "Paid report page and print/PDF",
  flow: "Labels inside the process diagram: fixed-width boxes, keep each under ≈ 20 characters",
  charts: "Chart axis and legend labels",
  labels: "Terms used everywhere (units, scenarios, business types): use the glossary term",
  footer: "Footer: includes the 'not a feasibility study' disclaimer",
  terms: "Terms page heading and note. Needs lawyer sign-off",
};

function leaves(o: unknown, path = "", out: [string, string][] = []): [string, string][] {
  if (typeof o === "string") out.push([path, o]);
  else if (Array.isArray(o)) o.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Tree)) leaves(v, path ? `${path}.${k}` : k, out);
  return out;
}
const csv = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

const rows = leaves(en).map(([key, text]) => {
  const top = key.split(/[.[]/)[0];
  const args = messageArgs(text).join(" ");
  const shortLabel = text.length <= 24 && !/[.!?]$/.test(text);
  return [key, text, CONTEXT[top] ?? "", args ? `keep unchanged: ${args}` : "", Math.ceil(text.length * (shortLabel ? 1.6 : 1.4)), shortLabel ? "button/label: no full stop" : ""];
});

const dir = process.argv[2] ?? join(tmpdir(), "methalytics-l10n");
mkdirSync(dir, { recursive: true });
const file = join(dir, "translator-brief.csv");
writeFileSync(file, `\uFEFF${["key", "english", "where_used", "placeholders", "max_chars", "note"].map(csv).join(",")}\r\n${rows.map((r) => r.map(csv).join(",")).join("\r\n")}\r\n`);
console.log(`${rows.length} strings → ${file}`);

import type { Assessment } from "@/core";
import type { Dict, Locale } from "@/i18n";
import { h2Chunks, near, norm, statsOf, txt, WS, type Access, type Finding } from "./report-audit";

/**
 * Languages, tiers and translated templates: translation and packaging must not change a number or a meaning.
 */
const SKIP_PATHS = /^(dataAudit|input|lang)(\.|$)/;
const IDENTIFIER = /\.(id|typeId|schemeId|parameterId|product|status|scenario|route|unit|kind|digestate|basis|position|severity|relevance|effort)$|^(verdict\.id|robustness|bestRoute|countryCode)$/;

function leaves(o: unknown, path: string, nums: Map<string, number>, strs: Map<string, string>) {
  if (typeof o === "number") nums.set(path, o);
  else if (typeof o === "string") strs.set(path, o);
  else if (Array.isArray(o)) o.forEach((v, i) => leaves(v, `${path}[${i}]`, nums, strs));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) leaves(v, path ? `${path}.${k}` : k, nums, strs);
}

/** Numbers in a sentence, independent of the language's separators: "1,234.5" and "1 234,5" both give 1234.5. */
export const numberTokens = (s: string): number[] =>
  (s.replace(WS, " ").replace(/Q\d|\b(?:IV|I{1,3})\s*кв\./g, " ").replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g, "$3 $2 $1").replace(/(\d)[ ,.](?=\d{3}(?!\d))/g, "$1").replace(/(\d),(\d)/g, "$1.$2").match(/\d+(?:\.\d+)?/g) ?? [])
    .map(Number).filter((n) => Number.isFinite(n)).sort((x, y) => x - y);

/** The English and Ukrainian assessments of one input are the same model: every number equal, every sentence quotes the same numbers. */
export function auditLanguages(en: Assessment, uk: Assessment): Finding[] {
  const out: Finding[] = [];
  const nE = new Map<string, number>(), sE = new Map<string, string>(), nU = new Map<string, number>(), sU = new Map<string, string>();
  leaves(en, "", nE, sE);
  leaves(uk, "", nU, sU);
  for (const [k, v] of nE) {
    if (SKIP_PATHS.test(k)) continue;
    const u = nU.get(k);
    if (u === undefined) out.push({ where: `languages ${k}`, message: "number missing in the Ukrainian assessment" });
    else if (!near(u, v, 1e-12)) out.push({ where: `languages ${k}`, message: `English ${v} ≠ Ukrainian ${u}` });
  }
  for (const k of nU.keys()) if (!SKIP_PATHS.test(k) && !nE.has(k)) out.push({ where: `languages ${k}`, message: "number missing in the English assessment" });
  const pathsE = [...sE.keys()].filter((k) => !SKIP_PATHS.test(k)), pathsU = [...sU.keys()].filter((k) => !SKIP_PATHS.test(k));
  if (pathsE.length !== pathsU.length) out.push({ where: "languages", message: `${pathsE.length} texts in English, ${pathsU.length} in Ukrainian` });
  for (const k of pathsE) {
    const u = sU.get(k);
    if (u === undefined) { out.push({ where: `languages ${k}`, message: "text missing in the Ukrainian assessment" }); continue; }
    const e = sE.get(k)!;
    if (IDENTIFIER.test(k)) { if (e !== u) out.push({ where: `languages ${k}`, message: `identifier differs: “${e}” vs “${u}”` }); continue; }
    if (/(^|\.)source$/.test(k)) continue;
    if (JSON.stringify(numberTokens(e)) !== JSON.stringify(numberTokens(u))) out.push({ where: `languages ${k}`, message: `English quotes ${numberTokens(e).join(", ")}, Ukrainian ${numberTokens(u).join(", ")}: “${e.slice(0, 90)}”` });
  }
  return out;
}

/** What the free result shows, the standard and the full report show identically (verdict, robustness, summary, key numbers, energy flow). */
export function auditTiers(a: Assessment, html: Record<Access, string>, ctx: { d: Dict; locale: Locale }): Finding[] {
  const out: Finding[] = [];
  const where = `${a.input.countryCode}/${ctx.locale}/tiers`;
  const R = ctx.d.result;
  const blocks = (h: string) => {
    const { map, order } = h2Chunks(h);
    // A block ends where the next <section> begins (the locked teaser is a section of its own).
    return [order[0], R.robust.title, R.summaryTitle, R.keyTitle, R.flowTitle].map((n) => (n !== undefined && map.has(norm(n)) ? txt(map.get(norm(n))!.split("<section")[0]) : ""));
  };
  const free = blocks(html.free), std = blocks(html.standard), full = blocks(html.full);
  ["verdict", "robustness", "summary", "key numbers", "energy flow"].forEach((name, i) => {
    // A paid report adds model warnings and market checks after the key-number tiles.
    const same = (x: string, y: string) => (i === 3 ? x.startsWith(y) || y.startsWith(x) : x === y);
    if (!same(std[i], free[i])) out.push({ where, message: `${name} differs between the free and the standard report` });
    if (!same(full[i], std[i])) out.push({ where, message: `${name} differs between the standard and the full report` });
  });
  const tiles = (h: string) => [...statsOf(h2Chunks(h).map.get(norm(R.keyTitle)) ?? "").entries()].map(([k, v]) => `${k}=${v.value}|${v.note}`).join("\n");
  if (tiles(html.free) !== tiles(html.standard) || tiles(html.standard) !== tiles(html.full)) out.push({ where, message: "key-number tiles differ between tiers" });
  return out;
}

/** A translated template keeps its placeholders, its literal numbers and the order low → base → high. */
export function auditCopy(locale: string, own: Record<string, unknown>, ref: Record<string, unknown>): Finding[] {
  const out: Finding[] = [];
  const a = new Map<string, string>(), b = new Map<string, string>();
  leaves(own, "", new Map(), a);
  leaves(ref, "", new Map(), b);
  const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  for (const [k, e] of b) {
    const t = a.get(k);
    if (t === undefined) { out.push({ where: `copy ${locale} ${k}`, message: "missing translation" }); continue; }
    if (JSON.stringify(vars(t).sort()) !== JSON.stringify(vars(e).sort())) out.push({ where: `copy ${locale} ${k}`, message: `placeholders {${vars(t).join(",")}} ≠ {${vars(e).join(",")}}` });
    const order = ["lo", "base", "hi"].filter((v) => vars(e).includes(v));
    if (order.length > 1) {
      const pos = order.map((v) => t.indexOf(`{${v}}`));
      if (pos.some((p, i) => i > 0 && p < pos[i - 1])) out.push({ where: `copy ${locale} ${k}`, message: `low/base/high placeholders are reordered: “${t}”` });
    }
    // 1, 10 and 1000 are often written as words ("tys.", "1 in 10"), so they are not compared.
    const literal = (s: string) => numberTokens(s.replace(/\{\w+\}/g, " ")).filter((n) => ![0, 1, 10, 1000].includes(n));
    if (JSON.stringify(literal(t)) !== JSON.stringify(literal(e))) out.push({ where: `copy ${locale} ${k}`, message: `literal numbers ${literal(t).join(", ")} ≠ English ${literal(e).join(", ")}` });
  }
  for (const k of a.keys()) if (!b.has(k)) out.push({ where: `copy ${locale} ${k}`, message: "key not in the English source" });
  return out;
}

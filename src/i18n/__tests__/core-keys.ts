import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/**
 * Finds every English source text of the model that other languages translate by catalog (`d.core`, `src/i18n/core/<locale>.ts`).
 * A source text is an English string literal that is written next to its Ukrainian twin:
 *   T("English", "Українська"[, vars])  ·  ["English", "Українська"]  ·  { en: "English", uk: "Українська" }  ·  f(id, "English", "Українська", …)
 * The English text is the catalog key. Dynamic strings written as `${…}` do not exist any more: values are `{name}` placeholders.
 */
export interface CoreKey { en: string; uk: string[]; where: string[] }

// src/content is not here: hub, segment and sample pages of other locales are authored per locale in the dictionaries (`localized.ts`, `samples.ts`).
const ROOTS = ["src/core", "src/countries", "src/lib", "src/server", "src/app"];
const CYR = /[Ѐ-ӿ]/;
const LAT = /[A-Za-z]{2}/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "__tests__" || name === "data" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const lit = (n: ts.Node): string | undefined => (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text : undefined);

export function collectCoreKeys(root = process.cwd()): Map<string, CoreKey> {
  const keys = new Map<string, CoreKey>();
  const add = (en: string, uk: string, where: string) => {
    if (!LAT.test(en) || CYR.test(en) || !CYR.test(uk)) return;
    const k = keys.get(en) ?? { en, uk: [], where: [] };
    if (!k.uk.includes(uk)) k.uk.push(uk);
    k.where.push(where);
    keys.set(en, k);
  };
  for (const r of ROOTS) {
    for (const file of walk(join(root, r))) {
      const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      const at = (n: ts.Node) => `${file.slice(root.length + 1)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
      const prop = (o: ts.ObjectLiteralExpression, name: string) => o.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(sf).replace(/["']/g, "") === name)?.initializer;
      /** English node next to its Ukrainian twin: strings, arrays of strings and objects with the same property names are paired element-wise. */
      const align = (en: ts.Node, uk: ts.Node) => {
        const a = lit(en), b = lit(uk);
        if (a !== undefined && b !== undefined) add(a, b, at(en));
        else if (ts.isArrayLiteralExpression(en) && ts.isArrayLiteralExpression(uk) && en.elements.length === uk.elements.length) en.elements.forEach((e, i) => align(e, uk.elements[i]));
        else if (ts.isObjectLiteralExpression(en) && ts.isObjectLiteralExpression(uk)) for (const p of en.properties) if (ts.isPropertyAssignment(p)) { const o = prop(uk, p.name.getText(sf).replace(/["']/g, "")); if (o) align(p.initializer, o); }
      };
      const pairs = (nodes: readonly ts.Node[]) => {
        for (let i = 0; i + 1 < nodes.length; i++) {
          const a = nodes[i], b = nodes[i + 1];
          if (lit(a) !== undefined && lit(b) !== undefined) align(a, b);
          else if (ts.isArrayLiteralExpression(a) && ts.isArrayLiteralExpression(b)) align(a, b);
        }
      };
      const visit = (n: ts.Node) => {
        if (ts.isCallExpression(n)) pairs(n.arguments);
        else if (ts.isArrayLiteralExpression(n)) pairs(n.elements);
        else if (ts.isObjectLiteralExpression(n)) {
          const en = prop(n, "en"), uk = prop(n, "uk");
          if (en && uk) align(en, uk);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
  }
  return keys;
}

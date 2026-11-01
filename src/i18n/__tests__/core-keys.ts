import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/**
 * Finds the English source texts of the model in the code: the texts that every language translates by catalog
 * (`src/i18n/core/<locale>.ts`, Ukrainian included). A source text is an English string literal written as
 *   T("English", vars?)  ·  ctx.t("English")  ·  { en: "English" }  ·  { en: ["English", …] }
 *   and the text arguments of the local helpers `it(id, en, whyEn, …)` (regulatory) and `none(en)` / `sup(en, …)` (profiles).
 * The English text is the catalog key. Dynamic strings written as `${…}` are not allowed: values are `{name}` placeholders.
 */
export interface CoreKey { en: string; where: string[] }

// src/content is not here: hub, segment and sample pages of other locales are authored per locale in the dictionaries (`localized.ts`, `samples.ts`).
const ROOTS = ["src/core", "src/countries", "src/lib", "src/server", "src/app"];
const LAT = /[A-Za-z]{2}/;
const CYR = /[Ѐ-ӿ]/;

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

/** Argument positions of the English texts in the local helpers whose arguments are not the model's `T`. */
const HELPERS: Record<string, { file: RegExp; args: number[] }> = {
  it: { file: /countries[\\/]regulatory\.ts$/, args: [1, 2] },
  none: { file: /countries[\\/]profiles\.ts$/, args: [0] },
  sup: { file: /countries[\\/]profiles\.ts$/, args: [0] },
};

export interface CoreScan {
  /** English source texts of the model with their places. */
  keys: Map<string, CoreKey>;
  /** Every string literal of the model code (to see that a catalog key is still written somewhere). */
  literals: Set<string>;
  /** Source texts written as `${…}` templates or other non-literals, which no catalog can hold. */
  dynamic: string[];
}

export function scanCoreCode(root = process.cwd()): CoreScan {
  const keys = new Map<string, CoreKey>();
  const literals = new Set<string>();
  const dynamic: string[] = [];
  const add = (en: string, where: string) => {
    // Acronyms (CAPEX, NPV) are the same in every language: no translation, no key.
    if (!LAT.test(en) || CYR.test(en) || !/[a-z]/.test(en)) return;
    const k = keys.get(en) ?? { en, where: [] };
    k.where.push(where);
    keys.set(en, k);
  };
  for (const r of ROOTS) {
    for (const file of walk(join(root, r))) {
      const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      const rel = file.slice(root.length + 1);
      const at = (n: ts.Node) => `${rel}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
      /** An English text node: a literal, or an array of them; anything dynamic is reported. */
      const text = (n: ts.Node | undefined) => {
        if (!n) return;
        const s = lit(n);
        if (s !== undefined) add(s, at(n));
        else if (ts.isArrayLiteralExpression(n)) n.elements.forEach((e) => text(e));
        else if (ts.isTemplateExpression(n) || ts.isBinaryExpression(n)) dynamic.push(`${at(n)}: ${n.getText(sf).slice(0, 60)}`);
      };
      const visit = (n: ts.Node) => {
        const s = lit(n);
        if (s !== undefined) literals.add(s);
        if (ts.isCallExpression(n)) {
          const callee = n.expression;
          const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
          if (name === "T" || name === "t") text(n.arguments[0]);
          else if (Object.hasOwn(HELPERS, name) && HELPERS[name].file.test(file)) for (const i of HELPERS[name].args) text(n.arguments[i]);
        } else if (ts.isObjectLiteralExpression(n)) {
          const en = n.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(sf) === "en");
          if (en) text(en.initializer);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
  }
  return { keys, literals, dynamic };
}

export const collectCoreKeys = (root = process.cwd()): Map<string, CoreKey> => scanCoreCode(root).keys;

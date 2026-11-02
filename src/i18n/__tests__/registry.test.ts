import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "..";

/**
 * The rule "a new string = English + every language, or the build fails" is kept by three machine checks:
 * this registry test (a new text module cannot skip the QA corpus), `dict.test.ts` (same keys, placeholders in all 25
 * dictionaries) and the `react/jsx-no-literals` lint rule + `hardcoded.test.ts` (no visible text typed into components).
 * `npm run build` runs them first (`prebuild` in package.json).
 */
const ROOT = join(process.cwd(), "src", "i18n");
/** Not user text: logic, types, data tables for other purposes, or the QA itself. */
const EXEMPT = new Set(["config.ts", "index.ts", "message.ts", "glossary.ts", "language-options.ts", "request.ts", "seo.ts"]);

const modules = readdirSync(ROOT).filter((f) => f.endsWith(".ts") && !EXEMPT.has(f));
const corpus = readFileSync(join(ROOT, "__tests__", "qa-corpus.ts"), "utf8");

describe("i18n text modules", () => {
  it.each(modules)("%s is covered by the QA corpus", (file) => {
    expect(corpus, `add ${file} to modules() in src/i18n/__tests__/qa-corpus.ts`).toContain(`"../${file.replace(/\.ts$/, "")}"`);
  });

  it("dictionary and core catalogs exist for every locale", () => {
    const dict = readdirSync(join(ROOT, "dict")).map((f) => f.replace(/\.ts$/, ""));
    for (const l of LOCALES) expect(dict, l).toContain(l);
    expect(statSync(join(ROOT, "core")).isDirectory()).toBe(true);
  });
});

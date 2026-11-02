import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, it } from "vitest";

/**
 * Visible text typed into a component is invisible to the 25-language dictionaries. JSX text children are blocked by
 * the `react/jsx-no-literals` lint rule (eslint.config.mjs); this test covers the string ATTRIBUTES lint does not see
 * (aria-label, title, placeholder, alt, label): they must come from a dictionary, except the technical tokens below.
 */
const ROOTS = ["src/components", "src/app"];
const SKIP_DIRS = new Set(["__tests__", "admin", "node_modules"]);
const ALLOWED = new Set(["Methalytics", "BMP (L CH₄/kg VS)"]); // brand name; BMP unit label (DO-NOT-TRANSLATE tokens)
const ATTR = /\b(aria-label|aria-description|aria-placeholder|title|placeholder|alt|label)="([^"{}]*)"/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p, out); }
    else if (/\.tsx$/.test(name) && !name.startsWith("Admin")) out.push(p);
  }
  return out;
}

it("no component types a human-readable string attribute (it must come from src/i18n)", () => {
  const found: string[] = [];
  for (const root of ROOTS) {
    for (const file of walk(join(process.cwd(), root))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(ATTR)) {
        if (/[\p{L}]{3}/u.test(m[2]) && !ALLOWED.has(m[2])) found.push(`${relative(process.cwd(), file)}: ${m[1]}="${m[2]}"`);
      }
    }
  }
  expect(found, `Move these strings into the dictionaries (en + all locales):\n${found.join("\n")}`).toEqual([]);
});

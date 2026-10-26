import { describe, expect, it } from "vitest";
import { getDictionary, LOCALES } from "..";
import en from "../dict/en";

type Tree = { [k: string]: unknown };

/** Flattens a dictionary into path → string (array items by index). */
function leaves(o: unknown, path = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof o === "string") out.set(path, o);
  else if (Array.isArray(o)) o.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Tree)) leaves(v, path ? `${path}.${k}` : k, out);
  return out;
}

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const ref = leaves(en);

it("keeps screening uncertainty copy intact in every locale without claiming validated accuracy", async () => {
  for (const locale of LOCALES) {
    const d = await getDictionary(locale);
    expect(d.result.robust.accuracy, locale).toContain("BMP");
    expect(d.result.robust.accuracy, locale).not.toMatch(/\?{3}|\uFFFD|±30|AACE/);
  }
});

describe.each(LOCALES.filter((l) => l !== "en"))("dictionary %s", (locale) => {
  it("has exactly the English keys, same array lengths and the same {placeholders}", async () => {
    const raw = (await import(`../dict/${locale}.ts`)).default;
    const own = leaves(raw);
    for (const k of own.keys()) expect(ref.has(k), `${locale}: unknown key ${k}`).toBe(true);
    const sharedTechnicalKeys = new Set(["labels.units.t", "labels.units.ha", "labels.units.m3", "labels.units.km", "labels.units.kwh", "labels.units.mwh", "labels.units.pct", "labels.units.kw", "labels.units.kwe", "flow.mwh", "flow.nm3"]);
    for (const k of ref.keys()) expect(own.has(k) || sharedTechnicalKeys.has(k), `${locale}: missing translation ${k}`).toBe(true);
    const merged = leaves(await getDictionary(locale));
    expect([...merged.keys()].sort()).toEqual([...ref.keys()].sort());
    for (const [k, v] of merged) {
      expect(vars(v), `${locale}: ${k}`).toEqual(vars(ref.get(k)!));
      expect(v.trim().length, `${locale}: empty ${k}`).toBeGreaterThan(0);
    }
    const h1 = (await getDictionary(locale)).hero.h1;
    expect(h1, `${locale}: hero.h1 needs one [accent]`).toMatch(/\[[^\]]+\]/);
  });

  it("translates most of the UI (not an English copy)", async () => {
    const own = leaves((await import(`../dict/${locale}.ts`)).default);
    const same = [...own].filter(([k, v]) => v === ref.get(k) && /[a-z]{4,}/i.test(v)).length;
    expect(own.size, `${locale}: translated keys`).toBeGreaterThan(ref.size * 0.9);
    expect(same / own.size, `${locale}: share identical to English`).toBeLessThan(0.08);
  });
});

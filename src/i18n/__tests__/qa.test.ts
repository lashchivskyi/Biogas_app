import { beforeAll, describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "..";
import { GLOSSARY } from "../glossary";
import { loadCorpus, type Corpus } from "./qa-corpus";
import { flattenMessage } from "../message";
import * as R from "./qa-rules";

/**
 * Automatic localisation QA over EVERY i18n module (dict, offer, methodology, help texts, …), 25 locales.
 * Rules and data: `qa-rules.ts`, `../glossary.ts`; human style guide: `.claude/skills/localization/SKILL.md`.
 *
 * Hard checks must stay at zero. Known defects found when the QA was introduced are counted per locale in `KNOWN`
 * (a ratchet): a new defect fails the test, and fixing one fails it too until the number is lowered, so the list
 * only ever shrinks. Style and length findings are warnings printed once.
 */
const KNOWN: Record<"dnt" | "unit" | "abbreviation", Partial<Record<Locale, number>>> = {
  // Monte Carlo, HHV/LHV and FACT/ASSUMPTION/CALCULATION/ESTIMATE written in local script or translated.
  dnt: { uk: 4, pl: 2, de: 7, fr: 0, it: 4, es: 0, pt: 0, nl: 4, cs: 6, sk: 10, hu: 0, ro: 0, bg: 7, sr: 5, el: 0, tr: 0, lt: 0, lv: 0, et: 0, da: 5, sv: 4, fi: 8, vi: 0, th: 4 },
  // "kWe" → "kWel", "t" → "tấn"/"ตัน" and similar local unit words (vi, th, fi write them natively: owner decision).
  unit: { uk: 1, pl: 1, de: 2, nl: 1, cs: 1, sk: 1, hu: 2, ro: 1, bg: 1, sr: 1, el: 1, tr: 2, lt: 1, lv: 1, et: 1, da: 1, sv: 1, fi: 8, vi: 11, th: 16 },
  // English CHP / COD / NPV / IRR left where the glossary has the local term.
  abbreviation: { uk: 3, pl: 5, de: 0, fr: 0, it: 0, es: 0, pt: 0, nl: 0, cs: 0, sk: 0, hu: 0, ro: 0, bg: 0, sr: 0, el: 0, tr: 0, lt: 0, lv: 0, et: 0, da: 0, sv: 0, vi: 0, th: 6 },
};

let corpus: Corpus;
beforeAll(async () => { corpus = await loadCorpus(); });

type Finding = string;
type Scanned = { module: string; path: string; text: string; en: string | undefined };
/** Text rules see plural/select messages as one representative sentence (the `other` branch); `raw` keeps the message as authored. */
const scan = (locale: Locale, rule: (e: Scanned) => string[], raw = false): Finding[] =>
  corpus.byLocale[locale].flatMap((e) => rule(raw ? e : { ...e, text: flattenMessage(e.text), en: e.en === undefined ? undefined : flattenMessage(e.en) }).map((m) => `${e.module}:${e.path} ${m}`));
const show = (f: Finding[]) => `${f.length} finding(s):\n  ${f.slice(0, 12).join("\n  ")}`;

function ratchet(check: keyof typeof KNOWN, locale: Locale, found: Finding[]) {
  const allowed = KNOWN[check][locale] ?? 0;
  expect(found.length, `${check} ${locale}: new defects (known: ${allowed})\n${show(found)}`).toBeLessThanOrEqual(allowed);
  expect(found.length, `${check} ${locale}: fewer defects than recorded — lower KNOWN.${check}.${locale} to ${found.length}`).toBeGreaterThanOrEqual(allowed);
}

it("covers every i18n module for every locale with the same strings", () => {
  const sizes = new Set(LOCALES.map((l) => corpus.byLocale[l].length));
  expect([...sizes], "all locales expose the same string paths").toHaveLength(1);
  const modules = new Set(corpus.byLocale.en.map((e) => e.module));
  expect(modules.size).toBeGreaterThanOrEqual(30);
  expect(corpus.byLocale.en.length).toBeGreaterThan(1200);
});

describe.each(LOCALES)("localisation QA %s", (locale) => {
  const g = GLOSSARY[locale];

  it("keeps placeholders, [accent] marks and valid {name} syntax", () => {
    const bad = scan(locale, (e) => {
      const out = [...R.icuIssues(e.text), ...R.pluralIssues(locale, e.text)];
      if (locale === "en") return out;
      if (e.en === undefined) return [...out, "no English source at this path"];
      if (R.placeholders(e.text).join() !== R.placeholders(e.en).join()) out.push(`placeholders {${R.placeholders(e.text)}} ≠ {${R.placeholders(e.en)}}`);
      if (R.accentMarks(e.text) !== R.accentMarks(e.en)) out.push("[accent] marks differ from English");
      return out;
    }, true);
    expect(bad, show(bad)).toEqual([]);
  });

  it("uses the approved terms at their anchor strings", () => {
    const d = corpus.dicts[locale];
    const t = g.terms, proc = corpus.byLocale[locale].find((e) => e.module === "processLabels" && e.path === "biomassCodPct")!.text;
    const plans = d.pricing.plans as Record<string, { name: string }>;
    const checks: [string, string, string, "equals" | "includes"][] = [
      ["digester", d.story.chapters[1].kicker, t.digester, "equals"], ["feedstock", d.story.chapters[0].kicker, t.feedstock, "equals"],
      ["digestate", d.story.chapters[4].kicker, t.digestate, "equals"], ["chp", d.labels.route.chp, t.chp, "includes"],
      ["biomethane", d.labels.route.biomethane, t.biomethane, "includes"], ["payback", d.result.payback, t.payback, "equals"],
      ["npv", d.result.npv, t.npv, "includes"], ["irr", d.result.rowIrr, t.irr, "equals"], ["cod", proc, t.cod, "includes"], ["dm", d.result.colDm, t.dm, "includes"],
      ["conservative", d.labels.scenario.conservative, t.conservative, "equals"], ["base", d.labels.scenario.base, t.base, "equals"], ["optimistic", d.labels.scenario.optimistic, t.optimistic, "equals"],
      ["planStandard", plans.standard.name, t.planStandard, "equals"], ["planExtended", plans.report.name, t.planExtended, "equals"],
    ];
    const bad = checks.filter(([, actual, term, mode]) => (mode === "equals" ? actual !== term : !actual.toLowerCase().includes(term.toLowerCase())))
      .map(([name, actual, term]) => `${name}: UI says "${actual}", glossary says "${term}"`);
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("has no forbidden term variants or English leaks", () => {
    const bad = scan(locale, (e) => R.forbiddenHits(locale, e.text).map((h) => `"${h.stem}…" → use ${h.use}`));
    expect(bad, show(bad)).toEqual([]);
  });

  it("keeps DO-NOT-TRANSLATE tokens as written", () => {
    ratchet("dnt", locale, scan(locale, (e) => (e.en === undefined ? [] : R.dntMissing(locale, e.en, e.text).map((m) => `lost ${m}`))));
  });

  it("keeps SI unit symbols", () => {
    ratchet("unit", locale, scan(locale, (e) => (e.en === undefined ? [] : R.unitsMissing(locale, e.en, e.text).map((m) => `unit ${m} replaced`))));
  });

  it("uses the local term instead of English NPV / IRR / CHP / COD", () => {
    ratchet("abbreviation", locale, scan(locale, (e) => R.abbreviationDrift(locale, e.text).map((m) => `${m} without ${g.terms[m.toLowerCase() as "npv" | "irr" | "chp" | "cod"]}`)));
  });

  it("writes in the right script (no foreign script, no mixed-script homoglyph words)", () => {
    const bad = scan(locale, (e) => R.scriptIssues(locale, e.text));
    expect(bad, show(bad)).toEqual([]);
  });

  it("has no invisible or control characters, double spaces or placeholders like ???", () => {
    const bad = scan(locale, (e) => R.invisibleIssues(locale, e.text, e.en));
    expect(bad, show(bad)).toEqual([]);
  });

  it("uses the locale's quotation marks and decimal separator, and one form of address", () => {
    const bad = scan(locale, (e) => [...R.quoteIssues(locale, e.text), ...R.decimalIssues(locale, e.text).map((d) => `decimal point in ${d}`), ...R.addressIssues(locale, e.text)]);
    expect(bad, show(bad)).toEqual([]);
  });

  it("does not leave a meaningful share of strings identical to English", () => {
    if (locale === "en") return;
    const entries = corpus.byLocale[locale];
    const same = entries.filter((e) => R.sameAsEnglish(flattenMessage(e.text), e.en && flattenMessage(e.en)));
    expect(same.length / entries.length, `identical to English: ${same.slice(0, 10).map((e) => `${e.module}:${e.path}`).join(", ")}`).toBeLessThan(0.05);
  });
});

it("reports warnings: text expansion > +60 % on short strings, % spacing, stray Latin words in non-Latin scripts", () => {
  const lines: string[] = [];
  for (const locale of LOCALES.filter((l) => l !== "en")) {
    const entries = corpus.byLocale[locale];
    const wide = entries.filter((e) => (R.expansion(flattenMessage(e.text), e.en && flattenMessage(e.en)) ?? 0) > 0.6);
    const pct = entries.flatMap((e) => R.percentIssues(locale, flattenMessage(e.text)));
    const latin = entries.flatMap((e) => R.strayLatin(locale, flattenMessage(e.text)));
    if (wide.length || pct.length || latin.length) {
      const worst = wide.slice(0, 3).map((e) => `"${e.en}" → "${e.text}"`).join("; ");
      lines.push(`${locale}: +60 % ${wide.length}${worst ? ` (e.g. ${worst})` : ""} · % spacing ${pct.length} · stray Latin ${latin.length}${latin.length ? ` (${[...new Set(latin)].slice(0, 6).join(", ")})` : ""}`);
    }
  }
  if (lines.length) console.warn(`Localisation warnings (not failures):\n${lines.join("\n")}`);
  expect(true).toBe(true);
});

it("the rules catch what they are meant to catch", () => {
  const cp = String.fromCharCode;
  expect(R.scriptIssues("uk", `Сирови${cp(0x61)} на рік`).join()).toMatch(/mixed scripts/); // Latin "a" inside a Cyrillic word
  expect(R.scriptIssues("sr", "Сировина").join()).toMatch(/Cyrillic text in a Latin locale/);
  expect(R.scriptIssues("pl", "ρ = m/V")).toEqual([]); // a lone Greek letter is a maths symbol
  expect(R.invisibleIssues("de", `Gär${cp(0xad)}rest`)).toContain("U+00AD soft hyphen");
  expect(R.invisibleIssues("de", `Gärrest${cp(0x200b)}`)).toContain("U+200B zero-width space");
  expect(R.forbiddenHits("uk", "Песимістичний сценарій").length).toBe(1);
  expect(R.forbiddenHits("de", "Feedstock und Digestate").length).toBeGreaterThanOrEqual(2);
  expect(R.dntMissing("uk", "Monte Carlo and EPA AgSTAR", "Монте-Карло та EPA AgSTAR")).toEqual(["Monte Carlo"]);
  expect(R.unitsMissing("uk", "{v} kWh, 5 t", "{v} кВт·год, 5 т")).toEqual([]);
  expect(R.unitsMissing("de", "{v} MWh", "{v} Megawattstunden")).toEqual(["MWh"]);
  expect(R.icuIssues("{n, plural, one {a} other {b}}")).toEqual([]);
  expect(R.icuIssues("{n, plural, one {a}}").join()).toMatch(/other/);
  expect(R.icuIssues("{n, number, percent}").join()).toMatch(/unsupported/);
  expect(R.icuIssues("a } b").length).toBeGreaterThan(0);
  expect(R.pluralIssues("uk", "{n, plural, one{# a} other{# b}}").join()).toMatch(/needs few\/many/);
  expect(R.pluralIssues("de", "{n, plural, one{# a} few{# b} other{# c}}").join()).toMatch(/not a de plural category/);
  expect(R.pluralIssues("pl", "{n, plural, one{# a} few{# b} many{# c} other{# d}}")).toEqual([]);
  expect(R.icuIssues("Hello {name} and [accent]")).toEqual([]);
  expect(R.decimalIssues("de", "0.25–1 MW, 3.000 t")).toEqual(["0.25"]);
  expect(R.quoteIssues("pl", 'Wybierz "plan"')).toContain('straight quote "');
  expect(R.expansion("Zurückbleibende", "Save")).toBeGreaterThan(0.6);
  expect(R.sameAsEnglish("Payback period", "Payback period")).toBe(true);
  expect(R.sameAsEnglish("BMP, kWh", "BMP, kWh")).toBe(false);
});

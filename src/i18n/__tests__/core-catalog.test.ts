import { describe, expect, it } from "vitest";
import { CORE_LOCALES, getCoreCatalog, type Locale } from "..";
import { messageArgs } from "../message";
import { tr } from "@/core/i18n";
import { collectCoreKeys } from "./core-keys";
import { GLOSSARY } from "../glossary";
import * as R from "./qa-rules";
import { flattenMessage } from "../message";

/**
 * The model's own sentences (verdict reasons, warnings, line labels, report sheets) are authored in English and Ukrainian
 * beside the code; every other language in CORE_LOCALES is a catalog keyed by the English text. A locale is listed only
 * when its catalog is complete, so a language never mixes translated and English sentences in one report.
 */
const keys = collectCoreKeys();
const catalogLocales = CORE_LOCALES.filter((l) => l !== "en" && l !== "uk");

it("finds the English source texts in the code", () => {
  expect(keys.size).toBeGreaterThan(600);
  for (const k of keys.values()) expect(k.uk.length, `${k.en}: one Ukrainian text per English text`).toBe(1);
});

it("keeps the Ukrainian twin's placeholders identical to the English text", () => {
  for (const k of keys.values()) expect(messageArgs(k.uk[0]).sort(), k.en).toEqual(messageArgs(k.en).sort());
});

describe.each(catalogLocales)("core catalog %s", (locale) => {
  it("has exactly the English source texts, with the same {placeholders}", async () => {
    const catalog = (await getCoreCatalog(locale))!;
    expect(catalog, "catalog loads").toBeTruthy();
    expect(Object.keys(catalog).sort()).toEqual([...keys.keys()].sort());
    for (const [en, text] of Object.entries(catalog)) {
      expect(text.trim().length, `${locale}: empty ${en}`).toBeGreaterThan(0);
      expect(messageArgs(text).sort(), `${locale}: ${en}`).toEqual(messageArgs(en).sort());
    }
  });

  it("translates through tr() and falls back to English for an unknown text", async () => {
    await getCoreCatalog(locale);
    const T = tr(locale as Locale);
    expect(T("Insufficient data", "Недостатньо даних")).not.toBe("Insufficient data");
    expect(T("A sentence that is in no catalog", "—")).toBe("A sentence that is in no catalog");
    expect(T("Base NPV positive (€{npvBase}), payback ≈ {pb}.", "—", { npvBase: "1 000", pb: "5 yrs" })).toMatch(/1\s?000/);
  });
});


/** The same machine QA as for the interface (`qa.test.ts`), applied to the model sentences: hard checks, no ratchet. */
describe.each(catalogLocales)("core catalog QA %s", (locale) => {
  const g = GLOSSARY[locale as Locale];
  const entries = async () => Object.entries((await getCoreCatalog(locale))!);
  const bad = (found: string[]) => `${found.length} finding(s):\n  ${found.slice(0, 10).join("\n  ")}`;
  const scan = async (rule: (en: string, text: string) => string[]) =>
    (await entries()).flatMap(([en, text]) => rule(flattenMessage(en), flattenMessage(text)).map((m) => `${en.slice(0, 50)} → ${m}`));

  it("uses glossary terms, keeps DO-NOT-TRANSLATE tokens and SI units", async () => {
    const found = await scan((en, text) => [
      ...R.forbiddenHits(locale as Locale, text).map((h) => `"${h.stem}…" → use ${h.use}`),
      ...R.dntMissing(locale as Locale, en, text).map((m) => `lost ${m}`),
      ...R.unitsMissing(locale as Locale, en, text).map((m) => `unit ${m} replaced`),
      ...R.abbreviationDrift(locale as Locale, text).map((m) => `${m} without ${g.terms[m.toLowerCase() as "npv" | "irr" | "chp" | "cod"]}`),
    ]);
    expect(found, bad(found)).toEqual([]);
  });

  it("uses the locale's script, quotes, decimal mark and form of address, with no invisible characters", async () => {
    const found = await scan((en, text) => [
      ...R.scriptIssues(locale as Locale, text), ...R.invisibleIssues(locale as Locale, text, en),
      ...R.quoteIssues(locale as Locale, text), ...R.decimalIssues(locale as Locale, text).map((d) => `decimal point in ${d}`), ...R.addressIssues(locale as Locale, text),
    ]);
    expect(found, bad(found)).toEqual([]);
  });

  it("is translated, not copied from English", async () => {
    const all = await entries();
    const same = all.filter(([en, text]) => R.sameAsEnglish(flattenMessage(text), flattenMessage(en)));
    expect(same.length / all.length, `identical to English: ${same.slice(0, 8).map(([en]) => en).join(" | ")}`).toBeLessThan(0.05);
  });
});

it("lists catalog locales only when a catalog loads", async () => {
  for (const l of CORE_LOCALES) {
    if (l === "en" || l === "uk") expect(await getCoreCatalog(l)).toBeUndefined();
    else expect(await getCoreCatalog(l), l).toBeTruthy();
  }
});

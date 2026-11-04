import { beforeAll, describe, expect, it } from "vitest";
import { CORE_LOCALES, type Locale } from "..";
import { getCoreCatalog } from "..";
import { FIXED_TERMS } from "../glossary";
import { flattenMessage } from "../message";
import { loadCorpus } from "./qa-corpus";

/** Terms fixed without a native (`FIXED_TERMS`) stay in use, and their rejected variants never come back. */
const texts = {} as Record<Locale, string[]>;
const locales = Object.keys(FIXED_TERMS) as Locale[];
const stemRe = (stem: string) => new RegExp(`(?<![\\p{L}])${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "iu");

beforeAll(async () => {
  const corpus = await loadCorpus();
  for (const l of locales) {
    const core = CORE_LOCALES.includes(l) ? Object.values((await getCoreCatalog(l)) ?? {}) : [];
    texts[l] = [...corpus.byLocale[l].map((e) => e.text), ...core].map((t) => flattenMessage(t));
  }
});

describe.each(locales)("fixed terms %s", (locale) => {
  it("uses every approved term", () => {
    const missing = FIXED_TERMS[locale]!.filter((t) => t.term && !texts[locale].some((s) => s.toLowerCase().includes(t.term.toLowerCase())));
    expect(missing.map((t) => `${t.concept}: "${t.term}"`)).toEqual([]);
  });

  it("never uses a rejected variant", () => {
    const hits = FIXED_TERMS[locale]!.flatMap((t) =>
      (t.rejected ?? []).flatMap((stem) => texts[locale].filter((s) => stemRe(stem).test(s)).map((s) => `${t.concept}: "${stem}" in "${s.slice(0, 80)}"`)),
    );
    expect(hits).toEqual([]);
  });
});

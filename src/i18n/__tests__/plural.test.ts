import { describe, expect, it } from "vitest";
import { fmt, INTL_TAG, LOCALES, type Locale } from "..";
import { flattenMessage, formatMessage, messageArgs, parseMessage } from "../message";
import { offerCopy } from "../offer";

/** Counts shown to the reader: zero, one, two, five, twenty-one (Slavic/Baltic/Romanian edge) and a decimal. */
const NS = [0, 1, 2, 5, 21, 1.5] as const;

describe("message format", () => {
  const T = "en-GB";

  it("keeps plain {name} interpolation unchanged", () => {
    expect(formatMessage("{v} kW", { v: 1.5 }, "de-DE")).toBe("1,5 kW"); // fractions get the locale decimal mark
    expect(formatMessage("{v} kW", { v: 12345 }, "de-DE")).toBe("12345 kW"); // integers print as passed
    expect(formatMessage("Step {n} of {total}: {name}", { n: 2, total: 5, name: "Feed" }, T)).toBe("Step 2 of 5: Feed");
    expect(formatMessage("{a} and {missing}", { a: 1 }, T)).toBe("1 and {missing}");
    expect(fmt("Hello {name}", { name: "x" })).toBe("Hello x");
    expect(fmt("no placeholders")).toBe("no placeholders");
    expect(formatMessage("od’ємний [accent] {v} 100%", { v: "5" }, T)).toBe("od’ємний [accent] 5 100%");
  });

  it("selects plural branches, exact =N matches and formats # with Intl", () => {
    const m = "{n, plural, =0{none} one{# item} other{# items}}";
    expect(formatMessage(m, { n: 0 }, T)).toBe("none");
    expect(formatMessage(m, { n: 1 }, T)).toBe("1 item");
    expect(formatMessage(m, { n: 1234.5 }, T)).toBe("1,234.5 items");
    expect(formatMessage(m, { n: 1234.5 }, "de-DE")).toBe("1.234,5 items");
    expect(formatMessage(m, { n: "2" }, T)).toBe("2 items");
  });

  it("falls back to other when the locale category is not written, and supports select, nesting and several arguments", () => {
    expect(formatMessage("{n, plural, one{# a} other{# b}}", { n: 1_000_000 }, "fr-FR")).toBe("1 000 000 b");
    expect(formatMessage("{g, select, f{She} m{He} other{They}} has {n, plural, one{# cat} other{# cats}} in {place}", { g: "f", n: 3, place: "Kyiv" }, T)).toBe("She has 3 cats in Kyiv");
    expect(formatMessage("{g, select, f{She} other{They}}", { g: "x" }, T)).toBe("They");
    expect(formatMessage("{n, plural, one{{who} has # cat} other{{who} has # cats}}", { n: 1, who: "Ann" }, T)).toBe("Ann has 1 cat");
    expect(formatMessage("{n, plural, one{# a} other{# b}}", {}, T)).toBe("{n}");
  });

  it("uses the decimal branch only for non-integers", () => {
    const m = "{n, plural, one{# a} few{# b} decimal{# c} other{# d}}";
    expect(formatMessage(m, { n: 1.5 }, "sr-Latn-RS")).toBe("1,5 c");
    expect(formatMessage(m, { n: 5 }, "sr-Latn-RS")).toBe("5 d");
  });

  it("reports malformed messages and still renders them as plain text", () => {
    for (const bad of ["{n, plural, one{# a}}", "{n, plural, one{# a other{b}}", "{n, foo, other{x}}", "a } b", "{ }"]) {
      expect(() => parseMessage(bad), bad).toThrow();
    }
    expect(formatMessage("{n, plural, one{# a}} {x}", { n: 1, x: "y" }, T)).toBe("{n, plural, one{# a}} y");
    expect(messageArgs("{n, plural, one{{who} #} other{# {place}}}")).toEqual(["n", "place", "who"]);
    expect(flattenMessage("{n, plural, one{# check} other{# checks}} first")).toBe("{n} checks first");
  });
});

/**
 * Noun phrase that must follow the number in `tChecks` / `tSizes` for n = 0, 1, 2, 5, 21, 1.5 (CLDR categories, hand-checked).
 * Languages whose noun does not change after a numeral (hu, tr, vi, th, da) list the same form six times on purpose.
 */
const CHECKS: Record<Locale, string[]> = {
  en: ["checks", "check", "checks", "checks", "checks", "checks"],
  uk: ["перевірок", "перевірка", "перевірки", "перевірок", "перевірка", "перевірки"],
  pl: ["rzeczy", "rzecz", "rzeczy", "rzeczy", "rzeczy", "rzeczy"],
  de: ["Punkte", "Punkt", "Punkte", "Punkte", "Punkte", "Punkte"],
  fr: ["point à vérifier", "point à vérifier", "points à vérifier", "points à vérifier", "points à vérifier", "point à vérifier"],
  it: ["verifiche", "verifica", "verifiche", "verifiche", "verifiche", "verifiche"],
  es: ["comprobaciones prioritarias", "comprobación prioritaria", "comprobaciones prioritarias", "comprobaciones prioritarias", "comprobaciones prioritarias", "comprobaciones prioritarias"],
  pt: ["verificação prioritária", "verificação prioritária", "verificações prioritárias", "verificações prioritárias", "verificações prioritárias", "verificação prioritária"],
  nl: ["punten", "punt", "punten", "punten", "punten", "punten"],
  cs: ["bodů", "bod", "body", "bodů", "bodů", "bodu"],
  sk: ["bodov", "bod", "body", "bodov", "bodov", "bodu"],
  hu: Array(6).fill("elsőként ellenőrizendő pont"),
  ro: ["verificări", "verificare", "verificări", "verificări", "de verificări", "verificări"],
  bg: ["проверки", "проверка", "проверки", "проверки", "проверки", "проверки"],
  sr: ["provera", "provera", "provere", "provera", "provera", "provere"],
  el: ["έλεγχοι", "έλεγχος", "έλεγχοι", "έλεγχοι", "έλεγχοι", "έλεγχοι"],
  tr: Array(6).fill("kontrol"),
  lt: ["patikrų", "patikra", "patikros", "patikros", "patikra", "patikros"],
  lv: ["pārbaužu", "pārbaude", "pārbaudes", "pārbaudes", "pārbaude", "pārbaudes"],
  et: ["kontrolli", "kontroll", "kontrolli", "kontrolli", "kontrolli", "kontrolli"],
  da: Array(6).fill("ting"),
  sv: ["saker", "sak", "saker", "saker", "saker", "saker"],
  fi: ["tarkistettavaa asiaa", "tarkistettava asia", "tarkistettavaa asiaa", "tarkistettavaa asiaa", "tarkistettavaa asiaa", "tarkistettavaa asiaa"],
  vi: Array(6).fill("điểm cần kiểm tra trước"),
  th: Array(6).fill("รายการที่ควรตรวจก่อน"),
};

/** Genitive after “comparison of N …”, the case where Slavic, Baltic and Romanian forms differ most. */
const SIZES: Partial<Record<Locale, string[]>> = {
  uk: ["розмірів", "розміру", "розмірів", "розмірів", "розміру", "розміру"],
  cs: ["velikostí", "velikosti", "velikostí", "velikostí", "velikostí", "velikosti"],
  sk: ["veľkostí", "veľkosti", "veľkostí", "veľkostí", "veľkostí", "veľkosti"],
  sr: ["veličina", "veličine", "veličine", "veličina", "veličine", "veličine"],
  lt: ["jėgainės dydžių", "jėgainės dydžio", "jėgainės dydžių", "jėgainės dydžių", "jėgainės dydžio", "jėgainės dydžio"],
  lv: ["stacijas izmēru", "stacijas izmērs", "stacijas izmēri", "stacijas izmēri", "stacijas izmērs", "stacijas izmēri"],
  ro: ["dimensiuni", "dimensiune", "dimensiuni", "dimensiuni", "de dimensiuni", "dimensiuni"],
  de: ["Anlagengrößen", "Anlagengröße", "Anlagengrößen", "Anlagengrößen", "Anlagengrößen", "Anlagengrößen"],
  fr: ["taille", "taille", "tailles", "tailles", "tailles", "taille"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const num = (locale: Locale, n: number) => new Intl.NumberFormat(INTL_TAG[locale]).format(n);
/** The number, one space, the noun phrase, and then a word boundary (so "kontroll" cannot pass for "kontrolli"). */
const phrase = (locale: Locale, n: number, noun: string) => new RegExp(`(^|[\\s(])${escape(num(locale, n))} ${escape(noun)}(?=[\\s,)]|$)`);

describe.each(LOCALES)("plural forms %s", (locale) => {
  it.each(NS.map((n, i) => [n, i] as const))("tChecks with n = %s", (n, i) => {
    const message = offerCopy[locale].tChecks;
    const text = fmt(message, { n }, locale);
    expect(text, text).toMatch(phrase(locale, n, CHECKS[locale][i]));
    expect(text).not.toMatch(/[{}#]|undefined/);
  });

  const sizes = SIZES[locale];
  if (sizes) {
    it.each(NS.map((n, i) => [n, i] as const))("tSizes with n = %s", (n, i) => {
      const message = offerCopy[locale].tSizes;
      const text = fmt(message, { n }, locale);
      expect(text, text).toMatch(phrase(locale, n, sizes[i]));
    });
  }

  it("renders every counted offer line for typical and edge counts without leftovers", () => {
    const o = offerCopy[locale];
    for (const key of ["tChecks", "tLines", "tSizes", "tMc", "tRegister", "tStress", "tSupport"] as const) {
      for (const n of [0, 1, 2, 3, 4, 5, 11, 12, 21, 22, 100, 101, 111, 160, 1.5]) {
        const text = fmt(o[key], { n, country: "X" }, locale);
        expect(text, `${key} n=${n}`).not.toMatch(/[{}]|#|undefined|NaN/);
        expect(text, `${key} n=${n}`).toContain(num(locale, n));
      }
    }
  });
});

describe("offer strings stay consistent across locales", () => {
  it("uses the same arguments as English in every counted string", () => {
    for (const locale of LOCALES) {
      for (const key of ["tChecks", "tLines", "tSizes", "tMc", "tRegister", "tStress", "tSupport"] as const) {
        expect(messageArgs(offerCopy[locale][key]), `${locale}.${key}`).toEqual(messageArgs(offerCopy.en[key]));
      }
    }
  });
});

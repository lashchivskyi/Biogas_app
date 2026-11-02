import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../dict/en";
import { messageArgs } from "../message";
import { fmt } from "..";
import { PSEUDO_CLOSE, PSEUDO_OPEN, pseudo, pseudoDeep } from "./pseudo";

vi.mock("@/i18n/dict/en", async (orig) => {
  const mod = await orig<typeof import("../dict/en")>();
  const { pseudoDeep: deep } = await import("./pseudo");
  return { ...mod, default: deep(mod.default) };
});
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, toString: () => "" }) }));

const leaves = (o: unknown): string[] => (typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(leaves) : []);

describe("pseudo-localisation helper", () => {
  it("keeps placeholders, ICU blocks and accent markers, adds ≥ 40 % length and diacritics", () => {
    const src = "Your {site} report has {n, plural, one{# check} other{# checks}} for [accent]biogas[/accent]";
    const p = pseudo(src);
    expect(messageArgs(p)).toEqual(messageArgs(src));
    expect(p).toContain("{n, plural, one{# check} other{# checks}}");
    expect(p).toContain("[accent]");
    expect(p.startsWith(PSEUDO_OPEN) && p.endsWith(PSEUDO_CLOSE)).toBe(true);
    expect([...p].length).toBeGreaterThanOrEqual(src.length * 1.4);
    expect(p).toMatch(/[áéíöüý]/);
    expect(fmt(p, { site: "X", n: 2 })).not.toContain("{");
  });

  it("leaves numbers, symbols and units alone", () => {
    for (const s of ["12", "m³", "—", "{v} MWh"]) expect(pseudo(s)).toBe(s);
  });
});

describe("pages rendered from the pseudo-localised English dictionary", () => {
  it("every dictionary string survives the transform with identical placeholders", () => {
    for (const s of leaves(en)) {
      const p = pseudoDeep(s);
      expect(messageArgs(p), s).toEqual(messageArgs(s));
    }
  });

  it("render without errors with 40 % longer, accented text (hard-coded JSX text is caught by the react/jsx-no-literals lint rule)", async () => {
    const [{ default: Home }, { default: Pricing }, { default: Terms }, { default: NotFound }, { LocaleProvider }] = await Promise.all([
      import("@/app/[lang]/page"), import("@/app/[lang]/pricing/page"), import("@/app/[lang]/terms/page"), import("@/app/[lang]/not-found"), import("@/components/LocaleProvider"),
    ]);
    const params = Promise.resolve({ lang: "en" });
    const wrap = (node: React.ReactNode) => createElement(LocaleProvider, { locale: "en", markets: {}, usd: { value: 1, date: "2026-01-01" }, children: node } as never);
    const pages = {
      home: wrap(await Home({ params } as never)),
      pricing: wrap(await Pricing({ params, searchParams: Promise.resolve({}) } as never)),
      terms: wrap(await Terms({ params } as never)),
      notFound: wrap(createElement(NotFound)),
    };
    for (const [name, node] of Object.entries(pages)) {
      const html = renderToStaticMarkup(node);
      if (name === "notFound") continue; // reads errorCopy (src/i18n/errors.ts), not the dictionary
      expect(html, name).toContain(PSEUDO_OPEN);
      expect(html, name).not.toMatch(/undefined|NaN|\[object/);
    }
  }, 60_000);
});

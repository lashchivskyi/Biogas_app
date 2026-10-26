import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import en from "@/i18n/dict/en";
import { ResultView, type ResultViewProps } from "../ResultView";

const input = EXAMPLES.find((e) => e.id === "de_food_30k")!.input;
const a = assess(input, getCountry(input.countryCode));
const render = (access: ResultViewProps["access"]) => renderToStaticMarkup(createElement(ResultView, {
  a, d: en, locale: "en", currency: "EUR", access, methodologyHref: "/en/methodology",
}));
const titles = (html: string) => [...html.matchAll(/<(h[23]|summary)\b[^>]*>([\s\S]*?)<\/\1>/g)]
  .map((m) => m[2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s*\+$/, "").trim());

describe("paid report contents", () => {
  it("includes the base economics and technical details in the standard report", () => {
    const html = render("standard");
    const headings = titles(html);
    expect(html).toContain(en.result.rowEbitda);
    expect(html).toContain(en.result.rowDscr);
    expect(headings).toContain(en.result.dMoney);
    expect(headings).toContain(en.result.dTech);
    expect(headings).toContain(en.result.dSafety);
    expect(headings).not.toContain(en.result.scenariosTitle);
    expect(headings).not.toContain(en.result.routesTitle);
    expect(headings).not.toContain(en.result.sensTitle);
    expect(headings).not.toContain(en.result.supportTitle);
  });

  it("adds scenario, route, stress and support comparisons in the extended report", () => {
    const html = render("full");
    for (const title of [en.result.scenariosTitle, en.result.routesTitle, en.result.sensTitle, en.result.supportTitle, en.result.dMoney]) {
      expect(titles(html)).toContain(title);
    }
  });

  it("keeps paid detail out of the free result", () => {
    const html = render("free");
    expect(html).toContain(en.result.lockedTitle);
    expect(titles(html)).not.toContain(en.result.dMoney);
    expect(titles(html)).not.toContain(en.result.scenariosTitle);
    expect(titles(html)).not.toContain(en.result.sensTitle);
  });
});

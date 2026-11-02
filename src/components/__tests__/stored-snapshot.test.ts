import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { advise, assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import en from "@/i18n/dict/en";
import { ResultView } from "../ResultView";

/**
 * A paid report is the snapshot saved at checkout (JSON in the database), rendered by the CURRENT code.
 * A snapshot written by an older model lacks fields added later, so every optional field must be
 * optional for the renderer too; otherwise a model release breaks reports that were already sold.
 */
const example = EXAMPLES.find((e) => e.id === "de_starch")!;
const assessed = assess(example.input, getCountry(example.input.countryCode), { asOfDate: "2026-11-01" });
// A report sold since 2026-11-02 also stores its action plan (`advice`, computed at checkout with break-even values).
const fresh = { ...assessed, advice: advise(assessed, getCountry(example.input.countryCode), { thresholds: true }) };
const stored = JSON.parse(JSON.stringify(fresh)) as Record<string, unknown>;
const render = (a: unknown, access: "standard" | "full") => renderToStaticMarkup(createElement(ResultView, {
  a: a as typeof fresh, d: en, locale: "en", currency: "EUR", access, methodologyHref: "/en/methodology",
}));

describe("stored report snapshot", () => {
  it("survives JSON storage unchanged (no NaN/Infinity/undefined that change on a round trip)", () => {
    expect(JSON.parse(JSON.stringify(stored))).toEqual(stored);
    expect(render(stored, "full")).toBe(render(fresh, "full"));
  });

  it("is deterministic: the same input and date give the same snapshot", () => {
    const again = assess(example.input, getCountry(example.input.countryCode), { asOfDate: "2026-11-01" });
    expect(JSON.stringify({ ...again, advice: advise(again, getCountry(example.input.countryCode), { thresholds: true }) })).toBe(JSON.stringify(fresh));
  });

  // Optional in the Assessment type (core/types.ts): added over time, so absent in older snapshots.
  const optional = ["dataAudit", "parameterSensitivity", "marketEvidence", "financialsAvailable", "quoteCheck", "ghg", "measureFirst", "monteCarlo", "scale", "advice"];
  for (const access of ["standard", "full"] as const) {
    it.each(optional)(`${access} report still renders when an older snapshot lacks "%s"`, (key) => {
      const old = { ...stored };
      delete old[key];
      expect(() => render(old, access)).not.toThrow();
    });
  }
});

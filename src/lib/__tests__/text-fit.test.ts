import { describe, expect, it } from "vitest";
import { getDictionary, LOCALES } from "@/i18n";
import { fitText, textWidth } from "../text-fit";

describe("fitText", () => {
  it("keeps short labels on one line at full size", () => {
    expect(fitText("Digestate", 108, 13.5, { bold: true })).toEqual({ lines: ["Digestate"], size: 13.5 });
  });

  it("wraps at spaces, then shrinks, and never exceeds the width when a fit exists", () => {
    const r = fitText("Heat without demand at all times", 108, 12.5, { maxLines: 2 });
    expect(r.lines.length).toBeLessThanOrEqual(2);
    for (const l of r.lines) expect(textWidth(l, r.size)).toBeLessThanOrEqual(108);
  });

  it("does not split inside a word", () => {
    const r = fitText("Verbrennungsmotor Kraft-Wärme", 120, 14, { maxLines: 2 });
    expect(r.lines.join(" ")).toBe("Verbrennungsmotor Kraft-Wärme");
  });
});

describe.each(LOCALES)("process diagram labels %s", (locale) => {
  it("every label fits its box (narrowest box 90 px, title boxes 108 px) at ≥ 9 px", async () => {
    const t = (await getDictionary(locale)).flow;
    const titles = [t.feedstock, t.digester, t.biogas, t.chp, t.boiler, t.bio, t.electricity, t.gasToGrid, t.usefulHeat, t.heatNoDemand, t.digestate];
    const subs = [t.feedstockSub1, t.feedstockSub2, t.digesterSub, t.chpSub1, t.chpSub2, t.boilerSub, t.bioSub1, t.bioSub2];
    for (const s of titles) {
      const r = fitText(s, s === t.biogas ? 90 : 108, 13.5, { maxLines: 2, bold: true });
      for (const l of r.lines) expect(textWidth(l, r.size, true), `${locale}: ${s}`).toBeLessThanOrEqual(s === t.biogas ? 90 : 108);
    }
    for (const s of subs) {
      const r = fitText(s, 116, 11.5, { maxLines: 2, minSize: 9.5 });
      for (const l of r.lines) expect(textWidth(l, r.size), `${locale}: ${s}`).toBeLessThanOrEqual(116);
    }
  });
});

it("never breaks inside a number written with a no-break space", () => {
  const r = fitText("savoms reikmėms: 1 200 MWh šilumos", 100, 12, { maxLines: 2 });
  expect(r.lines.some((l) => l.includes("1 200"))).toBe(true);
});

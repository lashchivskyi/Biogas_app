import { describe, expect, it } from "vitest";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { evidenceRequest } from "../evidence";

describe("evidence requests for what to verify first", () => {
  const cases = EXAMPLES.filter((e) => !e.input.process).slice(0, 10).map((e) => ({ id: e.id, a: assess(e.input, getCountry(e.input.countryCode)) }));

  it("gives steps and a target field for every listed check", () => {
    for (const { id, a } of cases) for (const m of a.measureFirst!) {
      const ev = evidenceRequest(a, m, "en");
      expect(ev, `${id} ${m.kind}`).toBeDefined();
      expect(ev!.steps.length, `${id} ${m.kind}`).toBeGreaterThan(0);
      expect(ev!.enterIn.length).toBeGreaterThan(0);
    }
  });

  it("pre-fills a supplier request with the screening design basis", () => {
    const { a } = cases.find((c) => c.a.measureFirst!.some((m) => m.kind === "capex"))!;
    const req = evidenceRequest(a, a.measureFirst!.find((m) => m.kind === "capex")!, "uk")!.request!;
    const nm3h = Math.round(Number(a.routesBase[a.bestRoute].energy.rawBiogasDesignNm3PerHour.toPrecision(2)));
    expect(req).toContain(String(nm3h).replace(/\B(?=(\d{3})+(?!\d))/g, " "));
    expect(req).toMatch(/Запит/);
    expect(req).not.toMatch(/NaN|undefined/);
  });
});

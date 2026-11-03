import { describe, expect, it } from "vitest";
import { accuracySummary } from "../../../scripts/accuracy-references";
import { capexReferenceRows } from "../../../scripts/capex-references";
import summary from "../data/accuracy-summary.json";

describe("accuracy summary on /methodology", () => {
  it("matches the current model (rerun `npx tsx scripts/accuracy.ts --write` after model or reference changes)", () => {
    const capex = capexReferenceRows().filter((r) => r.counted).map((r) => r.modelEur / r.publishedEur);
    expect(accuracySummary(capex).sets).toEqual(summary.sets);
  }, 180_000); // ≈ 400 full assessments plus CAPEX sizing by bisection

  it("states n, the distribution and a source for every set", () => {
    for (const s of summary.sets) {
      expect(s.n).toBeGreaterThan(0);
      expect(s.bins.reduce((a, b) => a + b, 0)).toBe(s.n);
      expect(s.p10).toBeLessThanOrEqual(s.median);
      expect(s.median).toBeLessThanOrEqual(s.p90);
      expect(s.source.length).toBeGreaterThan(5);
    }
  });
});

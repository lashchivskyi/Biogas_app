import { describe, expect, it } from "vitest";
import { BACKTEST, runAgstarBacktest } from "../backtest";
import agstar from "../data/agstar-backtest.json";

describe("AgSTAR production back-test", () => {
  it("the published summary matches the current model (rerun `npx tsx scripts/backtest.ts --write` after model changes)", () => {
    const { rows, ...summary } = runAgstarBacktest();
    expect(rows.length).toBe(agstar.rows.length);
    expect(summary).toEqual(BACKTEST);
  }, 30_000); // 161 full assessments; slow under a parallel run

  it("keeps US dairy electricity close to what operating digesters report", () => {
    // Before the NRCS/ASAE excretion values the model gave about half (median 0.53).
    expect(BACKTEST.electricity.n).toBeGreaterThanOrEqual(50);
    expect(BACKTEST.electricity.median).toBeGreaterThan(0.8);
    expect(BACKTEST.electricity.median).toBeLessThan(1.25);
  });
});

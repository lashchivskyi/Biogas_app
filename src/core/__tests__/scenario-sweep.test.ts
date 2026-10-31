import { describe, expect, it, vi } from "vitest";
import { inputSchema } from "@/server/validate";
import { COUNTRIES } from "@/countries";
import { climateRegions, DATA_LEVELS, matrix, physicalViolations, run, SEGMENTS, type MatrixCell } from "./scenario-matrix";

/**
 * MECE sweep: segment × size × feedstock mix × data completeness × country × climate (route is evaluated inside every assessment).
 * Default run (~30 s): every country × segment at medium size, plus all mixes at the extreme sizes in three climates/currencies.
 * MATRIX=full runs every cell (≈ 13 500 assessments, ≈ 8 min).
 */
vi.setConfig({ testTimeout: 900_000 });
const FULL = process.env.MATRIX === "full";
const codes = Object.keys(COUNTRIES);

function sweep(cells: Iterable<MatrixCell>) {
  const failures: string[] = []; let n = 0;
  for (const c of cells) {
    n++;
    const label = `${c.country}/${c.regionId}/${c.segment}/${c.mix}/${c.size}/${c.data}`;
    const parsed = inputSchema.safeParse(c.input);
    if (!parsed.success) { failures.push(`${label}: generator produced an input the server rejects (${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message})`); continue; }
    const r = run(c.input);
    if (!r.ok) { failures.push(`${label}: threw "${r.error}"`); continue; }
    for (const v of physicalViolations(r.a)) failures.push(`${label}: ${v}`);
    if (!r.a.verdict.id || !r.a.verdict.reasons.length) failures.push(`${label}: verdict has no id or reasons`);
  }
  return { n, failures };
}

describe("scenario sweep", () => {
  it("covers every segment, climate and country the product sells", () => {
    expect(SEGMENTS).toHaveLength(7);
    expect(codes.length).toBeGreaterThanOrEqual(33);
    for (const c of codes) expect(climateRegions(c).length).toBeGreaterThan(0);
  });

  it("every country × segment at medium size, both data levels: no throw, no NaN/Infinity, balances close", () => {
    const { n, failures } = sweep(matrix({ sizes: ["medium"], data: DATA_LEVELS, firstClimateOnly: true, firstMixOnly: true }));
    expect(n).toBeGreaterThan(400);
    expect(failures.slice(0, 20)).toEqual([]);
  });

  it("extreme sizes (tiny, giant) in a cold, a temperate and a tropical country", () => {
    const { n, failures } = sweep(matrix({ countries: ["UA", "DE", "TH"], sizes: ["tiny", "giant"] }));
    expect(n).toBeGreaterThan(100);
    expect(failures.slice(0, 20)).toEqual([]);
  });

  it.runIf(FULL)("every cell of the matrix", () => {
    const { failures } = sweep(matrix());
    expect(failures.slice(0, 20)).toEqual([]);
  });
});

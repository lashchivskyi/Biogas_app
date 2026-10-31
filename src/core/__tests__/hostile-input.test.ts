import { describe, expect, it, vi } from "vitest";
import { EXAMPLES } from "../examples";
import { processSchema } from "../processes";
import { inputSchema } from "@/server/validate";
import { assess } from "../assess";
import { getCountry } from "@/countries";
import { nonFinitePaths, run } from "./scenario-matrix";

/**
 * Absurd, zero, negative, non-finite and enormous values in every numeric field of reference projects of each kind.
 * Contract: the server schema rejects nonsense without crashing; whatever it accepts assesses to a finite, physical result;
 * assess() itself never turns a non-finite input into silent NaN output.
 */
vi.setConfig({ testTimeout: 300_000 });
const HOSTILE = [0, -1, -1e9, NaN, Infinity, -Infinity, 1e300, 1e15, 1e-300, 0.5];
const CASES = ["dairy_400", "slaughter_5000", "us_closed_landfill", "de_existing_biogas", "ca_brewery_cod", "se_ras_sludge"];

const numericPaths = (o: unknown, p: string[] = [], out: string[][] = []): string[][] => {
  if (typeof o === "number") out.push(p);
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) numericPaths(v, [...p, k], out);
  return out;
};
function withValue<T>(o: T, path: string[], v: number): T {
  const c = structuredClone(o) as Record<string, unknown>;
  let t = c;
  for (const k of path.slice(0, -1)) t = t[k] as Record<string, unknown>;
  t[path[path.length - 1]] = v;
  return c as T;
}

describe("hostile numeric input", () => {
  for (const id of CASES) it(`${id}: every numeric field × ${HOSTILE.length} hostile values`, () => {
    const base = EXAMPLES.find((e) => e.id === id)!.input;
    const problems: string[] = [];
    for (const path of numericPaths(base)) for (const v of HOSTILE) {
      const input = withValue(base, path, v);
      const key = `${path.join(".")}=${v}`;
      let accepted = false;
      try { accepted = inputSchema.safeParse(input).success; } catch (e) { problems.push(`${key}: schema crashed (${e instanceof Error ? e.message : e})`); continue; }
      if (!Number.isFinite(v)) {
        if (accepted) problems.push(`${key}: schema accepted a non-finite number`);
        let out: ReturnType<typeof assess> | undefined;
        try { out = assess(input, getCountry(input.countryCode), { uncertainty: false }); } catch { /* refusing is the contract */ }
        if (out) problems.push(`${key}: assess returned a result for a non-finite input`);
        continue;
      }
      if (!accepted) continue;
      const r = run(input);
      if (!r.ok) problems.push(`${key}: schema-accepted input threw "${r.error}"`);
      else if (nonFinitePaths(r.a).length) problems.push(`${key}: non-finite result ${nonFinitePaths(r.a)[0]}`);
    }
    expect(problems.slice(0, 20)).toEqual([]);
  });

  it("the process schema reports an impossible calendar instead of crashing", () => {
    const process = EXAMPLES.find((e) => e.id === "us_closed_landfill")!.input.process!;
    for (const monthsActive of [1e300, NaN, Infinity, -3, 0, 2.5, 13]) expect(() => processSchema.safeParse({ ...process, monthsActive })).not.toThrow();
    for (const startMonth of [1e300, NaN, 0, 13]) expect(processSchema.safeParse({ ...process, startMonth }).success).toBe(false);
  });
});

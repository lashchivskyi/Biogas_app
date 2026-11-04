import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Project memory stays small and decision-only (AGENTS › Project memory; DECISIONS 2026-11-04). */
const DOCS = path.resolve(import.meta.dirname, "../../docs");
const ALLOWED = ["ai/DATA-SOURCES.md", "ai/DECISIONS.md", "ai/PRODUCT.md", "ai/STATUS.md", "legal/LAWYER-BRIEF.md"];
const MAX_LINES: Record<string, number> = { STATUS: 40, DECISIONS: 220, PRODUCT: 190, "DATA-SOURCES": 130 };
const MAX_ENTRY_LINES = 4;

const lines = (name: string) => readFileSync(path.join(DOCS, "ai", `${name}.md`), "utf8").trimEnd().split(/\r?\n/);

function listFiles(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(path.join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
  );
}

describe("project docs", () => {
  it("contain only the allowed files (no reports or data dumps)", () => {
    expect(listFiles(DOCS).sort()).toEqual([...ALLOWED].sort());
  });

  it.each(Object.entries(MAX_LINES))("%s stays within %i lines", (name, max) => {
    expect(lines(name).length).toBeLessThanOrEqual(max);
  });

  it(`DECISIONS entries are at most ${MAX_ENTRY_LINES} lines`, () => {
    const long: string[] = [];
    let start = -1;
    const all = [...lines("DECISIONS"), ""];
    all.forEach((line, i) => {
      if (start >= 0 && !line.startsWith("  ")) {
        if (i - start > MAX_ENTRY_LINES) long.push(all[start].slice(0, 60));
        start = -1;
      }
      if (line.startsWith("- ")) start = i;
    });
    expect(long).toEqual([]);
  });
});

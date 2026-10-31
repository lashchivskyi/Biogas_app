import { describe, expect, it } from "vitest";
import { assess } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { getCountry } from "@/countries";
import { reportSheets } from "../report-export";
import { columnName, crc32, writeXlsx } from "../xlsx";

/** Reads a stored ZIP back through its central directory and checks every entry's CRC. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const out = new Map<string, string>();
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLen = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = dec.decode(bytes.subarray(at + 46, at + 46 + nameLen));
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const start = local + 30 + view.getUint16(local + 26, true);
    const data = bytes.subarray(start, start + size);
    expect(crc32(data), name).toBe(crc);
    out.set(name, dec.decode(data));
    at += 46 + nameLen;
  }
  return out;
}

describe("xlsx writer", () => {
  it("computes the standard CRC-32 and Excel column names", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect([0, 25, 26, 27, 701, 702].map(columnName)).toEqual(["A", "Z", "AA", "AB", "ZZ", "AAA"]);
  });

  it("writes a valid package with typed numbers and escaped text", () => {
    const files = unzip(writeXlsx([{ name: "Sum/mary: [1]", rows: [["Name", "Value"], ["A & <B>", 1.5], ["empty", null], ["bad", Number.NaN]] }]));
    expect([...files.keys()]).toEqual(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]);
    expect(files.get("xl/workbook.xml")).toContain('name="Sum mary   1"');
    const sheet = files.get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain('<c r="B2"><v>1.5</v></c>');
    expect(sheet).toContain("A &amp; &lt;B&gt;");
    expect(sheet).not.toContain("NaN");
  });
});

describe("report export", () => {
  const ex = EXAMPLES.find((e) => e.id === "de_nawaro")!.input;
  const a = assess(ex, getCountry(ex.countryCode));

  it("matches the report's numbers and keeps the plan split", () => {
    const standard = reportSheets(a, { currency: "EUR", access: "standard" });
    const full = reportSheets(a, { currency: "EUR", access: "full" });
    expect(standard.map((s) => s.name)).toEqual(["Summary", "Cash flow", "CAPEX and OPEX", "Assumptions", "Verify first", "Climate (RED)", "Plant size"]);
    expect(full.map((s) => s.name)).toEqual(["Summary", "Cash flow", "CAPEX and OPEX", "Assumptions", "Verify first", "Climate (RED)", "Plant size", "Routes", "Sensitivity", "Support cases"]);
    const flows = standard[1].rows.slice(1, a.scenarios.base.fin.cashFlows.length + 1).map((r) => r[1]);
    expect(flows).toEqual(a.scenarios.base.fin.cashFlows);
    expect(standard[0].rows.find((r) => r[0] === "NPV")?.[1]).toBe(a.scenarios.base.fin.npvEur);
    expect(standard[3].rows.length).toBeGreaterThan((a.marketEvidence ?? []).length);
    // Every sheet serialises without throwing.
    expect(writeXlsx(full).length).toBeGreaterThan(1000);
  });

  it("follows the model language", () => {
    const uk = assess({ ...ex, lang: "uk" }, getCountry(ex.countryCode));
    expect(reportSheets(uk, { currency: "EUR", access: "standard" })[0].name).toBe("Підсумок");
  });
});

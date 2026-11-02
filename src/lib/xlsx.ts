/**
 * Minimal XLSX writer: inline strings, numbers, column widths, bold first row. Stored (uncompressed) ZIP, no
 * dependencies, runs in the browser and in tests. Enough for an editable report export, not a general library.
 */
export type Cell = string | number | null | undefined;
export interface Sheet {
  name: string;
  rows: Cell[][];
  /** Column widths in characters. */
  widths?: number[];
  /**
   * Number format per row, parallel to `rows`: one code for every number in the row, or one per column. Codes are the
   * invariant Excel codes ("#,##0.00", "0.0%"), which Excel shows with the reader's own separators; "auto" picks the
   * decimals from the size of the value. A number without a format stays General.
   */
  formats?: (string | (string | undefined)[] | undefined)[];
  /** Rows shown in bold besides the first (section and table headings). */
  boldRows?: number[];
}

/** Decimals that keep a value readable without inventing precision: whole numbers grouped, small values to 3–4 places. */
export function autoFormat(v: number): string {
  const a = Math.abs(v);
  if (Number.isInteger(v)) return "#,##0";
  if (a >= 100) return "#,##0.0";
  if (a >= 1) return "#,##0.00";
  if (a >= 0.001) return "0.0000";
  return "0.00E+00";
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** ZIP archive with stored entries (method 0). */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, 0x21, true); // 1980-01-01
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, f.data);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, 0, true);
    dir.setUint16(12, 0, true);
    dir.setUint16(14, 0x21, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, f.data.length, true);
    dir.setUint32(24, f.data.length, true);
    dir.setUint16(28, name.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const dirSize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, dirSize, true);
  end.setUint32(16, offset, true);
  const parts = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  // Control characters other than tab and newlines are not allowed in XML 1.0.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

export function columnName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Excel sheet names: ≤ 31 characters, none of []:*?/\, unique. */
function sheetNames(sheets: Sheet[]): string[] {
  const used = new Set<string>();
  return sheets.map((s, i) => {
    let name = s.name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || `Sheet${i + 1}`;
    while (used.has(name.toLowerCase())) name = `${name.slice(0, 28)} ${i + 1}`;
    used.add(name.toLowerCase());
    return name;
  });
}

/** Cell styles: 0 plain, 1 bold; every other (number format, bold) pair gets its own entry. */
class Styles {
  private fmtIds = new Map<string, number>();
  private xfs: { fmt: string; bold: boolean }[] = [{ fmt: "", bold: false }, { fmt: "", bold: true }];
  index(fmt: string | undefined, bold: boolean): number {
    if (!fmt) return bold ? 1 : 0;
    if (!this.fmtIds.has(fmt)) this.fmtIds.set(fmt, 164 + this.fmtIds.size);
    let at = this.xfs.findIndex((x) => x.fmt === fmt && x.bold === bold);
    if (at < 0) at = this.xfs.push({ fmt, bold }) - 1;
    return at;
  }
  xml(): string {
    const numFmts = this.fmtIds.size ? `<numFmts count="${this.fmtIds.size}">${[...this.fmtIds].map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${esc(code)}"/>`).join("")}</numFmts>` : "";
    const xfs = this.xfs.map((x) => `<xf numFmtId="${x.fmt ? this.fmtIds.get(x.fmt) : 0}" fontId="${x.bold ? 1 : 0}" fillId="0" borderId="0" xfId="0"${x.fmt ? ' applyNumberFormat="1"' : ""}${x.bold ? ' applyFont="1"' : ""}/>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts}<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${xfs}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
}

function sheetXml(sheet: Sheet, styles: Styles): string {
  const cols = sheet.widths?.length ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const bold = new Set(sheet.boldRows ?? []);
  const rows = sheet.rows.map((row, r) => {
    const rowFormat = sheet.formats?.[r];
    const isBold = r === 0 || bold.has(r);
    const cells = row.map((v, c) => {
      const ref = `${columnName(c)}${r + 1}`;
      if (typeof v === "number") {
        if (!Number.isFinite(v)) return "";
        const code = Array.isArray(rowFormat) ? rowFormat[c] : rowFormat;
        const style = styles.index(code === "auto" ? autoFormat(v) : code, isBold);
        return `<c r="${ref}"${style ? ` s="${style}"` : ""}><v>${v}</v></c>`;
      }
      if (v === null || v === undefined || v === "") return "";
      const style = isBold ? 1 : 0;
      return `<c r="${ref}"${style ? ` s="${style}"` : ""} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

export function writeXlsx(sheets: Sheet[]): Uint8Array {
  const enc = new TextEncoder();
  const names = sheetNames(sheets);
  const styles = new Styles();
  const sheetXmls = sheets.map((sh) => sheetXml(sh, styles)); // before styles.xml: the sheets register their formats
  const files = [
    { name: "[Content_Types].xml", xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", xml: styles.xml() },
    ...sheetXmls.map((xml, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, xml })),
  ];
  return zipStore(files.map((f) => ({ name: f.name, data: enc.encode(f.xml) })));
}

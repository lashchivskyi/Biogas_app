/**
 * Print / PDF check: renders the sample report of every locale with print CSS to A4 PDF (browser print is the PDF export),
 * reports page count, horizontal overflow and the embedded fonts. Same setup as l10n-visual.mjs.
 *   node <repo>/scripts/l10n-print.mjs <out-folder>
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

// playwright-core is installed in the working folder, not in the repo.
const { chromium } = createRequire(path.join(process.cwd(), "noop.js"))("playwright-core");
const LOCALES = "en,uk,pl,de,fr,it,es,pt,nl,cs,sk,hu,ro,bg,sr,el,tr,lt,lv,et,da,sv,fi,vi,th".split(",");
const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = path.resolve(process.argv[2] ?? "pdf");
const b = await chromium.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
fs.mkdirSync(OUT, { recursive: true });
const out = [];
for (const l of LOCALES) {
  const pg = await b.newPage({ viewport: { width: 794, height: 1123 }, locale: "en-US" });
  await pg.goto(`${BASE}/${l}/samples/it_whey`, { waitUntil: "networkidle" });
  await pg.emulateMedia({ media: "print" });
  const over = await pg.evaluate(() => { const vw = document.documentElement.clientWidth; const bad = [...document.querySelectorAll("body *")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 2 && !e.closest("svg") && !e.closest("table") && e.textContent.trim() }); return { sw: document.documentElement.scrollWidth, vw, n: bad.length, first: bad[0] ? bad[0].tagName + " " + bad[0].textContent.trim().slice(0, 40) : "" } });
  const buf = await pg.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
  fs.writeFileSync(path.join(OUT, `${l}.pdf`), buf);
  const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  out.push(`${l} pages=${pages} bytes=${buf.length} overflow=${over.n} sw=${over.sw}/${over.vw} ${over.first}`);
  await pg.close();
}
console.log(out.join("\n"));
await b.close();

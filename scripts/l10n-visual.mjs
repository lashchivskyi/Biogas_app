/**
 * Visual layout check of every locale at 360 px and 1280 px: home, calculator, result, checkout, pricing, samples, report,
 * methodology, terms, 404. Reports page-wide horizontal scroll, text sticking out of the viewport, clipped text,
 * wrapped / overflowing buttons, SVG text outside its box, and the fonts actually used. Screenshots go to <out>.
 *
 *   mkdir %TEMP%\l10n-visual && cd %TEMP%\l10n-visual && npm i playwright-core     (outside the repo)
 *   npm run build && set APP_ENV=local&& set PAYMENTS_DEMO=1&& set STORAGE=json&& set PORT=3100&& npm start
 *   node <repo>/scripts/l10n-visual.mjs <out-folder> [comma-separated locales]
 *
 * Env: BASE (default http://localhost:3100), CHROME (path to chrome.exe / chromium; default Windows Chrome).
 * Not run in CI (needs a browser and a running server); run it after any change to UI text, fonts or layout.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

// playwright-core is installed in the working folder, not in the repo.
const { chromium } = createRequire(path.join(process.cwd(), "noop.js"))("playwright-core");

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = path.resolve(process.argv[2] ?? "out");
const LOCALES = (process.argv[3] ?? "en,uk,pl,de,fr,it,es,pt,nl,cs,sk,hu,ro,bg,sr,el,tr,lt,lv,et,da,sv,fi,vi,th").split(",");
const VIEWS = [{ w: 360, h: 800 }, { w: 1280, h: 800 }];
const SAMPLE = "it_whey";
fs.mkdirSync(OUT, { recursive: true });

/** Runs inside the page: collects layout defects. */
const probe = () => {
  const vw = document.documentElement.clientWidth;
  const issues = [];
  const visible = (el) => { if (el.closest(".sr-only")) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const desc = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/).slice(0, 3).join(".") : ""} "${(el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50)}"`;
  if (document.documentElement.scrollWidth > vw + 1) issues.push({ k: "page-hscroll", d: `scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });
  const all = [...document.querySelectorAll("body *")];
  for (const el of all) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    // clipped text: container hides overflow and content is larger than the box
    if ((s.overflowX !== "visible" || s.overflowY !== "visible") && el.children.length === 0 && el.textContent.trim()) {
      if (el.scrollWidth > el.clientWidth + 1 && s.overflowX !== "auto" && s.overflowX !== "scroll") issues.push({ k: "clipped-x", d: desc(el) });
      if (el.scrollHeight > el.clientHeight + 2 && s.overflowY !== "auto" && s.overflowY !== "scroll") issues.push({ k: "clipped-y", d: desc(el) });
    }
    if (s.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) issues.push({ k: "ellipsis", d: desc(el) });
    // element sticks out of the viewport horizontally (excluding scroll containers' children)
    if (r.right > vw + 2 || r.left < -2) {
      let p = el.parentElement, inScroll = false;
      while (p && p !== document.body) { const ps = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) { inScroll = true; break; } p = p.parentElement; }
      if (!inScroll && el.textContent.trim()) issues.push({ k: "outside-viewport", d: `${desc(el)} [${Math.round(r.left)}..${Math.round(r.right)}]` });
    }
    // buttons / links with very tall wrapped labels
    if (el.classList.contains("btn") && el.textContent.trim()) {
      const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.3;
      if (r.height > lh * 3.2) issues.push({ k: "button-wraps", d: `${desc(el)} h=${Math.round(r.height)}` });
      if (el.scrollWidth > el.clientWidth + 1) issues.push({ k: "button-overflow", d: desc(el) });
    }
    // very long unbroken words inside narrow columns
    if (el.children.length === 0 && el.textContent.trim() && r.width < 120 && r.width > 0) {
      const words = el.textContent.trim().split(/\s+/);
      if (words.some((w) => w.length > 14) && el.scrollWidth > el.clientWidth + 1) issues.push({ k: "long-word", d: desc(el) });
    }
  }
  // SVG diagrams: text outside its viewBox
  for (const svg of document.querySelectorAll("svg")) {
    if (!visible(svg)) continue;
    const vb = svg.viewBox?.baseVal;
    if (!vb || !vb.width) continue;
    for (const t of svg.querySelectorAll("text")) {
      let b; try { b = t.getBBox(); } catch { continue; }
      if (b.x < vb.x - 1 || b.x + b.width > vb.x + vb.width + 1) issues.push({ k: "svg-text-outside", d: `"${t.textContent.trim().slice(0, 40)}" bbox ${Math.round(b.x)}..${Math.round(b.x + b.width)} of ${vb.width}` });
    }
    // text wider than the rect it sits in (flow boxes)
    if (vb.width !== 980) continue;
    for (const g of svg.querySelectorAll("g")) {
      const rect = g.querySelector(":scope > rect"); const texts = g.querySelectorAll(":scope > text");
      if (!rect || !texts.length) continue;
      const rb = rect.getBBox();
      for (const t of texts) { const b = t.getBBox(); if (b.y < rb.y - 0.5 || b.y + b.height > rb.y + rb.height + 0.5) issues.push({ k: "svg-text-outside-box-y", d: `"${t.textContent.trim().slice(0, 40)}"` }); }
      for (const t of texts) { const b = t.getBBox(); if (b.width > rb.width + 1) issues.push({ k: "svg-text-wider-than-box", d: `"${t.textContent.trim().slice(0, 40)}" ${Math.round(b.width)} > ${Math.round(rb.width)}` }); }
    }
  }
  return issues;
};

async function fontsOf(page, cdp) {
  const out = {};
  for (const sel of ["h1", "main p", "button"]) {
    try {
      const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
      if (!nodeId) continue;
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      out[sel] = fonts.map((f) => `${f.familyName}${f.isCustomFont ? "" : "(system)"}:${f.glyphCount}`).join(", ");
    } catch { /* element missing */ }
  }
  return out;
}

async function shot(page, file) { await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 55 }).catch(() => {}); }

async function run(browser, locale, view) {
  const ctx = await browser.newContext({ viewport: { width: view.w, height: view.h }, locale: "en-US" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("pageerror " + String(e).slice(0, 200)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const results = [];
  const record = async (name, extra = {}) => {
    await page.waitForTimeout(250);
    const issues = await page.evaluate(probe);
    const fonts = await fontsOf(page, cdp);
    await shot(page, path.join(OUT, `${locale}-${view.w}-${name}.jpg`));
    results.push({ locale, w: view.w, page: name, issues, fonts, ...extra });
  };
  const go = async (p) => { await page.goto(`${BASE}/${locale}${p}`, { waitUntil: "networkidle", timeout: 60000 }); };
  try {
    await go(""); await record("home");
    await go("/calculator"); await record("calculator");
    // result: a typical case from the live-estimate panel opens straight on its result
    try {
      await page.locator("aside button").first().click({ timeout: 5000 });
      await page.waitForSelector("#decision h2", { timeout: 8000 });
      await page.waitForTimeout(1200);
      await record("result");
      const unlock = page.locator("button.btn-signal:visible").last();
      await unlock.click({ timeout: 4000 });
      await page.waitForTimeout(800);
      await record("checkout");
    } catch (e) { results.push({ locale, w: view.w, page: "result/checkout", issues: [{ k: "flow-failed", d: String(e).slice(0, 160) }], fonts: {} }); }
    await go("/pricing"); await record("pricing");
    await go("/samples"); await record("samples");
    await go(`/samples/${SAMPLE}`); await record("report");
    await go("/methodology"); await record("methodology");
    await go("/terms"); await record("terms");
    await go("/zzz-missing"); await record("404");
  } catch (e) { results.push({ locale, w: view.w, page: "fatal", issues: [{ k: "fatal", d: String(e).slice(0, 200) }], fonts: {} }); }
  await ctx.close();
  return { results, errors: [...new Set(errors)] };
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const jobs = LOCALES.flatMap((l) => VIEWS.map((v) => [l, v]));
const all = [];
const N = 4;
let idx = 0;
await Promise.all(Array.from({ length: N }, async () => {
  while (idx < jobs.length) {
    const [l, v] = jobs[idx++];
    const r = await run(browser, l, v);
    all.push(r);
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(all, null, 1));
    console.log("done", l, v.w, r.results.reduce((n, x) => n + x.issues.length, 0), "issues", r.errors.length, "console errors");
  }
}));
await browser.close();

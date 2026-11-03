/**
 * Keyboard self-check (WCAG 2.1.1 keyboard, 2.1.2 no trap, 2.4.3 focus order, 2.4.7/2.4.11 focus visible and not hidden):
 * tabs through each page of a running build and opens/closes the settings dialog with the keyboard. A self-assessment by
 * script, not an expert audit with a screen reader. Uses puppeteer-core and Chrome from Lighthouse's npx cache
 * (`npx -y lighthouse@12.8.2` installs it). Called by `scorecard.ts --web`.
 */
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

export interface KeyboardResult { pass: boolean; pages: string[]; notes: string }

function puppeteer() {
  const cache = join(process.env.LOCALAPPDATA ?? join(process.env.HOME ?? "", ".npm"), "npm-cache", "_npx");
  const dir = existsSync(cache) ? readdirSync(cache).map((d) => join(cache, d, "node_modules")).find((d) => existsSync(join(d, "puppeteer-core"))) : undefined;
  if (!dir) throw new Error("puppeteer-core not found: run `npx -y lighthouse@12.8.2 --version` once");
  const req = createRequire(join(dir, "x.js"));
  return { pptr: req("puppeteer-core"), chrome: req("chrome-launcher").Launcher.getInstallations()[0] as string };
}

export async function keyboardCheck(base: string, pages: string[]): Promise<KeyboardResult> {
  const { pptr, chrome } = puppeteer();
  const browser = await pptr.launch({ executablePath: chrome, headless: true, defaultViewport: { width: 390, height: 844 } });
  const problems: string[] = [];
  const counts: string[] = [];
  try {
    for (const path of pages) {
      const page = await browser.newPage();
      await page.goto(base + path, { waitUntil: "load" });
      await new Promise((r) => setTimeout(r, 1500)); // hydration
      const seen: string[] = [];
      for (let i = 0; i < 250; i++) {
        await page.keyboard.press("Tab");
        const probe = () => page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          // The page scrolls smoothly; finish the scroll the browser started for the focused element before measuring.
          el.scrollIntoView({ block: "nearest", behavior: "instant" });
          const cs = getComputedStyle(el), r = el.getBoundingClientRect();
          const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
          // 2.4.11: the focused element must not sit entirely under a fixed or sticky header.
          const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
          const hidden = r.width === 0 || r.height === 0 || !(top && (el === top || el.contains(top) || top.contains(el)));
          return { id: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}:${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}`, ring, hidden, cover: hidden ? `${top?.tagName ?? "none"}.${String(top?.className ?? "").slice(0, 60)} at ${Math.round(r.top)}-${Math.round(r.bottom)}/${innerHeight}` : "" };
        });
        let f = await probe();
        // A smooth scroll can still be running: look again before calling the focus hidden.
        if (f?.hidden) { await new Promise((r) => setTimeout(r, 400)); f = await probe(); }
        if (!f) { if (seen.length) break; continue; }
        if (seen[0] === f.id) break; // wrapped round: no trap
        seen.push(f.id);
        if (!f.ring) problems.push(`${path}: no visible focus on ${f.id}`);
        if (f.hidden) problems.push(`${path}: focus hidden on ${f.id} (under ${f.cover})`);
        if (i === 249) problems.push(`${path}: focus never left the page or wrapped (possible trap)`);
      }
      counts.push(`${path} ${seen.length} stops`);
      if (!seen.length) problems.push(`${path}: nothing focusable by Tab`);
      // Settings dialog: open with Enter, close with Escape, focus returns to the button.
      const opened = await page.evaluate(() => { const b = document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]'); b?.focus(); return !!b; });
      if (opened) {
        await page.keyboard.press("Enter");
        const dialog = await page.waitForSelector('[role="dialog"]', { timeout: 3000 }).catch(() => null);
        if (!dialog) problems.push(`${path}: settings dialog does not open with Enter`);
        else {
          await page.keyboard.press("Escape");
          const closed = await page.waitForSelector('[role="dialog"]', { hidden: true, timeout: 2000 }).then(() => true).catch(() => false);
          if (!closed) problems.push(`${path}: Escape does not close the settings dialog`);
          else if (!(await page.evaluate(() => document.activeElement?.getAttribute("aria-haspopup") === "dialog"))) problems.push(`${path}: focus does not return to the settings button`);
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const unique = [...new Set(problems)];
  return { pass: unique.length === 0, pages, notes: `${counts.join("; ")}${unique.length ? ` | ${unique.length} problems: ${unique.slice(0, 12).join("; ")}` : ""}` };
}

// CLI: npx tsx scripts/keyboard-check.ts <base url> <path>… → JSON on stdout (the scorecard runs it as a child process).
if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/keyboard-check.ts")) {
  keyboardCheck(process.argv[2], process.argv.slice(3)).then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e); process.exit(1); });
}

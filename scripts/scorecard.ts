/**
 * Quality contract scorecard: item / threshold / fact / status, grouped by the nine ISO/IEC 25010:2023 product quality
 * characteristics plus decision accuracy. Items, thresholds and their reasons: docs/ai/DECISIONS.md (2026-11-03).
 * Facts are measured here — from the model, the test suite, the type checker and linter — or read from
 * `scorecard-evidence.json` (what this script cannot measure: real outcomes, browser runs, usability sessions, audits).
 * Nothing is typed in as a result.
 *
 * GREEN met on valid evidence · AMBER met only on a proxy, a small sample or stale evidence · RED missed · GREY not measured.
 * Usage: npm run scorecard [-- --quick] [-- --web http://localhost:3000]
 *   --quick  skips the test suite, typecheck and lint (their rows show GREY).
 *   --web    runs Lighthouse (mobile) on a running production build and records LCP, CLS, TBT and axe in the evidence file.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { allProvenance, assess } from "../src/core";
import type { Assessment, ProjectInput, VerdictId } from "../src/core/types";
import { EXAMPLES } from "../src/core/examples";
import { FEEDSTOCKS } from "../src/core/feedstockData";
import { DATA_REVIEW_AS_OF, isoDate } from "../src/core/modelAudit";
import { COUNTRIES, COUNTRY_ORDER, getCountry } from "../src/countries";
import agstar from "../src/countries/data/agstar-backtest.json";
import agstarShutdown from "../src/countries/data/agstar-shutdown.json";
import odre from "../src/countries/data/odre-biomethane.json";
import seStats from "../src/countries/data/se-biogas-statistics.json";
import bmp3 from "../src/countries/data/bmp3-plants.json";
import lmop from "../src/countries/data/lmop-landfills.json";
import { landfillMethane } from "../src/core/processes";
import { chpEtaEl } from "../src/core/energy";
import { ENGINEERING_MAP } from "../src/core/engineeringParams";
import { agstarInput, type AgstarRow } from "../src/countries/backtest";
import { auditModel } from "../src/components/__tests__/report-audit";
import { KNOWN } from "../src/i18n/__tests__/qa-known";
import { capexReferenceRows } from "./capex-references";

type Status = "GREEN" | "AMBER" | "RED" | "GREY";
interface Row { id: string; item: string; threshold: string; fact: string; status: Status }
interface Group { name: string; rows: Row[] }

/* ---------- evidence recorded outside this script ---------- */

interface RealityCase { id: string; input: ProjectInput; outcome: "go" | "no"; reason?: "economics" | "other"; source: string; decidedOn: string; blind: boolean }
/** Lighthouse runs twice: simulated throttling (Lantern, the default) and applied DevTools throttling (the page really loads on slow 4G, 4× CPU). */
interface WebPage { lcpMs: number; cls: number; tbtMs: number; lcpAppliedMs: number; tbtAppliedMs: number; axeSerious: string[] }
interface Evidence {
  realityCases: RealityCase[];
  web: { date: string; commit: string; uiDiff: string; tool: string; pages: Record<string, WebPage> } | null;
  keyboard: { date: string; commit: string; uiDiff: string; pass: boolean; pages: string[]; notes: string } | null;
  usability: { date: string; participants: number; attempts: number; succeeded: number; medianSecondsToVerdict: number; method: string } | null;
  stripeE2e: { date: string; mode: "test" | "live"; pass: boolean; steps: string[] } | null;
  restoreDrill: { date: string; pass: boolean; minutes: number } | null;
}
const ROOT = resolve(import.meta.dirname ?? ".", "..");
const EVIDENCE_FILE = join(ROOT, "scripts", "scorecard-evidence.json");
const evidence = JSON.parse(readFileSync(EVIDENCE_FILE, "utf-8")) as Evidence;
const args = process.argv.slice(2);
const quick = args.includes("--quick");
const webBase = args.includes("--web") ? args[args.indexOf("--web") + 1] : undefined;
const TMP = mkdtempSync(join(tmpdir(), "scorecard-"));

const sh = (cmd: string, cmdArgs: string[]) => spawnSync(cmd, cmdArgs, { cwd: ROOT, shell: true, encoding: "utf-8", maxBuffer: 1 << 28 });
const git = (...a: string[]) => sh("git", a).stdout.trim();
const pct = (x: number) => `${Math.round(x * 100)} %`;
const share = (k: number, n: number) => (n ? `${pct(k / n)} (${k}/${n})` : "n = 0");
const UI_PATHS = ["src/app", "src/components", "src/i18n", "src/lib", "src/core", ":(exclude)**/__tests__/**"];
/** Fingerprint of what the pages render: the measured commit plus the uncommitted UI diff at measurement time. */
const uiDiff = (commit: string) => createHash("sha1").update(git("diff", commit, "--", ...UI_PATHS)).digest("hex").slice(0, 12);
/** Browser evidence goes stale when anything the page renders changed after it was measured. */
const isStale = (e: { commit: string; uiDiff: string }) => uiDiff(e.commit) !== e.uiDiff;

/* ---------- optional: measure the pages with Lighthouse ---------- */

const PAGES = ["/en", "/en/calculator", "/en/samples/de_nawaro", "/en/pricing", "/uk/calculator"];
if (webBase) {
  const pages: Record<string, WebPage> = {};
  for (const p of PAGES) sh("curl", ["-s", "-o", `"${join(TMP, "warm.html")}"`, webBase + p]); // warm the server: the first hit per route is cold
  for (const p of PAGES) {
    const lighthouse = (method: "simulate" | "devtools") => {
      const out = join(TMP, `lh-${method}-${p.replace(/\W+/g, "_")}.json`);
      const r = sh("npx", ["-y", "lighthouse@12.8.2", webBase + p, "--output=json", `--output-path="${out}"`, "--quiet", `--throttling-method=${method}`, "--only-categories=performance,accessibility", '--chrome-flags="--headless=new"']);
      if (r.status !== 0) throw new Error(`Lighthouse failed on ${p}: ${r.stderr.slice(-500)}`);
      return JSON.parse(readFileSync(out, "utf-8"));
    };
    const lhr = lighthouse("simulate"), applied = lighthouse("devtools");
    const axeSerious = (lhr.categories.accessibility.auditRefs as { id: string }[])
      .filter(({ id }) => lhr.audits[id].score === 0 && ["serious", "critical"].includes(lhr.audits[id].details?.debugData?.impact))
      .map(({ id }) => id);
    pages[p] = { lcpMs: Math.round(lhr.audits["largest-contentful-paint"].numericValue), cls: +lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3), tbtMs: Math.round(lhr.audits["total-blocking-time"].numericValue),
      lcpAppliedMs: Math.round(applied.audits["largest-contentful-paint"].numericValue), tbtAppliedMs: Math.round(applied.audits["total-blocking-time"].numericValue), axeSerious };
    console.log(p, pages[p]);
  }
  const commit = git("rev-parse", "--short", "HEAD");
  evidence.web = { date: new Date().toISOString().slice(0, 10), commit, uiDiff: uiDiff(commit), tool: "Lighthouse 12.8.2, mobile (slow 4G, 4× CPU), simulated and applied (DevTools) throttling, local production build", pages };
  const kb = sh("npx", ["tsx", "scripts/keyboard-check.ts", webBase, ...PAGES]);
  if (kb.status !== 0) throw new Error(`Keyboard check failed: ${kb.stderr.slice(-500)}`);
  evidence.keyboard = { date: evidence.web.date, commit, uiDiff: evidence.web.uiDiff, ...JSON.parse(kb.stdout.trim().split("\n").pop()!) };
  console.log("keyboard", evidence.keyboard);
  writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n", "utf-8");
}

/* ---------- test suite, typecheck, lint ---------- */

interface FileResult { passed: number; failed: number; names: { name: string; status: string }[] }
const tests = new Map<string, FileResult>();
let typeErrors: number | null = null, lintErrors: number | null = null, lintWarnings = 0;
if (!quick) {
  const out = join(TMP, "vitest.json");
  sh("npx", ["vitest", "run", "--reporter=json", `--outputFile="${out}"`]);
  const json = JSON.parse(readFileSync(out, "utf-8")) as { testResults: { name: string; assertionResults: { fullName: string; status: string }[] }[] };
  for (const f of json.testResults) {
    const key = f.name.replace(/\\/g, "/").replace(/^.*?\/src\//, "src/");
    tests.set(key, { passed: f.assertionResults.filter((a) => a.status === "passed").length, failed: f.assertionResults.filter((a) => a.status === "failed").length, names: f.assertionResults.map((a) => ({ name: a.fullName, status: a.status })) });
  }
  typeErrors = (sh("npx", ["tsc", "--noEmit"]).stdout.match(/error TS\d+/g) ?? []).length;
  const lintOut = join(TMP, "eslint.json");
  sh("npx", ["eslint", "-f", "json", "-o", `"${lintOut}"`]);
  const lint = JSON.parse(readFileSync(lintOut, "utf-8")) as { errorCount: number; warningCount: number }[];
  lintErrors = lint.reduce((s, f) => s + f.errorCount, 0);
  lintWarnings = lint.reduce((s, f) => s + f.warningCount, 0);
}
/** Rows backed by test files: GREEN when every test in them passes, GREY when the suite was skipped. */
function testRow(id: string, item: string, files: string[], nameFilter?: RegExp): Row {
  if (quick) return { id, item, threshold: "0 failing", fact: "not run (--quick)", status: "GREY" };
  const found = files.map((f) => tests.get(f));
  if (found.some((f) => !f)) return { id, item, threshold: "0 failing", fact: `missing test file: ${files.filter((_, i) => !found[i]).join(", ")}`, status: "RED" };
  const names = found.flatMap((f) => f!.names).filter((n) => !nameFilter || nameFilter.test(n.name));
  const failed = names.filter((n) => n.status === "failed").length;
  return { id, item, threshold: "0 failing", fact: `${failed} failing of ${names.length} (${files.map((f) => f.split("/").pop()).join(", ")})`, status: names.length === 0 ? "RED" : failed ? "RED" : "GREEN" };
}

/* ---------- decision accuracy: real outcomes ---------- */

const goClass = (v: VerdictId) => (v === "STRONG_CANDIDATE" || v === "POSSIBLE_WITH_CONDITIONS" ? "go" : v === "INSUFFICIENT_DATA" ? "none" : "no");
// Real outcomes: hand-entered cases plus AgSTAR's shut-down farm digesters with a recorded reason (economics → "no").
const shutdown = (agstarShutdown.rows as (AgstarRow & { economics: boolean; yearShutdown: number | null })[]).map((row): RealityCase => ({
  id: row.name, input: agstarInput(row), outcome: "no", reason: row.economics ? "economics" : "other", source: "EPA AgSTAR shutdown sheet", decidedOn: String(row.yearShutdown ?? ""), blind: false,
}));
const reality = [...evidence.realityCases, ...shutdown].map((c) => ({ c, v: assess(c.input, getCountry(c.input.countryCode), { uncertainty: false }).verdict.id }));
/** D2 counts outcomes a screening can know: economic closures and "go"; fires, design faults and farm closures are left out. */
const judged = reality.filter((r) => r.c.outcome === "go" || r.c.reason === "economics");
const oneSided = new Set(judged.map((r) => r.c.outcome)).size < 2;
const closedEconomic = reality.filter((r) => r.c.outcome === "no" && r.c.reason === "economics");
const strongOnClosed = closedEconomic.filter((r) => r.v === "STRONG_CANDIDATE").length;
const agree = judged.filter((r) => goClass(r.v) === r.c.outcome).length;
const matrix = (["STRONG_CANDIDATE", "POSSIBLE_WITH_CONDITIONS", "WEAK_ECONOMICS", "NOT_RECOMMENDED_AT_SCALE", "INSUFFICIENT_DATA"] as VerdictId[])
  .map((v) => `${v.split("_")[0]} ${judged.filter((r) => r.v === v && r.c.outcome === "go").length}/${judged.filter((r) => r.v === v && r.c.outcome === "no").length}`).join(" · ");

/* ---------- accuracy and range honesty against real plants (AgSTAR) and published plant costs ---------- */

const US = getCountry("US");
const plants = (agstar.rows as AgstarRow[]).filter((r) => r.electricityKwhYear).map((row) => {
  const a = assess(agstarInput(row), US, { uncertainty: false });
  const m = a.routeMatrix.chp, actual = row.electricityKwhYear!;
  const lo = Math.min(m.conservative.energy.elGrossKwh, m.optimistic.energy.elGrossKwh), hi = Math.max(m.conservative.energy.elGrossKwh, m.optimistic.energy.elGrossKwh);
  return { ratio: m.base.energy.elGrossKwh / actual, nameplate: actual % 8760 === 0, inside: actual >= lo && actual <= hi, below: actual < lo, verdict: a.verdict.id };
});
/** The "reality check" band the report prints (actual = 1/p90 … 1/p10 × estimate), tested out of sample: each plant against
 * the p10–p90 of the other 78, so the band cannot cover a plant only because that plant helped set it. */
const q = (xs: number[], p: number) => { const s2 = [...xs].sort((a, b) => a - b), i = (s2.length - 1) * p, lo = Math.floor(i); return s2[lo] + (s2[Math.ceil(i)] - s2[lo]) * (i - lo); };
const insideField = plants.filter((p, i) => { const rest = plants.filter((_, j) => j !== i).map((x) => x.ratio); return p.ratio >= q(rest, 0.1) && p.ratio <= q(rest, 0.9); }).length;
const within25 = plants.filter((p) => Math.abs(p.ratio - 1) <= 0.25).length;
// An "output" that is an exact multiple of 8 760 h is nameplate kW × a full year, not a reading (48 % of the AgSTAR rows).
const read = plants.filter((p) => !p.nameplate);
const insideEnergy = plants.filter((p) => p.inside).length;
const agstarVerdicts = Object.entries(plants.reduce<Record<string, number>>((s, p) => ({ ...s, [p.verdict.split("_")[0]]: (s[p.verdict.split("_")[0]] ?? 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(", ");

/* ---------- Europe: metered French biomethane output against plan (ODRÉ) ---------- */

// The publisher's "theoretical capacity" reads as the site's planned annual output; the model's own spread around its base is
// conservative ÷ base … optimistic ÷ base for an agricultural injection plant (fr_farm_injection). Agricultural sites only:
// they are what the farm form describes; STEP, landfill and household-waste sites are other inlets.
const frFarm = EXAMPLES.find((e) => e.id === "fr_farm_injection")!.input;
const frBand = (() => { const m = assess(frFarm, getCountry("FR"), { uncertainty: false }).routeMatrix.biomethane; return [m.conservative.energy.biomethaneNm3 / m.base.energy.biomethaneNm3, m.optimistic.energy.biomethaneNm3 / m.base.energy.biomethaneNm3]; })();
const odreYear = Math.max(...odre.rows.map((x) => x.year));
const frRatios = odre.rows.filter((x) => x.year === odreYear && x.type?.startsWith("Agricole")).map((x) => x.productionGwhHhv / x.capacityGwhHhv);
const frInside = frRatios.filter((x) => x >= frBand[0] && x <= frBand[1]).length;

/* ---------- Europe: Swedish farm plants, gas per tonne of substrate (official aggregate) ---------- */

// The statistics do not split slurry from solid manure, so the mix comes from a dry-matter balance: feed DM = digestate DM + mass
// that left as biogas (CH4 + CO2 at 60 % CH4); a slurry/solid blend of the catalogue's two cattle manures must match that feed DM.
// Co-substrates (≈ 2 % of the mass) are left out: the model side then reads slightly low.
const seFeed = (() => {
  const f = seStats.farm, ch4Nm3 = f.biogasGwhLhv * 1e6 / 9.97, gasKt = (ch4Nm3 * 0.717 + ch4Nm3 / 0.6 * 0.4 * 1.977) / 1e6;
  const feedDm = (f.digestateKt * f.digestateDmPct / 100 + gasKt) / f.substrateKt * 100;
  const slurry = FEEDSTOCKS.dairy_slurry.dryMatterPct, solid = FEEDSTOCKS.cattle_solid_manure.dryMatterPct;
  return { feedDm, solidShare: Math.min(1, Math.max(0, (feedDm - slurry) / (solid - slurry))) };
})();
const SE = getCountry("SE");
const seModelGwhPerKt = (() => {
  const t = 20000, a = assess({ countryCode: "SE", regionId: SE.regions[0].id, businessType: "dairy_farm", feedstocks: [
    { id: "a", type: "dairy_slurry", quantity: t * (1 - seFeed.solidShare) }, { id: "b", type: "cattle_solid_manure", quantity: t * seFeed.solidShare }],
    energy: { heatNeed: "none", hasGridConnection: true }, site: {} }, SE, { uncertainty: false });
  return a.routesBase.chp.energy.ch4ProducedM3 * 9.97 / t / 1000;
})();
const seActualGwhPerKt = seStats.farm.biogasGwhLhv / seStats.farm.substrateKt;
const seRatio = seModelGwhPerKt / seActualGwhPerKt;

/* ---------- Europe: FNR Biogas-Messprogramm III, 53 German plants with fed substrate and measured methane ---------- */

// Substrates the calculator can enter (grass, whole-crop cereal silage, grain and beet since 2026-11-03). A plant counts
// only when ≥ 98 % of its fed mass maps (water and additives map to nothing). Fed silage is converted back to harvested mass,
// because the model deducts the KTBL clamp loss from what is entered.
const BMP3_TYPES: Record<string, string> = {
  "Rindergülle": "dairy_slurry", "Rindergülle fester Anteil": "cattle_solid_manure", "Schweinegülle": "pig_slurry", "Rindermist": "cattle_solid_manure",
  "Pferdemist": "cattle_solid_manure", "Schafmist": "cattle_solid_manure", "Schweinemist": "cattle_solid_manure", "Hühnertrockenkot": "poultry_layer_manure",
  "Putenmist": "poultry_broiler_litter", "Mais-Ganzpflanzensilage": "maize_silage", "Maissilage": "maize_silage", "Kartoffeln": "potato_processing",
  "Grassilage": "grass_silage", "Kleegrassilage": "grass_silage", "Kleegras": "grass_silage", "Anwelksilage": "grass_silage", "Mix Gras- und Grünroggensilage": "grass_silage",
  "Roggen-Ganzpflanzensilage": "whole_crop_silage", "Triticale-Ganzpflanzensilage": "whole_crop_silage", "Tricitale-Ganzpflanzensilage": "whole_crop_silage", "Roggen GPS": "whole_crop_silage",
  "Gerste-Ganzpflanzensilage": "whole_crop_silage", "Mischung Roggen und Gerste-Ganzpflanzensilage": "whole_crop_silage", "Grünroggensilage": "whole_crop_silage",
  "Grünroggen-Ganzpflanzensilage": "whole_crop_silage", "Grünhafersilage": "whole_crop_silage",
  "Getreideschrot": "cereal_grain", "Getreide und Getreidekorn": "cereal_grain", "Weizen Getreide und Getreidekorn": "cereal_grain", "Roggenschrot": "cereal_grain",
  "Roggen-Getreidekorn": "cereal_grain", "Gerste-Getreidekorn": "cereal_grain", "Zuckerrüben": "sugar_beet", "Zuckerrübe": "sugar_beet",
  "Wasser": "", "Wasser (Stallspühlwasser)": "", "Silosickersaft": "", "Eisenpräparate": "",
};
const DEc = getCountry("DE"), CLAMP_LOSS = 0.093;
// A methane yield above 450 L/kg VS is above what carbohydrate/protein mixes can give (Buswell: ≈ 415 for carbohydrates): a reporting error.
const BMP3_MAX_L_PER_KG_VS = 450;
const bmpImplausible = bmp3.rows.filter((x) => (x.ch4M3PerTVs ?? 0) > BMP3_MAX_L_PER_KG_VS).map((x) => x.id);
const bmpRows = bmp3.rows.filter((x) => x.feedTonnesYear && x.ch4M3PerTFm && x.feed.length && !bmpImplausible.includes(x.id));
const bmpUnmappable = bmpRows.filter((x) => x.feed.filter((f) => !(f.name in BMP3_TYPES)).reduce((a, f) => a + f.pctFm, 0) > 2).length;
const bmpPlants = bmpRows.filter((x) => { const sum = x.feed.reduce((a, f) => a + f.pctFm, 0); return sum > 90 && sum < 110 && x.feed.filter((f) => f.name in BMP3_TYPES).reduce((a, f) => a + f.pctFm, 0) / sum >= 0.98; })
  .map((x) => {
    const sum = x.feed.reduce((a, f) => a + f.pctFm, 0);
    const feedstocks = x.feed.filter((f) => BMP3_TYPES[f.name]).map((f, i) => ({ id: String(i), type: BMP3_TYPES[f.name] as "maize_silage", monthsActive: 12,
      quantity: Math.round(x.feedTonnesYear! * f.pctFm / sum / (FEEDSTOCKS[BMP3_TYPES[f.name] as "maize_silage"].flags.includes("energy_crop") ? 1 - CLAMP_LOSS : 1)) }));
    const a = assess({ countryCode: "DE", regionId: DEc.regions[0].id, businessType: "dairy_farm", feedstocks, energy: { heatNeed: "none", hasGridConnection: true }, site: { existingStorageM3: 1e6 } }, DEc, { uncertainty: false });
    return { id: x.id, ratio: a.routesBase.chp.energy.ch4ProducedM3 / (x.ch4M3PerTFm! * x.feedTonnesYear!) };
  });
const bmpMedianVs = (() => { const v = bmp3.rows.map((x) => x.ch4M3PerTVs).filter((x): x is number => !!x).sort((a, b) => a - b); return { n: v.length, median: v[Math.floor(v.length / 2)] }; })();

/* ---------- Landfill gas: EPA LMOP, measured collection 2022 ---------- */

// Inputs a client would know: waste in place, years open, closure year. k, L0 and collection are the client's own fields; the check uses
// the EPA AP-42 defaults (k 0.04/a, L0 100 m³ CH4/t, 75 % collection) a client would most likely type.
const SCF_NM3 = 0.0283168 * 273.15 / 288.71; // standard cubic foot (60 °F) → Nm³ (0 °C)
const lmopRows = lmop.landfills.map((x) => {
  const end = x.closed && x.closed <= 2021 ? x.closed : 2022, years = Math.max(1, end - x.opened + 1), t = x.wipTons * 0.90718;
  const base = { kind: "landfill" as const, annualWasteTonnes: t / years, depositionYears: years, yearsSinceClosure: Math.max(0, 2022 - end), decayPerYear: 0.04, potentialNm3T: 100 };
  const actual = x.collectedMmscfd * 1e6 * 365 * SCF_NM3 * x.ch4Pct! / 100;
  return { closed: x.status === "Closed" && !!x.closed && x.closed <= 2021, captured: landfillMethane({ ...base, collectionPct: 75 } as never).captured / actual,
    method: x.generatedMmscfd ? landfillMethane({ ...base, collectionPct: 100 } as never).generated / (x.generatedMmscfd * 1e6 * 365 * SCF_NM3 * 0.5) : NaN,
    collectedShare: x.generatedMmscfd ? x.collectedMmscfd / x.generatedMmscfd : NaN };
});
const med = (a: number[]) => { const v = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return { n: v.length, m: v[Math.floor(v.length / 2)], p10: v[Math.round((v.length - 1) * 0.1)], p90: v[Math.round((v.length - 1) * 0.9)] }; };
const lfMethod = med(lmopRows.map((x) => x.method)), lfReal = med(lmopRows.filter((x) => x.closed).map((x) => x.captured)), lfShare = med(lmopRows.map((x) => x.collectedShare));
// Engines on landfill gas: electricity ÷ methane energy delivered (LHV 9.97 kWh/Nm³), against the model's datasheet curve at the engine size.
const lfCh4 = new Map(lmop.landfills.map((x) => [x.id, x.ch4Pct!]));
const engines = lmop.projects.filter((x) => lfCh4.has(x.landfillId)).map((x) => {
  const eta = x.actualMw * 1000 / (x.flowMmscfd * 1e6 * SCF_NM3 / 24 * lfCh4.get(x.landfillId)! / 100 * 9.97);
  const unitKw = x.ratedMw * 1000 / Math.max(1, Math.round(x.ratedMw / 1.6));
  return eta > 0.15 && eta < 0.6 ? eta / chpEtaEl(unitKw, (id) => ENGINEERING_MAP[id as keyof typeof ENGINEERING_MAP].value) : NaN;
});
const lfEngine = med(engines);

const capex = capexReferenceRows();
const counted = capex.filter((r) => r.counted);
const capexRatio = (r: (typeof capex)[number]) => r.modelEur / r.publishedEur;
const capex30 = counted.filter((r) => Math.abs(capexRatio(r) - 1) <= 0.3).length;
// AACE RP 18R-97 class 5: the actual cost may lie 50 % below to 100 % above the estimate.
const capexClass5 = counted.filter((r) => capexRatio(r) >= 0.5 && capexRatio(r) <= 2).length;
const smallN = counted.length < 10 ? `; n = ${counted.length} is too few to conclude` : "";
const capexInside = counted.filter((r) => r.publishedEur >= r.lowEur && r.publishedEur <= r.highEur).length;
const capexMedian = [...counted.map(capexRatio)].sort((a, b) => a - b)[Math.floor(counted.length / 2)];

/** ≈ 80 % of real outcomes inside the conservative–optimistic band: too few means overconfident, all means uninformative. */
const coverage = (k: number, n: number, minN: number): Status => (!n ? "GREY" : k / n < 0.7 || k / n > 0.9 ? "RED" : n < minN ? "AMBER" : "GREEN");

/* ---------- integrity: model audit over every example in every country ---------- */

let assessed = 0, unexpected = 0, hard = 0, unordered = 0, noHazards = 0;
const hardCases: string[] = [], errors: string[] = [];
for (const e of EXAMPLES) {
  for (const code of COUNTRY_ORDER) {
    const c = COUNTRIES[code];
    let a: Assessment;
    try { a = assess({ ...e.input, countryCode: code, regionId: c.regions[0].id, city: undefined }, getCountry(code), { uncertainty: false }); } catch (x) { unexpected++; errors.push(`${e.id}@${code}: ${(x as Error).message}`); continue; }
    assessed++;
    const findings = auditModel(a);
    if (findings.some((f) => f.kind === undefined)) { hard++; hardCases.push(`${e.id}@${code}`); }
    if (findings.some((f) => f.kind === "order")) unordered++;
    if (!["methane_explosion", "h2s", "confined_space"].every((id) => a.safety.some((s) => s.id === id))) noHazards++;
  }
}
// Subsidies are a separate case: removing every support scheme must leave the base verdict unchanged.
const supportMoves = EXAMPLES.filter((e) => {
  const c = getCountry(e.input.countryCode);
  return assess(e.input, c, { uncertainty: false }).verdict.id !== assess(e.input, { ...c, support: { ...c.support, schemes: [] } }, { uncertainty: false }).verdict.id;
}).map((e) => e.id);

const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
const duplicateIds = [
  ...dupes(EXAMPLES.map((e) => e.id)).map((id) => `example ${id}`),
  ...COUNTRY_ORDER.flatMap((code) => {
    const c = COUNTRIES[code];
    return [...dupes(allProvenance(c).map((p) => p.id)).map((id) => `${code} parameter ${id}`), ...dupes(c.regions.map((r) => r.id)).map((id) => `${code} region ${id}`), ...dupes(c.support.schemes.map((s) => s.id)).map((id) => `${code} scheme ${id}`)];
  }),
];

/** Input fields the model never reads, or that no form field fills (static: field name in `src/core` / `src/lib/form.ts`). */
const typesSrc = readFileSync(join(ROOT, "src/core/types.ts"), "utf-8");
const fieldsOf = (name: string) => {
  const body = typesSrc.slice(typesSrc.indexOf(`export interface ${name} {`)).split("\n}")[0];
  return [...body.matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
};
const coreSrc = sh("git", ["ls-files", "src/core/*.ts"]).stdout.split("\n").filter((f) => f && !/types\.ts$|examples\.ts$|__tests__/.test(f)).map((f) => readFileSync(join(ROOT, f), "utf-8")).join("\n");
const formSrc = readFileSync(join(ROOT, "src/lib/form.ts"), "utf-8");
const INPUTS = ["ProjectInput", "FeedstockLineInput", "EnergyInput", "SiteInput", "FinanceInput"];
const deadInModel = INPUTS.flatMap((t) => fieldsOf(t).filter((f) => !new RegExp(`\\b${f}\\b`).test(coreSrc)).map((f) => `${t}.${f}`));
// `lang` comes from the page locale, not from a field.
const notInForm = INPUTS.flatMap((t) => fieldsOf(t).filter((f) => f !== "lang" && !new RegExp(`\\b${f}\\b`).test(formSrc)).map((f) => `${t}.${f}`));

/* ---------- market data: dated, fresh, official ---------- */

const ageDays = (d: string) => (Date.parse(`${DATA_REVIEW_AS_OF}T00:00:00Z`) - Date.parse(`${d}T00:00:00Z`)) / 86400000;
const market = COUNTRY_ORDER.flatMap((code) => allProvenance(COUNTRIES[code]).filter((p) => p.id.startsWith("econ.")));
const undated = market.filter((p) => !isoDate(p.date)).length;
// Old data is stale only if nobody confirmed within 400 days that it is still the latest published period (`evidence.checkedOn`).
const checked = (p: (typeof market)[number]) => { const c = (p as { evidence?: { checkedOn?: string } }).evidence?.checkedOn; return !!c && isoDate(c) && ageDays(c) <= 400; };
const staleList = market.filter((p) => isoDate(p.date) && ageDays(p.date) > 400 && !checked(p));
const stale = staleList.length;
const marketLow = market.filter((p) => p.confidence === "LOW").length;

/* ---------- security self-assessment ---------- */

const asvsFile = JSON.parse(readFileSync(join(ROOT, "scripts", "asvs-checklist.json"), "utf-8")) as { date: string; standard: string; items: { id: string; status: "pass" | "fail" | "unverified" }[] };
const [asvs, asvsDate, asvsStd] = [asvsFile.items, asvsFile.date, asvsFile.standard];

/* ---------- l10n ---------- */

const knownL10n = Object.values(KNOWN).reduce((s, perLocale) => s + Object.values(perLocale).reduce((a, n) => a + (n ?? 0), 0), 0);
// fi, vi and th write unit words natively by owner decision (qa-known.ts): counted, but named apart.
const ownerUnits = (["fi", "vi", "th"] as const).reduce((s, l) => s + (KNOWN.unit[l] ?? 0), 0);

/* ---------- rows ---------- */

const web = evidence.web, webStale = !!web && isStale(web);
const worst = (k: keyof Omit<WebPage, "axeSerious">) => (web ? Math.max(...Object.values(web.pages).map((p) => p[k] ?? NaN)) : NaN);
const webFact = (v: string) => (web ? `${v} worst of ${Object.keys(web.pages).length} pages, lab ${web.date} @${web.commit}${webStale ? ", STALE: UI changed since" : ""}` : "not measured (run with --web)");
const webStatus = (ok: boolean): Status => (!web ? "GREY" : !ok ? "RED" : webStale ? "AMBER" : "GREEN");
const axeFailed = web ? Object.entries(web.pages).filter(([, p]) => p.axeSerious.length).map(([path, p]) => `${path}: ${p.axeSerious.join(" ")}`) : [];
const kb = evidence.keyboard, us = evidence.usability;

const groups: Group[] = [
  { name: "Decision accuracy (the client's go / no-go)", rows: [
    { id: "D1", item: "STRONG verdict on projects closed for economic reasons", threshold: "0, n ≥ 10", fact: `${strongOnClosed} of ${closedEconomic.length} (AgSTAR shut-down US farm digesters, reason recorded as economics; today's prices)`, status: closedEconomic.length === 0 ? "GREY" : strongOnClosed ? "RED" : closedEconomic.length < 10 ? "AMBER" : "GREEN" },
    { id: "D2", item: "Verdict vs reality (go/no), matrix verdict: go/no", threshold: "≥ 80 % agree, n ≥ 8", fact: `${share(agree, judged.length)}; ${matrix}${oneSided ? "; ONE-SIDED: no documented 'go' yet" : ""}; ${reality.length - judged.length} non-economic closures not counted. Not counted: ${plants.length} operating AgSTAR digesters → ${agstarVerdicts} (base excludes support; operating ≠ economic)`, status: judged.length === 0 ? "GREY" : agree / judged.length < 0.8 ? "RED" : judged.length < 8 || oneSided ? "AMBER" : "GREEN" },
  ] },
  { name: "Functional suitability — accuracy, range honesty, integrity", rows: [
    { id: "A1", item: "Gas / energy within ±25 % of real plants — US (AgSTAR)", threshold: "≥ 80 % of references", fact: `${share(within25, plants.length)} AgSTAR electricity (self-reported); ${plants.length - read.length} rows are nameplate × 8 760 h; on the other ${read.length}: ${pct(read.filter((p) => Math.abs(p.ratio - 1) <= 0.25).length / read.length)}; ±30 %: ${pct(plants.filter((p) => Math.abs(p.ratio - 1) <= 0.3).length / plants.length)}`, status: within25 / plants.length >= 0.8 ? "GREEN" : "RED" },
    { id: "A1e", item: "Methane within ±25 % of real plants — Europe (FNR Messprogramm III)", threshold: "≥ 80 % of references, n ≥ 10", fact: `${share(bmpPlants.filter((p) => Math.abs(p.ratio - 1) <= 0.25).length, bmpPlants.length)}; median ${(() => { const r = bmpPlants.map((p) => p.ratio).sort((x, y) => x - y); return r[Math.floor(r.length / 2)]?.toFixed(2); })()}; excluded as implausible (> ${BMP3_MAX_L_PER_KG_VS} L CH4/kg VS): ${bmpImplausible.join(", ") || "—"}; ${bmpUnmappable} plants feed substrates the calculator cannot enter; all ${bmpMedianVs.n} plants: median ${bmpMedianVs.median} L CH4/kg VS (model maize 306, dairy slurry 180 after realisation)`, status: !bmpPlants.length ? "GREY" : bmpPlants.filter((p) => Math.abs(p.ratio - 1) <= 0.25).length / bmpPlants.length < 0.8 ? "RED" : bmpPlants.length < 10 ? "AMBER" : "GREEN" },
    { id: "A1s", item: "EU aggregate: farm-plant gas per tonne — Sweden (official, all plants)", threshold: "model ÷ actual 0.75–1.25", fact: `model ${(seModelGwhPerKt * 1000).toFixed(0)} kWh/t ÷ actual ${(seActualGwhPerKt * 1000).toFixed(0)} kWh/t (${seStats.farm.plants} farm plants, ${seStats.dataYear}) = ${seRatio.toFixed(2)}; mix from DM balance: feed ${seFeed.feedDm.toFixed(1)} % DM → ${(seFeed.solidShare * 100).toFixed(0)} % solid manure; aggregate, so a proxy`, status: Math.abs(seRatio - 1) > 0.25 ? "RED" : "AMBER" },
    { id: "A1l", item: "Landfill gas: model with EPA AP-42 defaults ÷ measured collection (closed sites)", threshold: "median 0.75–1.25", fact: `median ${lfReal.m.toFixed(2)} (p10–p90 ${lfReal.p10.toFixed(2)}–${lfReal.p90.toFixed(2)}, n ${lfReal.n}, LMOP 2022); method = EPA's own estimate ${lfMethod.m.toFixed(2)}; sites collect ${(lfShare.m * 100).toFixed(0)} % of EPA-estimated generation (p10–p90 ${(lfShare.p10 * 100).toFixed(0)}–${(lfShare.p90 * 100).toFixed(0)} %), not the 75 % default`, status: Math.abs(lfReal.m - 1) > 0.25 ? "RED" : "GREEN" },
    { id: "A1g", item: "Gas engines: real electricity ÷ model efficiency (LMOP landfill-gas engines)", threshold: "median 0.85–1.15", fact: `median ${lfEngine.m.toFixed(2)} (p10–p90 ${lfEngine.p10.toFixed(2)}–${lfEngine.p90.toFixed(2)}, n ${lfEngine.n}); model = TEDOM datasheet at full load`, status: Math.abs(lfEngine.m - 1) > 0.15 ? "RED" : "GREEN" },
    { id: "A1w", item: "Wastewater / sewage sludge: model ÷ real plants", threshold: "≥ 80 % within ±25 %", fact: "no current open per-plant data (DWA benchmarks 2022–25 omit gas; the 2017 gas edition is too old); COD → CH4 is stoichiometric (IPCC)", status: "GREY" },
    { id: "A2", item: "CAPEX within ±30 % of published plant cost", threshold: "≥ 70 % of references", fact: `${share(capex30, counted.length)}; median model ÷ published ${capexMedian.toFixed(2)}${smallN}`, status: capex30 / counted.length >= 0.7 ? "GREEN" : "RED" },
    { id: "A3", item: "CAPEX within AACE class 5 (−50 % … +100 %)", threshold: "≥ 95 % of references", fact: `${share(capexClass5, counted.length)}${counted.length - capexClass5 ? `; outside: ${counted.filter((r) => capexRatio(r) < 0.5 || capexRatio(r) > 2).map((r) => `${r.id} ${capexRatio(r).toFixed(2)}`).join(", ")}` : ""}`, status: capexClass5 / counted.length >= 0.95 ? "GREEN" : "RED" },
    { id: "R1", item: "Real output inside conservative–optimistic band (diagnostic)", threshold: "70–90 % (≈ 80 %), n ≥ 20", fact: `${share(insideEnergy, plants.length)} AgSTAR electricity (without nameplate rows ${pct(read.filter((p) => p.inside).length / read.length)}); below band ${plants.filter((p) => p.below).length}, above ${plants.filter((p) => !p.inside && !p.below).length}`, status: coverage(insideEnergy, plants.length, 20) },
    { id: "R1b", item: "Real output inside the report's real-plant range (leave-one-out)", threshold: "70–90 % (≈ 80 %), n ≥ 20", fact: `${share(insideField, plants.length)} AgSTAR electricity; band = p10–p90 of model ÷ reported on the other plants`, status: coverage(insideField, plants.length, 20) },
    { id: "R3", item: "EU: metered output ÷ plan inside the model's cons.–opt. spread (FR agri sites)", threshold: "70–90 % (≈ 80 %), n ≥ 20", fact: `${share(frInside, frRatios.length)} ODRÉ ${odreYear}, spread ${frBand[0].toFixed(2)}–${frBand[1].toFixed(2)} of base; below ${frRatios.filter((x) => x < frBand[0]).length}, above ${frRatios.filter((x) => x > frBand[1]).length}; plan = publisher's "capacité théorique" (basis undefined, so a proxy: AMBER at best)`, status: coverage(frInside, frRatios.length, 20) === "GREEN" ? "AMBER" : coverage(frInside, frRatios.length, 20) },
    { id: "R2", item: "Published CAPEX inside optimistic–conservative CAPEX", threshold: "70–90 % (≈ 80 %), n ≥ 20", fact: share(capexInside, counted.length), status: coverage(capexInside, counted.length, 20) },
    testRow("I1", "Mass, methane, energy and money balances close", ["src/core/__tests__/audit-balances.test.ts", "src/core/__tests__/finance-audit.test.ts"]),
    { id: "I2", item: "Contradictions in the model output (39 examples × 33 countries)", threshold: "0", fact: `${hard} hard (${hardCases.join(", ") || "—"}) + ${unordered} unordered scenarios of ${assessed}`, status: hard + unordered === 0 ? "GREEN" : "RED" },
    testRow("I3", "Report = model in every tier, language and export", ["src/components/__tests__/report-consistency.test.ts"]),
    { id: "I4", item: "Duplicate ids (examples, parameters, regions, schemes)", threshold: "0", fact: duplicateIds.length ? `${duplicateIds.length}: ${duplicateIds.slice(0, 4).join(", ")}` : "0", status: duplicateIds.length ? "RED" : "GREEN" },
    { id: "I5", item: "Dead input fields (not read by the model / not in the form)", threshold: "0", fact: `${deadInModel.length} not read${deadInModel.length ? ` (${deadInModel.join(", ")})` : ""}; ${notInForm.length} not in form${notInForm.length ? ` (${notInForm.join(", ")})` : ""}`, status: deadInModel.length + notInForm.length ? "RED" : "GREEN" },
    { id: "I6", item: "Support schemes change the base verdict (39 examples)", threshold: "0", fact: supportMoves.length ? supportMoves.join(", ") : "0", status: supportMoves.length ? "RED" : "GREEN" },
    { id: "I7", item: "Market values undated, or > 400 days old and not re-checked", threshold: "0", fact: `${undated} undated, ${stale} stale of ${market.length}${stale ? ` (${staleList.map((p) => p.id.replace("econ.", "")).join(", ")})` : ""}; LOW confidence ${marketLow} (${pct(marketLow / market.length)})`, status: undated + stale ? "RED" : "GREEN" },
  ] },
  { name: "Performance efficiency", rows: [
    // Applied throttling measures the real paint on a slow phone; Lantern's simulation also waits for async scripts requested
    // before the observed LCP. GREEN needs both; AMBER when only the applied run passes.
    { id: "P1", item: "Largest Contentful Paint (lab mobile)", threshold: "≤ 2.5 s", fact: webFact(`applied ${(worst("lcpAppliedMs") / 1000).toFixed(2)} s, simulated ${(worst("lcpMs") / 1000).toFixed(2)} s`), status: !web ? "GREY" : worst("lcpAppliedMs") > 2500 ? "RED" : worst("lcpMs") > 2500 || webStale ? "AMBER" : "GREEN" },
    { id: "P2", item: "Interaction to Next Paint (field p75) — self-assessed lab proxy", threshold: "≤ 200 ms", fact: web ? `no field data; TBT ${webFact(`applied ${worst("tbtAppliedMs")} ms, simulated ${worst("tbtMs")} ms`)}` : "not measured", status: !web ? "GREY" : Math.max(worst("tbtMs"), worst("tbtAppliedMs")) > 600 ? "RED" : "AMBER" },
    { id: "P3", item: "Cumulative Layout Shift", threshold: "≤ 0.1", fact: webFact(worst("cls").toFixed(3)), status: webStatus(worst("cls") <= 0.1) },
  ] },
  { name: "Compatibility", rows: [
    { id: "C1", item: "Stripe end to end: checkout → webhook → email → report", threshold: "passes in test mode", fact: evidence.stripeE2e ? `${evidence.stripeE2e.pass ? "passed" : "FAILED"} ${evidence.stripeE2e.mode} ${evidence.stripeE2e.date}` : "never run against Stripe (unit tests mock it)", status: !evidence.stripeE2e ? "GREY" : evidence.stripeE2e.pass ? "GREEN" : "RED" },
  ] },
  { name: "Interaction capability", rows: [
    { id: "U1", item: "Task success in moderated sessions", threshold: "≥ 90 %, n ≥ 5 people", fact: us ? `${share(us.succeeded, us.attempts)}, ${us.participants} people, ${us.date}` : "no sessions run", status: !us ? "GREY" : us.succeeded / us.attempts < 0.9 ? "RED" : us.participants < 5 ? "AMBER" : "GREEN" },
    { id: "U2", item: "Median time to first verdict", threshold: "≤ 5 min", fact: us ? `${(us.medianSecondsToVerdict / 60).toFixed(1)} min` : "not measured", status: !us ? "GREY" : us.medianSecondsToVerdict > 300 ? "RED" : us.participants < 5 ? "AMBER" : "GREEN" },
    { id: "U3", item: "WCAG 2.2 AA: axe serious/critical + keyboard (self-check)", threshold: "0 and keyboard pass", fact: `${web ? `axe ${axeFailed.length ? axeFailed.join("; ") : "0"} (${web.date})` : "axe not run"}; keyboard ${kb ? `${kb.pass ? "pass" : "FAIL"} ${kb.date}${isStale(kb) ? " STALE" : ""}` : "not checked"}`, status: axeFailed.length || (kb && !kb.pass) ? "RED" : !web ? "GREY" : !kb || webStale || isStale(kb) ? "AMBER" : "GREEN" },
    { id: "U4", item: "Hard l10n errors (QA ratchet KNOWN, 25 locales)", threshold: "0", fact: `${knownL10n} known (dnt, units, abbreviations), of which ${ownerUnits} fi/vi/th unit words kept by owner decision; new ones fail qa.test.ts`, status: knownL10n ? "RED" : "GREEN" },
  ] },
  { name: "Reliability", rows: [
    testRow("Re1", "Fault tolerance: hostile input, properties, sweeps", ["src/core/__tests__/hostile-input.test.ts", "src/core/__tests__/properties.test.ts", "src/core/__tests__/regressions-sweep.test.ts", "src/server/__tests__/operations.test.ts"]),
    { id: "Re2", item: "Database restore drill (PITR)", threshold: "passed", fact: evidence.restoreDrill ? `${evidence.restoreDrill.pass ? "passed" : "FAILED"} ${evidence.restoreDrill.date}, ${evidence.restoreDrill.minutes} min` : "not done (no production database yet)", status: !evidence.restoreDrill ? "GREY" : evidence.restoreDrill.pass ? "GREEN" : "RED" },
  ] },
  { name: "Security", rows: [
    { id: "S1", item: "OWASP ASVS L1 (payments, tokens L2) — self-assessment", threshold: "all applicable verified", fact: `${share(asvs.filter((x) => x.status === "pass").length, asvs.length)} ${asvsDate} (${asvsStd}); fail: ${asvs.filter((x) => x.status === "fail").map((x) => x.id).join(", ") || "—"}; unverified: ${asvs.filter((x) => x.status === "unverified").map((x) => x.id).join(", ") || "—"}`, status: asvs.some((x) => x.status === "fail") ? "RED" : asvs.some((x) => x.status === "unverified") ? "AMBER" : "GREEN" },
    testRow("S2", "Security tests: CSRF, rate limit, payments, storage", ["src/server/__tests__/admin-csrf.test.ts", "src/server/__tests__/rate-limit.test.ts", "src/server/__tests__/payments.test.ts", "src/server/__tests__/storage.test.ts"]),
  ] },
  { name: "Maintainability", rows: [
    quick ? { id: "M1", item: "Test suite", threshold: "0 failing", fact: "not run (--quick)", status: "GREY" } : (() => { const all = [...tests.values()]; const failed = all.reduce((s, f) => s + f.failed, 0); return { id: "M1", item: "Test suite", threshold: "0 failing", fact: `${failed} failing of ${all.reduce((s, f) => s + f.passed + f.failed, 0)} in ${all.length} files`, status: failed ? "RED" : "GREEN" } as Row; })(),
    { id: "M2", item: "Type errors (tsc --noEmit)", threshold: "0", fact: typeErrors === null ? "not run (--quick)" : String(typeErrors), status: typeErrors === null ? "GREY" : typeErrors ? "RED" : "GREEN" },
    { id: "M3", item: "Lint errors (eslint)", threshold: "0", fact: lintErrors === null ? "not run (--quick)" : `${lintErrors} errors, ${lintWarnings} warnings`, status: lintErrors === null ? "GREY" : lintErrors ? "RED" : "GREEN" },
  ] },
  { name: "Flexibility", rows: [
    { id: "F1", item: "Every example runs in every country", threshold: "0 errors", fact: `${unexpected} errors of ${EXAMPLES.length * COUNTRY_ORDER.length}${errors.length ? `: ${errors.slice(0, 2).join("; ")}` : ""}`, status: unexpected ? "RED" : "GREEN" },
    testRow("F2", "25 interface locales and 24 model catalogs complete", ["src/i18n/__tests__/dict.test.ts", "src/i18n/__tests__/core-catalog.test.ts"]),
  ] },
  { name: "Safety", rows: [
    { id: "Sa1", item: "Hazard register (methane, H₂S, confined space) on every case", threshold: "0 missing", fact: `${noHazards} of ${assessed} missing`, status: noHazards ? "RED" : "GREEN" },
    testRow("Sa2", "INSUFFICIENT_DATA is never sold", ["src/server/__tests__/payments.test.ts"], /INSUFFICIENT_DATA/),
  ] },
];

/* ---------- print ---------- */

const all = groups.flatMap((g) => g.rows);
const width = (k: keyof Row, max: number) => Math.min(max, Math.max(...all.map((r) => r[k].length)));
const [wi, wt] = [width("item", 58), width("threshold", 24)];
console.log(`Methalytics quality scorecard · ${new Date().toISOString().slice(0, 10)} · ${git("rev-parse", "--short", "HEAD")}${git("status", "--porcelain") ? " + uncommitted changes" : ""} · data ${DATA_REVIEW_AS_OF}`);
for (const g of groups) {
  console.log(`\n${g.name}`);
  for (const r of g.rows) console.log(`  ${r.id.padEnd(4)} ${r.status.padEnd(5)}  ${r.item.padEnd(wi)}  ${r.threshold.padEnd(wt)}  ${r.fact}`);
}
const count = (s: Status) => all.filter((r) => r.status === s).length;
console.log(`\n${all.length} items: GREEN ${count("GREEN")} · AMBER ${count("AMBER")} · RED ${count("RED")} · GREY ${count("GREY")} (not measured)`);

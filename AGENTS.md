# Methalytics

Web product for the **preliminary techno-economic screening of biogas and biomethane
projects** in 33 countries and 25 languages. A free screening, then two automated paid
reports (`standard`, `report`) for one locked project, delivered by private link.
It is not design documentation, a bankable feasibility study or an expert service: it
tells the client whether a detailed feasibility study is worth paying for.

Start here, then read only what the task needs:

| Need | Where |
|---|---|
| Users, business, flow, critical calculations, open hypotheses | [docs/ai/PRODUCT.md](docs/ai/PRODUCT.md) |
| Current state, next steps, what is blocked | [docs/ai/STATUS.md](docs/ai/STATUS.md) |
| Decisions already taken and why (do not relitigate without new evidence) | [docs/ai/DECISIONS.md](docs/ai/DECISIONS.md) |
| Market data: source policy, official sources per country, refresh cadence | [docs/ai/DATA-SOURCES.md](docs/ai/DATA-SOURCES.md) |
| Rules for `src/core/**` and `src/countries/**` | `.claude/rules/core-model.md`, `.claude/rules/country-data.md` |
| Procedures (expert review, market-data update, sector calibration) | `.claude/skills/*/SKILL.md` |

The source of truth for formulas, parameters and their provenance is the code
(`src/core`, `src/countries`), shown to users on `/[lang]/methodology` via `allProvenance`.
Do not copy parameters into Markdown.

## How to work

- **Everything is a hypothesis.** Code, formulas, assumptions, data and the owner's
  instructions are the current state, not the truth. When you find something more accurate,
  newer, simpler or economically stronger: verify it in authoritative sources (date,
  geography, units, applicability to the country), explain the benefit plainly, then
  propose or make the change. Never tune inputs toward a positive verdict.
- **Think as the whole team** on non-trivial work: biogas/biomethane engineer, energy and
  industrial developer, financial and data analyst, product strategist, software
  architect, QA/security, CEO. The `expert-review` skill holds the checklist.
- **Be a mentor.** Flag weak spots, wrong assumptions and gaps even if not asked; offer the
  stronger alternative; explain simply, with the practical consequence first.
- **Plan yourself, ask rarely.** Ask only when a decision is genuinely the owner's
  (pricing, legal, scope). Otherwise decide, state the assumption, continue.
- **Label evidence**: Measured / User Input / Market Data / Engineering Assumption /
  Calculated Value. Never claim accuracy, freshness, bankability or expert review without proof.
- **External data**: official, regulatory, scientific or recognised industry sources only,
  latest published period. Third-party copies, news and broker data are not sources of
  numbers. No official source reachable → keep the value, mark confidence LOW and say why.

## Critical invariants

- Bases never mix: fresh mass / TS / VS; Nm³ biogas ≠ Nm³ CH₄ ≠ Nm³ biomethane; kW ≠ kWh;
  HHV vs LHV stated; currency and year stated.
- Mass, methane, energy and money balances close with no double counting
  (`src/core/__tests__/audit-balances.test.ts`).
- Subsidies are a separate case and never change the base verdict.
- The model is pre-tax screening, not after-tax and not bankable.
- Wastewater (COD), landfill and existing biogas enter as gas streams, never as invented feedstock.

## Commands (PowerShell: use `npm.cmd`)

- Verify: `npm test` · `npm run lint` · `npm run typecheck` · `npm run build`
- One test file: `npx vitest run src/core/__tests__/market-calibration.test.ts`
- Model impact of any data/formula change:
  `npx tsx scripts/compare-scenarios.ts --save <before.json>` before, `--save <after.json>` after,
  then `--diff <before.json> <after.json>` (all 39 examples × 33 countries).
- Market data refresh: `python -I scripts/data/fetch_statistics.py --output <tmp.json>` (dry run) or `--write`.
- Data quality audit: `npx tsx scripts/audit-sources.ts` (LOW, undated, non-official sources).
- Quality contract: `npm run scorecard` (item / threshold / fact / status; `-- --quick` skips tests, tsc, lint;
  `-- --web <url>` records Lighthouse + axe of a running `APP_ENV=local next start`). Tie every change to an item.

Say what you ran and what you did not.

## Working rules

- Start with `git status`; never touch others' unfinished changes; never read `.env*`.
- One-off scripts, downloads and screenshots go to the system temp folder, never the repo.
- No new reports, analysis or data-dump files anywhere in the repo; research write-ups for the owner go to chat or
  the owner's documents, not to `docs/`.

## Project memory (`docs/ai/`): default is to write nothing

Write a line only if ALL four hold; otherwise leave the files untouched and say "docs/ai not changed" in the answer:
1. **Changes future behaviour**: a decision taken, a constraint, an open owner decision, a blocked source, or a change
   tried and reverted, without which a later session would act differently or redo the work.
2. **Not recorded elsewhere**: not in code, tests, a parameter's `source`, the commit message or git history.
3. **Verified**: primary source read or measured by a script. "Not opened", "from listings", "assumption",
   "unconfirmed" are not findings; a gap worth tracking is one line in STATUS "Next work".
4. **Not a log**: no session summaries, "done" items, verdict/NPV counts of a change (commit message) or chat answers.

Where: STATUS = current state and next steps, overwritten, ≤ 40 lines. DECISIONS = `date — decision — why — where
enforced`, ≤ 4 lines, replaces the line it supersedes. PRODUCT = client, decision, market position, roadmap.
DATA-SOURCES = where to get data, blocks, cadence. Before adding, delete what the change made stale.
`src/__tests__/project-docs.test.ts` enforces the size limits and the file list.
- **Every user-facing text, in all 25 languages, is written as a native specialist of that language would write it**
  (names, headings, buttons, emails, SEO, reports): start from the meaning and the reader, use that country's own terms
  and word order, never a word-for-word copy of the English. Then revise it as a second native linguist would. It is still
  machine-written: never claim native review; the localization skill holds the procedure.

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

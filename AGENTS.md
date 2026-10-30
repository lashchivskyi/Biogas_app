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
| Procedures (expert review, market-data update) | `.claude/skills/*/SKILL.md` |

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

Say what you ran and what you did not.

## Working rules

- Start with `git status`; never touch others' unfinished changes; never read `.env*`.
- One-off scripts, downloads and screenshots go to the system temp folder, never the repo.
- No new reports or analysis files. Persistent knowledge lives only in `docs/ai/` (4 files) and
  skills. Before finishing a task that changed direction, data or a rule: update
  `docs/ai/STATUS.md` (rewrite, ≤ 40 lines) and append to `DECISIONS.md` only what a future
  session must not rediscover. Delete stale lines instead of adding new ones.
- Research done by helper agents must end in code, tests or `docs/ai/`, never only in chat.

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

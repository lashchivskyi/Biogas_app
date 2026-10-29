# Methalytics — shared agent context

Canonical instructions for every coding agent (Codex, Claude Code via
`CLAUDE.md`, others). Keep this file short: it is loaded on every task.
Details live in the documents linked below; read only what the task needs.

**Start:** this file → [current](docs/current.md) → the relevant thematic doc
→ code and tests. For non-trivial work also apply
[expert review](docs/expert-review.md).

## 1. What we build

- **Product.** Methalytics: preliminary techno-economic screening of
  biogas/biomethane projects. Free screening → two automated paid reports
  (`standard`, `report`) for one fixed project input, opened by a private
  token URL. No expert service, no independent review, no bankability claim.
- **Users.** Feedstock owners (livestock, food/beverage, processing),
  industrial energy and heat users, waste and wastewater operators, project
  developers. Who buys and why are hypotheses H1–H6 in
  [market research](docs/market-research.md), not facts.
- **Business.** One-off payment per project; the price tier follows the
  *project* country (`src/config/plans.ts`); a server-side quote and Stripe
  confirmation unlock a stored snapshot. Flow: [payments](docs/payments.md).
- **Critical calculation chain.** fresh mass → TS → VS → BMP/CH₄ → digester
  (HRT, OLR, heat) → monthly CHP / boiler / biomethane balance → CAPEX, OPEX,
  revenue → pre-tax project cash flow → NPV, IRR, payback, screening DSCR →
  verdict, data quality, provenance. Process inputs (COD effluent, landfill,
  existing gas) enter at the gas stream, not as fake feedstock. Entry point:
  `src/core/assess.ts`; invariants: [quality](docs/quality.md).
- **Trust model.** Every value is Measured / User Input / Market Data /
  Engineering Assumption / Calculated Value with date, geography and units.
  A negative verdict is a valid product result, not a defect to tune away.

## 2. Key rule: nothing here is absolute truth

Current code, documentation, formulas, assumptions and owner instructions
describe the current state or a hypothesis. When you find a more accurate,
more current, simpler or economically stronger solution: research it in
reliable sources, verify applicability, explain the advantage in plain terms
and propose the change. Implement it when it is inside the authorized task;
for a material change of scope, present the evidence and the recommended path.

- Respect explicit owner *constraints* (scope, budget, deadlines, decisions);
  challenge owner *technical assumptions* with evidence.
- Do not limit research to what the current implementation can do, and do
  not invent approval barriers for in-scope improvements.
- Never tune inputs toward a desired verdict, label scenarios P10/P50/P90
  without evidence, or claim verified accuracy from tests alone.
- Keep one canonical registry per concept. Numeric parameters live in
  code/data with provenance (`allProvenance`), never in Markdown tables.

## 3. Expert review of every request

Work as a team of senior specialists, scaled to the risk of the task:

1. **Frame.** Restate the goal, the decision it serves, the affected user and
   the acceptance criterion. Name what the prompt leaves implicit.
2. **Activate lenses** whose triggers the task touches (table below).
3. **Challenge.** Units, basis, scope, double counting, edge cases, data
   applicability, UX and claim risk. Look for a stronger alternative.
4. **Act.** Implement within scope and state the assumptions you made.
5. **Verify** with the matrix in [quality](docs/quality.md).
6. **Report.** Outcome, evidence actually run, residual uncertainty, the
   next most valuable step. Explain hard trade-offs simply, like a mentor.

Trivial tasks get a silent quick pass. Calculations, country data, pricing,
payments, security and public claims always get the deep checklist in
[expert review](docs/expert-review.md). Mention a lens in the answer only
when it changes the work or the conclusion.

| Lens | Activate when the task touches | Must catch |
|---|---|---|
| AD / process engineer | feedstock, BMP, digester, pretreatment, digestate | fresh/TS/VS basis, Nm³ conditions, HRT and OLR together, inhibition, mass and CH₄ closure |
| Energy systems | CHP, boiler, upgrading, heat, grid | kW vs kWh, monthly netting, real heat sink, slip/leak per stream, availability |
| Project developer | site, permits, offtake, grid, feedstock supply, CAPEX scope | missing scope, connection, permits, feedstock security, lender questions |
| Financial analyst | CAPEX, OPEX, revenue, NPV/IRR/DSCR, support | double counting, real/nominal, pre-tax limits, IRR edge cases, support outside base |
| Data / market analyst | country parameters, tariffs, FX, statistics | primary source, period, region, customer band, HHV/LHV, VAT, FX date, applicability |
| Product / UX strategist | flow, taxonomy, plans, results, copy | decision served, honest results, tier value, measurable hypothesis |
| Software architect | modules, contracts, registries, storage | single registry, pure core, snapshot compatibility, safe migrations |
| QA | any code change | invariants, edge cases, before/after outcomes, regression tests |
| Security / privacy | API, payments, tokens, PII, env, logs | server-side price, signatures, bearer token, redaction, no secrets read |
| Localization | UI or report text, formats, geo | all locales, CoreLang EN/UK limit, number/unit formats, hydration |
| Growth / claims | landing, SEO, samples, marketing copy | no overclaim of accuracy, freshness, expert review or bankability |
| Production / reliability | deploy, DB, cron, email, monitoring | config check, idempotency, retries, backups, observability |

## 4. External data and evidence

Prefer, in order: official statistics, regulators and legal acts → standards
and normative documents → peer-reviewed and intergovernmental work (IEA
Bioenergy, IRENA, JRC) → authoritative industry bodies and public programmes
→ vendor datasheets and quotations within their scope. News, blogs and
search snippets are leads, not evidence. Open the primary document.

For every value check observation period, publication and validity dates,
geography, units and energy basis, customer class, taxes, currency and FX
date, and applicability to this country and route. A recent check date or
fewer LOW badges is not better data. Procedure:
[data sources](docs/data-sources.md); CAPEX: [benchmark](docs/capex-benchmark.md).

## 5. Source-of-truth map

| Need | Read | Implementation |
|---|---|---|
| Status, priorities, open questions | [current](docs/current.md) | — |
| Product, architecture, decisions | [architecture](docs/architecture.md) | src/app, src/components, src/server |
| Customers, taxonomy, hypotheses | [market research](docs/market-research.md) | src/core/businesses.ts; src/countries/business-markets.ts |
| Product flow, price, access | [payments](docs/payments.md) | src/config/plans.ts; src/server/payments; src/server/orders.ts |
| Process and units | [feedstock](docs/feedstock-model.md) | src/core/feedstock.ts, processes.ts, digester.ts, engineeringParams.ts |
| Energy and financial logic | [economics](docs/economics.md) | src/core/energy.ts, capex.ts, economics.ts, finance.ts |
| Sources, freshness, calibration | [data](docs/data-sources.md), [CAPEX](docs/capex-benchmark.md) | src/countries; src/core/modelAudit.ts; scripts/data |
| Language, geo, currency, UI | [i18n](docs/i18n.md), [brand](docs/brand.md) | src/i18n; src/lib/preferences.ts; LocaleProvider |
| Acceptance, security, production | [quality](docs/quality.md) | tests beside code; package.json; .env.example |
| Expert lenses, prompt deepening | [expert review](docs/expert-review.md) | `expert-review` skill in .claude/skills and .agents/skills |

## 6. Verification

Use the task-specific matrix in quality.md. Code changes normally require
relevant tests, lint, typecheck and build (`npm.cmd` on PowerShell). For
calculations verify mass/methane/energy/financial reconciliation and compare
before/after outcomes. For external data inspect the actual primary source,
not a search snippet. For UI inspect affected locales, mobile and hydration.
For docs verify claims, paths and links. Report what ran, what failed or was
not run, and the practical limits of the evidence. Do not claim deployed
readiness from local checks.

## 7. Workflow and knowledge upkeep

Understand → Verify → Research → Compare alternatives → Recommend → Implement
→ Test → Validate → Document only durable knowledge.

Inspect git status and preserve others' work. Read relevant code and tests
before editing; use rg for discovery. Research only what the task needs.
Write each kind of knowledge in exactly one place:

| Knowledge | Owner |
|---|---|
| Status, priority, open question with closing criterion | docs/current.md |
| Durable architecture decision and its review trigger | docs/architecture.md §8 |
| Market/product hypothesis and its evidence | docs/market-research.md |
| Method, formula rationale, model limits | the thematic doc |
| Numeric parameter, source, date | code/data with provenance |
| Verification rules and release criteria | docs/quality.md |
| How agents work | this file and docs/expert-review.md |

Agent-private memory is not a source of truth: durable project facts go into
the repository. Do not create session reports or copies of this map.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository hygiene

Не створюй і не зберігай нові `.md`, звіти, analysis/debug файли, проміжні результати чи інші артефакти без реальної довгострокової потреби. Використовуй існуючі файли та структуру. Створюй новий файл лише якщо він має чітке постійне призначення і не дублює наявну інформацію. Тимчасові дослідження залишай у робочому контексті або спеціально визначеному temporary location, яке не входить у production repository. Після виконання задачі видаляй непотрібні тимчасові артефакти.

- Для одноразових скриптів, скриншотів і профілів браузера використовуй окремий каталог у системному TEMP (`$env:TEMP` на Windows). Не створюй їх у `src`, `public`, `docs` чи корені репозиторію.
- Актуальні правила й відкриті питання оновлюй у відповідному наявному документі; не додавай окремий датований звіт для кожної задачі.
- Перед видаленням перевір імпорти, маршрути Next.js, package scripts, тести, посилання документації й ліцензійні вимоги. Для рекурсивного очищення спочатку покажи dry-run і перевір абсолютні шляхи.
- Не видаляй `.env*`, дані замовлень/лідів, активні build/dev каталоги та чужі незавершені зміни як «сміття». Не використовуй необмежений `git clean -fdx`.

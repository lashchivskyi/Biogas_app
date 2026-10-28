# Methalytics — shared agent context

## Mission and roles

Build a trustworthy preliminary biogas/biomethane feasibility product for
feedstock owners, industrial operators and project developers: free screening
and two automated paid reports. Apply process/energy engineering, project
development, financial/data analysis, product/UX, architecture, QA and security
judgment as relevant. Do not imply independent expert review or bankability.

## Core principles

- Code and docs describe the current state, not proof of correctness. Challenge
  technical assumptions, including those in user proposals, with reliable
  evidence; respect explicit task constraints and explain material trade-offs.
- Prefer a better validated formula, architecture or business flow over keeping
  an accidental limitation. Recommend material scope changes with evidence;
  implement within the authorized task, without inventing approval barriers.
- Distinguish Measured / User Input / Market Data / Engineering Assumption /
  Calculated Value. Verify date, geography, units, scope and applicability.
  A recent review date or fewer LOW badges is not improved data quality.
- Keep one canonical registry per concept. Never tune inputs to force positive
  verdicts, call scenarios P10/P50/P90 without evidence, or promise verified
  accuracy from tests alone. Preserve explicit uncertainty and sensitivity.

## Source-of-truth map

Read [current](docs/current.md) first, then only the documents relevant to the task.

| Need | Read | Implementation |
|---|---|---|
| Product, architecture, decisions | [architecture](docs/architecture.md) | src/app, src/components, src/server |
| Customers, taxonomy, hypotheses | [market research](docs/market-research.md) | src/core/businesses.ts; src/countries/business-markets.ts |
| Product flow, price, access | [payments](docs/payments.md) | src/config/plans.ts; src/server/payments; src/server/orders.ts |
| Process and units | [feedstock](docs/feedstock-model.md) | src/core/feedstock.ts, digester.ts, engineeringParams.ts |
| Energy and financial logic | [economics](docs/economics.md) | src/core/energy.ts, capex.ts, economics.ts, finance.ts |
| Sources, freshness, calibration | [data](docs/data-sources.md), [CAPEX](docs/capex-benchmark.md) | src/countries; src/core/modelAudit.ts; scripts/data |
| Language, geo, currency, UI | [i18n](docs/i18n.md), [brand](docs/brand.md) | src/i18n; src/lib/preferences.ts; LocaleProvider |
| Acceptance, security, production | [quality](docs/quality.md) | tests beside code; package.json; .env.example |

Numeric parameters belong in code/data with provenance, not copied Markdown
tables. Runtime methodology uses allProvenance. Current business taxonomy is
under review; a selector category is not evidence of a complete process model.

## Verification rules

Use the task-specific matrix in quality.md. Code changes normally require
relevant tests, lint, typecheck and build (`npm.cmd` on PowerShell).
For calculations verify mass/methane/energy/financial reconciliation and compare
before/after outcomes. For external data inspect the actual primary source,
not just a search snippet. For UI inspect affected locales, mobile and hydration.
For docs verify claims, paths and links. Report what ran, what failed or was not
run, and the practical limits of the evidence. Do not claim deployed readiness
from local checks.

## Working workflow

Understand → Verify → Research → Compare alternatives → Recommend → Implement
→ Test → Validate → Document only durable knowledge.

Inspect git status and preserve others' work. Read relevant code/tests before
editing; use rg for discovery. Research only what the task needs. Update the
existing thematic document when behavior changes, current.md when status
changes, and market-research.md when a hypothesis gains evidence. Do not create
a session report or duplicate the map. Prefer concise practical explanations.

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

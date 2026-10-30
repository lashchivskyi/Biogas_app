---
name: market-data-update
description: Refresh or correct Methalytics market data (prices, tariffs, FX, wages, grid factors, support schemes) for one or more countries from official sources, and measure the effect on results. Use for "update prices/tariffs/data", "check sources", or a weekly data refresh.
---
1. Read `docs/ai/DATA-SOURCES.md` (policy, sources, blocked items) and run
   `npx tsx scripts/audit-sources.ts` to list LOW, stale or non-official values.
2. Snapshot results: `npx tsx scripts/compare-scenarios.ts --save $TEMP/before.json`.
3. Automated data: `python -I scripts/data/fetch_statistics.py --output $TEMP/stats.json`, review
   changed periods and `refreshErrors`, then `--write`.
4. Manual items: fetch the official page (API, CSV, PDF; Wayback of the official page if blocked).
   Record value, unit, basis, period, URL. If only third-party copies exist, do not use the number:
   keep the old value as LOW with the reason.
5. Edit `src/countries/sources.ts` / `market-observations.json` / `profiles.ts`; keep source strings short.
6. Run `npx tsx scripts/compare-scenarios.ts --save $TEMP/after.json` and
   `--diff $TEMP/before.json $TEMP/after.json`; explain every verdict change by its cause.
7. Run all checks (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`).
8. Update `docs/ai/DATA-SOURCES.md` (sources, blocks, cadence) and `docs/ai/STATUS.md`.

Parallel research helpers are worth it only for several independent countries; give each the full
source policy, ask for a compact table (value | unit/basis | period | official URL | access | confidence).

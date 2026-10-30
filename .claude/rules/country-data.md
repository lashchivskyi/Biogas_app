---
paths:
  - "src/countries/**"
  - "scripts/data/**"
---
- Follow the source policy in `docs/ai/DATA-SOURCES.md`: official/primary sources, latest period,
  no third-party copies. Unreachable official source → keep value, confidence LOW, reason in `source`.
- Every value states unit, basis (excl. VAT, HHV/LHV, consumer band), period, currency and the FX date.
- Local-currency quotes go in `LOCAL_QUOTES` with their observation date; FX revaluation never moves it.
- Regional values use GeoNames admin1 codes (`US.CA`); the national value stays the fallback.
- Hand-edit `statistics.json` only for values the fetch script cannot get, and make the script preserve them.
- After changes: `npx vitest run src/core/__tests__/market-calibration.test.ts`, then the full checks,
  then update `docs/ai/DATA-SOURCES.md` if a source, block or cadence changed.

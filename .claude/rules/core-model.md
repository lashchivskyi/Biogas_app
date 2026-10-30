---
paths:
  - "src/core/**"
---
- Before changing a formula or engineering parameter: find the primary source (standard, regulation,
  DBFZ/KTBL/FNR/IEA Bioenergy, peer-reviewed), record it in the parameter's `source` with its date,
  and set confidence honestly (HIGH = published value used directly, LOW = judgement).
- Keep balances closing: run `npx vitest run src/core/__tests__/audit-balances.test.ts`.
- Any change that moves results: snapshot with `scripts/compare-scenarios.ts` before and after and
  report verdict changes and NPV shifts with their cause.
- Tests that assert old values: update them only when the new value is better evidenced; say why.
- Never let support schemes change the base verdict; never add data that a user input should override
  without keeping the override path.

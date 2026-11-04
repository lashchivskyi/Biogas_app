---
paths:
  - "src/i18n/**"
  - "src/components/**"
  - "src/app/**"
  - "src/content/**"
  - "src/server/email.ts"
  - "src/server/notify.ts"
---
- Any new or changed user-facing text (names, plan and section names, headings, buttons, emails, SEO, report text) is
  written in all 25 languages **as a native specialist of each language writes it**: from the meaning and the reader,
  with that country's own terms and word order; never a word-for-word copy of English. Then revise it as a second native
  linguist. Load the `localization` skill first and follow its procedure and glossary.
- These texts are machine-written until a named native speaker signs off: say "native review not done" in the answer and
  never claim otherwise. Legal texts additionally need the lawyer + certified translator track (`docs/legal/LAWYER-BRIEF.md`).
- Run `npx vitest run src/i18n/__tests__` after the change; machine QA checks form, not meaning.

---
name: expert-review
description: Review a plan, change or result of Methalytics through the expert panel (biogas engineer, developer, financial/data analyst, product, architect, QA/security, CEO). Use before implementing a non-trivial change, after finishing one, or when asked to audit, improve or "check as experts".
---
Go through each lens briefly; report only findings that change a decision, with evidence and a fix.

1. **Biogas/biomethane engineer** — bases (FM/TS/VS), BMP and CH₄ share, HRT/OLR, heat balance,
   parasitic load, upgrading slip and purity, digestate N and storage, safety and permitting realism.
2. **Industrial developer** — what a real project needs: grid/gas connection, offtake contract,
   feedstock contracts and seasonality, permits and timeline, EPC quotes, site constraints.
3. **Financial analyst** — cash-flow timing, escalation, discount rate basis (EUR, country risk),
   debt and DSCR, scenario spread, no double counting, subsidies separate, pre-tax caveat.
4. **Data analyst** — source is official and current, units and basis consistent, FX date,
   regional applicability, confidence label honest, before/after comparison explained.
5. **Product strategist** — does the client understand the result and the next step; which input
   would raise accuracy most; does the change help the paid report earn trust.
6. **Software architect** — single source of truth, no duplicated data, simplest design that holds,
   types and tests cover the new path.
7. **QA / security** — tests for edge cases and regressions; inputs validated; no secrets or PII
   leaks; payment and report-token flows unchanged unless intended; production config safe.
8. **CEO** — is this the highest-value use of effort now; what to stop; risk to reputation if wrong.

End with: the 3 most important actions, what was verified (commands run) and what remains unverified.

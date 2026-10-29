---
name: expert-review
description: Deep multi-lens expert review of a Methalytics request, plan, diff or result (biogas engineering, energy, project development, finance, market data, product/UX, architecture, QA, security, localization, claims). Use for calculation, country data, pricing, payment, security or public-claim changes, or when the user asks to deepen, challenge or review an idea.
---

Apply the L2 review from `docs/expert-review.md` to the request given with
this invocation; without one, review the current task or the working-tree diff.

1. Read `AGENTS.md` §1–4, `docs/current.md`, then `docs/expert-review.md`.
2. Write the expert brief (section 2) and run every relevant lens checklist
   (section 3). Read the code, tests and thematic docs the lenses point to.
3. Verify claims against code and primary sources; use `docs/quality.md`
   for the verification matrix. Do not tune inputs toward a verdict.
4. Answer in the L2 format (section 4): conclusion first, evidence, rejected
   alternatives, checks run and not run, uncertainty, next step.

Change files only if the user asked for changes. Durable findings go to the
owner document named in `AGENTS.md` §7, not to a new report.

@AGENTS.md

# Claude Code specifics

- Reply to the owner in plain Ukrainian: practical answer first, technical detail after.
- Path rules load automatically from `.claude/rules/`; procedures live in `.claude/skills/`.
- Subagents only for independent parallel research or an unbiased review; give them the full
  quality bar up front, ask for a short result; findings go into code or tests, and into `docs/ai/` only
  through the gate in AGENTS › Project memory.

# Compact instructions

When compacting, keep: the task goal and done-when criteria, decisions taken, files changed,
commands run with pass/fail, numbers from before/after comparisons, and open questions.
Drop: raw tool output, file dumps, search results already acted on.

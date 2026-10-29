@AGENTS.md

Спільні правила й карта знань зберігаються в AGENTS.md. Цей файл — лише
сумісний вхід для Claude Code; не дублюйте тут інструкції або статус проєкту.

Специфічне для Claude Code:

- `/expert-review` (`.claude/skills/expert-review`) запускає глибокий L2-review
  за [docs/expert-review.md](docs/expert-review.md); копія для Codex —
  `.agents/skills/expert-review`, обидва файли мають бути ідентичні.
- Auto memory не зберігає факти проєкту: сталий висновок записується в
  документ-власника з AGENTS.md §7, щоб інші агенти бачили той самий контекст.

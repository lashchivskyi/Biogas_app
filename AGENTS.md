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

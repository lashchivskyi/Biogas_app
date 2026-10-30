# Methalytics

Попередня техніко-економічна оцінка біогазових і біометанових проєктів:
безкоштовний screening і два автоматичні платні звіти.
Поточна модель допомагає відбирати концепції; точність для інвестиційного
рішення потребує незалежних даних конкретного майданчика.

## Запуск

`npm ci` → налаштування за [.env.example](.env.example) → `npm run dev`.
Локально без `DATABASE_URL` замовлення й ліди пишуться в `data/*.json`; production і
staging використовують Postgres (`npm run db -- migrate|import-json|export-json`).
Production-сервер не стартує з небезпечною конфігурацією (`src/server/config.ts`);
для локального `next start` задайте `APP_ENV=local`.
У Windows PowerShell використовуйте `npm.cmd`, якщо виконання npm.ps1 заборонено.
Режими Stripe/demo й зберігання налаштовуються через змінні з `.env.example`.
Не вмикайте demo для реальних продажів.

## Контекст для AI-агентів

Єдина інструкція для Claude Code і Codex — [AGENTS.md](AGENTS.md) (`CLAUDE.md` лише імпортує її).
Стан, рішення, продукт і джерела даних — у [docs/ai/](docs/ai/); процедури — у `.claude/skills/`.
Методологія на сайті використовує `allProvenance` з коду: окрему Markdown-копію параметрів не підтримуємо.

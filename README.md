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
Режими Stripe/demo й зберігання описані в [payments](docs/payments.md).
Не вмикайте demo для реальних продажів.

## Карта знань

Почніть з [AGENTS.md](AGENTS.md) і [поточного стану](docs/current.md).
Claude Code отримує ті самі правила через [CLAUDE.md](CLAUDE.md).
Інші агенти можуть використовувати AGENTS як стартовий контекст.

- [Архітектура, data flow, сталі рішення](docs/architecture.md).
- [Бізнеси, ринки, активні гіпотези](docs/market-research.md).
- [Product flow, плани, оплата й доступ](docs/payments.md).
- [Сировина та процес](docs/feedstock-model.md) · [енергія й економіка](docs/economics.md).
- [Джерела й оновлення даних](docs/data-sources.md) · [CAPEX benchmarks](docs/capex-benchmark.md).
- [Локалізація, країна, валюти й порядок відображення](docs/i18n.md) · [бренд](docs/brand.md).
- [Verification, engineering validity, security і production](docs/quality.md).

Команди перевірки — `npm test`, `npm run lint`, `npm run typecheck`,
`npm run build`; застосовність до задачі описана в quality.
Методологія на сайті використовує `allProvenance` з коду:
окрему Markdown-копію параметрів не підтримуємо.

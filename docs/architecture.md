# Архітектура та карта джерел істини

Опис звірено з кодом 2026-10-29. Статус і наступні пріоритети — [current.md](current.md).
Код визначає фактичну поведінку; першоджерела й незалежна перевірка визначають,
чи вона правильна. Документація пояснює зв'язки та рішення, не дублює реєстри.

## 1. Продукт і межі

Methalytics допомагає власникам сировини, промисловим підприємствам,
операторам відходів і девелоперам оцінити, чи варто переходити до детального
біогазового/біометанового feasibility. Поточний результат — попередній screening,
не проєктна документація, банківське ТЕО або гарантія прибутковості.

Безкоштовний калькулятор → два автоматичні платні звіти → доступ за приватним
посиланням. Монетизація й entitlement: [payments.md](payments.md).
Цільові сегменти та неперевірені комерційні припущення: [market-research.md](market-research.md).
Класифікація бізнесів є поточною реалізацією, яку власник просить переглянути.

## 2. Шари й відповідальність

| Шар | Джерело істини | Відповідальність |
|---|---|---|
| Runtime і tooling | `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json` | Версії, команди, build; Next.js App Router, React, TypeScript, Tailwind |
| Модель | `src/core/assess.ts`, `types.ts`, `context.ts` | Оркестрація розрахунку й контракти Input/Assessment; без HTTP/React/файлового I/O |
| Інженерні defaults | `src/core/engineeringParams.ts`, `feedstockData.ts`, `scenarios.ts` | Коефіцієнти, каталоги, діапазони й provenance |
| Ринки | `src/countries/index.ts`, `build.ts`, `sources.ts`, `profiles.ts`, `src/countries/data/` | CountryAdapter, офіційні ряди, fallback, тарифи, регуляторний контекст |
| Бізнес-сегменти | `src/core/businesses.ts`, `src/countries/business-markets.ts` | ID, групи, роль, scope, докази країни/регіону; не доказ попиту чи прибутку |
| Локалізація | `src/i18n/config.ts`, `index.ts`, `dict/`, тематичні каталоги | UI-мови, формати, тексти; EN — структура ключів, CoreLang — EN/UK |
| Shared context | `src/lib/preferences.ts`, `src/components/LocaleProvider.tsx`, `src/proxy.ts` | Країна проєкту, мова, валюти, локація; правила — [i18n.md](i18n.md) |
| Web/UI | `src/app/`, `src/components/`, `src/content/` | Маршрути, анкета, методологія, приклади, відображення результату |
| Server | `src/server/`, `src/app/api/`, `src/instrumentation.ts` | Zod validation, city lookup/signing, orders/leads (Postgres/JSON), quote, Stripe, email, admin auth, config check, error reporting |
| Зовнішні дані | `scripts/data/`, `src/server/data/locations.json` | Явне оновлення наборів, manifest, checksum, ліцензії; [data-sources.md](data-sources.md) |

Не вводьте нову паралельну таблицю цін, бізнесів, локалей або параметрів у UI.
Внутрішні модулі можуть імпортувати детальні core-контракти; `src/core/index.ts`
є публічним входом, а не доказом формально enforced dependency boundary.

## 3. Розрахунковий data flow

```mermaid
flowchart TD
  UI["Анкета / приклад"] --> INPUT["ProjectInput + CountryAdapter + asOfDate"]
  INPUT --> CTX["Локація, тарифний клас, Params, scenario"]
  DATA["Engineering defaults + country data + user overrides"] --> CTX
  CTX --> FEED["Feedstock: mass, VS, BMP, сезонність"]
  FEED --> DESIGN["Digester, підготовка, тепло, peak sizing"]
  DESIGN --> ENERGY["CHP / boiler / biomethane: місячні баланси"]
  ENERGY --> MONEY["CAPEX + OPEX + revenue"]
  MONEY --> FIN["Project cash flow, NPV, IRR, screening DSCR"]
  FIN --> RESULT["Assessment: routes, scenarios, verdict, quality, provenance"]
  RESULT --> VIEW["Безкоштовний результат / платний snapshot"]
```

`assess` запускає маршрути та сценарії; national support cases відділені від бази.
Legacy input `assumedSupportEurPerKwh` приймається для сумісності старих чернеток,
але виключається з бази з явним попередженням у результаті (`assess.ts`).
Сировина визначає газ і масштаб; назва підприємства не створює сировину.
`paramsForProject` враховує країну, регіон і клас споживання; підтверджувані
входи клієнта можуть замінювати референси. Місто змінює кліматичну основу,
але не доводить локальний тариф чи галузеву активність.

Методологія: [feedstock-model.md](feedstock-model.md) — сировина/процес,
[economics.md](economics.md) — енергія/фінанси; критерії балансів і межі —
[quality.md](quality.md). Опис технології high-rate/lagoon у результаті не
означає, що відповідний процес незалежно валідований.

`src/core/modelAudit.ts` визначає версію моделі, fallback дату статичних прикладів
і fingerprints. Live-виклики передають дату оцінки; вона не оновлює джерела.
Fingerprints виявляють зміни, але не є криптографічною гарантією чи сертифікатом.
`allProvenance` живить методологію; реєстр у Markdown не генерується.

## 4. Web і контекст

| Маршрут | Функція |
|---|---|
| `/[lang]`, `/[lang]/biogas`, `/[lang]/biogas/[slug]` | Позиціювання, цільові сегменти, редакційні матеріали |
| `/[lang]/calculator` | Бізнес → сировина → енергія → майданчик → screening |
| `/[lang]/methodology` | Реєстр параметрів вибраного ринку/локації; джерела зберігають одиниці |
| `/[lang]/samples`, `/[lang]/samples/[id]` | Змодельовані кейси з тією ж core-моделлю; не фактичні клієнтські звіти |
| `/[lang]/pricing`, `/[lang]/report/[token]` | Плани, оплата, серверна перевірка доступу й відображення snapshot |
| `/api/location`, `/api/cities` | IP-country підказка; локальний пошук GeoNames/ERA5 |
| `/api/checkout/quote`, `/api/checkout`, `/api/payments/*` | Серверна ціна, платіжна сесія, webhook/status |
| `/admin`, `/api/admin/*` | Замовлення/ліди, Basic auth; у production без credentials закрито |
| `/api/health`, `/api/cron/reconcile` | Uptime-probe сховища; захищена `CRON_SECRET` звірка незавершених оплат |

Статичні й динамічні маршрути визначає код сторінок, а не припущення, що весь
сайт SSG. Збережені проєкти й оплачені snapshots не переосмислюються при
перемиканні валюти. SSR/перший client render мають отримувати однаковий snapshot;
деталі hydration, geo та форматування — у [i18n.md](i18n.md).

`businessHref` веде кожен доступний сектор на окрему `/biogas/[slug]`, зокрема
з «Для кого», footer і довідника. Існуючі editorial URL збережено; нові сторінки
беруть локалізовані назви й приклади відповідного business ID з canonical
реєстрів. Не замінювати детальний перехід якорем довідника або чужим прикладом.
Усі напрями входять до `content/segments.ts:SEGMENTS` і використовують один
`SegmentPage` та `localizedSegment`: hero → чинники → умови → FAQ → бічна
картка модельного кейсу й планів. Окремого шаблону для нових бізнесів немає.
Невідомі показники залишаються «—»; відсутній кейс не замінюється чужим.

## 5. Локація та дані

`CitySelect` → `/api/cities` → `src/server/cities.ts` → локальні GeoNames/ERA5
assets. Production-пошук не потребує зовнішнього платного API.
HMAC прив'язує кліматичний snapshot до локації; `inputSchema` перевіряє підпис
і країну. Період клімату зафіксовано в manifest, новий рік не оновлює його сам.
Репрезентативні регіональні профілі залишаються сумісними зі старими вводами;
їх не слід вважати повним адміністративним реєстром.

Ринкові дані й клімат оновлюються окремими скриптами, не при кожному запиті.
Процедура оновлення, історичні зрізи й невідомості — [data-sources.md](data-sources.md).

## 6. Платежі, безпека та спостережуваність

Backend фіксує ціну, input і Assessment перед перенаправленням у Stripe.
Платіжне підтвердження відкриває збережений результат; return URL сам по собі
не підтверджує оплату. Report token є секретом доступу, email — контактним
полем, а не акаунтом. Повний flow й edge cases — [payments.md](payments.md).

Спостережуваність: `src/instrumentation.ts` перевіряє конфігурацію при старті
(`src/server/config.ts`) і передає серверні помилки в `src/server/monitoring.ts`:
JSON-лог без report token/email і, за SENTRY_DSN, Sentry envelope без SDK.
Клієнтські помилки браузера туди не потрапляють. Операційні листи власнику —
`src/server/notify.ts`. Security headers задає `next.config.ts`; CSP для
script/style ще не enforced (потрібні nonce).

`src/lib/analytics.ts` додає події до `window.dataLayer`. Це не підтвердження
підключення GTM/GA4 або наявності виміряної конверсії. Не надсилати туди
PII, повний ввід клієнта чи приватні URL. Вбудованого LLM, що генерує розрахунки,
зараз немає; можливий AI-продуктовий шар — окрема гіпотеза, не поточна функція.

## 7. Зберігання й експлуатація

`orders.ts` / `leads.ts` мають один repository-контракт і два сховища:

- **Postgres** (`DATABASE_URL`, `src/server/db.ts`, драйвер `pg`) — production і staging.
  Snapshot розрахунку зберігається окремою колонкою `json` (байт-у-байт), решта
  order — `jsonb` з індексами token/provider/payment refs. Оновлення статусу — у
  транзакції з `SELECT … FOR UPDATE`; лист покупцю — атомарний claim. Міграції —
  append-only масив `MIGRATIONS`, застосовуються при першому зверненні під advisory lock
  або `npm run db -- migrate`. Імпорт/експорт JSON: `npm run db -- import-json|export-json`.
- **JSON-файли** (`src/server/jsonFile.ts`) — локальна розробка й тести; у deployed
  середовищі лише явно `STORAGE=json` для одного інстансу з persistent volume.
  Кожен запит читає весь файл, тож для реального обсягу замовлень не придатне.

Тести (`storage.test.ts`) проганяють контракт на обох сховищах; Postgres — через
PGlite у процесі. Backup/PITR і restore rehearsal — налаштування хостингу БД;
production-конфігурацію не можна підтвердити читанням repository.

У `.env.example` — доступні налаштування, без секретів; реальні `.env*`,
замовлення й ліди не є матеріалом для документації чи очищення.
Вимоги релізу — [quality.md](quality.md).

## 8. Сталі рішення та умови перегляду

| Статус / рішення | Причина | Коли переглянути |
|---|---|---|
| Реалізовано: детерміноване ядро окремо від UI/I/O | Відтворюваність, тестованість, прозорі формули | Новий процес потребує іншої моделі; зберегти явні контракти й звірки |
| Реалізовано: base без subsidies, national support окремо; legacy override виключено з бази з попередженням | Eligibility і строки не гарантовані | За перевіреним контрактом/правом; не приховувати внесок підтримки |
| Реалізовано: language / project country / display currency / billing country розділені | Клієнт, об'єкт і платник можуть бути в різних країнах | Після UX-доказів із збереженням числового змісту |
| Реалізовано: платний assessment snapshot | Оновлення даних не переписує придбаний результат | Якщо вводиться явне версіоноване редагування/новий entitlement |
| Реалізовано: offline GeoNames/ERA5 | Без runtime-підписки та залежності від зовнішнього API | Покриття/точність/ліцензія вимагає іншого джерела |
| Реалізовано: Postgres для orders/leads, JSON лише локально | Snapshot ~0,2–0,3 MB на order робив повне читання файлу непридатним; serverless не має постійного диска | Якщо знадобиться інший сервіс БД — новий repository за тим самим контрактом |
| Taxonomy 2.1: 25 секторів + загальний ввід / 3 групи, роль автоматична | 30 ID зі збереженням legacy-входів; modelsForBusiness та processSchema визначають сумісну фізичну базу | Перевіряти зрозумілість із клієнтами та незалежно калібрувати процеси |
| Прийнято для знань: AGENTS + тематичні docs, CLAUDE імпортує AGENTS | Один набір правил без копій і без завантаження всього docs у контекст | Лише за реальною потребою іншого agent loader |

## 9. Як підтримувати цю архітектуру знань

На старті — AGENTS → current → потрібний тематичний документ → код/тести.
Не читати всі docs за замовчуванням. Статус/гіпотеза/рішення/числовий параметр
мають різних власників: current / market-research / ця таблиця / код із provenance.
Зміна однієї сутності не повинна вимагати редагування її копій у багатьох файлах.

Підключення агентів перевірено за
[OpenAI: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
і [Claude Code: memory/imports](https://code.claude.com/docs/en/memory).
CLAUDE.md містить тільки імпорт спільної інструкції, сумісний також із сесіями,
що не читають AGENTS напряму. Тематичні docs — звичайні посилання, не eager imports.
Для іншого coding agent явно задайте AGENTS як початковий контекст, якщо його
loader не підтримує цей файл; нову копію правил не створюйте.

## Процесні входи

`ProjectInput.process` — discriminated union у `src/core/processes.ts`. Відсутність process означає каталожний AD; одночасне введення process і feedstocks відхиляється. `prepareProcess` повертає фізичний газовий потік, технологічні величини й витрати для спільного energy/finance ядра. Для нового газового входу не створюються фіктивна сировина, метантенк або добривний дохід.

`ProcessInputs` і `lib/form.ts` забезпечують locale-aware ввід та round-trip; `ProcessReport` відображає відповідні баланси, а не AD-схему для полігона. Для процесів what-if пропонує реальну зміну теплопопиту; додавання ко-субстрату до газового потоку не дозволяється. `ResultView` зберігає розподіл free/standard/full, snapshots і старі звіти залишаються читабельними. Усі меню використовують SECTOR_IDS; BUSINESS_IDS містить також legacy ID.

У process-контракті відсутні budgets/own loads позначаються ProcessResult.missingInputs та Assessment.financialsAvailable=false. Числові фінансові intermediates зі спільного ядра в цьому стані не є інвестиційним результатом; кожен renderer/export повинен перевіряти прапорець. ProcessReport, каталог прикладів і what-if не показують ці результати. Native details у калькуляторі зменшує одночасну кількість бізнес-карток; source-registry не залежить від UI.

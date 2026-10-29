# Product flow, тарифи, оплата й доступ

Звірено з кодом 2026-10-29. Джерела: `src/config/plans.ts`,
`src/server/payments/{quote,service,providers}.ts`, `src/server/orders.ts`, `src/server/notify.ts`,
`src/app/api/checkout/`, `src/app/api/payments/`, `src/components/payments/`,
`src/app/[lang]/report/[token]/page.tsx`.
Цей документ об'єднує бізнес-правила тарифів і технічний платіжний flow.

## Бізнес-шлях

1. Користувач приходить із головної, галузевого матеріалу або прикладу.
2. Обирає бізнес і локацію, вводить сировину, енергію й умови майданчика.
   Анкета зберігається в браузері; це не акаунт і не серверна бібліотека проєктів.
3. Безкоштовний screening допомагає вирішити, чи потрібне поглиблення.
   Приклади — змодельовані сценарії, не докази точності на реальних клієнтах.
4. Оплата купує автоматичний звіт за зафіксованим вводом одного проєкту.
   Це не підписка, пакет об'єктів або послуга експерта.
5. Після підтвердження оплати відкривається приватний звіт; PDF — через друк
   браузера. Окремий серверний PDF-generation pipeline не реалізований.

Категорія бізнесу має відповідати фактичній можливості моделі. Поточні
`outside_model` відхиляються UI/API/core; бажане повне покриття описане в
[current.md](current.md). Не продавати перейменований generic-звіт як готову
спеціалізовану модель.

## Тарифи й валюти

- `standard`: базова економіка, баланс, конфігурація, CAPEX/OPEX, cash flow.
  `report`: додаткові порівняння маршрутів/сценаріїв, sensitivity та support cases.
  Межа відображення задається `ResultView.access` на серверній сторінці.
- Суми й tiers A/B/C — тільки `PLAN_PRICES_EUR_CENTS` у `src/config/plans.ts`.
  Tier визначає країна **проєкту**, не мова, IP або billing country.
- Ціни — комерційна гіпотеза. Позначка «Рекомендуємо» не доводить, що Extended
  найчастіше купують. Перевірка гіпотези — [market-research.md](market-research.md).
- EUR — база. USD перераховується за датованим reference FX і округлюється
  вгору до кратного $10 через `convertedPlanPrice`, однаково для карток і quote.
  Це комерційна ціна, не обіцянка банківського FX.
- EUR доступний завжди за активного провайдера; USD — якщо FX має позитивне
  значення і вік не більше 7 діб. За недоступного USD новий quote повертає EUR;
  клієнт має бачити фактичну валюту перед підтвердженням.
- Quote діє 30 хвилин; це строк ціни, **не строк доступу до звіту**.
  HMAC і binding охоплюють план, мову та ProjectInput; валюту й суму підписано
  всередині payload. Змінений/прострочений quote → 409.
- Stripe Adaptive Pricing вимкнено. STRIPE_TAX=1 вмикає exclusive automatic tax;
  backend звіряє subtotal і валюту, Stripe показує остаточний total.
- Новий `expert` не продається. Історичні вже оплачені expert orders
  зберігають full-доступ. Редагування/перерахунок протягом «30 днів» не реалізовані.

## Checkout → provider → backend → report

1. `POST /api/checkout/quote` перевіряє ввід і повертає серверну ціну, FX/date,
   строк, доступні валюти й підписаний token.
2. `POST /api/checkout` перевіряє Zod schema, consent та quote. Якщо quoteToken
   відсутній, сервіс створює quote сам: ціна однаково не береться з клієнта.
3. Backend обчислює Assessment і створює Order з input, customer, price,
   випадковим reportToken (24 bytes) і assessmentSnapshot **до** Stripe Session.
   Запис після створення сесії отримує providerRef та `pending`.
4. Stripe Checkout бере email для оплати, billing address/VAT ID; success URL
   веде до `/[lang]/report/[token]?session_id=...`.
   Права визначає token + серверний status, не сам session_id чи редірект.
5. Webhook перевіряє Stripe-Signature по raw body, знаходить order за Session
   або client_reference_id, зберігає PaymentIntent reference. `paid` приймається
   лише за відповідного subtotal та currency.
6. Report route, `/api/payments/status` і cron `/api/cron/reconcile` (кожні 15 хв,
   `vercel.json`, `CRON_SECRET`; замовлення від 5 хв до 3 діб) викликають
   `refreshOrder` як резервну перевірку Stripe для нетермінальних статусів. Poll теж
   зберігає PaymentIntent, тож refund зіставляється без webhook. UI повторює polling
   приблизно 2,5 хвилини за успішних відповідей; refresh сторінки запускає його знов.
   Помилка обробки webhook повертає 500, щоб Stripe повторив доставку.
7. Лише `paid` відкриває report. Нові orders показують snapshot; старі без нього
   явно позначають повторний розрахунок за поточною моделлю.
8. Перехід у `paid` (webhook, poll, cron, demo або ручний admin) один раз надсилає
   покупцю лист із приватним URL мовою замовлення (`deliverPaidReport`, Resend,
   атомарний claim `customerNotifiedAt`; при помилці відправки claim знімається для
   повтору). Власник (OWNER_EMAIL) отримує листи про оплату, лід, mismatch, refund і dispute.

## Entitlement і крайові випадки

| Сценарій | Поточна поведінка / стан / наступна дія |
|---|---|
| Успішна оплата | Order стає paid; token відкриває збережений звіт. Автоматичного строку закінчення доступу в коді немає; доступ залежить від збереженого order та статусу |
| Вийти, refresh, інший пристрій, очищення cookies | Серверний order зберігається; той самий URL працює без cookies/акаунта. Browser draft може зникнути; історія звітів в акаунті не реалізована |
| Як отримати посилання | Stripe success redirect відкриває приватний URL; після підтвердження оплати той самий URL надходить листом на email із checkout (якщо налаштовані RESEND_API_KEY/EMAIL_FROM). Списку придбаних звітів в UI немає |
| Втрата всіх копій URL | Self-service recovery через email-login відсутній; власник знаходить order в admin, копіює посилання на звіт і надсилає його вручну. Не обіцяти відновлення лише за знанням email |
| Інший об'єкт, країна, ввід або «домен» | Оплата прив'язана до Order.input/snapshot, не домену клієнта. Редагування цього order або кредиту на новий розрахунок немає; новий ввід → нова покупка |
| Повторне оформлення/подвійна оплата | Кожен startCheckout створює новий order; дедуплікації покупок за email/input і автоматичного повернення дубля немає |
| Delayed/duplicate webhook | Повторний paid не додає нове entitlement; пізні pending/failed не знімають paid. providerModifiedAt відсікає старі датовані session events; це не повна exactly-once гарантія |
| Failed / expired / cancel | Failed/expired не дають доступу. Якщо Stripe не створив сесію, order одразу стає failed. Cancel URL повертає pricing?cancelled=1, але саме повернення не переводить order у cancelled; він може залишатися pending до події/перевірки. Новий checkout — новий order |
| Async payment | Completed Session ще може бути pending; доступ лише після provider paid. Невідповідність суми/валюти пише notes для ручної перевірки, не відкриває звіт |
| Refund | Повний refund, зіставлений за paymentRef, переводить у reversed і закриває report; частковий додає note і лист власнику, доступ не змінює. Перестановки refund/session events на реальному Stripe перевіряти на staging |
| Dispute | `charge.dispute.created` додає note з причиною й дедлайном доказів і надсилає лист власнику; доступ не змінюється автоматично. Відповідь на dispute — вручну в Stripe Dashboard |
| Reversed UX | Доступ закрито; сторінка звіту показує локалізоване повідомлення про повернення оплати (`src/i18n/delivery.ts`) |
| Помилка розрахунку / Stripe create | Assessment рахується до створення платіжної сесії; його помилка не запускає оплату. Помилка Stripe create переводить order у failed |
| Оплачено, але report render/storage недоступні | Snapshot не треба генерувати повторно; повторне відкриття допоможе лише після усунення збою. Автоматичний refund, delivery job і SLA відновлення не реалізовані |

Redirect не є гарантією доставки посилання: вкладка може закритися до
повернення зі Stripe. Report URL є секретом.
Власник URL бачить звіт і поле company/name/email у заголовку; не називати це
авторизацією власника email. Адмін може вручну змінювати статус, що теж впливає на доступ.

## Налаштування й операційні межі

`.env.example` описує всі змінні. Для оплати: PAYMENT_PROVIDER=stripe (`off` —
kill switch), STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_SITE_URL,
окремий CHECKOUT_QUOTE_SECRET; необов'язковий STRIPE_TAX. Без CHECKOUT_QUOTE_SECRET
код бере STRIPE_SECRET_KEY, demo — процесний випадковий ключ; у production/staging
`src/server/config.ts` вимагає окремий стабільний secret і не дає стартувати з
PAYMENTS_DEMO=1, test-ключем у production, без webhook secret, DATABASE_URL,
email-налаштувань або з заглушками SITE.legal.

Webhook endpoint: `/api/payments/webhook/stripe`; події:
checkout.session.completed, checkout.session.async_payment_succeeded,
checkout.session.async_payment_failed, checkout.session.expired, charge.refunded,
charge.dispute.created. Версію API endpoint обирайте як у встановленому SDK
(`node_modules/stripe/cjs/apiVersion.js`).
Конфігурацію Stripe Dashboard і legal entity потрібно перевіряти перед запуском
за [Stripe availability](https://stripe.com/global) та
[Stripe currencies](https://docs.stripe.com/currencies);
наявність country profile продукту не доводить можливість merchant onboarding.
Платіжні методи залежать від provider/account, не від обіцянки в UI.

Якщо налаштований Stripe key — використовується Stripe. Без нього non-production
може використовувати demo; у production demo можливий за PAYMENTS_DEMO=1.
Не вмикати його для реальних продажів. Monobank не інтегрований.

Order/lead storage: [architecture.md, §7](architecture.md#7-зберігання-й-експлуатація).
`/admin` захищено Basic auth через ADMIN_USER/ADMIN_PASSWORD;
у production без них закрито. Вимоги перед продажами, backup, staging QA
і захист bearer tokens — [quality.md](quality.md).

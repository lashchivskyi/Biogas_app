# Payments

> v3 · 2026-10-27. Код: `src/config/plans.ts`, `src/server/payments/providers.ts`, `src/server/payments/service.ts`, `src/server/orders.ts`, `src/app/api/checkout`, `src/app/api/payments/*`, `src/components/payments/*`, сторінки `/[lang]/pricing`, `/[lang]/report/[token]`, `/[lang]/payment/demo`, `/[lang]/terms`. Ціни та обґрунтування — `docs/pricing.md`.

## 1. Потік

1. Клієнт проходить безкоштовний скринінг у калькуляторі (вхідні дані зберігаються в браузері).
2. Відкриття звіту → POST /api/checkout/quote повертає підписану серверну ціну на 30 хвилин, курс, дату та підтримувані валюти. Діалог: план (`standard` / `report`), email, ім'я, компанія, VAT ID, згода з умовами. Обидва плани автоматичні; `expert` більше не приймається при оформленні.
3. `POST /api/checkout` — сервер валідує вхід (`checkoutSchema`), перевіряє quoteToken (підпис, строк, провайдер, план, мова та дані проєкту), зберігає підтверджену суму й валюту. База ціни — PLAN_PRICES_EUR_CENTS × tier країни проєкту; створює замовлення з випадковим `reportToken` (24 байти, base64url) і Stripe Checkout Session.
4. Stripe-сторінка (картка, Apple Pay, Google Pay, Link, локальні методи — вмикаються в Stripe Dashboard). `success_url` = `/{lang}/report/{token}`.
5. Webhook `POST /api/payments/webhook/stripe` (підпис перевіряється `stripe.webhooks.constructEvent`): `checkout.session.completed` / `async_payment_succeeded` → `paid`; `expired` / `async_payment_failed` → `expired`/`failed`; `charge.refunded` → `reversed`. Сума й валюта звіряються з замовленням; невідповідність не позначає оплату, а пише примітку «check manually».
6. Сторінка звіту: якщо webhook ще не прийшов — `ReportPending` опитує `/api/payments/status?token=` і робить резервний запит статусу в Stripe (`refreshOrder`). Для нових замовлень сервер зберігає `assessmentSnapshot` з версіями моделі, даних, вводу й датою до створення платіжної сесії. Оплачений результат відтворюється зі знімка, без тихого перерахунку після оновлень. Для старих замовлень без знімка є явне повідомлення про повторну оцінку за поточною моделлю.
7. Статус `paid` «липкий»: пізні `pending/failed` його не скасовують; повернення коштів (`reversed`) фіксується.

## 2. Налаштування Stripe

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; endpoint у Dashboard → `https://<домен>/api/payments/webhook/stripe`, події: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
- `STRIPE_TAX=1` — увімкнути Stripe Tax (потрібна реєстрація податкових юрисдикцій у Dashboard). Збір VAT ID (`tax_id_collection`) і рахунок-фактура (`invoice_creation`) увімкнені в коді.
- Ціни передаються як price_data у підтвердженій EUR або USD валюті, цілими minor units. USD округлюється вгору до наступних 10 доларів (наприклад, 179,09 → 180; 212,67 → 220) однаковою функцією в pricing, checkout та підписаній серверній котировці. EUR залишається базою ціни. Продукти в Dashboard створювати не треба. Adaptive Pricing вимкнено для кожної сесії, щоб провайдер не замінив підтверджену котировку іншою конвертацією.
- Billing address обов’язкова на Stripe; billingCountry зберігається з підписаного webhook / provider status, не виводиться з IP, мови чи країни об’єкта. Валюта картки й валюта settlement можуть відрізнятися від валюти списання; банківський FX не контролюється продуктом.
- Довідковий FX — датований запис fxFor; для оплат дозволений вік до 7 днів. Прострочений USD → тільки EUR із повторним підтвердженням користувачем. Змінений/прострочений quoteToken → HTTP 409 і нова котировка без автоматичного списання.
- CHECKOUT_QUOTE_SECRET — спільний секрет інстансів; за відсутності береться ключ активного платіжного провайдера. Лише локальне demo може використати випадковий process secret; після рестарту такий quote треба отримати заново.
- Мова Checkout відповідає мові інтерфейсу, якщо підтримується Stripe; uk/sr → en, pt → pt-BR. Країна платника не перемикає мову.
- Stripe Tax за STRIPE_TAX=1 додає податок на платіжній сторінці після введення billing address. Котировка продукту — subtotal; кінцеву суму з податками користувач підтверджує в Stripe. Звірка subtotal/currency захищає базову ціну, а не видає subtotal за total.
- Джерела: [Stripe currencies](https://docs.stripe.com/currencies), [Adaptive Pricing](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing).
- Пакет `stripe` зафіксовано на точній версії (`23.0.0`).

## 3. Юридичний суб'єкт — важливо

Stripe **не відкриває акаунти для компаній, зареєстрованих в Україні**. Варіанти:

1. Компанія в країні Stripe (Польща, Естонія через e-Residency, Ірландія, США/Delaware через Stripe Atlas тощо) — рекомендовано для міжнародного продукту.
2. Merchant of Record (Paddle, Lemon Squeezy) — вони продавці перед клієнтом, самі рахують і сплачують ПДВ; комісія вища, але менше бухгалтерії. Інтерфейс провайдера в `providers.ts` дозволяє додати їх без зміни решти коду.

## 4. Демо-режим

Поза production (або з `PAYMENTS_DEMO=1`) провайдер — `demo`: сторінка `/[lang]/payment/demo` імітує банк. Ніколи не вмикати `PAYMENTS_DEMO` на бойовому сайті.

## 5. Зберігання

MVP — JSON-файли (`ORDERS_FILE`, `LEADS_FILE`) з послідовним записом. Для кількох інстансів (Vercel) — замінити на Postgres/KV до запуску продажів: файлова система serverless-функцій не спільна й не постійна.

## 6. CRM

`/admin` (Basic auth `ADMIN_USER` / `ADMIN_PASSWORD`, у production без них закрито): замовлення (план, tier, фактична сума та валюта списання, статус, ручна зміна статусу) і заявки.

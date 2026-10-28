# Product flow, тарифи, оплата й доступ

Звірено з кодом 2026-10-28. Джерела: `src/config/plans.ts`,
`src/server/payments/{quote,service,providers}.ts`, `src/server/orders.ts`,
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
6. Report route і `/api/payments/status` можуть викликати `refreshOrder` як
   резервну перевірку Stripe для нетермінальних статусів. UI повторює polling
   приблизно 2,5 хвилини за успішних відповідей; refresh сторінки запускає його знов.
7. Лише `paid` відкриває report. Нові orders показують snapshot; старі без нього
   явно позначають повторний розрахунок за поточною моделлю.

## Entitlement і крайові випадки

| Сценарій | Поточна поведінка / стан / наступна дія |
|---|---|
| Успішна оплата | Order стає paid; token відкриває збережений звіт. Автоматичного строку закінчення доступу в коді немає; доступ залежить від збереженого order та статусу |
| Вийти, refresh, інший пристрій, очищення cookies | Серверний order зберігається; той самий URL працює без cookies/акаунта. Browser draft може зникнути; історія звітів в акаунті не реалізована |
| Як отримати посилання | API checkout повертає лише redirectUrl до провайдера; Stripe success redirect відкриває приватний URL. Його треба зберегти з адресного рядка/історії браузера; окремого списку придбаних звітів у UI немає. Сам застосунок не реалізує email-доставку приватного URL або self-service recovery; Stripe invoice/receipt не вважати таким листом |
| Втрата всіх копій URL | Автоматичне відновлення через email-login відсутнє; потрібна ручна перевірка замовлення. Не обіцяти відновлення лише за знанням email |
| Інший об'єкт, країна, ввід або «домен» | Оплата прив'язана до Order.input/snapshot, не домену клієнта. Редагування цього order або кредиту на новий розрахунок немає; новий ввід → нова покупка |
| Повторне оформлення/подвійна оплата | Кожен startCheckout створює новий order; дедуплікації покупок за email/input і автоматичного повернення дубля немає |
| Delayed/duplicate webhook | Повторний paid не додає нове entitlement; пізні pending/failed не знімають paid. providerModifiedAt відсікає старі датовані session events; це не повна exactly-once гарантія |
| Failed / expired / cancel | Failed/expired не дають доступу. Cancel URL повертає pricing?cancelled=1, але саме повернення не переводить order у cancelled; він може залишатися pending до події/перевірки. Новий checkout — новий order |
| Async payment | Completed Session ще може бути pending; доступ лише після provider paid. Невідповідність суми/валюти пише notes для ручної перевірки, не відкриває звіт |
| Refund | Повний refund, зіставлений за paymentRef, переводить у reversed і закриває report. Частковий — ручна обробка. Політику dispute і всі перестановки refund/session events не вважати перевіреними |
| Reversed UX | Доступ закрито, але ReportPending не має окремого refunded-повідомлення й показує pending-текст; це відкрита UX-прогалина |
| Помилка розрахунку / Stripe create | Assessment рахується до створення платіжної сесії; його помилка не запускає оплату. Stripe create може залишити created order; автоматичного recovery queue немає |
| Оплачено, але report render/storage недоступні | Snapshot не треба генерувати повторно; повторне відкриття допоможе лише після усунення збою. Автоматичний refund, delivery job і SLA відновлення не реалізовані |

Redirect не є гарантією доставки посилання: вкладка може закритися до
повернення зі Stripe. Report URL є секретом.
Власник URL бачить звіт і поле company/name/email у заголовку; не називати це
авторизацією власника email. Адмін може вручну змінювати статус, що теж впливає на доступ.

## Налаштування й операційні межі

`.env.example`: PAYMENT_PROVIDER=stripe, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
NEXT_PUBLIC_SITE_URL; необов'язковий STRIPE_TAX. Код quote також підтримує
CHECKOUT_QUOTE_SECRET, інакше бере STRIPE_SECRET_KEY; demo без них має
процесний випадковий ключ. Secret має бути стабільним між рестартами/інстансами.

Webhook endpoint: `/api/payments/webhook/stripe`; події:
checkout.session.completed, checkout.session.async_payment_succeeded,
checkout.session.async_payment_failed, checkout.session.expired, charge.refunded.
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

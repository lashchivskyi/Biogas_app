# Методологія: енергія та економіка

Код: `src/core/{energy,capex,economics,finance,assess,scoring,verdict}.ts`.
Параметри — `engineeringParams.ts`, `scenarios.ts`, країнові реєстри;
`allProvenance` показує їх на сайті. Таблиці числових defaults тут не дублюються.
Процес — [feedstock-model.md](feedstock-model.md); межі й перевірки —
[quality.md](quality.md).

## Одиниці та базис

Внутрішні гроші моделі — EUR, грошовий ввід — валюта країни проєкту.
`local amount / FX[local/EUR] = EUR`; display EUR/USD не переосмислює input.
kW — потужність, kWh/MWh — енергія; CH₄ Nm³, biogas Nm³ і product biomethane
Nm³ мають різний склад. Газові ціни HHV/GCV нормалізуються до відповідного
LHV/NCV базису; коефіцієнт має походження й sensitivity, не є універсальною константою.

Модель **pre-tax project screening**: без податків, ПДВ, depreciation,
working capital і construction financing. Вона не обчислює equity IRR.
Назва cash flow не перетворює EBITDA на банківський CFADS.

## Місячний енергобаланс

Доступна енергія газу = вироблений CH₄ × LHV × (1 − upstream leak).
Продуктивність обладнання визначається піковим місячним потоком і
розрахунковими годинами; одні лише річні Nm³ не визначають nameplate.

- **CHP:** газ → електрика й тепло за парними electric/thermal efficiencies.
  Поточна інтерполяція походить із біогазового каталогу TEDOM; це не стара
  крива з довільним постійним total efficiency. Тепло реактора має пріоритет;
  недостача покривається котлом/перерозподілом газу або купованим теплом.
- **Boiler:** газ → тепло процесу → корисне тепло клієнта; електрика купується.
- **Biomethane:** тепло процесу забирає частину газу, решта йде на upgrading;
  recovery/slip, purity, own power та за потреби CNG-компресія враховуються
  окремо. Обсяг товарного газу = recovered CH₄ / product CH₄ fraction.

Електрика нетто, власне споживання, імпорт, експорт і факел рахуються по місяцях.
Власне споживання обмежують попит і coincidence assumption; експорт потребує
відповідного route/site context. Корисне тепло обмежене кількісним попитом,
доставкою й utilization, а не дорівнює всьому теплу двигуна.
Річні суми складаються з місячних, без взаємозаліку сезонного дефіциту/надлишку.

Upstream leakage, engine slip, upgrading slip та залишковий CH₄ після flare
належать різним потокам. Викиди — screening estimate, не повний LCA;
уникнені викиди відкритого зберігання гною не є автоматичним доходом.

## CAPEX

`capex.ts` складає рядки для приймання/підготовки, реактора, газової системи,
CHP/котла/upgrading, digestate storage, електро- й газоприєднання, civil works,
проєктування та contingency. Формули масштабу, floors і scope — у коді.

Застосовуються окремі `econ.capex_factor_chp`, `_boiler`, `_biomethane`.
CHP reference не калібрує автоматично biomethane. `econ.capex_factor`
залишається compatibility/reference показником.
Сценарний multiplier і sensitivity modifier не є cost index.
Порівняння ринку й правила зіставлення scope/year/units —
[capex-benchmark.md](capex-benchmark.md).

## OPEX і виручка

OPEX включає працю, сервіс, maintenance, insurance, monitoring, сировину,
opportunity cost, логістику, відсів, digestate handling, куповану енергію,
а для відповідного маршруту — certification/balancing і CNG haulage.
CHP service включає allowance на overhaul; ще один такий reserve не додавати
без узгодження scope. Negative purchase price зменшує net OPEX як gate fee.

Доходи/економія:
- заміщена **уникненна** частина електричного рахунку, а не вся retail-ціна;
- дозволений експорт за відповідним тарифом, не за ціною купівлі;
- кількісно корисне тепло за вартістю заміщеного палива;
- біометан за route-specific offtake reference; премія без контракту — припущення;
- утилізація лише там, де економію отримує цей проєкт;
- інкрементальна цінність дигестату з урахуванням retention і землі.

За замовчуванням база не покладається на incentives. Водночас legacy-поле
`assumedSupportEurPerKwh` залишається читабельним legacy-полем, але не додається до базової виручки та супроводжується попередженням. Каталожні AD-проєкти можуть мати окремі country support cases; для нових процесних моделей право на стимули не припускається і такі сценарії не обчислюються без процесно-специфічної перевірки.

## Cash flow, NPV, IRR і DSCR

Поточна реалізація `buildFinancials`:

```text
CF_0 = −CAPEX
Revenue_t = (energyRevenue × (1+energyEsc)^(t−1)
             + otherRevenue × (1+opexEsc)^(t−1) + fixedRevenue) × ramp_t
OPEX_t = opexYear1 × (1+opexEsc)^(t−1)
CF_t = EBITDA_t = Revenue_t − OPEX_t
NPV = Σ CF_t / (1+discount)^t
simplePayback = CAPEX / steadyEBITDA    [null if steadyEBITDA ≤ 0]
debt = CAPEX × debtShare
annuity = debt × r / (1−(1+r)^−n)      [debt/n if r = 0]
DSCR_t = EBITDA_t / annuity           [only debt-service years]
```

Ramp зменшує виручку першого року, але не всі OPEX.
`dynamicPaybackYears` у коді — перетин **недисконтованого** накопиченого
потоку з нулем із часткою року; не називати його discounted payback.

IRR шукається бісекцією в заданому інтервалі лише для потоку з однією зміною
знаку; за неоднозначності/відсутності кореня — null, а не 0%.
DSCR min/avg базуються на EBITDA і фіксованому ануїтеті, а не на lender CFADS.
Борг не віднімається з project cash flow; debt service окремо оцінює покриття.
Дисконт та ескалацію потрібно звіряти за валютою, nominal/real basis і cost year.

## Сценарії, sensitivity і висновок

Conservative/base/optimistic — спільні набори припущень у `scenarios.ts`,
не статистичні P10/P50/P90 і не доведений confidence interval.
Вісім базових stress tests та parameterSensitivity перевіряють вплив на NPV;
breakeven показує потрібну зміну CAPEX/ціни. Кореляція припущень і фактичний
діапазон невизначеності потребують перевірки, а не заяви «ширше за похибку».

`scoring.ts` формує пояснювальні оцінки, `verdict.ts` — rule-based висновок,
`quality.ts` і data audit — обмеження довіри. Позитивна економіка не компенсує
критично відсутніх даних. Thresholds — продуктове рішення, не фізичний закон
чи банківський стандарт. Не змінювати їх, щоб отримати бажану кількість
«успішних» прикладів.

## Приклади й перевірка

`src/core/examples.ts` — inputs; `src/content/sample-cases.ts` — контекст і
джерела; `src/lib/examples.ts` — розрахунок/порядок. Джерело технології не
підтверджує змодельовані обсяги, ціни чи прибуток конкретного підприємства.
Не підтримувати вручну таблицю поточних NPV/вердиктів у документації.

Для зміни фінансової формули звіряти незалежний cash-flow workbook/ручний
контрольний розрахунок і тести, не лише два виклики тієї самої функції.
Для зміни ринку порівнювати використані тарифи, класи, date/FX та наслідок
для CAPEX/OPEX/NPV; для точності потрібні незалежні as-built кейси.

## Економіка окремих процесів

Для process-вводу встановлений upstream CAPEX та annual non-energy OPEX є явними бюджетами користувача в місцевій валюті. Вони переводяться в EUR один раз, без повторного country CAPEX multiplier. Бюджет має включати приймання/pretreatment, обладнання основного процесу, логістику/закупівлю/альтернативну вартість сировини, зберігання, необхідне доочищення й upstream labour/service. Ціни не підставляються з історичних впроваджень. Енергія, утилізація залишків, закуплений газ і downstream conversion/service додаються окремо; той самий personnel/service scope не можна включати в обидва бюджети.

CHP/boiler та базові газові системи залишаються component-based estimates з країновими параметрами й LOW там, де бракує калібрування. Для LFG/наявного газу upgrading CAPEX, recovery, energy use й product purity задані користувачем для повного train під його gas analysis (H₂S/siloxanes/H₂O/CO₂/N₂/O₂). Це не автоматичне підтвердження досягнення газових специфікацій. Поточні unit maintenance, staffing та grid/CNG параметри — окремі припущення, що потребують оферт.

COD-модель додає лише явно зазначені уникнені платежі за очищення; не приписує дохід за очищення, яке ще потрібно виконувати. Residue/WW sludge disposal рахується на фактичну модельну масу; добривна виручка без nutrient/offtake basis не нараховується. Потік existing-gas купується за введеною ціною raw Nm³; CAPEX нового метантенка не додається.

Для FOD і existing-gas з annual decline кожен рік повторно проходить energy balance з тим самим встановленим CHP rating і початковим CAPEX. Використане тепло/електрика обмежуються попитом; купівля газу змінюється з потоком, фіксовані витрати не зникають. Повний annual operating forecast входить у NPV/IRR/DSCR; газ не вважається сталим 15 років. Country biomethane price нормалізується за product CH₄ purity, щоб зміна об’ємної чистоти не змінювала ціну одиниці енергії.

Scenario uncertainty задає paired supply/yield/cost cases; додаткові OAT bounds охоплюють k/L₀/collection, COD/removal/avoided treatment, gas price/decline та process OPEX/residuals. Це engineering bounds, не статистична похибка. Simple payback є CAPEX / початковий steady EBITDA; для спадаючого газу обов’язково дивитися cumulative cash flow і dynamicPaybackYears (недисконтований перший перетин нуля), NPV та DSCR. Податки, оборотний капітал, financing during construction, equity IRR та lender CFADS не додані; ці результати залишаються pre-tax project screening.

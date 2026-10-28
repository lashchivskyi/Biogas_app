# Методологія: сировина та процес

Джерела реалізації: `src/core/feedstockData.ts`, `feedstock.ts`,
`digester.ts`, `massBalance.ts`, `digestate.ts`, `logistics.ts`,
`climate.ts`, `engineeringParams.ts`. Числові defaults і діапазони
належать цим реєстрам; тут описано одиниці, залежності й межі.
Енергія/фінанси — [economics.md](economics.md), валідація — [quality.md](quality.md).

## Від бізнесу до вимірюваного потоку

`businessType` — UX/аналітичний ID, а не обсяг сировини чи коефіцієнт виходу.
Каталог бізнесів пропонує релевантні потоки; кількості вводить клієнт.
Роль оператора полігона, виробника стоків або покупця енергії не можна
звести до звичайної ферми зміною назви. Вимоги розширення — [current.md](current.md).

`resolveLine`:
- Тварини: поголів'я × т свіжого гною/голову/рік × collection factor.
  Зібраний гній відрізняється від усіх екскрементів, особливо на пасовищі.
- Інша сировина: введені т/рік свіжої маси; не т сухої речовини.
- Availability і sensitivity modifiers застосовуються явно. Річна кількість
  розподіляється по активних місяцях за кількістю днів; не множиться ще раз
  на частку активних місяців. Animal streams у поточному коді розподілені на рік,
  а сезонне утримання враховується collection factor.

## TS/DM → VS → CH₄ → біогаз

Для потоку i:

```text
VS_i [t/a] = fresh_i [t/a] × DM_i [%] × VS_of_DM_i [%] / 10000
BMP_CH4_i [Nm³/a] = VS_i [t/a] × BMP_i [L CH₄/kg VS] × yield_modifier
produced_CH4 = Σ BMP_CH4_i × processRealisation × inhibition
biogas = Σ (BMP_CH4_i / CH4_fraction_i) × processRealisation × inhibition
```

1 L/kg × 1 t = 1 m³: множник 1000 для kg/t скорочується з L/m³.
У коді частина полів називається `M3`; при застосуванні джерела перевіряти
нормальні умови, сухий/вологий газ і CH₄, а не total biogas.
Масовий dry-gas approximation використовує 0°C, 1 atm.

DM, VS і BMP з вводу мають пріоритет над каталогом. Прапорець
`labAnalysisAvailable` без чисел для всіх потоків не підтверджує лабораторію.
Числа клієнта теж не є незалежно перевіреними протоколами.

`yieldBlend` обирає точку каталожного low/typ/high; `processRealisation`
описує неповну реалізацію потенціалу, а `inhibition` — спрощені поправки
на птахівничий послід і жири. Вони не є кінетичною моделлю TAN/FAN/VFA.
Якщо нове джерело дає фактичний експлуатаційний вихід замість BMP,
перевірити, чи повторний realization factor не занижує результат двічі.

## Підготовка, реактор і сезонність

`chooseDigestion` розрізняє wet CSTR, wet із solids feeding, high-solids,
high-rate та covered lagoon за DM, типом суміші й кліматом.
Поточні HRT/OLR та cost branches — preliminary proxies; вибір high-rate
не замінює COD loading, SRT, removal efficiency та реальну гідравліку UASB/EGSB.

```text
V_work [m³] = max(Q_peak [m³/d] × HRT [d],
                  VS_peak [kg/d] / OLR_limit [kg VS/(m³·d)])
V_total = V_work × geometry/headspace factor
```

Пік береться з місячного розподілу. Перетворення т/добу → м³/добу наразі
припускає густину близько 1 т/м³. Це потрібно переглянути для іншого матеріалу.
HRT/OLR залежать від вибраної технології й суміші; розміри не є специфікацією закупівлі.

ABP flags запускають орієнтовні pasteurisation CAPEX/тепло та safety notes.
Фактичні вимоги залежать від категорії матеріалу й юрисдикції.
Є витрати відсіву харчових/муніципальних відходів, але повний баланс домішок,
депакування й втраченої органіки не реалізований.

## Тепло і клімат

Тепло за місяць = нагрів субстрату `m × cp × ΔT` + втрати через
огороджувальні поверхні `U × A × ΔT × hours` + передбачена гігієнізація.
Потрібні узгоджені kg/kJ/kWh або W/kW; conversion factors — у коді.
Температура субстрату й U-values є припущеннями, не вимірюваннями майданчика.
Для covered lagoon застосовується окрема температурна гілка.

Країна/регіон або підписане місто визначають місячні температури.
ERA5 — reanalysis; поточний десятирічний період і метод вибору клітинки
записані в dataset manifest, не оновлюються автоматично.
Кліматичні аналоги — порівняння температур, не перенос тарифів, дозволів чи біології.

## Дигестат і логістика

```text
dry_gas_kg = CH4_Nm3 × density_CH4 + (biogas_Nm3 − CH4_Nm3) × density_CO2
digestate_t = max(0, fresh_input_t − dry_gas_kg / 1000)
```

Це screening balance: non-CH₄ частку прийнято за CO₂; реакційна вода, домішки,
розведення, NH₃ і сепарація не описані повністю. Нульовий clamp не є доказом
фізичної коректності аномальних входів.

N/P/K оцінюються за каталогом і DM; добривна вигода для власного гною лише
інкрементальна. Невідома площа або надлишок дигестату створюють припущення/витрати,
а не гарантований продаж. Норму внесення не переносити між країнами без перевірки.

Транспорт = тонни × (fixed handling + відстань × ставка) × return factor.
Це proxy за відстанню, без road routing і фактичних змін водія.
Доставлена сировина не створює автоматичну економію утилізації для власника
установки. Закупівля й втрачений продаж одного потоку не додаються двічі.

## Як удосконалювати

Вибрати конкретний процес і country/scale → отримати відповідні лабораторні
та operating data → порівняти технологічні альтернативи → перевірити розміри,
вихід і баланси незалежним розрахунком → калібрувати → перевірити на інших кейсах.
Не задавати бажану похибку постфактум і не підміняти COD моделлю VS без обґрунтування.
Джерела, provenance й оновлення — [data-sources.md](data-sources.md).

## Додаткові процесні моделі (processes.ts)

Одна оцінка обирає одну фізичну базу: каталожні feedstocks **або** discriminated process input. Їхнє змішування API/ядро відхиляють. Країна й підписана локація задають ринкові параметри та клімат; назва бізнесу не підміняє характеристик потоку. Для нових моделей числові поля обов’язкові, без невидимих замін найближчим субстратом. Нульова вартість має бути явною. Місяці/початок сезону та operating days задають графік, потрібний для місячної енергії й пікових потужностей.

| Вхід | Розрахунок та конфігурація | Межі |
|---|---|---|
| residue | FM t/a × DM × VS → VS t/a; CH₄ Nm³/a = VS t/a × BMP L/kg VS × realization. V = max(Q × HRT, VS kg/d / OLR), за фактичними operating days; Q = FM t/a × 1000 / density kg/m³ / operating days | Лабораторно характеризований органічний потік/суміш; BMP не прогнозує самостійно inhibition, salinity чи pretreatment. Реалізація BMP обмежена 100%. Немає cattle-head conversion для інших тварин |
| wastewater | COD kg/a = Q m³/d × d/a × COD mg/L / 1000; COD in = residual COD + biomass COD + methane COD. Methane COD / 4 / ρCH₄ → generated CH₄, далі explicit capture. V = max(Q × HRT, Q × COD kg/m³ / OLR kg COD/m³/d) | COD removal і biomass split — project inputs, які треба довести для заданого HRT/OLR. Це не ADM1, не моделювання granular sludge formation, sulfate reduction, токсичності чи інертних відсівів |
| landfill | Річні когорти з рівномірною historical deposition; remaining = Σ Mᵢ L₀ exp(−k ageᵢ). Generated = remaining × (1−exp(−k)); closing = remaining−generated; captured ≤ generated з operating-days/capture factors | Закритий полігон, без нових відходів; k/L₀/collection site-specific. Це screening FOD, не regulatory LandGEM submission; неоднорідні когорти/майбутнє захоронення не прогнозуються |
| gas | Dry normal Nm³/h × 24 × operating days × supply availability × CH₄ fraction; annual decline; CHP/boiler/upgrading | Вхід — raw biogas, не торгівля сертифікатами або перепродаж готового природного газу. Supply та conversion downtime — різні припущення; погодинний dispatch не моделюється |

COD sludge: COD/VSS ≈ 1.42 для C₅H₇NO₂; це не COD/TS. Вхідні sludge VS/TS і TS перетворюють VSS на dry solids і wet sludge. Effluent + wet sludge + generated dry gas дорівнюють inflow за наближенням 1 t/m³; це не повний елементний баланс, не гарантія складу стоку. Dissolved/uncollected CH₄ показується окремо; methane climate check обмежений зібраним газом і не є повним LCA полігона. Реакційна вода, домішки й повний nutrient fate потребують розширення.

Mass/COD impossibilities, gas fractions >100%, incompatible bases, incomplete budgets та calendars відхиляються. Actual HRT враховує обмеження OLR. Seasonal/rated flow використовується для conversion capacity; boiler має враховувати доступний газ, а не лише digester heat.

Методичні першоджерела: [IPCC 2019, wastewater](https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/5_Volume5/19R_V5_6_Ch06_Wastewater.pdf) — COD/CH₄, не inventory MCF як reactor efficiency; [EPA LMOP 2021, modelling](https://www.epa.gov/system/files/documents/2021-07/pdh_chapter2.pdf) — FOD; [EPA LFG treatment](https://www.epa.gov/lmop/basic-information-about-landfill-gas) — газозбір і різні ступені очищення. Переглянуто 28.10.2026; ці роки не є базою поточних CAPEX.

Валідація коду: ручні COD/FOD identities, газ/залишки/effluent, енергія й фінанси для чотирьох inlet models у всіх країнах; негативний CAPEX/OPEX case, invalid units/ranges/calendar/composition, локалізований round-trip, джерела й тарифи. Інженерна точність ще потребує незалежного порівняння з operating/as-built datasets; прохід тестів цього не замінює.

Додаткове процесне тепло (`auxiliaryHeatKwhYear`) задається окремо для hygienisation, drying та іншої теплової обробки; воно додається до розрахованого обігріву реактора/стоків, тому цей обігрів повторно вводити не потрібно. Енергетичний баланс та закупівля зовнішнього тепла враховують обидві складові.

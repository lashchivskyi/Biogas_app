import type { CoreLang } from "@/core/i18n";

interface CaseNotes {
  context: string;
  operations: readonly string[];
  verify: string;
}
interface SampleCase {
  notes: Record<CoreLang, CaseNotes>;
  sources: readonly { title: string; url: string }[];
}

const FOOD_AD = { title: "IEA Bioenergy Task 37 — Food and beverage industry (2025)", url: "https://www.ieabioenergy.com/blog/publications/implementation-of-anaerobic-digestion-facilities-in-the-food-and-beverage-industry/" };

const AGSTAR = { title: "US EPA AgSTAR — Project planning and financing", url: "https://www.epa.gov/agstar/project-planning-and-financing" };

function brief(context: readonly [string, string], operations: readonly [readonly string[], readonly string[]], verify: readonly [string, string], sources: SampleCase["sources"] = [AGSTAR]): SampleCase {
  return { notes: {
    en: { context: context[0], operations: operations[0], verify: verify[0] },
    uk: { context: context[1], operations: operations[1], verify: verify[1] },
  }, sources };
}

/** Hypothetical operating briefs. References support the process, not the assumed project figures. */
export const SAMPLE_CASES: Record<string, SampleCase> = {
  de_food_30k: {
    notes: {
      en: {
        context: "A regional brewery in Lower Saxony is deciding whether to keep selling wet spent grain or use it to replace purchased energy. This is a feedstock-diversion decision, not a waste-disposal business.",
        operations: ["Spent grain is generated throughout the year and fed promptly; no storage through a long off-season is assumed.", "Lost feed sales are charged at €38/t. No gate fee or avoided disposal payment is credited. Process steam provides a heat outlet; the site has no spreading land."],
        verify: "Obtain the existing feed contract, wet-grain BMP and weekly production schedule. Price digestate removal and compare CHP with direct boiler use before buying equipment.",
      },
      uk: {
        context: "Регіональна пивоварня в Нижній Саксонії вирішує, чи продавати мокру дробину на корм, чи заміщати нею куповану енергію. Основне питання — вигода від зміни способу використання побічного продукту.",
        operations: ["Дробина надходить протягом року й подається свіжою. Зберігання на довге міжсезоння не передбачено.", "Втрачений дохід від продажу корму враховано за €38/т. Плати за приймання відходів та економії на їх утилізації немає. Тепло потрібне для виробництва; полів для дигестату немає."],
        verify: "Перевірити чинний договір продажу дробини, BMP та тижневий графік варіння. Отримати ціну вивезення дигестату й порівняти CHP із прямим використанням газу в котлі.",
      },
    }, sources: [FOOD_AD],
  },
  it_food_30k: {
    notes: {
      en: {
        context: "A mixed vegetable cannery in Emilia-Romagna has a large tomato campaign and a smaller continuous line. A seasonal surge in material does not imply a steady year-round gas supply.",
        operations: ["The main stream is available from July to October; the smaller vegetable stream runs all year. Their dry-matter contents and treatment costs are entered separately.", "Electricity and process heat are used on site. There is no contracted land for digestate. Annual energy demand is a screening approximation, not a measured campaign load curve."],
        verify: "Check monthly residues, steam demand and sanitation downtime. Quote buffering or storage separately; do not assume summer gas can cover winter demand without storage.",
      },
      uk: {
        context: "Консервний завод в Емілії-Романьї має потужну томатну кампанію та меншу цілорічну овочеву лінію. Сезонний пік сировини не означає рівномірного виробництва газу весь рік.",
        operations: ["Основний потік надходить із липня до жовтня, менший — протягом року. Вміст сухої речовини та поточні витрати на обробку задано окремо.", "Електрика й тепло потрібні на майданчику. Домовленостей про поля для дигестату немає. Річне енергоспоживання — наближення для скринінгу, а не виміряний графік кампанії."],
        verify: "Звірити помісячні залишки, потребу в парі та зупинки на миття. Окремо оцінити буферні ємності чи зберігання: літній газ не покриє зимовий попит без запасу.",
      },
    }, sources: [FOOD_AD, { title: "OI Pomodoro Nord Italia — 2026 processing campaign", url: "https://oipomodoronorditalia.it/area-stampa/art/bilancio-campagna-2026-nel-nord-italia-rese-tra-le-piu-basse-degli-ultimi-anni" }],
  },
  fr_food_35k: {
    notes: {
      en: {
        context: "A Breton dairy cooperative has low-value off-spec whey and flotation sludge. Saleable whey is kept in its existing food or feed outlet and is not counted as free biogas feedstock.",
        operations: ["45,000 t/year of rejected whey at 5.5% solids and 1,500 t/year of flotation sludge at 15% solids are separate streams. Avoided treatment costs of €18/t and €55/t are scenario assumptions, not market quotations.", "Cleaning and hot water provide a steady heat outlet. The scenario includes 1,200 ha of contracted spreading land, subject to a nutrient and acceptance plan; land is not an unlimited disposal outlet."],
        verify: "Confirm whey quality, cleaning-chemical carryover and the BMP of the actual sludge. Test the fat loading and obtain a digestate outlet agreement.",
      },
      uk: {
        context: "Молочний кооператив у Бретані має некондиційну сироватку та флотаційний осад. Товарна сироватка залишається в харчовому чи кормовому збуті й не рахується безкоштовною сировиною для біогазу.",
        operations: ["Окремо задано 45 000 т/рік некондиційної сироватки з 5,5% сухої речовини та 1 500 т/рік флотаційного осаду з 15%. Економія €18/т і €55/т на обробці — припущення сценарію, а не ринкові котирування.", "Миття й гаряча вода створюють постійний попит на тепло. Передбачено 1 200 га договірних полів за умови погодженого плану поживних речовин; це не необмежений приймач дигестату."],
        verify: "Уточнити якість сироватки, потрапляння мийних засобів та BMP саме цього осаду. Перевірити жирове навантаження й домовитися про приймання дигестату.",
      },
    }, sources: [FOOD_AD],
  },
  es_food_35k: {
    notes: {
      en: {
        context: "A Catalan pig farm has finishing pigs and a sow unit with piglet heating. This is a manure-management project with energy recovery, not a merchant food-waste plant.",
        operations: ["Only the farm's own slurry is included. There is no purchased co-substrate or gate fee. Existing storage, 1,800 ha and a 12 km gas-main distance are explicit inputs.", "Electricity and nursery heating can be used on site, but gas export needs a separate connection assessment. Digestion does not remove the manure's nutrient burden."],
        verify: "Measure slurry solids and collection frequency; old slurry can lose methane potential. Confirm storage suitability, spreading agreements and the real heating schedule.",
      },
      uk: {
        context: "Свинокомплекс у Каталонії поєднує відгодівлю та свиноматочне поголів’я з обігрівом поросят. Це проєкт поводження з гноївкою та повернення енергії, а не майданчик приймання харчових відходів.",
        operations: ["Враховано лише власну гноївку — без купованих домішок і плати за приймання. Наявне сховище, 1 800 га та відстань 12 км до газової мережі задано окремо.", "Електрику й тепло можна використати на фермі; збут газу потребує окремої оцінки приєднання. Зброджування не прибирає поживні речовини з гноївки."],
        verify: "Виміряти суху речовину й частоту видалення гноївки: тривале зберігання знижує потенціал метану. Перевірити сховище, договори на поля та реальний графік обігріву.",
      },
    }, sources: [{ title: "US EPA AgSTAR — Anaerobic digestion on swine farms", url: "https://www.epa.gov/agstar/anaerobic-digestion-swine-farms" }],
  },
  br_food_40k: {
    notes: {
      en: {
        context: "A poultry processor in southern Brazil separates non-saleable slaughter residues and grease. Material already sold to rendering or feed buyers is excluded from this scenario.",
        operations: ["Residues and grease are entered separately with different solids and treatment costs. The grease stream is limited, rather than treating all residue as high-yield fat.", "Refrigeration and sanitation consume energy throughout the year. No digestate land is assumed; the gas main is 7 km away."],
        verify: "Confirm the segregated mass balance, fat and nitrogen loading, sanitation needs and actual disposal invoices. Obtain a local digestate route and check whether direct heat use is preferable to CHP.",
      },
      uk: {
        context: "Птахопереробний завод на півдні Бразилії відокремлює нетоварні залишки забою та жир. Матеріал, який уже продають на переробку чи корм, до цього сценарію не включено.",
        operations: ["Залишки й жир задано окремо, з різною сухою речовиною та витратами на обробку. Частку жиру обмежено — весь потік не прирівнюється до висококалорійного жиру.", "Охолодження та санітарне миття споживають енергію весь рік. Полів для дигестату немає, газова мережа розташована за 7 км."],
        verify: "Перевірити баланс відокремлених потоків, жир і азот, санітарну підготовку та рахунки за утилізацію. Визначити місцевий збут дигестату й порівняти пряме тепло з CHP.",
      },
    }, sources: [FOOD_AD],
  },
  in_food_40k: {
    notes: {
      en: {
        context: "A Punjab cooperative aggregates cattle dung from nearby holdings and buys seasonal sugar press mud. Collection and offtake arrangements matter as much as the reactor size.",
        operations: ["Dung is purchased and hauled 5 km throughout the year; press mud is purchased and hauled 18 km from November to March. Neither stream earns a disposal fee.", "Only 400 ha of contracted land are available. The base case has no guaranteed CBG premium or grant, and a transport-fuel distribution business is not modelled."],
        verify: "Secure weighed collection contracts, seasonal feedstock prices and digestate acceptance. Confirm gas quality, compression, transport and a binding buyer agreement separately before relying on CBG income.",
      },
      uk: {
        context: "Кооператив у Пенджабі збирає гній із сусідніх господарств і купує сезонний фільтраційний осад цукрового виробництва. Договори збору й збуту тут не менш важливі за розмір реактора.",
        operations: ["Гній купують і возять за 5 км весь рік, фільтраційний осад — за 18 км із листопада до березня. Плати за приймання жодного потоку немає.", "За договорами доступно лише 400 га. Базовий розрахунок не містить гарантованої премії CBG чи гранту; бізнес доставки автомобільного палива не моделюється."],
        verify: "Укласти договори збору зі зважуванням, уточнити сезонні ціни та приймання дигестату. Якість газу, стиснення, транспортування й зобов’язання покупця CBG потрібно підтвердити окремо.",
      },
    }, sources: [{ title: "Government of India — GOBARdhan technical manual", url: "https://swachhbharatmission.ddws.gov.in/sites/default/files/Technical-Notes/GobardhanTechnicalManual.pdf" }, { title: "Ministry of Petroleum & Natural Gas — CBG feedstocks", url: "https://gobardhan.gov.in/about/compressed-biogas" }],
  },
  dairy_400: brief(
    ["A Lviv dairy farm considers a new digester for 400 dairy cows and 250 young cattle. This tests whether manure alone can pay for a small installation.", "Молочна ферма на Львівщині розглядає нову установку для гноївки від 400 корів і 250 голів молодняку. Кейс перевіряє, чи окупиться невеликий комплекс лише на власній сировині."],
    [["Year-round housing, 5,000 m³ of existing storage and 900 ha are assumed; existing storage still needs a structural and gas-tightness survey.", "Annual demand is 420 MWh of electricity and 160 MWh of useful heat. A 6 km gas connection makes export a different proposition from on-site CHP."],
     ["Прийнято цілорічне утримання, 5 000 м³ наявного сховища й 900 га. Стан і газощільність сховища потрібно обстежити.", "Споживання — 420 МВт·год електрики й 160 МВт·год корисного тепла на рік. Газова мережа за 6 км робить експорт газу окремим інвестиційним рішенням."]],
    ["Weigh actual slurry, measure solids and BMP, and obtain a small-plant service quote. Compare a cluster with a stand-alone installation.", "Виміряти фактичну гноївку, суху речовину й BMP, отримати ціну сервісу малої установки. Порівняти власний комплекс з участю в кластері."]),
  pig_5000: brief(
    ["A Ternopil finishing unit with 5,000 places needs a manure-management solution. A large number of pigs does not necessarily mean a large methane resource.", "Відгодівельний комплекс на Тернопільщині на 5 000 місць шукає рішення для гноївки. Велике поголів’я не завжди означає великий ресурс метану."],
    [["Only own pig slurry is included, with no gate fee or imported high-yield co-feed. Existing storage is 4,000 m³; spreading land is 1,200 ha.", "Heating is seasonal, 450 MWh/year, while electricity use is 700 MWh/year. The gas main is 8 km away."],
     ["Враховано тільки власну свинячу гноївку, без плати за приймання чи висококалорійних домішок. Наявне сховище — 4 000 м³, поля — 1 200 га.", "Опалення сезонне: 450 МВт·год/рік, електроспоживання — 700 МВт·год/рік. Газова мережа розташована за 8 км."]],
    ["Confirm occupancy, dilution water, slurry age and winter demand. Obtain the minimum viable CHP size and a nutrient-management plan.", "Перевірити фактичне заповнення місць, розбавлення водою, вік гноївки й зимовий попит. Уточнити мінімальний масштаб CHP та план поводження з поживними речовинами."]),
  layers_200k: brief(
    ["A Ukrainian egg producer with 200,000 layers considers mono-digestion of poultry manure. High solids and nitrogen make this an operating-risk case.", "Український виробник яєць із 200 000 несучок розглядає зброджування посліду без іншої сировини. Високі суха речовина й азот роблять це кейсом технологічного ризику."],
    [["The scenario has 500 ha and 600 MWh/year of seasonal heat demand. Neither dilution water nor an ammonia-removal system is assumed to be free.", "No external carbon-rich co-feed is included. A positive methane yield alone does not establish process stability or a viable nutrient outlet."],
     ["Передбачено 500 га й сезонний попит на 600 МВт·год тепла на рік. Вода для розбавлення та система видалення аміаку не вважаються безкоштовними.", "Зовнішньої вуглецевої домішки немає. Сам по собі вихід метану не доводить стабільності процесу чи можливості використання поживних речовин."]],
    ["Analyse TAN, free ammonia, grit and BMP; pilot-test loading and dilution. Quote ammonia management and digestate export before procurement.", "Визначити TAN, вільний аміак, пісок і BMP; випробувати навантаження та розбавлення. Оцінити видалення аміаку й вивезення дигестату до закупівлі обладнання."]),
  dairy_processor: brief(
    ["A Ukrainian dairy plant pays to treat rejected whey and flotation sludge. Its business case combines avoided treatment with continuous energy use.", "Український молокозавод платить за обробку некондиційної сироватки й флотаційного осаду. Бізнес-кейс поєднує економію на обробці з постійним використанням енергії."],
    [["15,000 t/year of whey at 5.5% solids and 1,200 t/year of sludge at 15% solids are separate. Assumed treatment costs are UAH600/t and UAH1,200/t; marketable whey is excluded.", "450 ha are assumed available by agreement. Electricity demand is 5 GWh/year; gas use is 1.8 million m³/year. Utility prices are illustrative customer inputs, not verified invoices."],
     ["Окремо задано 15 000 т/рік сироватки з 5,5% сухої речовини й 1 200 т/рік осаду з 15%. Припущені витрати — 600 і 1 200 грн/т; товарну сироватку виключено.", "За умовою доступно 450 га договірних полів. Споживання — 5 ГВт·год електрики й 1,8 млн м³ газу на рік. Ціни енергії — ілюстративний ввід, а не перевірені рахунки."]],
    ["Check disposal invoices, cleaning chemicals, whey outlets and an hourly heat profile. Confirm field acceptance and local supplier CAPEX.", "Звірити рахунки за утилізацію, мийні засоби, збут сироватки й погодинний графік тепла. Підтвердити приймання на поля та CAPEX за пропозиціями постачальників."], [FOOD_AD]),
  slaughter_5000: brief(
    ["A Volyn meat processor considers treating 5,000 t/year of non-saleable residues on site. Savings depend on what is genuinely paid for disposal today.", "М’ясокомбінат на Волині розглядає обробку 5 000 т/рік нетоварних залишків на власному майданчику. Економія залежить від фактичних поточних витрат на утилізацію."],
    [["UAH700/t is an assumed avoided disposal cost, counted once. Rendering products and saleable animal by-products must remain outside this stream.", "The site uses 3.8 GWh of electricity and 900,000 m³ of gas annually. Only 60 ha are available, so excess digestate requires an outlet."],
     ["700 грн/т — припущена економія на утилізації, врахована один раз. Товарні побічні продукти й сировину для переробки до цього потоку не включають.", "Споживання — 3,8 ГВт·год електрики й 900 000 м³ газу на рік. Доступно лише 60 га, тому для надлишку дигестату потрібен окремий приймач."]],
    ["Confirm permitted material categories, hygienisation, fat and nitrogen loading. Obtain a digestate contract and compare direct process heat with CHP.", "Уточнити дозволені категорії матеріалів, санітарну підготовку, жир і азот. Укласти договір на дигестат та порівняти пряме тепло з CHP."], [FOOD_AD]),
  mixed_80: brief(
    ["A small mixed farm with 80 cows asks whether an individual digester is justified. This deliberately represents a project where screening can prevent an unsuitable investment.", "Невелике змішане господарство з 80 коровами перевіряє доцільність власної установки. Цей приклад показує цінність відмови від невідповідної інвестиції ще на ранньому етапі."],
    [["Seasonal housing limits collectible manure. Electricity demand is only 60 MWh/year and there is no confirmed useful heat demand.", "150 ha are available, but a digestate outlet alone does not overcome minimum equipment and maintenance costs. No subsidy is assumed in the base case."],
     ["Через сезонне утримання збирається лише частина гною. Електроспоживання — 60 МВт·год/рік, підтвердженого корисного теплоспоживання немає.", "Доступно 150 га, але наявність полів не усуває мінімальних витрат на обладнання й сервіс. Базовий сценарій не містить субсидії."]],
    ["Compare shared digestion, simpler storage improvements and the value of avoiding stand-alone operating overhead. Do not extrapolate large-plant costs to this scale.", "Порівняти спільне зброджування, поліпшення сховища та відмову від витрат на окрему експлуатаційну команду. Не переносити питомі витрати великого заводу на цей масштаб."]),
  ua_sugar: brief(
    ["A Vinnytsia sugar factory considers year-round digestion of 90,000 t of pressed beet pulp using existing silage infrastructure.", "Цукроварня на Вінниччині розглядає цілорічне зброджування 90 000 т пресованого жому з використанням наявної силосної інфраструктури."],
    [["Pulp is 23% solids, fed all year from storage. UAH200/t of lost feed revenue remains a cost; harvest residues do not become year-round fresh supply.", "Electricity consumption is 20 GWh/year; gas use is 9 million m³/year. Heat use remains seasonal, and 8,000 ha are assumed available for nutrients."],
     ["Жом містить 23% сухої речовини й подається весь рік зі сховища. Втрачений продаж за 200 грн/т залишається витратою; сезонне виробництво не стає цілорічним свіжим потоком.", "Споживання — 20 ГВт·год електрики та 9 млн м³ газу на рік. Тепло використовують сезонно, для поживних речовин за умовою доступно 8 000 га."]],
    ["Survey silage clamps, losses and leachate; meter campaign heat demand. Confirm that local energy prices, grid capacity and spreading agreements apply to this site.", "Обстежити траншеї, втрати й фільтрат; виміряти тепло в сезон кампанії. Підтвердити місцеві ціни енергії, потужність мережі й договори на поля."], [FOOD_AD]),
  de_meat: brief(
    ["A Lower Saxony meat processor has steady non-saleable residues, grease and substantial on-site energy demand. This tests industrial energy recovery at a viable scale.", "М’ясокомбінат у Нижній Саксонії має стабільні нетоварні залишки, жир і значне власне енергоспоживання. Це приклад промислового повернення енергії за достатнього масштабу."],
    [["15,000 t/year of residues at 18% solids and 2,500 t/year of separated grease at 15% solids are distinct streams. Assumed avoided costs are €55/t and €70/t.", "Electricity demand is 14 GWh/year and gas use is 2.4 million m³/year. Only 300 ha are available; excess digestate export is retained."],
     ["Окремо задано 15 000 т/рік залишків із 18% сухої речовини та 2 500 т/рік відокремленого жиру з 15%. Припущена економія — €55/т і €70/т.", "Споживання — 14 ГВт·год електрики й 2,4 млн м³ газу на рік. Доступно лише 300 га; вивезення надлишку дигестату не виключено з витрат."]],
    ["Confirm by-product categories, permitted sanitisation and continuous feedability. Test fat inhibition and verify disposal invoices, useful heat and vendor guarantees.", "Підтвердити категорії побічних продуктів, санітарну обробку й стабільність подачі. Перевірити жирове інгібування, рахунки за утилізацію, корисне тепло та гарантії постачальника."], [FOOD_AD]),
  it_whey: brief(
    ["A Lombardy cheese dairy pays for rejected whey and dairy flotation sludge while buying electricity and boiler fuel throughout the year.", "Сироварня в Ломбардії платить за некондиційну сироватку й молочний флотаційний осад та цілий рік купує електрику й котельне паливо."],
    [["40,000 t/year of whey at 5.5% solids and 3,000 t/year of sludge at 15% solids are assumed. Avoided treatment is €12/t and €60/t; saleable whey is excluded.", "Demand is 9 GWh of electricity and 1.8 million m³ of gas annually. There are 200 ha and a gas main 1 km away; connection approval is not assumed."],
     ["Прийнято 40 000 т/рік сироватки з 5,5% сухої речовини та 3 000 т/рік осаду з 15%. Економія на обробці — €12/т і €60/т; товарну сироватку виключено.", "Річний попит — 9 ГВт·год електрики та 1,8 млн м³ газу. Є 200 га, газова мережа — за 1 км; погодження приєднання не вважається отриманим."]],
    ["Check whey outlets, cleaning chemicals, organic loading and fat dosing. Obtain local CAPEX and digestate quotes; reconcile hourly heat use with dairy shutdowns.", "Перевірити збут сироватки, мийні засоби, органічне навантаження й дозування жиру. Отримати місцеві ціни CAPEX і дигестату, звірити тепло зі зупинками заводу."], [FOOD_AD]),
  gb_food: brief(
    ["An English merchant AD developer considers 50,000 t/year of separately collected commercial food waste, with grid injection as a candidate outlet.", "Англійський девелопер розглядає 50 000 т/рік роздільно зібраних комерційних харчових відходів і можливу подачу біометану в мережу."],
    [["Food waste is assumed at 24% solids, supplied all year and hauled 25 km one way. A £30/t gate fee is recorded once as a negative purchase price.", "2,000 ha are assumed by agreement, with the gas main 1 km away. There is no useful external heat demand; no support payment is guaranteed in the base case."],
     ["Прийнято 24% сухої речовини, цілорічну подачу й 25 км доставки в один бік. Плату £30/т за приймання враховано один раз через від’ємну закупівельну ціну.", "За умовою є 2 000 га договірних полів, газова мережа — за 1 км. Зовнішнього теплоспоживання немає; державна підтримка не гарантована в базовому сценарії."]],
    ["Secure tonnage, contamination limits and gate-fee contracts. Quote depackaging, methane recovery, connection capacity, gas quality and digestate certification.", "Закріпити обсяги, обмеження домішок і плату договорами. Оцінити розпакування, повернення метану, приєднання, якість газу й сертифікацію дигестату."], [FOOD_AD]),
  de_guelle: brief(
    ["A Bavarian dairy with 650 cows and 300 young cattle evaluates manure-only digestion in the small-plant segment. Support eligibility is a separate question from unsubsidised economics.", "Баварська ферма з 650 коровами та 300 головами молодняку оцінює малу установку на власній гноївці. Право на підтримку розглядається окремо від економіки без неї."],
    [["Year-round housing, 7,000 m³ of existing storage and 450 ha are assumed. Herd-derived manure volumes remain estimates until weighed.", "Demand is 550 MWh of electricity and 250 MWh of useful heat per year. Support cases are displayed separately and do not improve the base verdict."],
     ["Прийнято цілорічне утримання, 7 000 м³ сховища й 450 га. Обсяги за поголів’ям залишаються оцінкою до фактичного вимірювання.", "Річний попит — 550 МВт·год електрики й 250 МВт·год корисного тепла. Схеми підтримки показуються окремо та не поліпшують базовий вердикт."]],
    ["Confirm current EEG rules, capacity and manure-share eligibility with the applicable authority. Obtain small-CHP maintenance and storage-conversion quotes.", "Підтвердити чинні правила EEG, межі потужності й частку гною у відповідального органу. Отримати ціни сервісу малого CHP та переобладнання сховища."]),
  us_dairy_rng: brief(
    ["A Wisconsin dairy with 3,000 cows and 1,500 young cattle compares on-site energy with renewable natural gas. The report tests the project before relying on environmental credits.", "Молочна ферма у Вісконсині з 3 000 корів і 1 500 голів молодняку порівнює власну енергію з RNG. Спершу перевіряється проєкт без опори на екологічні кредити."],
    [["The site has 40,000 m³ of existing storage, 2,500 ha and a gas main 3 km away. Existing lagoons still need technical and permitting review.", "Annual demand is 2.5 GWh of electricity and 800 MWh of heat. RIN, LCFS and carbon-credit income are not automatically combined or guaranteed."],
     ["Є 40 000 м³ наявного сховища, 2 500 га, газова мережа — за 3 км. Стан лагун і дозвільні вимоги потребують окремої перевірки.", "Річне споживання — 2,5 ГВт·год електрики й 800 МВт·год тепла. RIN, LCFS та вуглецеві кредити не підсумовуються автоматично й не гарантуються."]],
    ["Verify actual collection, winter heating, utility interconnection and methane losses. Obtain pathway eligibility, credit ownership and net-of-fees offtake terms separately.", "Перевірити фактичний збір, зимове тепло, приєднання й втрати метану. Окремо підтвердити право на кредити, їх належність і чисті умови збуту після комісій."]),
  br_vinasse: brief(
    ["A São Paulo sugar-ethanol mill considers vinasse and press mud during an eight-month harvest. Warm climate does not remove the seasonal feedstock constraint.", "Цукрово-етанольний завод у Сан-Паулу розглядає вінасу й фільтраційний осад у восьмимісячний сезон. Теплий клімат не усуває сезонності сировини."],
    [["400,000 t/year of vinasse and 40,000 t/year of press mud arrive from April to November. No fresh off-season supply or free storage is invented.", "The scenario has 20,000 ha, no confirmed external heat outlet and a gas main 15 km away. Fertigation constraints and connection cost remain material."],
     ["400 000 т/рік вінаси й 40 000 т/рік фільтраційного осаду надходять із квітня до листопада. Свіжої міжсезонної сировини чи безкоштовного сховища не припускають.", "За умовою є 20 000 га, зовнішнього теплоспоживання немає, газова мережа — за 15 км. Обмеження фертигації й витрати на приєднання залишаються важливими."]],
    ["Measure COD, solids, sulphur and daily harvest flows. Verify potassium and land loading, off-season operation, local quotes and a buyer before selecting gas upgrading.", "Виміряти COD, суху речовину, сірку й добові сезонні потоки. Перевірити калій, навантаження на поля, міжсезонну роботу, місцеві ціни та покупця газу."], [FOOD_AD]),
  th_pome: brief(
    ["A southern Thai palm-oil mill assesses methane recovery from 250,000 t/year of POME. This is also a test of the model's limits for lagoon technology.", "Пальмоолійний завод на півдні Таїланду оцінює повернення метану з 250 000 т/рік POME. Цей кейс також показує межі моделі для лагунної технології."],
    [["Electricity demand is 4 GWh/year and there is no useful external heat outlet. A covered lagoon needs a dedicated design and cannot inherit a CSTR budget unchanged.", "3,000 ha are assumed, but effluent discharge, rainfall storage and loading limits still need assessment. Subsidies and carbon credits are not guaranteed."],
     ["Електроспоживання — 4 ГВт·год/рік, зовнішнього корисного тепла немає. Накрита лагуна потребує окремого проєкту й не може автоматично отримати кошторис CSTR.", "Прийнято 3 000 га, але скид стоків, опади, сховище та допустиме навантаження треба оцінювати окремо. Субсидії й вуглецеві кредити не гарантовані."]],
    ["Measure COD, discharge temperature and seasonal flow. Obtain lagoon-specific CAPEX, liner and cover design, H₂S treatment and current utility terms before using the result for investment.", "Виміряти COD, температуру й сезонні витрати стоків. Отримати кошторис лагуни, проєкт покриття та гідроізоляції, очищення H₂S і чинні умови енергозбуту."], [FOOD_AD]),
  it_slaughter: brief(
    ["An Emilia-Romagna pork processor considers digesting eligible category 3 residues. The model assumes avoided treatment costs and year-round process heat demand; these require confirmation for the proposed site.", "М’ясопереробне підприємство в Емілії-Романьї розглядає зброджування придатних залишків категорії 3. У моделі припущено економію на обробці та цілорічну потребу в технологічному теплі; ці умови потрібно підтвердити для конкретного майданчика."],
    [["The disposal price of €180/t is an assumed current payment and is counted once as avoided cost. Category 1 material is excluded; category 3 must be hygienised before digestion.", "Electricity at €0.225/kWh and gas at €0.56/m³ come from national statistics as a stand-in for invoices; replace them with the plant's own bills."],
     ["Ціна утилізації 180 €/т — припущений поточний платіж, який враховано один раз як уникнені витрати. Матеріал категорії 1 виключено; категорія 3 потребує санітарної обробки перед зброджуванням.", "Електроенергія 0,225 €/кВт·год і газ 0,56 €/м³ — з національної статистики як заміна рахункам; замінити даними власних рахунків заводу."]],
    ["Confirm the disposal contract and invoices, the category split, pasteurisation capacity and the digestate outlet. Obtain quotes for hygienisation and CHP before any decision.", "Перевірити договір і рахунки за обробку, категорії сировини, продуктивність пастеризації та маршрут використання дигестату. До інвестиційного рішення отримати комерційні пропозиції на санітарну обробку й когенераційну установку."], [{ title: "Regulation (EC) No 1069/2009 — animal by-products, categories 1–3", url: "https://eur-lex.europa.eu/eli/reg/2009/1069/oj" }, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  de_biowaste: brief(
    ["A German municipal waste operator considers a 40 kt/year biowaste digester under a long contract. The gate fee is the main income; CHP heat goes to a district network.", "Німецький муніципальний оператор відходів розглядає реактор на 40 тис. т біовідходів на рік за довгим договором. Головний дохід — плата за приймання; тепло від когенераційної установки іде в районну мережу."],
    [["The gate fee of €85/t is a contracted price, entered once as a negative purchase price. Packaging and contamination rejects are not credited as income.", "Heat use assumes a 3 GWh/year district connection; the heat is credited only as far as a signed network agreement allows."],
     ["Плата за приймання 85 €/т — договірна ціна, введена один раз як від'ємна закупівельна ціна. Відбраковані відходи з упаковкою й забрудненням не враховуються як дохід.", "Тепло — 3 ГВт·год на рік для районної мережі; воно враховується лише в межах підписаної угоди з мережею."]],
    ["Check the tender or contract term, tonnage guarantees, reject rates and the district-heat agreement. Obtain biowaste lab data (BMP) and CHP quotes.", "Перевірити умови закупівлі, строк договору, гарантовані обсяги, частку непридатних домішок і договір постачання тепла. Отримати лабораторні результати BMP та комерційні пропозиції на когенераційну установку."], [{ title: "Directive 2008/98/EC — waste framework directive (biowaste, recovery)", url: "https://eur-lex.europa.eu/eli/dir/2008/98/oj" }]
  ),
  it_forsu: brief(
    ["A central-Italian FORSU operator considers a 40 kt/year organic municipal waste plant. A high gate fee and biomethane or power offtake carry the economics; permits and odour control dominate the risk.", "Оператор муніципальних органічних відходів у центральній Італії розглядає завод на 40 тис. т на рік. Економіку тримають висока плата за приймання і збут біометану або електроенергії; головні ризики — дозволи й запахи."],
    [["The gate fee of €110/t is entered as a negative purchase price. It is a contract assumption, not a public tariff.", "Electricity at €0.225/kWh from national statistics replaces the customer's bill; no process heat is used, so output is sold as biomethane or power."],
     ["Плата за приймання 110 €/т введена як від'ємна закупівельна ціна. Це договірне припущення, а не публічний тариф.", "Електроенергія 0,225 €/кВт·год з національної статистики замінює рахунок; технологічного тепла немає, тож продукція йде як біометан або електроенергія."]],
    ["Confirm the municipal contract, gate-fee indexation, odour and permit conditions, and the biomethane offtake. Obtain BMP tests and two EPC quotes.", "Перевірити муніципальний договір, індексацію плати, умови щодо запахів і дозволів та збут біометану. Отримати BMP-тести й дві пропозиції EPC."], [{ title: "Directive 2008/98/EC — waste framework directive (biowaste, recovery)", url: "https://eur-lex.europa.eu/eli/dir/2008/98/oj" }, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  at_dairy: brief(
    ["An Upper Austrian cheese dairy pays for whey and fat-sludge disposal and needs process heat all year. A digester turns part of the disposal cost into steam and power, with digestate spread on contracted land.", "Сироварня у Верхній Австрії платить за утилізацію сироватки й жирового осаду і потребує технологічного тепла цілий рік. Реактор переводить частину витрат на утилізацію в пару й електроенергію; дигестат вносять на договірні поля."],
    [["Whey disposal at €15/t and fat sludge at €60/t are current payments, counted once. Saleable whey and any whey-powder line are excluded.", "Electricity (€0.192/kWh) and gas (€0.65/m³) are national-statistics stand-ins for invoices; process heat first replaces boiler gas."],
     ["Утилізація сироватки 15 €/т і жирового осаду 60 €/т — поточні платежі, враховані один раз. Товарна сироватка і будь-яка лінія сироваткового порошку виключені.", "Електроенергія (0,192 €/кВт·год) і газ (0,65 €/м³) — з національної статистики як заміна рахункам; тепло спершу замінює газ котла."]],
    ["Confirm the disposal invoices, seasonal whey volumes and the hourly heat profile. Check digestate land and the permit for co-digesting fat.", "Перевірити рахунки за утилізацію, сезонні обсяги сироватки і погодинний профіль тепла. Перевірити поля під дигестат і дозвіл на спільне зброджування жиру."], [FOOD_AD, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  se_slaughter: brief(
    ["A Skåne meat plant pays for category 3 residues and burns gas for process steam. Swedish gas prices make recovered heat valuable; the digester is sized to the residue stream.", "М'ясопереробний завод у Сконе платить за відходи категорії 3 і спалює газ для технологічної пари. Високі шведські ціни на газ роблять відновлене тепло цінним; реактор підібрано під потік відходів."],
    [["The disposal cost of SEK 1,600/t is a current payment, counted once; it is high because category 3 transport is long-distance.", "Electricity (SEK 1.30/kWh) and gas (SEK 11.75/m³) come from national statistics converted at the 2025 rate; replace them with invoices."],
     ["Вартість утилізації 1 600 SEK/т — поточний платіж, враховано один раз; вона висока через далекі перевезення відходів категорії 3.", "Електроенергія (1,30 SEK/кВт·год) і газ (11,75 SEK/м³) — з національної статистики за курсом 2025 року; замінити рахунками."]],
    ["Confirm the transport and disposal contract, category 3 hygienisation capacity, and whether heat can be sold to a neighbouring user.", "Перевірити договір на перевезення й утилізацію, потужність санітарної обробки категорії 3 і чи можна продати тепло сусідньому споживачу."], [{ title: "Regulation (EC) No 1069/2009 — animal by-products, categories 1–3", url: "https://eur-lex.europa.eu/eli/reg/2009/1069/oj" }, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  dk_slaughter: brief(
    ["A Jutland meat processor pays for category 3 residues and fat. Year-round steam and cooling demand suit a plant of this size; digestate goes onto the processor's own contracted fields.", "М'ясопереробний завод у Ютландії платить за відходи категорії 3 і жир. Цілорічний попит на пару й охолодження відповідає такому заводу; дигестат іде на договірні поля підприємства."],
    [["The disposal price of DKK 500/t is current and counted once; Danish category 3 disposal is typically priced per tonne at the plant gate.", "Electricity (DKK 0.97/kWh) and gas (DKK 4.91/m³) are statistics stand-ins; the plant's own bills should replace them."],
     ["Ціна утилізації 500 DKK/т — поточна, враховано один раз; датська утилізація категорії 3 зазвичай тарифікується за тонну на воротах заводу.", "Електроенергія (0,97 DKK/кВт·год) і газ (4,91 DKK/м³) — статистичні заміни; замінити даними рахунків."]],
    ["Check the disposal contract and volumes, pasteurisation capacity and the digestate spreading plan on owned fields.", "Перевірити договір на утилізацію й обсяги, потужність пастеризації та план внесення дигестату на власні поля."], [{ title: "Regulation (EC) No 1069/2009 — animal by-products, categories 1–3", url: "https://eur-lex.europa.eu/eli/reg/2009/1069/oj" }, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  de_bakery: brief(
    ["A German bakery group produces dough, bread and confectionery rejects that it pays to dispose of. Ovens and cleaning need process heat through the year; a digester turns the rejects into heat and power.", "Німецька пекарська група має відбраковані тісто, хліб і кондитерські вироби, за утилізацію яких платить. Печі та миття потребують технологічного тепла протягом року; реактор переробляє відходи на тепло й електроенергію."],
    [["Disposal at €120/t is a current payment, counted once. Packaging must be removed first; 30% dry matter is typical for baked-goods residues.", "Electricity (€0.206/kWh) and gas (€0.65/m³) are statistics stand-ins; replace them with the bakery's invoices."],
     ["Утилізація 120 €/т — поточний платіж, враховано один раз. Упаковку треба відокремити; 30% сухої речовини типове для залишків випічки.", "Електроенергія (0,206 €/кВт·год) і газ (0,65 €/м³) — статистичні заміни; замінити рахунками пекарні."]],
    ["Confirm separate collection of bakery residues, the packaging rejection rate and the heat profile. Obtain twelve months of disposal invoices.", "Перевірити окреме збирання залишків випічки, частку пакування та профіль тепла. Отримати рахунки за утилізацію за дванадцять місяців."], [{ title: "Directive 2008/98/EC — waste framework directive (biowaste, recovery)", url: "https://eur-lex.europa.eu/eli/dir/2008/98/oj" }, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  gb_slaughter: brief(
    ["A Midlands poultry plant pays for category 3 residues and needs steam and cooling all year. UK power prices are among the highest in this set, so on-site generation displaces expensive grid electricity.", "Птахопереробний завод у Мідлендсі платить за відходи категорії 3 і потребує пари та охолодження цілий рік. Ціни на електроенергію у Британії серед найвищих у наборі, тож власна генерація замінює дорогу мережеву енергію."],
    [["Disposal at £120/t is a current payment, counted once; UK category 3 disposal contracts are typically priced per tonne.", "Electricity (£0.245/kWh) and gas (£0.38/m³) are national-statistics stand-ins; the plant's own bills should replace them."],
     ["Утилізація 120 £/т — поточний платіж, враховано один раз; контракти на утилізацію категорії 3 у Британії зазвичай за тонну.", "Електроенергія (0,245 £/кВт·год) і газ (0,38 £/м³) — статистичні заміни; замінити рахунками заводу."]],
    ["Check the disposal contract, any exemptions for on-site renewable generation, and the grid-connection terms.", "Перевірити контракт на утилізацію, умови щодо власної генерації відновлюваної електрики та умови приєднання до мережі."], [{ title: "Regulation (EC) No 1069/2009 — animal by-products, categories 1–3", url: "https://eur-lex.europa.eu/eli/reg/2009/1069/oj" }, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  fr_slaughter: brief(
    ["A Brittany abattoir pays for category 3 residues and burns gas for scalding and cleaning steam. A digester on site converts the disposal cost and part of the gas into power and heat.", "Бретонська бійня платить за відходи категорії 3 і спалює газ для пари на опалюванні та миття. Реактор на майданчику перетворює витрати на утилізацію і частину газу на електроенергію й тепло."],
    [["Disposal at €150/t is a current payment, counted once; French category 3 disposal rates vary by region and contract.", "Electricity (€0.155/kWh) and gas (€0.59/m³) are statistics stand-ins; replace them with the abattoir's invoices."],
     ["Утилізація 150 €/т — поточний платіж, враховано один раз; ставки утилізації категорії 3 у Франції різняться за регіоном і договором.", "Електроенергія (0,155 €/кВт·год) і газ (0,59 €/м³) — статистичні заміни; замінити рахунками бійні."]],
    ["Confirm disposal invoices, regional contract terms and the availability of land for digestate.", "Перевірити рахунки за утилізацію, регіональні умови договору та наявність земель під дигестат."], [{ title: "Regulation (EC) No 1069/2009 — animal by-products, categories 1–3", url: "https://eur-lex.europa.eu/eli/reg/2009/1069/oj" }, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  dk_dairy: brief(
    ["A Jutland dairy treats whey and fat sludge at paid disposal and uses process heat and power year-round. Danish gas and electricity prices make on-site heat and power valuable.", "Молочний завод у Ютландії обробляє сироватку й жировий осад з платною утилізацією і використовує технологічне тепло та електроенергію цілий рік. Датські ціни на газ і електроенергію роблять власні тепло та електроенергію цінними."],
    [["Whey disposal at DKK 120/t and fat sludge at DKK 500/t are current payments, counted once.", "Electricity (DKK 0.97/kWh) and gas (DKK 4.91/m³) are statistics stand-ins; replace them with invoices."],
     ["Утилізація сироватки 120 DKK/т і жирового осаду 500 DKK/т — поточні платежі, враховані один раз.", "Ціни електроенергії та газу взято зі статистики. Для інвестиційного рішення потрібні чинні тарифи підприємства."]],
    ["Confirm disposal invoices, whey volumes by month and the heat profile. Check the digestate spreading plan.", "Перевірити рахунки за утилізацію, помісячні обсяги сироватки та профіль тепла. Перевірити план внесення дигестату."], [FOOD_AD, { title: "Eurostat — non-household energy prices (nrg_pc_205, nrg_pc_203)", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table" }]
  ),
  pl_cows_60: brief(
    ["A Polish family farm with 60 cows asks whether an own digester pays. Seasonal housing limits collectable manure, and there is no heat customer.", "Польське сімейне господарство з 60 коровами питає, чи окупиться власний реактор. Сезонне утримання обмежує збір гною, а споживача тепла немає."],
    [["Manure is estimated from head counts and seasonal housing; no laboratory data are assumed.", "Electricity use of 60 MWh/year is far below what a CHP of any useful scale can serve."],
     ["Кількість гною оцінено за поголів’ям і режимом утримання; лабораторних вимірювань немає.", "Попит на електроенергію становить лише 60 МВт·год на рік. Для такого господарства потрібна окрема оцінка малої установки або спільного проєкту з сусідніми фермами."]],
    ["Compare with a shared digester, a storage improvement or a contract with a larger biogas plant before any capital is committed.", "Порівняти зі спільною установкою, поліпшенням сховища або договором із більшою біогазовою станцією до будь-яких капіталовкладень."]
  ),
  gb_farm_60: brief(
    ["An English dairy with 60 cows, housed year-round, considers manure digestion. Without a heat customer and at small volumes, a case like this rarely closes.", "Англійська молочна ферма на 60 корів з цілорічним утриманням розглядає переробку гною. Без споживача тепла і при малих обсягах такий кейс рідко окупається."],
    [["Manure only; no energy crop or gate-fee feedstock is added, so the case is tested as it stands.", "Electricity use of 60 MWh/year and no heat use give little value for a CHP of any size."],
     ["Лише гній; енергетичні культури й сировина з платою за приймання не додані — кейс перевірено в поточному вигляді.", "Споживання 60 МВт·год електроенергії і відсутність споживання тепла дають малу цінність для когенераційної установки будь-якого розміру."]],
    ["Check whether a neighbouring plant could take the manure, and whether the farm has heat use it has not yet counted.", "Перевірити, чи може сусідня установка прийняти гній, і чи є у господарства споживання тепла, яке ще не враховано."]
  ),
  ro_pigs_300: brief(
    ["A Romanian family unit with 300 finishing places. Manure is the only feedstock and heating needs are seasonal, which is too little to support a stand-alone digester.", "Румунська сімейна ферма на 300 місць відгодівлі. Гній — єдина сировина, а потреба в опаленні сезонна; цього замало для окремого реактора."],
    [["Manure from 300 finishers is estimated from animal numbers, not weighed.", "Heating needs of 20 MWh/year are seasonal and cannot justify a digester on their own."],
     ["Гній від 300 відгодівельних свиней оцінено за поголів'ям, а не зважено.", "Потреба в опаленні 20 МВт·год на рік сезонна і сама по собі не виправдовує реактор."]],
    ["Check whether a cooperative or a neighbouring farm could share a digester, and what a non-biogas heating option costs.", "Перевірити, чи можуть кооператив або сусіднє господарство спільно використати реактор, і скільки коштує опалення без біогазу."]
  ),
  kz_cows_150: brief(
    ["A Kazakh dairy in Akmola with 150 cows and seasonal housing. Grazing reduces collectable manure, and the local grid tariff gives little value for own power.", "Казахське молочне господарство в Акмолі на 150 корів з сезонним утриманням. Випасання зменшує збір гною, а місцевий тариф дає малу цінність для власної електроенергії."],
    [["The electricity tariff of 31.85 KZT/kWh is a regional tariff and is entered as the customer's price.", "Manure is collected only during housing; no energy crop is assumed."],
     ["Тариф 31,85 KZT/кВт·год — регіональний тариф, введений як ціна клієнта.", "Гній збирається лише під час утримання в приміщеннях; енергетичні культури не припускаються."]],
    ["Confirm the tariff with the local distributor, the grazing calendar and whether a heat customer exists.", "Підтвердити тариф у місцевого дистриб'ютора, календар випасання і наявність споживача тепла."]
  ),
  tr_cows_100: brief(
    ["A Turkish dairy farm in Konya with 100 cows, housed year-round. Manure alone is too little for a digester of economic size, and there is no heat customer.", "Турецька молочна ферма в Коньї на 100 корів з цілорічним утриманням. Самого гною замало для реактора економічного розміру, а споживача тепла немає."],
    [["Manure is estimated from head counts; no laboratory data are assumed.", "Electricity use of 90 MWh/year is well below the scale at which a CHP is cost-effective."],
     ["Кількість гною оцінено за поголів’ям; лабораторних вимірювань немає.", "За попиту 90 МВт·год електроенергії на рік слід окремо порівняти малу установку та участь у спільному проєкті."]],
    ["Compare shared digestion through a cooperative, and check the connection conditions for small plants in Türkiye.", "Порівняти спільне зброджування через кооператив і перевірити умови підключення малих установок у Туреччині."]
  ),
};

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
        operations: ["Whey and fat sludge are separate year-round streams. The €6/t and €55/t treatment savings are scenario assumptions that need invoices.", "Milk cooling, cleaning and hot water give simultaneous electricity and heat demand. No spreading land is assumed, so digestate removal remains a cost."],
        verify: "Confirm whey quality, cleaning-chemical carryover and the BMP of the actual sludge. Test the fat loading and obtain a digestate outlet agreement.",
      },
      uk: {
        context: "Молочний кооператив у Бретані має некондиційну сироватку та флотаційний осад. Товарна сироватка залишається в харчовому чи кормовому збуті й не рахується безкоштовною сировиною для біогазу.",
        operations: ["Сироватка та жировий осад задані окремими цілорічними потоками. Економія €6/т і €55/т на обробці — припущення сценарію, які потрібно підтвердити рахунками.", "Охолодження молока, миття й гаряча вода створюють попит на електрику та тепло. Полів немає, тому вивезення дигестату залишається витратою."],
        verify: "Уточнити якість сироватки, потрапляння мийних засобів та BMP саме цього осаду. Перевірити жирове навантаження й домовитися про приймання дигестату.",
      },
    }, sources: [FOOD_AD],
  },
  nl_food_30k: {
    notes: {
      en: {
        context: "A potato processor in North Brabant is reviewing its peel and wet-pulp outlets. One stream earns feed revenue; the thinner stream incurs treatment costs. They cannot share a single assumed gate fee.",
        operations: ["Peelings and thin pulp have different dry-matter contents. Diverting peelings loses €28/t of feed sales, while the thin stream has an assumed €7/t treatment cost.", "Frying and hot-water demand can use recovered heat. The nearby gas main is a possible connection, not a confirmed right to inject. No land is allocated to digestate."],
        verify: "Check existing feed contracts, contaminants and daily quantities. Quote connection, dewatering and off-site digestate handling before assigning a value to the gas.",
      },
      uk: {
        context: "Картоплепереробний завод у Північному Брабанті переглядає збут лушпиння та рідкої мезги. Один потік приносить кормовий дохід, інший потребує платної обробки — єдиної плати за утилізацію для них немає.",
        operations: ["Для лушпиння й мезги задано різний вміст сухої речовини. Перенаправлення лушпиння забирає €28/т кормового доходу; для рідкого потоку прийнято €7/т поточних витрат.", "Тепло можна використовувати для смаження й гарячої води. Близька газова мережа ще не означає погодженого приєднання. Землі під дигестат не передбачено."],
        verify: "Перевірити кормові контракти, домішки й добові обсяги. Отримати пропозиції на приєднання, зневоднення та вивезення дигестату.",
      },
    }, sources: [FOOD_AD, { title: "Teagasc — Potato processing side streams (2025)", url: "https://teagasc.ie/about/research--innovation/research-publications/tresearch-articles/chipping-away-at-food-waste-php/?c=104" }],
  },
  pl_food_30k: {
    notes: {
      en: {
        context: "A sugar factory in Wielkopolska considers year-round digestion of ensiled pressed beet pulp. The pulp already has a livestock-feed market, so its entire energy value is not an additional profit.",
        operations: ["The model assumes existing pulp silage clamps and year-round feeding. Lost pulp sales are charged at PLN160/t; no disposal saving is added.", "Only 700 ha are available for digestate. The factory's annual utility figures do not describe the hourly campaign load or prove year-round self-consumption."],
        verify: "Verify silage losses, clamp capacity, leachate handling and the actual feed-sale price. Obtain monthly utility profiles; new silage infrastructure requires a separate quote.",
      },
      uk: {
        context: "Цукроварня у Великопольщі розглядає цілорічне зброджування силосованого пресованого жому. Жом уже має кормовий збут, тому вся його енергетична цінність не є додатковим прибутком.",
        operations: ["Прийнято, що силосні траншеї вже є, а подача жому триває весь рік. Втрачений продаж враховано за 160 PLN/т; економії на утилізації немає.", "Для дигестату доступно 700 га. Річні енергопоказники заводу не описують погодинне навантаження кампанії й не доводять цілорічного власного споживання."],
        verify: "Звірити втрати під час силосування, місткість траншей, збір фільтрату й фактичну ціну продажу жому. Потрібні місячні графіки енергії; нові траншеї оцінюються окремо.",
      },
    }, sources: [FOOD_AD],
  },
  gb_food_onsite: {
    notes: {
      en: {
        context: "An East Anglian grain distillery compares wet-stillage sales with energy recovery for its steam system. This scenario retains the commercial value of the existing feed outlet.",
        operations: ["Wet stillage is generated throughout the year at 8% dry matter. Its assumed feed-sale value is £14/t; no gate fee is received.", "The plant has a large process-steam demand, a nearby gas connection and no spreading land. Digestate removal is not assumed to be free."],
        verify: "Check stillage composition, current feed contracts and boiler fuel records. Match the proposed biogas burner to steam pressure, turndown and production shutdowns.",
      },
      uk: {
        context: "Зерновий спиртзавод у Східній Англії порівнює продаж мокрої барди з отриманням енергії для виробничої пари. Наявний кормовий дохід зберігається у витратах альтернативного сценарію.",
        operations: ["Барда надходить протягом року, містить 8% сухої речовини. Прийнята ціна її продажу — £14/т; доходу від приймання відходів немає.", "Завод має значну потребу в парі, близьке газове приєднання й не має полів. Безкоштовне вивезення дигестату не передбачається."],
        verify: "Перевірити склад барди, кормові договори та фактичне паливоспоживання котлів. Узгодити пальник із тиском пари, діапазоном потужності й зупинками виробництва.",
      },
    }, sources: [FOOD_AD, { title: "University of Limerick — Distillery spent wash and biogas", url: "https://pure.ul.ie/en/publications/pre-treatment-of-distillery-spent-wash-vinasse-with-vortex-based-/" }],
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
  us_food_40k: {
    notes: {
      en: {
        context: "A Wisconsin wastewater works considers a new sludge digester and limited acceptance of collected fats, oils and grease. Aeration and pumping provide a continuous electricity demand.",
        operations: ["Thickened sludge at 4.5% solids is distinct from delivered grease. A $35/t grease gate fee is recorded once; no saving for eliminating all sludge disposal is credited.", "Digester heating is covered before external useful heat. No agricultural land or fertiliser sales are assumed."],
        verify: "The model's generic digestate costs do not replace a biosolids budget. Obtain dewatering, treatment and disposal quotes, contaminant tests and a permitted outlet; check aeration loads and outage resilience separately.",
      },
      uk: {
        context: "Очисні споруди у Вісконсині розглядають новий метантенк для осаду й обмежене приймання зібраних жирів. Аерація та насоси створюють постійне електричне навантаження.",
        operations: ["Згущений осад із 4,5% сухої речовини відокремлено від привізного жиру. Плата $35/т за приймання жиру врахована один раз; повне усунення витрат на осад не зараховується.", "Спершу покривається нагрів метантенка, потім інше корисне тепло. Сільськогосподарських полів та доходу від добрив не передбачено."],
        verify: "Типові витрати моделі на дигестат не замінюють кошторис поводження з осадом. Потрібні пропозиції на зневоднення, обробку та вивезення, аналіз забруднень і погоджений приймач; резервування енергії оцінюється окремо.",
      },
    }, sources: [{ title: "US EPA — Types of anaerobic digesters", url: "https://www.epa.gov/anaerobic-digestion/types-anaerobic-digesters" }, { title: "US DOE — CHP at wastewater treatment plants", url: "https://betterbuildingssolutioncenter.energy.gov/sites/default/files/attachments/Market_Sector_Fact_Sheet_Wastewater_Treatment.pdf" }],
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
};

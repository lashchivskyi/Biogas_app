import type { BusinessTypeId } from "@/core/types";

/**
 * Sector landing pages (/[lang]/biogas/[slug]). Long-form SEO copy exists in English and Ukrainian;
 * other locales render English (hreflang points only to en/uk for these pages).
 * Short picker texts for the home page live in the i18n dictionaries (dict.fit.segments).
 * Figures in prose are qualitative; numbers on the page come from the model (src/core/examples.ts).
 */
export interface SegmentSeo {
  title: string;
  description: string;
  h1: string;
  intro: string[];
  drivers: Array<[string, string]>;
  faq: Array<[string, string]>;
}

export interface Segment {
  slug: string;
  id: "meat" | "dairyproc" | "poultry" | "pigs" | "dairy" | "brewery" | "small";
  businessType: BusinessTypeId;
  exampleId: string;
  tone: "good" | "mid" | "weak";
  seo: { en: SegmentSeo; uk: SegmentSeo };
}

export const SEGMENTS: Segment[] = [
  {
    slug: "meat-processing", id: "meat", businessType: "slaughterhouse", exampleId: "slaughter_5000", tone: "good",
    seo: {
      en: {
        title: "Biogas for slaughterhouses and meat processing: payback",
        description: "Does a biogas plant on slaughter residues pay off? Methane from rumen content, blood and DAF fat, CAPEX, payback and the conditions that matter. Free screening.",
        h1: "Biogas for meat processing plants",
        intro: [
          "Slaughter residues — rumen content, blood, DAF fat — yield several times more methane per tonne than manure. The plant already pays for their removal and uses steam, hot water and power for cooling every day. This is where biogas most often pays without any subsidy.",
          "The conditions: a steady daily flow (in our model NPV turns positive from roughly 3 kt a year), pasteurisation of animal by-products, and land or an offtaker for the nitrogen-rich digestate.",
        ],
        drivers: [
          ["Disposal cost", "The more you pay today, the faster the payback — and this saving doesn't depend on energy prices."],
          ["Own consumption", "Power and heat for refrigeration and steam replace purchased energy — the most valuable kWh you can make."],
          ["Pasteurisation", "Mandatory for Category 3 material: adds CAPEX and heat use, but unlocks the feedstock."],
          ["Digestate", "Rich in nitrogen: you need fields or agreements with farms, otherwise it is a cost."],
        ],
        faq: [
          ["Can blood and rumen content be digested together?", "Yes, in co-digestion. They are blended to avoid excess nitrogen and fat; the ratio is set after a laboratory analysis."],
          ["Is pasteurisation required?", "For Category 3 animal by-products, yes (70 °C for 1 hour). Some material may be Category 2 with stricter rules — the veterinary authority decides."],
          ["What plant size do I need?", "Your feedstock sets it: a few thousand tonnes a year usually means 100–300 kW of electrical capacity. The calculator gives your range."],
        ],
      },
      uk: {
        title: "Біогаз для м'ясопереробки та бойні: окупність установки",
        description: "Чи окупиться біогазова установка на відходах забою: скільки біогазу дають рубець, кров і флотат, вартість, окупність і умови. Безкоштовний розрахунок.",
        h1: "Біогаз для м'ясопереробних підприємств",
        intro: [
          "Відходи забою — рубцевий вміст, кров, жировий флотат — дають у кілька разів більше метану на тонну, ніж гній. Підприємство вже платить за їх вивезення і щодня споживає пару, гарячу воду й електрику для холоду. Саме тут біогаз найчастіше має позитивну економіку без субсидій.",
          "Головні умови — достатній щоденний потік (за нашою моделлю NPV стає додатним приблизно від 3 тис. т на рік), пастеризація побічних продуктів тваринного походження та земля або покупець для дигестату.",
        ],
        drivers: [
          ["Вартість утилізації", "Що більше ви зараз платите за вивезення, то швидша окупність — ця економія не залежить від тарифів."],
          ["Власне споживання", "Електрика й тепло для холодильників і пари заміщують покупні — це найцінніші кіловат-години."],
          ["Пастеризація", "Обов'язкова для категорії 3: додає CAPEX і тепловитрати, але відкриває доступ до сировини."],
          ["Дигестат", "Багато азоту: потрібні поля або договори з агропідприємствами, інакше це витрата."],
        ],
        faq: [
          ["Чи можна переробляти кров і рубцевий вміст разом?", "Так, у ко-ферментації. Їх змішують, щоб уникнути надлишку азоту й жирів; співвідношення визначають після лабораторного аналізу."],
          ["Чи потрібна пастеризація?", "Для категорії 3 — так (70 °C, 1 година). Частина матеріалу може бути категорією 2 з жорсткішими вимогами — це вирішує ветслужба."],
          ["Який розмір установки потрібен?", "Його визначає сировина: кілька тисяч тонн на рік — зазвичай 100–300 кВт ел. Калькулятор покаже ваш діапазон."],
        ],
      },
    },
  },
  {
    slug: "dairy-processing", id: "dairyproc", businessType: "dairy_processor", exampleId: "dairy_processor", tone: "mid",
    seo: {
      en: {
        title: "Biogas from whey for dairies and cheese plants",
        description: "A biogas plant on whey and DAF sludge: biogas yield, payback, CAPEX and conditions. Free screening for dairy processors.",
        h1: "Biogas for dairies and cheese plants",
        intro: [
          "Whey and DAF sludge arrive daily, and a dairy uses hot water, steam and cooling around the clock. That is an almost ideal profile for biogas — if the volume is large enough.",
          "Whey is very dilute (≈ 6 % dry matter), so energy per tonne is modest. In our model the case becomes realistic from around 15 kt of whey a year, especially together with fatty wastes.",
        ],
        drivers: [
          ["Alternative value of whey", "If it sells well as feed, that is lost revenue — we count it as a cost."],
          ["Fat sludge", "Small amounts of fat lift biogas output a lot but need careful dosing."],
          ["Heat", "Year-round steam and hot water are why CHP pays better here than on a farm."],
          ["Process stability", "Whey acidifies fast: a buffer tank and process control are needed."],
        ],
        faq: [
          ["Can biogas run on whey alone?", "It can, but small volumes give weak economics. Best is whey plus fat sludge, or manure from nearby farms."],
          ["What about digestate without our own fields?", "Contracts with farms or digestate separation. Without them it becomes a cost — the calculator shows it."],
        ],
      },
      uk: {
        title: "Біогаз із сироватки для молокозаводу та сироварні",
        description: "Біогазова установка на сироватці та жиро-флотаційному осаді: вихід біогазу, окупність, вартість і умови. Безкоштовний розрахунок.",
        h1: "Біогаз для молокозаводів і сироварень",
        intro: [
          "Сироватка та жиро-флотаційний осад утворюються щодня, а молокозавод цілодобово споживає гарячу воду, пару й холод. Це майже ідеальний профіль для біогазу — якщо обсягу достатньо.",
          "Сироватка дуже рідка (≈ 6 % сухої речовини), тому енергії на тонну небагато. За нашою моделлю проєкт стає реальним приблизно від 15 тис. т на рік, особливо разом із жировими відходами.",
        ],
        drivers: [
          ["Альтернативна вартість сироватки", "Якщо її вигідно продають на корм, це втрачений дохід — враховуємо як витрату."],
          ["Жиро-осад", "Невеликий обсяг жирів суттєво збільшує вихід біогазу, але потребує обережного дозування."],
          ["Тепло", "Пара і гаряча вода цілий рік — головна причина, чому когенерація тут окупається краще."],
          ["Стабільність процесу", "Сироватка швидко закислюється: потрібні буферна ємність і контроль процесу."],
        ],
        faq: [
          ["Чи можна зробити біогаз лише на сироватці?", "Можна, але на малих обсягах економіка слабка. Найкраще — разом із жиро-осадом або гноєм сусідніх ферм."],
          ["Що робити з дигестатом без власних полів?", "Договори з агропідприємствами або сепарація. Без цього він стає витратою — калькулятор це покаже."],
        ],
      },
    },
  },
  {
    slug: "poultry", id: "poultry", businessType: "poultry_farm", exampleId: "layers_200k", tone: "mid",
    seo: {
      en: {
        title: "Biogas from poultry manure: does it pay off?",
        description: "Biogas from chicken manure: ammonia inhibition, co-substrates, heat for poultry houses, CAPEX and payback. Free screening.",
        h1: "Biogas for poultry farms",
        intro: [
          "Poultry manure is rich in energy but also in nitrogen. On its own it slows the bacteria through ammonia, so in practice it is diluted or blended with other feedstock.",
          "Poultry farms have strong points — a constant flow and high winter heat demand. Whether it pays depends on scale, co-substrates and where the nitrogen-rich digestate goes.",
        ],
        drivers: [
          ["Ammonia", "The model cuts the yield when poultry manure exceeds about a third of the organic matter, and flags the risk."],
          ["Co-substrate", "Slurry, crop or food residues dilute nitrogen and stabilise the process."],
          ["House heating", "In winter CHP heat replaces gas — a real saving."],
          ["Grit", "Sand and shell settle in the digester: pre-treatment is needed."],
        ],
        faq: [["Why not use manure alone?", "Excess ammonia slows the bacteria, gas yield drops and the process can stop. Dilution or a co-substrate is needed."], ["Does broiler litter work?", "Yes, but it is dry and contains straw: dilution and solids feeding are required."]],
      },
      uk: {
        title: "Біогаз із курячого посліду для птахофабрики: окупність",
        description: "Чи вигідна біогазова установка на курячому посліді: аміачне інгібування, ко-сировина, тепло для пташників, вартість і окупність.",
        h1: "Біогаз для птахофабрик",
        intro: [
          "Курячий послід містить багато енергії, але й багато азоту. У чистому вигляді він гальмує роботу бактерій через аміак, тому його змішують з іншою сировиною або розводять.",
          "Сильні сторони птахофабрик — постійний потік і великий попит на тепло взимку. Чи окупиться проєкт, залежить від масштабу, ко-сировини та того, куди подіти дигестат.",
        ],
        drivers: [
          ["Аміак", "Модель знижує вихід газу, якщо послід становить понад третину органічної речовини, і попереджає про ризик."],
          ["Ко-сировина", "Гноївка, рослинні чи харчові відходи розбавляють азот і стабілізують процес."],
          ["Тепло для пташників", "Взимку тепло від когенерації заміщує газ — реальна економія."],
          ["Домішки", "Пісок і шкаралупа осідають у реакторі: потрібна підготовка сировини."],
        ],
        faq: [["Чому не можна взяти лише послід?", "Через надлишок аміаку бактерії працюють гірше, вихід газу падає, процес може зупинитися."], ["Бройлерна підстилка підходить?", "Так, але вона суха й містить солому: потрібні розведення та подача твердої сировини."]],
      },
    },
  },
  {
    slug: "pig-farms", id: "pigs", businessType: "pig_farm", exampleId: "pig_5000", tone: "weak",
    seo: {
      en: {
        title: "Biogas for pig farms from slurry: will it pay off?",
        description: "A biogas plant on pig slurry: biogas yield, why co-substrates matter, heat for piglets, CAPEX and payback. Honest free screening.",
        h1: "Biogas for pig farms",
        intro: [
          "Pig slurry is a steady feedstock, but it is 95 % water. A tonne yields little gas, and hauling it more than a few kilometres makes no economic sense.",
          "In our model a slurry-only plant without subsidies rarely pays back in a reasonable time — except at very large scale. Gate-fee residues from processors and year-round heat for piglets change the picture.",
        ],
        drivers: [
          ["Co-substrate", "The main lever: food waste or slaughter residues multiply the biogas yield."],
          ["Heat", "Heating piglet houses is the most valuable use of CHP heat."],
          ["Distance", "Slurry is processed where it is produced."],
          ["Existing lagoons", "Covering an existing store is cheaper than a new one and cuts methane emissions."],
        ],
        faq: [["How many pigs do I need?", "On slurry alone — a lot; mid-size farms without co-substrates have weak economics. Check your numbers in the calculator."], ["What about selling the power?", "Without a tariff, the selling price is far below what you pay. Self-consumption is much more valuable."]],
      },
      uk: {
        title: "Біогаз для свинокомплексу з гноївки: чи окупиться",
        description: "Біогазова установка на свинячій гноївці: скільки біогазу, чому важлива ко-сировина, тепло для поросят, вартість і окупність.",
        h1: "Біогаз для свинокомплексів",
        intro: [
          "Свиняча гноївка — стабільна сировина, але на 95 % це вода. З тонни виходить мало газу, а возити її далі кількох кілометрів безглуздо.",
          "За нашою моделлю установка лише на гноївці без субсидій рідко окупається в розумний строк — крім дуже великого масштабу. Ситуацію змінюють відходи переробників з платою за прийом і цілорічне тепло для поросят.",
        ],
        drivers: [
          ["Ко-сировина", "Головний важіль: харчові відходи чи відходи забою множать вихід біогазу."],
          ["Тепло", "Опалення приміщень для поросят — найцінніше використання тепла когенерації."],
          ["Відстань", "Гноївку переробляють там, де вона утворюється."],
          ["Наявні лагуни", "Накриття наявного сховища дешевше за нове й зменшує викиди метану."],
        ],
        faq: [["Скільки свиней потрібно?", "Для самої гноївки — дуже багато; середні комплекси без ко-сировини мають слабку економіку."], ["А якщо продавати електрику?", "Без тарифу ціна продажу значно нижча за ціну купівлі. Власне споживання значно вигідніше."]],
      },
    },
  },
  {
    slug: "dairy-farms", id: "dairy", businessType: "dairy_farm", exampleId: "dairy_400", tone: "weak",
    seo: {
      en: {
        title: "Biogas from cow manure for dairy farms: payback",
        description: "Will a biogas plant on cattle manure pay off? Biogas per cow, plant cost, payback, co-substrates and farm clusters. Free screening.",
        h1: "Biogas for dairy farms",
        intro: [
          "A dairy cow produces about 20 t of slurry a year — and only ≈ 250 m³ of methane. A manure-only plant is therefore small in output but not cheap: digester, storage and CHP cost a lot regardless of size.",
          "Without subsidies our model shows weak economics for typical herds of a few hundred cows — just as in Germany, where small manure plants live on a dedicated tariff. Real routes: gate-fee co-substrates, full heat use and clusters of farms.",
        ],
        drivers: [
          ["Scale", "Small capacity makes every kW expensive — the main reason for weak economics."],
          ["Co-substrate", "Residues from nearby processors can change the verdict."],
          ["Heat", "Hot water for the parlour and heating is an extra saving if the user is close."],
          ["Housing", "Cows on summer pasture leave manure you can't collect — reflect it in your answers."],
        ],
        faq: [["How many cows does a biogas plant need?", "Technically a few hundred, but without co-substrates it rarely pays back. The calculator shows your case in 3 minutes."], ["Can a single farm produce biomethane?", "Usually not — upgrading and grid connection pay from hundreds of m³ of gas per hour. The route is a cluster of farms."]],
      },
      uk: {
        title: "Біогаз з гною для молочної ферми: окупність установки",
        description: "Чи окупиться біогазова установка на гною ВРХ: скільки біогазу дає корова, вартість установки, окупність, ко-сировина і кластери.",
        h1: "Біогаз для молочних ферм",
        intro: [
          "Одна корова дає близько 20 т гноївки на рік — і лише ≈ 250 м³ метану. Установка тільки на гною виходить малою за потужністю, але не дешевою: реактор, сховище й когенерація дорогі незалежно від масштабу.",
          "Без субсидій наша модель показує слабку економіку для типових ферм на кількасот корів — так само, як у Німеччині, де малі гнойові установки живуть на спецтарифі. Реальні шляхи: ко-сировина з платою за прийом, повне використання тепла і кластер ферм.",
        ],
        drivers: [
          ["Масштаб", "Мала потужність робить кожен кіловат дорогим — головна причина слабкої економіки."],
          ["Ко-сировина", "Відходи сусідніх переробників можуть змінити вердикт."],
          ["Тепло", "Гаряча вода для доїльного залу й обігрів — додаткова економія, якщо споживач поруч."],
          ["Утримання", "Влітку на пасовищі гній не зібрати — врахуйте це у відповідях."],
        ],
        faq: [["Скільки корів потрібно для біогазової установки?", "Технічно — кількасот, але без ко-сировини вона рідко окупається. Калькулятор покаже ваш випадок за 3 хвилини."], ["Чи можна отримувати біометан на фермі?", "Для однієї ферми зазвичай ні — очищення й підключення вигідні від сотень м³ газу на годину. Шлях — кластер господарств."]],
      },
    },
  },
  {
    slug: "breweries", id: "brewery", businessType: "brewery", exampleId: "brewery", tone: "weak",
    seo: {
      en: {
        title: "Biogas for breweries from spent grain and effluent",
        description: "Is biogas from brewer's spent grain worth it? Feed value, effluent, steam demand, payback. Free screening for breweries.",
        h1: "Biogas for breweries",
        intro: [
          "Spent grain gives a lot of biogas, but it usually sells to farmers as feed. Sending it to a digester loses that income — we count it as a cost.",
          "For breweries biogas more often pays on high-strength effluent and sludge, or when selling spent grain is difficult.",
        ],
        drivers: [["Spent grain price", "The better it sells, the weaker the biogas case."], ["Effluent", "Anaerobic pre-treatment can cut sewer charges — a separate calculation."], ["Steam", "Constant steam demand is the main heat user."]],
        faq: [["Selling spent grain or making biogas — which is better?", "It depends on the sale price and your energy use. Enter the price in the calculator and it compares."]],
      },
      uk: {
        title: "Біогаз для пивоварні з дробини та стоків",
        description: "Чи вигідно робити біогаз з пивної дробини: вартість корму, стоки, пара, окупність. Безкоштовний розрахунок.",
        h1: "Біогаз для пивоварень",
        intro: [
          "Пивна дробина дає багато біогазу, але зазвичай її продають фермерам на корм. Якщо віддати її в реактор, цей дохід зникає — ми враховуємо його як витрату.",
          "Тому для пивоварні біогаз частіше має сенс на висококонцентрованих стоках і осадах або коли збут дробини складний.",
        ],
        drivers: [["Ціна дробини", "Що дорожче її продаєте, то слабша економіка біогазу."], ["Стоки", "Анаеробне очищення може зменшити плату водоканалу — окремий розрахунок."], ["Пара", "Постійна потреба в парі — головний споживач тепла."]],
        faq: [["Що вигідніше: продавати дробину чи робити біогаз?", "Залежить від ціни продажу й вашого споживання енергії. Вкажіть ціну в калькуляторі — він порівняє."]],
      },
    },
  },
  {
    slug: "small-farms", id: "small", businessType: "cattle_farm", exampleId: "mixed_80", tone: "weak",
    seo: {
      en: {
        title: "Biogas plant for a small farm or household: is it worth it?",
        description: "The honest answer on biogas for homesteads and small farms: gas per cow, plant cost, safety, and better alternatives.",
        h1: "Biogas for small farms and households",
        intro: [
          "One cow produces ≈ 250 m³ of methane a year. At typical household gas prices that is worth little — and in winter much of it goes into heating the digester itself. A plant costs thousands of euros, so payback takes decades.",
          "Biogas also means methane and hydrogen sulphide: without professional installation there is a risk of explosion and poisoning. For homesteads and small farms we usually recommend teaming up with neighbours or supplying manure to a larger plant.",
        ],
        drivers: [["Feedstock volume", "Too small for the equipment to pay back."], ["Household gas price", "Low regulated prices make the saving negligible."], ["Safety", "Methane and H₂S require professional installation and supervision."]],
        faq: [["Can I build a DIY biogas plant at home?", "Technically yes, but it is dangerous (explosion, H₂S poisoning) and almost never pays. We don't recommend home-made digesters."], ["What should a small farm do with manure?", "Composting, proper storage and spreading, or joining a shared (cluster) biogas plant."]],
      },
      uk: {
        title: "Біогазова установка для дому та малої ферми: чи варто",
        description: "Чесно про біогаз для приватного господарства і малої ферми: скільки газу дає корова, вартість установки, безпека і кращі альтернативи.",
        h1: "Біогаз для малої ферми та приватного господарства",
        intro: [
          "Одна корова дає ≈ 250 м³ метану на рік. За ціною газу для населення це кілька тисяч гривень — і взимку значна частина піде на обігрів самого реактора. Установка коштує тисячі євро, тож окупність — десятиліття.",
          "Біогаз — це метан і сірководень: без професійного монтажу є ризик вибуху та отруєння. Тому домогосподарствам і малим фермам ми зазвичай радимо об'єднатися з сусідами або здавати гній на більшу установку.",
        ],
        drivers: [["Обсяг сировини", "Замало для окупності обладнання."], ["Ціна газу для населення", "Низька регульована ціна робить економію незначною."], ["Безпека", "Метан і сірководень потребують професійного монтажу та контролю."]],
        faq: [["Чи можна зробити біогаз для дому своїми руками?", "Технічно — так, але це небезпечно (вибух, отруєння H₂S) і майже ніколи не окупається. Ми не рекомендуємо саморобні установки."], ["Що робити з гноєм малої ферми?", "Компостування, правильне зберігання і внесення, або участь у спільній установці."]],
      },
    },
  },
];

export const segmentBySlug = (slug: string) => SEGMENTS.find((s) => s.slug === slug);

import type { BusinessTypeId } from "@/core/types";
import { SECTOR_IDS, businessSlug } from "@/core/businesses";
import { EXAMPLES } from "@/core/examples";

/**
 * Sector landing pages (/[lang]/biogas/[slug]). Authored English/Ukrainian articles are retained;
 * other entries use native product summaries through localizedSegment (with locale-specific hreflang).
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
  id: "meat" | "dairyproc" | "sugar" | "foodwaste" | "poultry" | "pigs" | "dairy" | "brewery" | "small" | BusinessTypeId;
  businessType: BusinessTypeId;
  exampleId?: string;
  tone?: "good" | "mid" | "weak";
  seo?: { en: SegmentSeo; uk: SegmentSeo };
}

const AUTHORED_SEGMENTS: Segment[] = [
  {
    slug: "meat-processing", id: "meat", businessType: "slaughterhouse", exampleId: "slaughter_5000", tone: "good",
    seo: {
      en: {
        title: "Biogas for slaughterhouses and meat processing: payback",
        description: "Does a biogas plant on slaughter residues pay off? Methane from rumen content, blood and DAF fat, CAPEX, payback and the conditions that matter. Free screening.",
        h1: "Biogas for meat processing plants",
        intro: [
          "Slaughter residues — rumen content, blood, DAF fat — yield several times more methane per tonne than manure. The plant already pays for their removal and uses steam, hot water and power for cooling every day. This is where biogas most often pays without any subsidy.",
          "The conditions: a steady daily flow (in our model NPV turns positive from roughly 2–3 kt a year when disposal is paid for), pasteurisation of animal by-products, and land or an offtaker for the nitrogen-rich digestate.",
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
          "Головні умови — достатній щоденний потік (за нашою моделлю NPV стає додатним приблизно від 2–3 тис. т на рік, якщо утилізація платна), пастеризація побічних продуктів тваринного походження та земля або покупець для дигестату.",
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
    slug: "dairy-processing", id: "dairyproc", businessType: "dairy_processor", exampleId: "it_whey", tone: "good",
    seo: {
      en: {
        title: "Biogas from whey for dairies and cheese plants",
        description: "A biogas plant on whey and DAF sludge: biogas yield, payback, CAPEX and conditions. Free screening for dairy processors.",
        h1: "Biogas for dairies and cheese plants",
        intro: [
          "Whey and DAF sludge arrive daily, and a dairy uses hot water, steam and cooling around the clock. That is an almost ideal profile for biogas — if the volume is large enough.",
          "Whey is very dilute (≈ 6 % dry matter), so energy per tonne is modest. In our model the case becomes realistic from about 10–20 kt of whey a year — the lower end where power and gas are expensive — especially together with fatty wastes.",
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
          "Сироватка дуже рідка (≈ 6 % сухої речовини), тому енергії на тонну небагато. За нашою моделлю проєкт стає реальним приблизно від 10–20 тис. т на рік (нижня межа — там, де дорогі електрика й газ), особливо разом із жировими відходами.",
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
    slug: "sugar-industry", id: "sugar", businessType: "sugar_beet_factory", exampleId: "ua_sugar", tone: "good",
    seo: {
      en: {
        title: "Biogas from sugar-beet pulp: economics for sugar factories",
        description: "Pressed beet pulp is one of the most energy-dense industrial residues. CAPEX, payback and the conditions that make a sugar-factory biogas plant work. Free screening.",
        h1: "Biogas for sugar factories",
        intro: [
          "A sugar factory produces tens of thousands of tonnes of pressed pulp in a few months — and needs huge amounts of heat during the campaign. Pressed pulp (≈ 22–24 % dry matter) gives about 70 m³ of methane per tonne, five times more than cattle slurry.",
          "Ensiled pulp can feed a digester all year, so the plant runs at full load while power and heat replace grid electricity and natural gas. Plants of this type operate in Germany, Poland, France and Ukraine.",
        ],
        drivers: [
          ["Feed value of pulp", "Pulp sold as feed is lost revenue: the economics work when the feed price is low or the market is saturated."],
          ["Gas replacement", "During the campaign biogas displaces factory gas — at current gas prices this is the largest saving."],
          ["Ensiling", "Silage storage (clamps or silos) lets the digester run 12 months instead of 4."],
          ["Biomethane", "At 1 000+ Nm³/h of biogas, upgrading and grid injection become realistic."],
        ],
        faq: [
          ["Can pulp be digested alone?", "Yes, but it is acidic and low in nitrogen: manure, vinasse or stillage are usually added to keep the process stable."],
          ["What size of plant?", "Roughly 30 kt of pressed pulp a year supports a 1 MW-class plant; 80–100 kt supports 2.5–3.5 MW or a biomethane plant."],
        ],
      },
      uk: {
        title: "Біогаз із бурякового жому: економіка для цукрових заводів",
        description: "Пресований жом — одна з найенергоємніших промислових сировин. Вартість, окупність і умови, за яких біогазова установка цукрового заводу працює. Безкоштовний розрахунок.",
        h1: "Біогаз для цукрових заводів",
        intro: [
          "Цукровий завод за кілька місяців отримує десятки тисяч тонн пресованого жому — і під час кампанії споживає дуже багато тепла. Пресований жом (≈ 22–24 % сухої речовини) дає близько 70 м³ метану на тонну — уп'ятеро більше за гноївку ВРХ.",
          "Силосований жом живить реактор цілий рік, тож установка працює на повну, а електрика й тепло заміщують мережеву електроенергію та природний газ. Такі станції працюють у Німеччині, Польщі, Франції та Україні.",
        ],
        drivers: [
          ["Кормова цінність жому", "Жом, який продають на корм, — це втрачений дохід: економіка сходиться, коли кормова ціна низька або ринок насичений."],
          ["Заміщення газу", "Під час кампанії біогаз заміщує заводський газ — за нинішніх цін це найбільша економія."],
          ["Силосування", "Сховище силосу (траншеї або силоси) дозволяє реактору працювати 12 місяців, а не 4."],
          ["Біометан", "Від 1 000 нм³/год біогазу очищення та подача в мережу стають реальними."],
        ],
        faq: [
          ["Чи можна зброджувати лише жом?", "Можна, але він кислий і бідний на азот: зазвичай додають гній, барду чи інші азотовмісні відходи для стабільності процесу."],
          ["Якого розміру установка?", "Приблизно 30 тис. т пресованого жому на рік — це установка класу 1 МВт; 80–100 тис. т — 2,5–3,5 МВт або біометановий завод."],
        ],
      },
    },
  },
  {
    slug: "food-waste", id: "foodwaste", businessType: "municipal_biowaste", exampleId: "gb_food", tone: "good",
    seo: {
      en: {
        title: "Food-waste and biowaste anaerobic digestion: gate fees and payback",
        description: "Merchant and municipal AD plants earn twice: from gate fees and from energy. CAPEX, depackaging, payback and the conditions for a food-waste biogas plant. Free screening.",
        h1: "Biogas from food waste and municipal biowaste",
        intro: [
          "Commercial food waste and source-separated biowaste come with a gate fee: the plant is paid to take its feedstock and then sells biomethane or power. That double income is why food-waste AD is one of the strongest biogas segments in Europe.",
          "The conditions are a secure tonnage contract, a depackaging line and an enclosed reception hall (odour), and an outlet for the digestate under the national quality protocol.",
        ],
        drivers: [
          ["Gate fee", "The fee per tonne often matters more than the energy price — and depends on local competition with composting and incineration."],
          ["Contracts", "Banks finance on secured tonnage: 5–10-year waste contracts with municipalities or retailers."],
          ["Depackaging & quality", "Packaging and plastics must be removed; digestate quality decides whether it is a product or a waste."],
          ["Gas route", "At this scale biomethane to the grid or vehicle fuel usually beats CHP."],
        ],
        faq: [
          ["What size is viable?", "From ≈ 15–20 kt a year; most merchant plants process 40–100 kt."],
          ["Is the digestate a fertiliser?", "Yes, if it meets the national quality standard (e.g. PAS 110 in the UK); otherwise it must be disposed of."],
        ],
      },
      uk: {
        title: "Біогаз із харчових і муніципальних біовідходів: плата за прийом і окупність",
        description: "Установки на харчових відходах заробляють двічі: на платі за прийом і на енергії. Вартість, депакування, окупність і умови. Безкоштовний розрахунок.",
        h1: "Біогаз із харчових відходів і муніципальних біовідходів",
        intro: [
          "Комерційні харчові відходи та роздільно зібрані біовідходи надходять із платою за прийом: установці платять за сировину, а потім вона продає біометан або електрику. Саме подвійний дохід робить цей сегмент одним із найсильніших у Європі.",
          "Умови — гарантований договір на обсяги, лінія депакування й закритий цех прийому (запахи) та збут дигестату за національним стандартом якості.",
        ],
        drivers: [
          ["Плата за прийом", "Ціна за тонну часто важить більше за ціну енергії — і залежить від конкуренції з компостуванням та спалюванням."],
          ["Договори", "Банки фінансують під гарантовані обсяги: договори з громадами чи торговельними мережами на 5–10 років."],
          ["Депакування та якість", "Упаковку й пластик треба видаляти; від якості дигестату залежить, чи це продукт, чи відхід."],
          ["Шлях використання газу", "У такому масштабі біометан у мережу чи як пальне зазвичай вигідніший за когенерацію."],
        ],
        faq: [
          ["Який мінімальний обсяг?", "Від ≈ 15–20 тис. т на рік; більшість комерційних установок переробляють 40–100 тис. т."],
          ["Чи є дигестат добривом?", "Так, якщо відповідає національному стандарту якості (наприклад, PAS 110 у Великій Британії); інакше його утилізують."],
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
    slug: "pig-farms", id: "pigs", businessType: "pig_farm", exampleId: "ro_pig_complex", tone: "weak",
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
    slug: "breweries", id: "brewery", businessType: "brewery", exampleId: "cz_craft_brewery", tone: "weak",
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

/** All businesses extend the existing sector-page registry and use the same renderer. */
export const SEGMENTS: Segment[] = [
  ...AUTHORED_SEGMENTS,
  ...SECTOR_IDS.filter(id => !AUTHORED_SEGMENTS.some(s => s.businessType === id && s.id !== "small")).map(id => ({
    id, businessType: id, slug: businessSlug(id),
    exampleId: (EXAMPLES.find(e => e.input.businessType === id && e.reference) ?? EXAMPLES.find(e => e.input.businessType === id))?.id,
  })),
];

export const segmentBySlug = (slug: string) => SEGMENTS.find((s) => s.slug === slug);

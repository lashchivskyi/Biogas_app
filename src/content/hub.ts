/**
 * Long-form guide (/[lang]/biogas) and sector-page labels. Written in English and Ukrainian;
 * other locales render English with canonical → /en (no duplicate-content pages).
 */
export interface HubSection {
  id: string;
  h: string;
  p: string[];
}

export interface HubContent {
  title: string;
  description: string;
  sections: HubSection[];
  cta: string;
  ctaSectors: string;
  sector: { drivers: string; conditions: string; faq: string; others: string; expertTitle: string; expertText: string; expertLink: string; disclaimer: string; calcCta: string };
}

export const HUB: { en: HubContent; uk: HubContent } = {
  en: {
    title: "Biogas plant: cost, payback and how it works",
    description: "A plain-language guide for farms, food processors, developers and municipalities: how a biogas plant works, what it costs, what drives payback, CHP vs biomethane, digestate and risks.",
    cta: "Run my numbers",
    ctaSectors: "Biogas for my business",
    sections: [
      {
        id: "how-it-works",
        h: "How a biogas plant works",
        p: [
          "Organic waste — manure, slaughter residues, whey, food waste, vinasse, palm-oil effluent — is fed into a sealed tank. Without oxygen, bacteria turn the organic matter into biogas: 50–65 % methane, the rest mostly CO₂. In a heated digester at about 38 °C this takes 20–40 days; in hot climates an unheated covered lagoon does the job more slowly and far more cheaply.",
          "The gas is stored, cleaned of hydrogen sulphide and then burned in a CHP engine (power and heat), in a boiler (heat only), or upgraded to biomethane that can replace natural gas in the grid or as vehicle fuel. What is left — digestate — goes back to the fields as fertiliser.",
        ],
      },
      {
        id: "cost",
        h: "What a biogas plant costs",
        p: [
          "Cost is driven by digester volume, digestate storage, feedstock preparation (pasteurisation, de-packaging), the CHP or upgrading unit and the grid connection — not by a catalogue kilowatt figure. Small plants have the highest cost per kW: a 50 kW plant is nowhere near five times cheaper than 250 kW.",
          "Prices also differ by country: labour, permitting and construction costs in Germany or Denmark are not those of Poland, Turkey or India. Our model builds a component budget, applies a country factor and shows a range. Firm prices come from supplier quotes after a proper feasibility study.",
        ],
      },
      {
        id: "payback",
        h: "What drives payback",
        p: [
          "Four things matter most: how much of the energy you use yourself (your own power and heat replace expensive purchases), what you pay today to get rid of the waste, how energy-dense the feedstock is, and scale.",
          "Support schemes — feed-in tariffs, biomethane premiums, investment grants — can change the picture, but they change, close and come with conditions. That is why our verdict is always calculated without them and every scheme is shown as a separate case with its status and source.",
        ],
      },
      {
        id: "chp-or-biomethane",
        h: "CHP, boiler or biomethane",
        p: [
          "CHP pays when both power and heat are needed on site. A boiler is the simplest option if you only need heat. Biomethane makes sense from a few hundred cubic metres of biogas per hour and where grid injection or vehicle-fuel offtake exists — too large for a single small farm, often right for a cluster, a developer or a large processor.",
        ],
      },
      {
        id: "digestate-and-risks",
        h: "Digestate, methane and safety",
        p: [
          "Digestate is a valuable fertiliser only when there is land and a nitrogen allowance to spread it; otherwise it is a cost. Methane leaks eat both money and the climate benefit, so gas-tight storage and monitoring are essential.",
          "A biogas plant handles explosive gas and toxic hydrogen sulphide. Design and operation require qualified engineers; a screening is only the first step.",
        ],
      },
    ],
    sector: {
      drivers: "What drives payback",
      conditions: "What it takes to work",
      faq: "Frequently asked questions",
      others: "Biogas for other sectors",
      expertTitle: "Need an expert opinion?",
      expertText: "An engineer checks your data and the calculation and gives you a written recommendation.",
      expertLink: "Plans and pricing",
      disclaimer: "Illustrative archetype, subsidies excluded; your result depends on your data.",
      calcCta: "Calculate my case",
    },
  },
  uk: {
    title: "Біогазова установка: ціна, окупність і як це працює",
    description: "Простою мовою для ферм, переробників, девелоперів і громад: як працює біогазова установка, скільки коштує, від чого залежить окупність, когенерація чи біометан, дигестат і ризики.",
    cta: "Розрахувати окупність",
    ctaSectors: "Біогаз для мого бізнесу",
    sections: [
      {
        id: "how-it-works",
        h: "Як працює біогазова установка",
        p: [
          "Органічні відходи — гній, відходи забою, сироватка, харчові відходи, барда, стоки олійних заводів — подаються в герметичний реактор. Без доступу кисню бактерії перетворюють органіку на біогаз: 50–65 % метану, решта переважно CO₂. У підігрітому реакторі при ≈ 38 °C це триває 20–40 діб; у спекотному кліматі ту саму роботу повільніше, але значно дешевше виконує накрита лагуна без підігріву.",
          "Газ накопичується, очищується від сірководню і спалюється в когенераційній установці (електрика й тепло), у котлі (лише тепло) або доочищується до біометану, який заміщує природний газ у мережі чи як моторне паливо. Залишок — дигестат — повертається на поля як добриво.",
        ],
      },
      {
        id: "cost",
        h: "Скільки коштує біогазова установка",
        p: [
          "Вартість визначає не «каталожна» потужність, а об'єм реактора, сховище дигестату, підготовка сировини (пастеризація, депакування), когенерація чи установка очищення та підключення до мережі. У малих установок найвища питома ціна за кіловат: 50 кВт аж ніяк не вп'ятеро дешевші за 250 кВт.",
          "Ціни відрізняються й між країнами: робота, дозволи та будівництво в Німеччині чи Данії коштують не так, як у Польщі, Туреччині чи Індії. Модель складає бюджет із компонентів, застосовує коефіцієнт країни й показує діапазон. Точну ціну дають комерційні пропозиції після повноцінного ТЕО.",
        ],
      },
      {
        id: "payback",
        h: "Від чого залежить окупність",
        p: [
          "Найбільше важать чотири речі: скільки енергії ви використаєте самі (власна електрика й тепло заміщують дорогі покупні), скільки ви зараз платите за утилізацію відходів, наскільки енергетично щільна сировина і масштаб.",
          "Програми підтримки — «зелені» тарифи, премії за біометан, інвестиційні гранти — можуть змінити картину, але вони змінюються, закриваються й мають умови. Тому вердикт ми завжди рахуємо без них, а кожну програму показуємо окремим сценарієм зі статусом і джерелом.",
        ],
      },
      {
        id: "chp-or-biomethane",
        h: "Когенерація, котел чи біометан",
        p: [
          "Когенерація вигідна, коли на місці потрібні і електрика, і тепло. Котел — найпростіший варіант, якщо потрібне лише тепло. Біометан має сенс від кількох сотень кубометрів біогазу на годину та за наявності доступу до газової мережі чи покупця моторного палива — для однієї малої ферми це завеликий масштаб, а для кластера, девелопера чи великого переробника — часто якраз.",
        ],
      },
      {
        id: "digestate-and-risks",
        h: "Дигестат, метан і безпека",
        p: [
          "Дигестат — цінне добриво лише тоді, коли є земля й дозволений ліміт азоту; інакше це витрата. Витоки метану з'їдають і гроші, і кліматичну вигоду, тому потрібні герметичні сховища та моніторинг.",
          "Біогазова установка — це об'єкт із вибухонебезпечним газом і отруйним сірководнем. Проєкт і експлуатація потребують кваліфікованих інженерів; попередня оцінка — лише перший крок.",
        ],
      },
    ],
    sector: {
      drivers: "Що визначає окупність",
      conditions: "Щоб проєкт спрацював",
      faq: "Часті запитання",
      others: "Біогаз для інших напрямів",
      expertTitle: "Потрібна думка експерта?",
      expertText: "Інженер перевірить ваші дані й розрахунок та надасть письмовий висновок.",
      expertLink: "Плани і ціни",
      disclaimer: "Ілюстративний архетип без субсидій; ваш результат залежить від ваших даних.",
      calcCta: "Порахувати мій випадок",
    },
  },
};

/** Content language for the long-form pages and the canonical locale for that content. */
export const contentLang = (locale: string): "en" | "uk" => (locale === "uk" ? "uk" : "en");

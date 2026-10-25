import { tr, type CoreLang } from "./i18n";
import type { FeedstockSummary, ProjectInput, SafetyItem } from "./types";

export const SAFETY_DISCLAIMER = {
  en: "Software does NOT replace a qualified process engineer and a process-safety engineer. Every final engineering design, hazardous-area classification and safe-operation programme must pass human professional review.",
  uk: "Програмний розрахунок НЕ замінює кваліфікованого інженера-технолога та інженера з промислової безпеки. Кожен кінцевий інженерний проєкт, класифікація вибухонебезпечних зон і програма безпечної експлуатації мають пройти професійну перевірку фахівцями.",
};

export function safetyRegister(input: ProjectInput, feed: FeedstockSummary, lang: CoreLang = "en"): SafetyItem[] {
  const T = tr(lang);
  const items: SafetyItem[] = [
    {
      id: "methane_explosion", hazard: T("Methane: explosion and fire (flammable range ≈ 5–15 % in air)", "Метан: вибух і пожежа (діапазон займання ≈5–15 % у повітрі)"), relevance: "ALWAYS", severity: "HIGH",
      controls: [
        T("Hazardous-area (ATEX/IECEx or national) zoning and suitably rated equipment", "Класифікація вибухонебезпечних зон і обладнання відповідного виконання"),
        T("Fixed gas detectors in the CHP room and near tanks", "Стаціонарні газоаналізатори в приміщеннях КГУ і біля резервуарів"),
        T("Flame arresters, over/under-pressure relief, safety flare", "Полум'ягасники, запобіжні клапани надмірного тиску/вакууму, факел безпеки"),
        T("Ignition-source control and hot-work permits", "Контроль джерел займання, дозвільна система на гарячі роботи"),
      ],
    },
    {
      id: "h2s", hazard: T("Hydrogen sulphide (H₂S): acute toxicity, corrosion", "Сірководень (H₂S): гостра токсичність, корозія"), relevance: "ALWAYS", severity: "HIGH",
      controls: [
        T("Biological / chemical desulphurisation of the biogas", "Біологічне/хімічне знесірчення біогазу"),
        T("Personal H₂S monitors, no lone working", "Персональні H₂S-детектори, заборона роботи в одиночку"),
        T("H₂S monitoring upstream of the CHP (engine protection)", "Моніторинг концентрації перед КГУ (захист двигуна)"),
      ],
    },
    {
      id: "confined_space", hazard: T("Confined spaces (digester, storage, pits): asphyxiation, toxic gases", "Замкнені простори (реактор, сховище, колодязі): задуха, токсичні гази"), relevance: "ALWAYS", severity: "HIGH",
      controls: [T("Entry only under permit, ventilation, standby person", "Допуск лише за нарядом-допуском, вентиляція, страхувальник"), T("Self-contained breathing apparatus for rescue", "Автономні дихальні апарати для рятувальників")],
    },
    {
      id: "pressure", hazard: T("Over/under-pressure: membrane roof rupture, tank deformation", "Над-/недотиск: розрив мембранного даху, деформація резервуарів"), relevance: "ALWAYS", severity: "MEDIUM",
      controls: [T("Liquid seals / relief valves venting to a safe location", "Гідрозатвори/клапани перепускання з виходом у безпечне місце"), T("Gas-holder level and pressure sensors", "Датчики рівня газгольдера і тиску")],
    },
    {
      id: "chp_co", hazard: T("CHP: carbon monoxide, fire, high temperatures", "КГУ: чадний газ, пожежа, високі температури"), relevance: "ALWAYS", severity: "MEDIUM",
      controls: [T("CHP room ventilation, CO detectors", "Вентиляція приміщення КГУ, CO-детектори"), T("Emergency stop, fire suppression", "Вимикач аварійного зупинення, протипожежні системи")],
    },
  ];

  if (feed.abpTonnesYear > 0 || feed.lines.some((l) => l.typeId === "food_waste" || l.typeId === "municipal_biowaste")) {
    items.push({
      id: "biological", hazard: T("Biological hazards: pathogens in animal by-products and food waste", "Біологічні ризики: патогени з тваринних побічних продуктів і харчових відходів"), relevance: "CONDITIONAL", severity: "HIGH",
      trigger: T("Animal by-products / food waste in the mix", "У суміші є ABP/харчові відходи"),
      controls: [
        T("Pasteurisation 70 °C / 1 h (Cat. 3) with time–temperature control", "Пастеризація 70 °C/1 год (кат. 3) і контроль часу–температури"),
        T("Separate dirty and clean zones, vehicle disinfection", "Розділення «брудної» та «чистої» зон, дезінфекція транспорту"),
        T("Veterinary supervision and traceability", "Ветеринарний нагляд і реєстрація потоків"),
      ],
    });
  }
  if (feed.poultryShareVs > 0.2) {
    items.push({
      id: "ammonia", hazard: T("Ammonia (NH₃): toxicity and process inhibition", "Аміак (NH₃): токсичність і інгібування процесу"), relevance: "CONDITIONAL", severity: "MEDIUM",
      trigger: T("Poultry manure in the mix", "Птахівничий послід у суміші"),
      controls: [T("Limit the poultry share, dilute", "Обмеження частки посліду, розведення"), T("Monitor NH₄-N in the digester, ventilate reception", "Контроль NH₄-N у реакторі, вентиляція приймальної зони")],
    });
  }
  items.push({
    id: "water", hazard: T("Soil and water pollution: slurry/digestate spills, lagoon overflow", "Забруднення ґрунту й вод: розливи гноївки/дигестату, переливи лагуни"), relevance: input.site.nearProtectedOrWaterArea ? "CONDITIONAL" : "ALWAYS", severity: "HIGH",
    trigger: input.site.nearProtectedOrWaterArea ? T("Water bodies / protected areas nearby", "Поруч водойми/природоохоронні території") : undefined,
    controls: [
      T("Bund sized for the largest tank", "Обвалування/піддон на найбільший резервуар"),
      T("Level sensors and a spill-response plan", "Датчики рівня, план реагування на розлив"),
      T("Digestate storage covering the closed spreading season", "Сховище дигестату з запасом на сезон заборони внесення"),
    ],
  });
  if (input.site.neighboursWithin300m) {
    items.push({
      id: "odour_neighbours", hazard: T("Odour and noise for neighbours; blast exposure", "Запах і шум для сусідів, ураження у разі вибуху"), relevance: "CONDITIONAL", severity: "MEDIUM",
      trigger: T("Housing within 300 m", "Житло ближче 300 м"),
      controls: [T("Enclosed reception and storage, injection spreading", "Закриті приймальні пункти та сховища, інжекторне внесення"), T("Community consultation before design; consequence assessment", "Консультації з громадою до проєкту; оцінка зони ураження")],
    });
  }
  return items;
}

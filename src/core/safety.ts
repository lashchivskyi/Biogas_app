import { tr, type CoreLang } from "./i18n";
import type { FeedstockSummary, ProjectInput, SafetyItem } from "./types";

export const SAFETY_DISCLAIMER = {
  en: "Software does NOT replace a qualified process engineer and a process-safety engineer. Every final engineering design, hazardous-area classification and safe-operation programme must pass human professional review.",
};

export function safetyRegister(input: ProjectInput, feed: FeedstockSummary, lang: CoreLang = "en"): SafetyItem[] {
  const T = tr(lang);
  const items: SafetyItem[] = [
    {
      id: "methane_explosion", hazard: T("Methane: explosion and fire (flammable range ≈ 5–15 % in air)"), relevance: "ALWAYS", severity: "HIGH",
      controls: [
        T("Hazardous-area (ATEX/IECEx or national) zoning and suitably rated equipment"),
        T("Fixed gas detectors in the CHP room and near tanks"),
        T("Flame arresters, over/under-pressure relief, safety flare"),
        T("Ignition-source control and hot-work permits"),
      ],
    },
    {
      id: "h2s", hazard: T("Hydrogen sulphide (H₂S): acute toxicity, corrosion"), relevance: "ALWAYS", severity: "HIGH",
      controls: [
        T("Biological / chemical desulphurisation of the biogas"),
        T("Personal H₂S monitors, no lone working"),
        T("H₂S monitoring upstream of the CHP (engine protection)"),
      ],
    },
    {
      id: "confined_space", hazard: T("Confined spaces (digester, storage, pits): asphyxiation, toxic gases"), relevance: "ALWAYS", severity: "HIGH",
      controls: [T("Entry only under permit, ventilation, standby person"), T("Self-contained breathing apparatus for rescue")],
    },
    {
      id: "pressure", hazard: T("Over/under-pressure: membrane roof rupture, tank deformation"), relevance: "ALWAYS", severity: "MEDIUM",
      controls: [T("Liquid seals / relief valves venting to a safe location"), T("Gas-holder level and pressure sensors")],
    },
    {
      id: "chp_co", hazard: T("CHP: carbon monoxide, fire, high temperatures"), relevance: "ALWAYS", severity: "MEDIUM",
      controls: [T("CHP room ventilation, CO detectors"), T("Emergency stop, fire suppression")],
    },
  ];

  if (feed.abpTonnesYear > 0 || feed.lines.some((l) => l.typeId === "food_waste" || l.typeId === "municipal_biowaste")) {
    items.push({
      id: "biological", hazard: T("Biological hazards: pathogens in animal by-products and food waste"), relevance: "CONDITIONAL", severity: "HIGH",
      trigger: T("Animal by-products / food waste in the mix"),
      controls: [
        T("Pasteurisation 70 °C / 1 h (Cat. 3) with time–temperature control"),
        T("Separate dirty and clean zones, vehicle disinfection"),
        T("Veterinary supervision and traceability"),
      ],
    });
  }
  if (feed.poultryShareVs > 0.2) {
    items.push({
      id: "ammonia", hazard: T("Ammonia (NH₃): toxicity and process inhibition"), relevance: "CONDITIONAL", severity: "MEDIUM",
      trigger: T("Poultry manure in the mix"),
      controls: [T("Limit the poultry share, dilute"), T("Monitor NH₄-N in the digester, ventilate reception")],
    });
  }
  items.push({
    id: "water", hazard: T("Soil and water pollution: slurry/digestate spills, lagoon overflow"), relevance: input.site.nearProtectedOrWaterArea ? "CONDITIONAL" : "ALWAYS", severity: "HIGH",
    trigger: input.site.nearProtectedOrWaterArea ? T("Water bodies / protected areas nearby") : undefined,
    controls: [
      T("Bund sized for the largest tank"),
      T("Level sensors and a spill-response plan"),
      T("Digestate storage covering the closed spreading season"),
    ],
  });
  if (input.site.neighboursWithin300m) {
    items.push({
      id: "odour_neighbours", hazard: T("Odour and noise for neighbours; blast exposure"), relevance: "CONDITIONAL", severity: "MEDIUM",
      trigger: T("Housing within 300 m"),
      controls: [T("Enclosed reception and storage, injection spreading"), T("Community consultation before design; consequence assessment")],
    });
  }
  return items;
}

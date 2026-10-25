/**
 * Published market reference points for turnkey biogas CAPEX (EUR per kW electrical, ex VAT).
 * Collected 2026-10 (docs/capex-benchmark.md). Each band states its source quality honestly —
 * most are press/trade figures, not audited project costs. Used to show the customer where the
 * model estimate sits relative to the market, never to override the component calculation.
 */
export interface MarketBand {
  id: string;
  label: string;
  minKw: number;
  maxKw: number;
  feed: "manure" | "waste" | "any";
  lowEurPerKw: number;
  highEurPerKw: number;
  source: string;
  quality: "official study" | "trade press" | "vendor" | "single project";
  year: string;
}

export const MARKET_BANDS: MarketBand[] = [
  {
    id: "de_small_manure", label: "Малі гнойові установки < 100 кВт (Німеччина)", minKw: 0, maxKw: 100, feed: "manure",
    lowEurPerKw: 6500, highEurPerKw: 10000,
    source: "Fachverband Biogas (через biomasse-nutzung.de); C.A.R.M.E.N. e.V. (оновлено 2025): «до 10 000 €/кВт реалістично»; LWK Niedersachsen: 75 кВт ≈ €0,5–0,75 млн (≈2014)",
    quality: "trade press", year: "2014–2025",
  },
  {
    id: "task37_manure_200", label: "200 кВт лише на гною ВРХ (IEA Task 37)", minKw: 100, maxKw: 300, feed: "manure",
    lowEurPerKw: 8000, highEurPerKw: 10000,
    source: "IEA Bioenergy Task 37, презентація P. Kornatz (DBFZ): ≈ €1,81 млн за 200 кВт",
    quality: "single project", year: "≈2022–2023",
  },
  {
    id: "de_500_flex", label: "Нова установка 510 кВт (енергокультури + гній, гнучка, Німеччина)", minKw: 300, maxKw: 800, feed: "any",
    lowEurPerKw: 3400, highEurPerKw: 7500,
    source: "DBFZ / Fraunhofer IEE для BMWK (лютий 2024): 7 521 € на кВт номінальної (≈ 3 400 € на кВт встановленої) потужності",
    quality: "official study", year: "2023",
  },
  {
    id: "pl_500_1000", label: "Сільськогосподарські установки 0,5–1 МВт (Польща)", minKw: 400, maxKw: 1200, feed: "any",
    lowEurPerKw: 2800, highEurPerKw: 7000,
    source: "Польська галузева преса 2023–2024 (7–20 млн зл за 500 кВт; 12–16 млн зл за 1 МВт); IOŚ-PIB: ≈ 30 млн зл за 1 МВт",
    quality: "trade press", year: "2023–2024",
  },
  {
    id: "ua_1mw", label: "Біогазові установки ≈ 1 МВт (Україна)", minKw: 700, maxKw: 1500, feed: "any",
    lowEurPerKw: 3000, highEurPerKw: 4500,
    source: "Оцінка постачальника (Zorg Biogas, ≈ 3 500 €/кВт за 1 МВт — первинне джерело не знайдено); Ecodevelop 333 кВт ≈ €1,5 млн (давній проєкт)",
    quality: "vendor", year: "≈2013–2020",
  },
];

/** Bands relevant to a plant of this size and feed. */
export function marketBandsFor(kwEl: number, manureShare: number): MarketBand[] {
  const feed = manureShare > 0.7 ? "manure" : "waste";
  return MARKET_BANDS.filter((b) => kwEl >= b.minKw * 0.7 && kwEl <= b.maxKw * 1.3 && (b.feed === "any" || b.feed === feed));
}

/** Upgrading reference (biomethane), EUR per Nm³/h of raw biogas. */
export const UPGRADING_BAND = {
  lowEurPerNm3h: 2500,
  highEurPerNm3h: 3500,
  source: "Огляди мембранних технологій (Frontiers in Chem. Eng. 2021; ResearchGate review 2020) та дані постачальників 2025–2026 для 250–700 Нм³/год",
};

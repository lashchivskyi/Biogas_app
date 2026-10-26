import type { SupportInfo, SupportScheme } from "@/core/country";
import { region, type CountryProfile } from "./build";
import { indiaCbgProcurementPrice } from "./sources";

/**
 * 32 national profiles (Ukraine has its own calibrated adapter in ua.ts).
 * The market numbers here are FALLBACK estimates only: build.ts replaces each one with an official
 * statistic from sources.ts wherever a series exists, and only the remainder is shown as an estimate.
 * Support schemes are listed only where at least a figure was found in this research or is a
 * widely documented national instrument; all are LOW/MEDIUM confidence and must be checked before use.
 */

const CHECKED = "2026-10-24";
const none = (en: string, uk: string): SupportInfo => ({ summary: { en, uk }, availableForNewSmallProjects: false, checkedOn: CHECKED, schemes: [] });
const sup = (en: string, uk: string, schemes: SupportScheme[], open = true, checkedOn = CHECKED): SupportInfo => ({ summary: { en, uk }, availableForNewSmallProjects: open, checkedOn, schemes });
const sch = (s: Omit<SupportScheme, "checkedOn">): SupportScheme => ({ ...s, checkedOn: CHECKED });

const EU_BM: [number, number, number] = [0.4, 0.55, 0.8];
const EU_BM_NEW: [number, number, number] = [0.35, 0.5, 0.75];
const NO_GRID_BM: [number, number, number] = [0.3, 0.4, 0.55];

export const PROFILES: CountryProfile[] = [
  // ---------------- Central & Eastern Europe ----------------
  {
    code: "PL", name: "Poland", currency: "PLN", fx: 4.25, tier: "B", regime: "EU", inj: true,
    elec: 0.19, exp: 0.1, gas: 50, labour: 12, capex: 0.9, disc: 0.085, debtRate: 0.07, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.65,
    regions: [region("wielkopolskie", "Wielkopolska", [-0.9, 0.2, 3.8, 9.3, 14.3, 17.6, 19.7, 19.2, 14.4, 9.2, 4.3, 0.6], { pl: "Wielkopolskie" }), region("podkarpackie", "Podkarpackie (Rzeszów)", [-1.8, -0.6, 3.3, 9.5, 14.4, 17.9, 19.7, 19.2, 14.1, 8.9, 3.9, -0.4], { pl: "Podkarpackie" })],
    support: sup("Feed-in tariff / premium for small agricultural biogas (≤ 1 MW) and new biomethane legislation (2025); first grid injection in 2025.", "Фіксований тариф / премія для малого агробіогазу (≤ 1 МВт) і нове законодавство про біометан (2025); перша ін'єкція в мережу у 2025 р.", [
      sch({ id: "pl.fit", name: "FiT/FiP biogaz rolniczy (≤ 1 MW)", status: "open", electricityTariffEurKwh: 0.15, routes: ["chp"], maxKwEl: 1000, note: { en: "Indicative reference price for agricultural biogas — confirm the current URE reference price.", uk: "Орієнтовна референтна ціна для агробіогазу — уточніть актуальну ціну URE." }, source: "URE reference prices (order of magnitude, not verified in this build)", confidence: "LOW" }),
    ]),
    notes: { en: ["Permitting (environmental decision, KOWR registration) is the main bottleneck; budget 18–30 months."], uk: ["Дозволи (екологічне рішення, реєстр KOWR) — головне вузьке місце; закладайте 18–30 місяців."] },
  },
  {
    code: "CZ", name: "Czechia", currency: "CZK", fx: 24.5, tier: "B", regime: "EU", inj: true,
    elec: 0.18, exp: 0.09, gas: 48, labour: 13, capex: 0.9, disc: 0.08, debtRate: 0.065, tkm: 0.12, bm: EU_BM, fertN: 1.15, ef: 0.45,
    regions: [region("vysocina", "Vysočina", [-2.5, -1.5, 2.0, 7.5, 12.5, 15.8, 17.6, 17.2, 12.8, 7.8, 2.8, -1.2], { cs: "Vysočina" }), region("praha", "Central Bohemia (Prague)", [0.0, 1.2, 4.9, 10.2, 14.6, 18.2, 20.1, 19.7, 14.7, 9.6, 4.5, 1.2], { cs: "Středočeský kraj" })],
    support: none("Most of ≈540 plants run on 20-year tariffs ending 2028–2032; new support targets biomethane conversion.", "Більшість із ≈540 станцій працює на 20-річних тарифах, що закінчуються у 2028–2032 рр.; нова підтримка спрямована на перехід на біометан."),
    notes: { en: ["For existing plants, the key question is life after the tariff: CHP on own use vs conversion to biomethane."], uk: ["Для наявних станцій ключове питання — робота після тарифу: КГУ на власне споживання чи перехід на біометан."] },
  },
  {
    code: "SK", name: "Slovakia", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: true,
    elec: 0.19, exp: 0.09, gas: 50, labour: 12, capex: 0.9, disc: 0.085, debtRate: 0.065, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.12,
    regions: [region("nitra", "Nitra region", [-1.0, 1.0, 5.5, 11.5, 16.5, 20.0, 21.8, 21.3, 16.3, 10.8, 5.2, 0.2], { sk: "Nitriansky kraj" })],
    support: none("Legacy feed-in tariffs for existing plants; no reliable scheme for new small CHP identified.", "Старі тарифи для наявних станцій; надійної схеми для нових малих КГУ не виявлено."),
    notes: { en: ["Similar structure to Czechia: large former cooperative farms, good gas grid."], uk: ["Структура схожа на Чехію: великі колишні кооперативні господарства, розвинена газова мережа."] },
  },
  {
    code: "HU", name: "Hungary", currency: "HUF", fx: 395, tier: "B", regime: "EU", inj: true,
    elec: 0.16, exp: 0.1, gas: 48, labour: 10, capex: 0.88, disc: 0.095, debtRate: 0.08, tkm: 0.11, bm: EU_BM_NEW, fertN: 1.1, ef: 0.2,
    regions: [region("alfold", "Great Plain (Alföld)", [-0.5, 1.5, 6.5, 12.3, 17.3, 20.8, 22.8, 22.4, 17.2, 11.5, 5.6, 1.0], { hu: "Alföld" })],
    support: sup("HUF 40 bn (≈ €100 m) grant call for biogas/biomethane, about half reserved for small plants (applications Oct 2025 – Jan 2026); allocation status uncertain. METÁR brown premium approved until 2026.", "Грантовий конкурс HUF 40 млрд (≈ €100 млн) на біогаз/біометан, близько половини — для малих станцій (заявки жовт. 2025 – січ. 2026); статус розподілу невизначений. Премія METÁR погоджена до 2026 р.", [
      sch({ id: "hu.grant", name: "Biogáz/biometán támogatás (HUF 40 bn)", status: "uncertain", capexGrantShare: 0.4, routes: ["chp", "biomethane", "boiler"], note: { en: "Grant share assumed 40 % for illustration; actual intensity depends on the call and state-aid rules.", uk: "Частку гранту 40 % прийнято для ілюстрації; реальна інтенсивність залежить від умов конкурсу." }, source: "Dentons (Oct 2025), Schoenherr, Bioenergy Insight", confidence: "LOW" }),
    ]),
    notes: { en: ["Hungary lags its neighbours and is actively funding small plants — timing of grant calls matters more than tariffs."], uk: ["Угорщина відстає від сусідів і активно фінансує малі станції — час грантових конкурсів важить більше за тарифи."] },
  },
  {
    code: "RO", name: "Romania", currency: "RON", fx: 5.05, tier: "B", regime: "EU", inj: false,
    elec: 0.18, exp: 0.1, gas: 45, labour: 9, capex: 0.85, disc: 0.1, debtRate: 0.085, tkm: 0.1, bm: NO_GRID_BM, fertN: 1.05, ef: 0.25,
    regions: [region("baragan", "Bărăgan / Muntenia", [-1.5, 0.6, 5.5, 11.8, 17.3, 21.2, 23.2, 22.7, 17.4, 11.3, 5.3, 0.4], { ro: "Muntenia" }), region("transilvania", "Transylvania (Cluj)", [-3.0, -1.0, 3.8, 9.5, 14.5, 17.8, 19.5, 19.2, 14.6, 9.3, 3.8, -1.3], { ro: "Transilvania" })],
    support: none("No biomethane production yet; a draft decree to support biomethane and a 2025–2035 energy strategy targeting up to 2 bcm by 2030.", "Біометану ще немає; проєкт постанови про підтримку біометану та енергетична стратегія 2025–2035 з ціллю до 2 млрд м³ до 2030 р."),
    notes: { en: ["Early-stage market with high potential: first movers face grid-connection and permitting uncertainty."], uk: ["Ринок на ранній стадії з високим потенціалом: першопрохідці стикаються з невизначеністю приєднання та дозволів."] },
  },
  {
    code: "MD", name: "Moldova", currency: "MDL", fx: 19.5, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.15, exp: 0.1, gas: 50, labour: 4, capex: 0.82, disc: 0.13, debtRate: 0.1, tkm: 0.1, bm: NO_GRID_BM, fertN: 1.0, ef: 0.45,
    regions: [region("chisinau", "Central Moldova", [-2.5, -1.2, 3.7, 10.5, 16.2, 20.0, 22.0, 21.4, 16.2, 10.0, 4.3, -0.8], { ro: "Centrul Moldovei" })],
    support: none("No dedicated support for new biogas identified.", "Окремої підтримки нового біогазу не виявлено."),
    notes: { en: ["High energy-import dependence makes self-consumption valuable; small market."], uk: ["Висока залежність від імпорту енергії робить власне споживання цінним; ринок малий."] },
  },
  {
    code: "BG", name: "Bulgaria", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: false,
    elec: 0.15, exp: 0.1, gas: 45, labour: 7, capex: 0.82, disc: 0.095, debtRate: 0.075, tkm: 0.1, bm: NO_GRID_BM, fertN: 1.05, ef: 0.4,
    regions: [region("danube", "Danube plain (Pleven)", [-0.8, 1.5, 6.5, 12.5, 17.5, 21.5, 23.8, 23.3, 18.3, 12.2, 6.0, 1.0], { bg: "Дунавска равнина" })],
    support: none("No support scheme for new plants identified; biomethane potential ≈ 0.67 bcm.", "Схем для нових установок не виявлено; потенціал біометану ≈ 0,67 млрд м³."),
    notes: { en: ["Euro area since 2026; low labour costs, limited sector experience."], uk: ["У зоні євро з 2026 р.; низька вартість праці, обмежений досвід галузі."] },
  },
  {
    code: "RS", name: "Serbia", currency: "RSD", fx: 117, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.11, exp: 0.09, gas: 45, labour: 7, capex: 0.82, disc: 0.11, debtRate: 0.08, tkm: 0.1, bm: NO_GRID_BM, fertN: 1.0, ef: 0.7,
    regions: [region("vojvodina", "Vojvodina", [0.0, 2.0, 6.8, 12.3, 17.3, 20.8, 22.6, 22.3, 17.3, 11.9, 6.4, 1.5], { sr: "Vojvodina" })],
    support: none("Renewable auctions / market premiums exist mainly for wind and solar; biogas support for new plants not confirmed.", "Аукціони та ринкові премії є переважно для вітру й сонця; підтримку нового біогазу не підтверджено."),
    notes: { en: ["Vojvodina's large farms and food industry are the natural market."], uk: ["Природний ринок — великі господарства та харчова промисловість Воєводини."] },
  },
  {
    code: "GR", name: "Greece", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: false,
    elec: 0.16, exp: 0.1, gas: 50, labour: 14, capex: 0.92, disc: 0.09, debtRate: 0.07, tkm: 0.12, bm: NO_GRID_BM, fertN: 1.1, ef: 0.35,
    regions: [region("thessaly", "Thessaly (Larissa)", [5.5, 7.0, 10.0, 14.5, 20.0, 25.0, 28.0, 27.5, 22.5, 16.8, 11.0, 6.8], { el: "Θεσσαλία" })],
    support: none("Feed-in premium tenders for renewables; biogas-specific terms not verified.", "Тендери з премією для ВДЕ; умови саме для біогазу не перевірено."),
    notes: { en: ["Mild winters cut digester heating; small, dispersed livestock farms favour co-digestion hubs."], uk: ["М'які зими зменшують обігрів реактора; дрібні розпорошені ферми спонукають до спільних хабів ко-ферментації."] },
  },
  {
    code: "TR", name: "Türkiye", currency: "TRY", fx: 45, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.11, exp: 0.07, gas: 30, labour: 6, capex: 0.8, disc: 0.15, debtRate: 0.12, tkm: 0.08, bm: NO_GRID_BM, fertN: 0.9, ef: 0.42,
    regions: [region("konya", "Central Anatolia (Konya)", [-0.2, 1.5, 5.8, 11.0, 16.0, 20.4, 23.8, 23.5, 19.0, 12.7, 6.0, 1.6], { tr: "İç Anadolu (Konya)" }), region("aegean", "Aegean (İzmir/Balıkesir)", [7.5, 8.5, 11.0, 15.0, 20.0, 24.8, 27.5, 27.2, 23.0, 18.0, 13.0, 9.0], { tr: "Ege" })],
    support: sup("YEKDEM renewable support mechanism for biogas (USD-denominated, plus local-content bonus); 301 MW agricultural biogas installed by 2024.", "Механізм підтримки ВДЕ YEKDEM для біогазу (у USD, з бонусом за локальне обладнання); до 2024 р. встановлено 301 МВт агробіогазу.", [
      sch({ id: "tr.yekdem", name: "YEKDEM (biyokütle/biyogaz)", status: "open", electricityTariffEurKwh: 0.075, routes: ["chp"], note: { en: "≈ USD 81–99/MWh base/ceiling reported for biomass; confirm current EPDK terms and duration.", uk: "Для біомаси повідомлялося ≈ USD 81–99/МВт·год (база/стеля); уточніть чинні умови EPDK." }, source: "MDPI Energies 16(22):7578 (2023), not verified against EPDK", confidence: "LOW" }),
    ]),
    notes: { en: ["Most plants are 1–4 MW centralised CHP on cattle and poultry manure; only ≈ 11 % of cattle manure is digested."], uk: ["Більшість станцій — централізовані КГУ 1–4 МВт на гною ВРХ і посліді; перероблюється лише ≈ 11 % гною ВРХ."] },
  },
  // ---------------- Baltics & Nordics ----------------
  {
    code: "LT", name: "Lithuania", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: true,
    elec: 0.16, exp: 0.09, gas: 45, labour: 12, capex: 0.9, disc: 0.085, debtRate: 0.065, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.15,
    regions: [region("kaunas", "Central Lithuania (Kaunas)", [-3.5, -3.0, 0.8, 7.4, 13.0, 16.3, 18.6, 17.6, 12.8, 7.3, 2.3, -1.6], { lt: "Vidurio Lietuva" })],
    support: none("EU-funded investment support for biomethane; operating support for new small CHP not confirmed.", "Інвестиційна підтримка біометану з фондів ЄС; операційну підтримку нових малих КГУ не підтверджено."),
    notes: { en: ["Large farms and an open gas grid favour farm-cluster biomethane."], uk: ["Великі ферми та відкрита газова мережа сприяють кластерному біометану."] },
  },
  {
    code: "LV", name: "Latvia", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: true,
    elec: 0.16, exp: 0.09, gas: 45, labour: 11, capex: 0.9, disc: 0.085, debtRate: 0.065, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.1,
    regions: [region("zemgale", "Zemgale (Jelgava)", [-3.1, -3.0, 0.6, 6.9, 12.6, 16.1, 18.5, 17.6, 12.9, 7.4, 2.4, -1.3], { lv: "Zemgale" })],
    support: sup("State/EU programmes support biomethane production and transport (≈ €21.5 m listed); first public biomethane entry point opened in 2025.", "Державні/ЄС програми підтримують виробництво і транспорт біометану (≈ €21,5 млн); першу публічну точку подачі біометану відкрито у 2025 р.", [
      sch({ id: "lv.bm", name: "Biometāna atbalsts (ES fondi)", status: "competitive", capexGrantShare: 0.3, routes: ["biomethane"], note: { en: "Grant intensity assumed 30 % for illustration.", uk: "Інтенсивність гранту 30 % прийнято для ілюстрації." }, source: "Invest in Latvia, Green fuels fact sheet", confidence: "LOW" }),
    ]),
    notes: { en: ["Poultry-manure biomethane (Balticovo) proves the industrial route."], uk: ["Біометан із посліду (Balticovo) доводить промисловий шлях."] },
  },
  {
    code: "EE", name: "Estonia", currency: "EUR", fx: 1, tier: "B", regime: "EU", inj: true,
    elec: 0.14, exp: 0.09, gas: 45, labour: 14, capex: 0.92, disc: 0.08, debtRate: 0.065, tkm: 0.12, bm: EU_BM_NEW, fertN: 1.15, ef: 0.6,
    regions: [region("tartu", "Southern Estonia (Tartu)", [-4.6, -4.9, -1.0, 5.5, 11.6, 15.3, 18.0, 16.7, 11.8, 6.2, 1.0, -2.6], { et: "Lõuna-Eesti" })],
    support: none("Biomethane for transport has been the driver; scheme details not verified.", "Рушій — біометан для транспорту; деталі схем не перевірено."),
    notes: { en: ["Cold winters: insulation and digester heat demand matter."], uk: ["Холодні зими: важливі ізоляція та тепло для реактора."] },
  },
  {
    code: "DK", name: "Denmark", currency: "DKK", fx: 7.46, tier: "A", regime: "EU", inj: true,
    elec: 0.12, exp: 0.07, gas: 45, labour: 38, capex: 1.08, disc: 0.065, debtRate: 0.045, tkm: 0.16, bm: EU_BM, fertN: 1.2, ef: 0.12,
    regions: [region("jutland", "Jutland (Herning)", [1.2, 1.0, 3.0, 6.9, 11.0, 14.1, 16.6, 16.5, 13.2, 9.3, 5.3, 2.4], { da: "Jylland" })],
    support: sup("Biogas tender scheme (≈ €1.7 bn, five rounds 2024–2030, 20-year contracts) — aimed at large biomethane plants.", "Тендерна схема для біогазу (≈ €1,7 млрд, п'ять раундів 2024–2030, 20-річні контракти) — для великих біометанових заводів.", [], false),
    notes: { en: ["The Danish model is centralised: dozens of farms supply one large biomethane plant; single-farm CHP is rare."], uk: ["Данська модель централізована: десятки ферм постачають один великий біометановий завод; фермерські КГУ рідкісні."] },
  },
  {
    bmOverride: true, code: "SE", name: "Sweden", currency: "SEK", fx: 11.3, tier: "A", regime: "EU", inj: false,
    elec: 0.09, exp: 0.04, gas: 50, labour: 32, capex: 1.05, disc: 0.065, debtRate: 0.045, tkm: 0.16, bm: [0.5, 0.65, 0.85], fertN: 1.2, ef: 0.03,
    regions: [region("skane", "Skåne", [1.4, 1.3, 3.3, 7.2, 11.5, 15.0, 17.6, 17.3, 13.9, 9.6, 5.6, 2.6], { sv: "Skåne" })],
    support: none("Manure-gas premium and investment support (Klimatklivet) — details not verified; biomethane mainly for transport.", "Премія за біогаз із гною та інвестиційна підтримка (Klimatklivet) — деталі не перевірено; біометан переважно для транспорту."),
    notes: { en: ["Low electricity prices make CHP unattractive; upgraded biogas for vehicles is the usual route."], uk: ["Низькі ціни на електрику роблять КГУ непривабливою; звична схема — очищений біогаз для транспорту."] },
  },
  {
    bmOverride: true, code: "FI", name: "Finland", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: false,
    elec: 0.09, exp: 0.05, gas: 50, labour: 30, capex: 1.05, disc: 0.065, debtRate: 0.045, tkm: 0.16, bm: [0.5, 0.65, 0.85], fertN: 1.2, ef: 0.08,
    regions: [region("ostrobothnia", "Ostrobothnia (Seinäjoki)", [-7.0, -7.3, -3.3, 2.6, 9.3, 14.2, 16.9, 14.8, 9.6, 4.2, -0.6, -4.6], { fi: "Pohjanmaa", sv: "Österbotten" })],
    support: none("Investment grants for biogas and recycled nutrients; biomethane for heavy transport is the policy driver.", "Інвестиційні гранти на біогаз і повторне використання поживних речовин; рушій політики — біометан для важкого транспорту."),
    notes: { en: ["Very cold winters: expect a large share of biogas to heat the digester."], uk: ["Дуже холодні зими: значна частка біогазу піде на обігрів реактора."] },
    storageMonths: 12,
  },
  // ---------------- Western Europe ----------------
  {
    code: "DE", name: "Germany", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    elec: 0.21, exp: 0.08, gas: 50, labour: 30, capex: 1.0, disc: 0.065, debtRate: 0.05, tkm: 0.15, bm: EU_BM, fertN: 1.3, ef: 0.38,
    regions: [region("niedersachsen", "Lower Saxony", [1.5, 2.0, 5.0, 9.0, 13.3, 16.2, 18.3, 17.9, 14.3, 10.0, 5.5, 2.4], { de: "Niedersachsen" }), region("bayern", "Bavaria", [-0.2, 0.8, 4.8, 9.3, 13.6, 17.3, 19.2, 18.8, 14.2, 9.5, 4.1, 0.7], { de: "Bayern" }), region("sachsen", "Saxony", [0.8, 1.8, 5.2, 10.2, 14.4, 17.9, 19.8, 19.5, 14.8, 10.0, 5.2, 2.0], { de: "Sachsen" })],
    support: sup("EEG 2023: small manure plants ≤ 150 kW paid 22 ct/kWh (first 75 kW) and 19 ct/kWh (75–150 kW) with ≥ 80 % manure; larger plants bid in tenders (≈ 18–19 ct/kWh ceilings) and must run flexibly. Solarspitzengesetz (2025) removed payment in negative-price hours.", "EEG 2023: малі гнойові установки ≤ 150 кВт — 22 ц/кВт·год (перші 75 кВт) і 19 ц/кВт·год (75–150 кВт) за ≥ 80 % гною; більші — тендери (стелі ≈ 18–19 ц/кВт·год) і гнучкий режим. Solarspitzengesetz (2025) скасував оплату в години від'ємних цін.", [
      sch({ id: "de.guelle", name: "EEG 2023 Güllekleinanlage", status: "open", electricityTariffEurKwh: 0.205, routes: ["chp"], maxKwEl: 150, minManureShareMass: 0.8, note: { en: "Blended 22/19 ct/kWh; 20 years; site capacity ≤ 150 kW incl. all CHPs.", uk: "Середньозважено 22/19 ц/кВт·год; 20 років; потужність майданчика ≤ 150 кВт з усіма КГУ." }, source: "topagrar (EEG 2023 Güllekleinanlagen), FNR 2023 presentation", confidence: "MEDIUM" }),
      sch({ id: "de.tender", name: "EEG Ausschreibung Biomasse", status: "competitive", electricityTariffEurKwh: 0.18, routes: ["chp"], minKwEl: 150, note: { en: "Competitive tender; the bid value is a ceiling, awards are typically below; flexible operation required.", uk: "Конкурсний тендер; значення — стеля, присудження зазвичай нижчі; потрібен гнучкий режим." }, source: "Bundesnetzagentur / FNR (order of magnitude)", confidence: "LOW" }),
    ]),
    notes: { en: ["Mature market (≈ 9 300 CHP plants): German economics are tariff-driven — compare the support case with the no-support verdict."], uk: ["Зрілий ринок (≈ 9 300 станцій з КГУ): економіка Німеччини тримається на тарифах — порівнюйте сценарій підтримки з вердиктом без неї."] },
    storageMonths: 9,
  },
  {
    code: "AT", name: "Austria", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    elec: 0.18, exp: 0.09, gas: 48, labour: 29, capex: 1.0, disc: 0.065, debtRate: 0.05, tkm: 0.15, bm: EU_BM, fertN: 1.25, ef: 0.1,
    regions: [region("oberoesterreich", "Upper Austria", [-0.5, 1.0, 5.0, 9.8, 14.5, 17.8, 19.7, 19.2, 14.7, 9.5, 4.2, 0.6], { de: "Oberösterreich" })],
    support: sup("EAG market premium for new biogas plants up to 250 kWel and for existing plants after the ÖSG period (until 2030).", "Ринкова премія EAG для нових біогазових установок до 250 кВт ел. і для наявних після завершення ÖSG (до 2030 р.).", [
      sch({ id: "at.eag", name: "EAG Marktprämie Biogas (≤ 250 kW)", status: "open", electricityTariffEurKwh: 0.2, routes: ["chp"], maxKwEl: 250, note: { en: "Value assumed for illustration (premium on top of market price) — confirm the current anzulegender Wert.", uk: "Значення прийнято для ілюстрації — уточніть актуальний anzulegender Wert." }, source: "EAG summary via regional grant listing (not verified)", confidence: "LOW" }),
    ]),
    notes: { en: ["Small Alpine farms: cluster or co-digestion is usually needed to reach scale."], uk: ["Малі альпійські ферми: для масштабу зазвичай потрібні кластер або ко-ферментація."] },
  },
  {
    code: "IT", name: "Italy", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    elec: 0.22, exp: 0.11, gas: 50, labour: 24, capex: 0.97, disc: 0.075, debtRate: 0.055, tkm: 0.14, bm: EU_BM, fertN: 1.25, ef: 0.27,
    regions: [region("lombardia", "Lombardy (Po valley)", [1.8, 4.0, 8.5, 12.8, 17.5, 21.8, 24.0, 23.4, 19.0, 13.5, 7.6, 2.8], { it: "Lombardia" }), region("emilia", "Emilia-Romagna", [2.5, 4.5, 8.8, 13.0, 17.8, 22.0, 24.5, 24.0, 19.5, 14.2, 8.3, 3.5], { it: "Emilia-Romagna" })],
    support: sup("DM 15/9/2022 biomethane incentive with PNRR capital grant (40 % of CAPEX) — 398 projects awarded, completion deadline 30 June 2026; a post-PNRR plan to 2030 is under discussion.", "Стимул для біометану DM 15/9/2022 з грантом PNRR (40 % CAPEX) — 398 проєктів, термін завершення 30.06.2026; план після PNRR до 2030 р. обговорюється.", [
      sch({ id: "it.pnrr", name: "DM 15/9/2022 + PNRR (40 % grant)", status: "closed", capexGrantShare: 0.4, biomethaneEurNm3: 1.05, routes: ["biomethane"], note: { en: "Grant + incentive tariff (≈ €100–110/MWh assumed). The PNRR window has closed; a successor scheme is expected but not yet defined.", uk: "Грант + стимулюючий тариф (≈ €100–110/МВт·год, припущення). Вікно PNRR закрито; наступна схема очікується." }, source: "CIB (Biogas Italy 2025), Il Sole 24 Ore", confidence: "LOW" }),
    ]),
    notes: { en: ["Large agricultural biogas fleet in the Po valley; the strategic question is CHP-to-biomethane conversion."], uk: ["Великий парк агробіогазу в долині По; стратегічне питання — переведення КГУ на біометан."] },
  },
  {
    code: "FR", name: "France", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    elec: 0.16, exp: 0.06, gas: 45, labour: 30, capex: 1.0, disc: 0.07, debtRate: 0.05, tkm: 0.15, bm: EU_BM, fertN: 1.2, ef: 0.05,
    regions: [region("bretagne", "Brittany", [5.8, 6.2, 8.6, 10.6, 14.0, 17.0, 19.0, 19.0, 16.5, 13.0, 9.0, 6.4], { fr: "Bretagne" }), region("grand-est", "Grand Est", [1.8, 2.8, 6.3, 9.8, 14.0, 17.4, 19.5, 19.1, 15.2, 10.7, 5.6, 2.6], { fr: "Grand Est" })],
    support: sup("Feed-in tariff for biomethane injection (obligation d'achat) for small and mid-size units; electricity purchase contracts are ending and pushing units toward injection.", "Фіксований тариф на ін'єкцію біометану (obligation d'achat) для малих і середніх установок; контракти на електрику закінчуються і штовхають до ін'єкції.", [
      sch({ id: "fr.oa", name: "Obligation d'achat biométhane injecté", status: "open", biomethaneEurNm3: 1.1, routes: ["biomethane"], note: { en: "≈ €110/MWh assumed for a small farm unit; the real tariff depends on capacity and feedstock — check the current arrêté.", uk: "≈ €110/МВт·год прийнято для малої фермерської установки; реальний тариф залежить від потужності — перевірте чинне arrêté." }, source: "Order of magnitude; not verified against CRE/arrêté tarifaire", confidence: "LOW" }),
    ]),
    notes: { en: ["Collective farm 'méthanisation' with grid injection is the dominant model; units under 200 kWe rarely justify upgrading on their own."], uk: ["Домінує колективна фермерська «méthanisation» з ін'єкцією; установки до 200 кВт ел. рідко окупають очищення самостійно."] },
  },
  {
    code: "ES", name: "Spain", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    elec: 0.13, exp: 0.06, gas: 42, labour: 20, capex: 0.92, disc: 0.075, debtRate: 0.055, tkm: 0.13, bm: EU_BM_NEW, fertN: 1.15, ef: 0.15,
    regions: [region("cataluna", "Catalonia (Lleida)", [5.5, 7.5, 11.0, 13.5, 17.8, 22.3, 25.2, 24.7, 20.5, 15.3, 9.3, 5.6], { es: "Cataluña (Lleida)" }), region("castilla", "Castile and León", [3.5, 5.0, 8.0, 10.0, 13.8, 18.5, 21.6, 21.2, 17.5, 12.5, 7.3, 4.2], { es: "Castilla y León" })],
    support: none("PERTE grants and a biogas roadmap; long-term operating support not confirmed.", "Гранти PERTE і дорожня карта біогазу; довгострокову операційну підтримку не підтверджено."),
    notes: { en: ["Pig-dense regions (Catalonia, Aragón) face nitrate pressure: digestate treatment can be as important as energy."], uk: ["Регіони з високою щільністю свиней (Каталонія, Арагон) мають нітратний тиск: обробка дигестату може важити не менше за енергію."] },
  },
  {
    code: "NL", name: "Netherlands", currency: "EUR", fx: 1, tier: "A", regime: "EU", inj: true,
    elec: 0.16, exp: 0.08, gas: 45, labour: 32, capex: 1.05, disc: 0.065, debtRate: 0.045, tkm: 0.16, bm: EU_BM, fertN: 1.2, ef: 0.3,
    regions: [region("brabant", "North Brabant", [3.6, 4.0, 6.8, 10.0, 13.8, 16.6, 18.8, 18.4, 15.0, 11.0, 7.0, 4.2], { nl: "Noord-Brabant" })],
    support: none("SDE++ operating subsidy (competitive rounds) and a green-gas blending obligation in preparation — terms not verified.", "Операційна субсидія SDE++ (конкурсні раунди) та обов'язок домішування зеленого газу в підготовці — умови не перевірено."),
    notes: { en: ["Manure surplus and nitrogen rules make digestate processing a central cost item."], uk: ["Надлишок гною та азотні правила роблять обробку дигестату центральною статтею витрат."] },
  },
  {
    code: "GB", name: "United Kingdom", currency: "GBP", fx: 0.86, tier: "A", regime: "UK", inj: true,
    elec: 0.27, exp: 0.09, gas: 58, labour: 26, capex: 1.08, disc: 0.075, debtRate: 0.06, tkm: 0.16, bm: [0.45, 0.6, 0.8], fertN: 1.25, ef: 0.2,
    regions: [region("midlands", "West Midlands / Shropshire", [4.3, 4.5, 6.4, 8.5, 11.5, 14.4, 16.4, 16.1, 13.8, 10.5, 7.0, 4.6]), region("east-anglia", "East Anglia", [4.2, 4.5, 6.7, 9.0, 12.3, 15.3, 17.7, 17.6, 14.9, 11.3, 7.2, 4.6])],
    support: sup("Green Gas Support Scheme for biomethane injection (open to new plants until 2028; tiered tariffs); 119 biomethane plants.", "Green Gas Support Scheme для ін'єкції біометану (для нових до 2028 р.; ступінчасті тарифи); 119 біометанових заводів.", [
      sch({ id: "gb.ggss", name: "Green Gas Support Scheme", status: "closing", biomethaneEurNm3: 1.05, routes: ["biomethane"], note: { en: "Tier-1 tariff plus gas and certificate sales ≈ €1.0–1.1/Nm³ assumed; budget-capped, tariffs degress.", uk: "Тариф Tier-1 плюс продаж газу та сертифікатів ≈ €1,0–1,1/Нм³ (припущення); бюджет обмежений, тарифи знижуються." }, source: "Ofgem GGSS (order of magnitude, not verified)", confidence: "LOW" }),
    ]),
    notes: { en: ["High electricity prices make on-site CHP for own use attractive; policy favours food waste over manure."], uk: ["Високі ціни на електрику роблять КГУ для власних потреб привабливою; політика надає перевагу харчовим відходам перед гноєм."] },
  },
  // ---------------- North America ----------------
  {
    code: "US", name: "United States", currency: "USD", fx: 1.1, tier: "A", regime: "US", inj: true,
    elec: 0.1, exp: 0.04, gas: 12, labour: 30, capex: 1.1, disc: 0.075, debtRate: 0.065, tkm: 0.14, bm: [0.12, 0.2, 0.35], fertN: 1.1, ef: 0.37,
    regions: [region("wisconsin", "Wisconsin (dairy)", [-8.5, -6.5, -0.5, 7.0, 13.5, 19.0, 21.5, 20.5, 16.0, 9.0, 2.0, -5.0]), region("california", "California Central Valley", [8.0, 10.5, 13.0, 15.8, 20.3, 24.5, 27.8, 27.0, 24.0, 18.5, 11.8, 7.5]), region("iowa", "Iowa (swine)", [-6.0, -3.5, 3.0, 10.0, 16.3, 21.5, 23.5, 22.5, 18.0, 11.0, 3.5, -3.5])],
    support: sup("RNG economics are driven by federal RFS D3 RINs and state low-carbon fuel credits (LCFS in California, Oregon, Washington); ≈ 400 farm digesters operate.", "Економіка RNG тримається на федеральних RIN D3 (RFS) і кредитах низьковуглецевого пального штатів (LCFS у Каліфорнії, Орегоні, Вашингтоні); працює ≈ 400 фермерських станцій.", [
      sch({ id: "us.rng", name: "RFS D3 RINs (+ state LCFS where applicable)", status: "open", biomethaneEurNm3: 0.9, routes: ["biomethane"], note: { en: "Credit value is volatile; ≈ €0.9/Nm³ all-in assumed without LCFS. Projects in California can earn much more — and carry more price risk.", uk: "Вартість кредитів волатильна; ≈ €0,9/Нм³ разом прийнято без LCFS. Проєкти в Каліфорнії можуть отримати більше — з більшим ціновим ризиком." }, source: "Order of magnitude from RIN market; not verified", confidence: "LOW" }),
    ]),
    notes: { en: ["Low gas prices make biogas without credits unattractive; transport-fuel credits, not electricity savings, decide most US projects."], uk: ["Низькі ціни на газ роблять біогаз без кредитів непривабливим; більшість проєктів у США визначають кредити за пальне, а не економія електрики."] },
  },
  {
    code: "CA", name: "Canada", currency: "CAD", fx: 1.52, tier: "A", regime: "CA", inj: true,
    elec: 0.09, exp: 0.04, gas: 10, labour: 26, capex: 1.1, disc: 0.075, debtRate: 0.06, tkm: 0.14, bm: [0.15, 0.25, 0.4], fertN: 1.1, ef: 0.12,
    regions: [region("ontario", "Ontario (Guelph)", [-7.5, -6.5, -2.0, 5.5, 12.0, 17.0, 19.8, 18.8, 14.5, 8.0, 2.0, -4.0]), region("alberta", "Alberta (Lethbridge)", [-6.5, -4.5, 0.0, 6.5, 11.5, 15.8, 19.0, 18.3, 13.0, 6.8, -1.0, -5.5])],
    support: sup("Utility RNG procurement programmes and Clean Fuel Regulations credits; ≈ 300 biogas facilities nationally.", "Програми закупівлі RNG газовими компаніями та кредити Clean Fuel Regulations; ≈ 300 біогазових об'єктів у країні.", [
      sch({ id: "ca.rng", name: "Utility RNG offtake + CFR credits", status: "competitive", biomethaneEurNm3: 0.6, routes: ["biomethane"], note: { en: "≈ CAD 25–30/GJ long-term offtake assumed; contracts are negotiated.", uk: "Довгостроковий збут ≈ CAD 25–30/ГДж (припущення); контракти — за домовленістю." }, source: "Order of magnitude; not verified", confidence: "LOW" }),
    ]),
    notes: { en: ["Cold winters and low power prices: RNG contracts are usually the business case."], uk: ["Холодні зими та низькі ціни на електрику: бізнес-модель зазвичай — контракти на RNG."] },
  },
  // ---------------- Latin America ----------------
  {
    code: "MX", name: "Mexico", currency: "MXN", fx: 20.5, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.1, exp: 0.06, gas: 20, labour: 5, capex: 0.8, disc: 0.12, debtRate: 0.1, tkm: 0.08, bm: NO_GRID_BM, fertN: 0.9, ef: 0.43,
    regions: [region("jalisco", "Jalisco highlands", [16.5, 18.0, 20.3, 22.5, 24.3, 23.3, 21.5, 21.5, 21.3, 20.0, 18.3, 16.8], { es: "Altos de Jalisco" })],
    support: none("No dedicated operating support for biogas identified; self-supply and net metering are the main routes.", "Окремої операційної підтримки біогазу не виявлено; основні шляхи — самопостачання та нетто-облік."),
    notes: { en: ["Warm climate allows covered lagoons for pig and dairy effluent."], uk: ["Теплий клімат дозволяє накриті лагуни для стоків свиноферм і молочних ферм."] },
  },
  {
    code: "AR", name: "Argentina", currency: "ARS", fx: 1450, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.08, exp: 0.05, gas: 12, labour: 6, capex: 0.85, disc: 0.16, debtRate: 0.14, tkm: 0.08, bm: [0.2, 0.28, 0.4], fertN: 0.9, ef: 0.33,
    regions: [region("cordoba", "Córdoba / Pampas", [24.2, 22.8, 21.0, 17.3, 14.0, 10.7, 10.2, 12.0, 15.0, 18.4, 21.2, 23.4], { es: "Córdoba / Pampa" })],
    support: none("RenovAr auctions supported biogas in the past; current programme status not verified. High macro risk.", "Аукціони RenovAr у минулому підтримували біогаз; поточний статус не перевірено. Високий макроризик."),
    notes: { en: ["Feedlots and dairy in the Pampas; currency risk dominates the discount rate."], uk: ["Відгодівельні майданчики та молочні ферми в Пампі; валютний ризик визначає ставку дисконтування."] },
  },
  {
    code: "BR", name: "Brazil", currency: "BRL", fx: 6.2, tier: "B", regime: "GENERIC", inj: false,
    elec: 0.13, exp: 0.05, gas: 45, labour: 6, capex: 0.8, disc: 0.12, debtRate: 0.11, tkm: 0.08, bm: [0.35, 0.45, 0.6], fertN: 0.95, ef: 0.08,
    regions: [region("santa-catarina", "West Santa Catarina / Paraná (pigs & poultry)", [22.5, 22.3, 21.3, 18.5, 15.5, 13.8, 13.5, 15.2, 16.5, 19.0, 20.8, 22.0], { pt: "Oeste catarinense / Paraná" }), region("sao-paulo", "São Paulo interior (sugarcane)", [24.0, 24.3, 23.8, 22.5, 20.0, 18.8, 19.0, 21.0, 22.8, 23.8, 23.8, 24.0], { pt: "Interior de São Paulo" })],
    support: none("Fuel of the Future law (14.993/2024): a 1 % biomethane obligation from 2026 rising toward 10 %; distributed-generation net metering for small CHP. 1 803 biogas plants (2025).", "Закон «Паливо майбутнього» (14.993/2024): обов'язок 1 % біометану з 2026 р. зі зростанням до 10 %; нетто-облік розподіленої генерації для малих КГУ. 1 803 біогазові станції (2025)."),
    notes: { en: ["Sugar-ethanol vinasse and press mud are the largest feedstock; covered lagoons dominate in the warm South."], uk: ["Найбільша сировина — вінас і фільтраційний осад цукрово-етанольних заводів; на теплому Півдні домінують накриті лагуни."] },
  },
  // ---------------- Asia ----------------
  {
    code: "IN", name: "India", currency: "INR", fx: 95, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.09, exp: 0.05, gas: 40, labour: 3, capex: 0.6, disc: 0.12, debtRate: 0.1, tkm: 0.05, bm: [0.35, 0.45, 0.6], fertN: 0.5, fertFactor: 0.45, ef: 0.71,
    regions: [region("punjab", "Punjab", [12.8, 15.8, 20.8, 27.0, 31.3, 32.5, 30.5, 29.8, 28.8, 25.3, 19.3, 14.3]), region("maharashtra", "Maharashtra (Pune)", [20.8, 22.5, 25.5, 28.5, 29.0, 26.5, 24.8, 24.3, 24.5, 24.8, 22.5, 20.5])],
    support: sup("MoPNG (29 Aug 2026): GOBARdhan producer procurement ₹2,110/MMBtu. Conditional support case, not guaranteed commercial offtake; eligibility and contract terms require confirmation. No unverified capital grant is assumed.", "MoPNG (29.08.2026): закупівельна ціна GOBARdhan для виробників — ₹2 110/MMBtu. Це умовний сценарій підтримки, а не гарантований комерційний збут; участь та договірні умови потрібно підтвердити. Непідтверджений капітальний грант не враховується.", [
      { id: "in.cbg", name: "GOBARdhan conditional CBG procurement", status: "uncertain", biomethaneEurNm3: indiaCbgProcurementPrice(), routes: ["biomethane"], note: { en: "MoPNG (29 Aug 2026): producer procurement ₹2,110/MMBtu. EUR/Nm³ conversion assumes HHV pricing, 97% CH₄ and documented annual FX. Eligibility, effective contract terms, quality and transport require confirmation. No capital grant or additional ₹10/kg payment is added.", uk: "MoPNG (29.08.2026): закупівельна ціна для виробника — ₹2 110/MMBtu. Перерахунок у EUR/Nm³ передбачає ціну за HHV, 97% CH₄ та задокументований середньорічний курс. Право на участь, договірні умови, якість газу й доставку потрібно підтвердити. Капітальний грант і додаткові ₹10/кг не нараховуються." }, source: "MoPNG / PIB, 2026-08-29: https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2304467&lang=1&reg=3", confidence: "MEDIUM", checkedOn: "2026-10-26" },
    ], false, "2026-10-26"),
    notes: { en: ["Dung collection from many small holdings is the main logistics challenge; urea is subsidised, so digestate N has low cash value."], uk: ["Головний виклик логістики — збір гною з багатьох малих господарств; сечовина субсидована, тож азот дигестату має низьку грошову цінність."] },
  },
  {
    code: "TH", name: "Thailand", currency: "THB", fx: 38, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.11, exp: 0.07, gas: 35, labour: 4, capex: 0.7, disc: 0.09, debtRate: 0.07, tkm: 0.06, bm: NO_GRID_BM, fertN: 0.9, ef: 0.47,
    regions: [region("central", "Central Thailand", [26.5, 28.0, 29.3, 30.3, 29.8, 29.0, 28.6, 28.4, 28.0, 27.8, 27.3, 26.0], { th: "ภาคกลาง" }), region("south", "Southern Thailand (palm oil)", [26.0, 26.8, 27.8, 28.6, 28.6, 28.2, 27.8, 27.8, 27.4, 27.0, 26.4, 26.0], { th: "ภาคใต้" })],
    support: sup("Feed-in tariffs for biogas power under VSPP/SPP programmes (round-based).", "Фіксовані тарифи на електрику з біогазу за програмами VSPP/SPP (за раундами).", [
      sch({ id: "th.fit", name: "VSPP biogas FiT", status: "uncertain", electricityTariffEurKwh: 0.1, routes: ["chp"], note: { en: "≈ THB 3.8/kWh assumed; quotas are round-based.", uk: "≈ THB 3,8/кВт·год (припущення); квоти — за раундами." }, source: "Order of magnitude; not verified", confidence: "LOW" }),
    ], false),
    notes: { en: ["POME covered lagoons at palm-oil mills are the standard industrial application."], uk: ["Стандартне промислове застосування — накриті лагуни POME на пальмоолійних заводах."] },
  },
  {
    code: "VN", name: "Vietnam", currency: "VND", fx: 28500, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.08, exp: 0.05, gas: 35, labour: 3, capex: 0.65, disc: 0.11, debtRate: 0.09, tkm: 0.05, bm: NO_GRID_BM, fertN: 0.85, ef: 0.6,
    regions: [region("mekong", "Mekong Delta", [25.8, 26.5, 27.8, 28.9, 28.5, 27.8, 27.4, 27.3, 27.2, 27.1, 26.9, 25.9], { vi: "Đồng bằng sông Cửu Long" }), region("red-river", "Red River Delta", [16.4, 17.0, 20.2, 23.7, 27.3, 28.8, 29.1, 28.6, 27.5, 24.9, 21.5, 18.2], { vi: "Đồng bằng sông Hồng" })],
    support: none("Biomass/biogas feed-in tariffs existed for power; current terms for new projects not verified.", "Для електрики з біомаси/біогазу існували тарифи; поточні умови для нових проєктів не перевірено."),
    notes: { en: ["Hundreds of thousands of small household digesters; commercial pig-farm and food-industry plants are the growth segment."], uk: ["Сотні тисяч малих домашніх біодигесторів; сегмент зростання — комерційні свиноферми та харчова промисловість."] },
  },
  {
    code: "KZ", name: "Kazakhstan", currency: "KZT", fx: 560, tier: "C", regime: "GENERIC", inj: false,
    elec: 0.06, exp: 0.03, gas: 8, labour: 5, capex: 0.8, disc: 0.13, debtRate: 0.12, tkm: 0.07, bm: [0.1, 0.15, 0.2], fertN: 0.8, ef: 0.6,
    regions: [region("north", "Northern Kazakhstan (Kostanay)", [-15.5, -14.5, -7.5, 5.5, 13.5, 19.5, 21.0, 19.0, 12.5, 4.5, -5.0, -12.5]), region("south", "Almaty region", [-5.0, -3.5, 3.5, 11.5, 16.5, 21.5, 24.0, 23.0, 17.5, 10.0, 2.5, -3.0])],
    support: none("Renewable auctions exist; biogas-specific support for new plants not confirmed.", "Аукціони ВДЕ існують; підтримку саме біогазу для нових установок не підтверджено."),
    notes: { en: ["Very cheap gas and power make biogas hard to justify on energy alone; waste treatment and fertiliser drive the case."], uk: ["Дуже дешеві газ і електрика ускладнюють обґрунтування біогазу лише енергією; рушій — переробка відходів і добрива."] },
  },
];

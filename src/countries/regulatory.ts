import type { RegulatoryContext, RegulatoryRegime } from "@/core/country";
import { tr } from "@/core/i18n";
import type { RegulatoryItem } from "@/core/types";

/**
 * Permitting checklists by legal regime. These are orientation lists for a screening report, written
 * from general knowledge of each framework — every item is TO_VERIFY with a local lawyer/engineer
 * except where marked CONFIRMED. National transposition differs; thresholds below are indicative.
 */
type Item = (c: RegulatoryContext) => RegulatoryItem | null;

const it = (id: string, en: string, uk: string, whyEn: string, whyUk: string, effort: RegulatoryItem["effort"], status: RegulatoryItem["status"] = "TO_VERIFY"): Item => (c) => {
  const T = tr(c.lang);
  return { id, title: T(en, uk), appliesBecause: T(whyEn, whyUk), effort, status };
};
const when = (cond: (c: RegulatoryContext) => boolean, item: Item): Item => (c) => (cond(c) ? item(c) : null);
const bigWaste = (c: RegulatoryContext) => c.tonnesYear / 365 > 100 && c.abpTonnesYear + c.tonnesYear > 0;

const COMMON: Item[] = [
  when((c) => c.abpTonnesYear > 0, it("abp", "Animal by-products approval: pasteurisation 70 °C / 1 h (Cat. 3) or pressure sterilisation (Cat. 2), veterinary registration", "Побічні продукти тваринного походження: пастеризація 70 °C/1 год (кат. 3) або стерилізація (кат. 2), ветеринарна реєстрація", "Slaughter / dairy / food residues in the feed", "У сировині є відходи забою / молочні / харчові", "HIGH")),
  when((c) => c.neighboursWithin300m, it("setback", "Setback distances, odour assessment and community consultation", "Санітарно-захисна зона, оцінка запахів, узгодження з громадою", "Housing within 300 m", "Житло ближче 300 м", "HIGH")),
  when((c) => c.nearProtectedOrWaterArea, it("protected", "Water-protection / protected-area restrictions and spill containment", "Обмеження водоохоронних та природоохоронних зон, захист від розливів", "Water bodies or protected areas nearby", "Поблизу водойм або заповідних територій", "HIGH")),
];

const EU: Item[] = [
  it("eu.permit", "Building permit and environmental permit; EIA screening (Directive 2011/92/EU as transposed)", "Дозвіл на будівництво та екологічний дозвіл; скринінг ОВД (Директива 2011/92/ЄС у національному праві)", "New installation", "Нове капітальне будівництво", "MEDIUM"),
  when(bigWaste, it("eu.ied", "Industrial Emissions Directive (2010/75/EU) permit — anaerobic digestion of waste above ~100 t/day", "Дозвіл за Директивою про промислові викиди (2010/75/ЄС) — анаеробне перероблення відходів понад ~100 т/добу", "Throughput above the IED threshold", "Пропускна здатність вище порогу IED", "HIGH")),
  it("eu.nitrates", "Nitrates Directive (91/676/EEC): 170 kg N/ha from organic manures in vulnerable zones; closed spreading periods", "Нітратна директива (91/676/ЄЕС): 170 кг N/га з органіки у вразливих зонах; заборонені періоди внесення", "Digestate is spread on land", "Дигестат вноситься на поля", "MEDIUM", "CONFIRMED"),
  it("eu.atex", "ATEX hazardous-area zoning (Directives 2014/34/EU, 1999/92/EC)", "Класифікація вибухонебезпечних зон ATEX (Директиви 2014/34/ЄС, 1999/92/ЄС)", "Methane in the gas phase", "Метан у газовій фазі", "MEDIUM", "CONFIRMED"),
  when((c) => c.route === "chp" && c.kwElEquivalent > 380, it("eu.mcpd", "Medium Combustion Plant Directive (2015/2193): registration and emission limits for CHP ≥ 1 MW thermal input", "Директива про середні спалювальні установки (2015/2193): реєстрація та ліміти викидів для КГУ ≥ 1 МВт теплової потужності", "CHP above 1 MWth input", "КГУ понад 1 МВт теплової потужності", "MEDIUM")),
  when((c) => c.exportsElectricity, it("eu.grid", "Grid-connection agreement with the DSO and generator registration", "Договір приєднання з оператором розподілу та реєстрація генерації", "Surplus electricity is exported", "Є експорт надлишків електрики", "MEDIUM")),
  when((c) => c.gasGridInjection, it("eu.red", "RED III sustainability & GHG certification (e.g. ISCC EU / REDcert) and Guarantees of Origin for biomethane", "Сертифікація сталості та ПГ за RED III (ISCC EU / REDcert) і гарантії походження для біометану", "Biomethane is sold as a renewable product", "Біометан продається як відновлюваний продукт", "MEDIUM", "CONFIRMED")),
  when((c) => c.gasGridInjection, it("eu.injection", "Gas-grid injection: connection request, gas-quality specification, metering (TSO/DSO)", "Ін'єкція в газову мережу: заявка на приєднання, вимоги до якості газу, облік (оператор ГТС/ГРМ)", "Grid injection", "Ін'єкція біометану", "HIGH")),
];

const UK: Item[] = [
  it("uk.planning", "Planning permission (local planning authority) incl. odour, traffic and landscape", "Дозвіл на планування (місцева влада): запах, транспорт, ландшафт", "New installation", "Нове будівництво", "HIGH"),
  it("uk.permit", "Environmental Permit (Environment Agency / SEPA / NRW / NIEA): standard rules or bespoke", "Екологічний дозвіл (Environment Agency / SEPA / NRW / NIEA): стандартні правила або індивідуальний", "Treatment of waste or manure", "Перероблення відходів або гною", "HIGH"),
  it("uk.dsear", "DSEAR hazardous-area assessment", "Оцінка вибухонебезпечних зон за DSEAR", "Methane in the gas phase", "Метан у газовій фазі", "MEDIUM", "CONFIRMED"),
  it("uk.nvz", "Nitrate Vulnerable Zone rules and Farming Rules for Water", "Правила зон, вразливих до нітратів, та Farming Rules for Water", "Digestate is spread on land", "Дигестат вноситься на поля", "MEDIUM"),
  when((c) => c.gasGridInjection, it("uk.ggss", "Green Gas Support Scheme registration (Ofgem) and Green Gas Certificates", "Реєстрація в Green Gas Support Scheme (Ofgem) і сертифікати зеленого газу", "Biomethane injection", "Ін'єкція біометану", "MEDIUM")),
  when((c) => c.exportsElectricity, it("uk.dno", "DNO connection offer (G99) and export agreement", "Пропозиція приєднання DNO (G99) і договір експорту", "Electricity export", "Експорт електрики", "MEDIUM")),
];

const US: Item[] = [
  it("us.air", "State air permit (CHP/flare) and possibly Title V; EPA NSPS/NESHAP for engines", "Дозвіл штату на викиди (КГУ/факел), можливо Title V; EPA NSPS/NESHAP для двигунів", "Combustion of biogas", "Спалювання біогазу", "MEDIUM"),
  it("us.water", "CAFO / NPDES and state nutrient-management plan for digestate", "CAFO / NPDES і план керування поживними речовинами штату для дигестату", "Manure / digestate land application", "Внесення гною/дигестату", "MEDIUM"),
  it("us.zoning", "County zoning / conditional-use permit and building permits", "Зонування округу / дозвіл на умовне використання та будівельні дозволи", "New installation", "Нове будівництво", "MEDIUM"),
  when((c) => c.gasGridInjection, it("us.rfs", "EPA RFS registration (D3 RINs), LCFS pathway (California/Oregon/Washington) and utility interconnection", "Реєстрація в EPA RFS (D3 RIN), шлях LCFS (Каліфорнія/Орегон/Вашингтон) і приєднання до газової мережі", "RNG sold for transport credits", "RNG продається за транспортні кредити", "HIGH")),
  when((c) => c.exportsElectricity, it("us.interconnect", "Utility interconnection agreement (state rules / FERC for wholesale)", "Договір приєднання з енергокомпанією (правила штату / FERC)", "Electricity export", "Експорт електрики", "MEDIUM")),
];

const CA: Item[] = [
  it("ca.env", "Provincial environmental approval (e.g. Ontario ECA / O.Reg 267/03 for on-farm AD)", "Провінційний екологічний дозвіл (напр. Ontario ECA / O.Reg 267/03 для фермерських AD)", "New installation", "Нове будівництво", "MEDIUM"),
  it("ca.nutrient", "Nutrient-management regulation for digestate (provincial)", "Провінційні правила керування поживними речовинами для дигестату", "Digestate is spread on land", "Дигестат вноситься на поля", "MEDIUM"),
  when((c) => c.gasGridInjection, it("ca.rng", "RNG offtake contract with gas utility and Clean Fuel Regulations credits", "Договір продажу RNG газовій компанії та кредити за Clean Fuel Regulations", "Biomethane injection", "Ін'єкція біометану", "HIGH")),
];

const UA: Item[] = [
  it("ua.construction", "Urban-planning conditions and construction permit (consequence class to be confirmed)", "Містобудівні умови та дозвіл на будівництво (клас наслідків уточнюється)", "New installation", "Нове капітальне будівництво", "MEDIUM"),
  it("ua.eia", "Environmental impact assessment / screening (thresholds to be confirmed)", "Оцінка впливу на довкілля / скринінг (пороги уточнюються)", "Biogas plant as an organic-waste facility", "Біогазова установка як об'єкт поводження з органічними відходами", "MEDIUM"),
  it("ua.hazard", "Registration of high-hazard equipment and gas-system expert review", "Реєстрація обладнання підвищеної небезпеки та експертиза газових систем", "Gas holders, CHP under pressure", "Газові резервуари, КГУ під тиском", "MEDIUM"),
  it("ua.fire", "Fire safety and explosion-hazard zoning", "Пожежна безпека та класифікація вибухонебезпечних зон", "Methane in the gas phase", "Метан у газовій фазі", "MEDIUM"),
  it("ua.air", "Air-emission permit for stationary sources (CHP, flare)", "Дозвіл на викиди стаціонарних джерел (КГУ, факел)", "Biogas combustion", "Спалювання біогазу", "LOW"),
  when((c) => c.digestateTonnesYear > 0, it("ua.digestate", "Digestate use as fertiliser: status under the pesticides & agrochemicals law and application rules", "Використання дигестату як добрива: статус у законі про пестициди й агрохімікати та вимоги до внесення", "Digestate goes to fields", "Дигестат потрібно вносити на поля або передавати", "MEDIUM")),
  when((c) => c.exportsElectricity, it("ua.license", "Generator licence/registration and grid-connection agreement", "Ліцензія/реєстрація виробника електроенергії та договір приєднання", "Electricity export", "Є експорт надлишків електрики в мережу", "MEDIUM")),
  when((c) => c.gasGridInjection, it("ua.register", "Biomethane register (SAEE): producer verification and guarantees of origin", "Реєстр біометану (Держенергоефективності): верифікація виробника та гарантії походження", "Biomethane as a product", "Біометан як продукт", "MEDIUM", "CONFIRMED")),
  when((c) => c.gasGridInjection, it("ua.gasgrid", "Connection to the gas distribution / transmission network and metering", "Приєднання до газорозподільної/газотранспортної мережі та облік", "Biomethane injection", "Ін'єкція біометану", "HIGH")),
  when((c) => c.gasGridInjection, it("ua.iscc", "ISCC EU certification for export to the EU", "Сертифікація ISCC EU для експорту до ЄС", "Biomethane export", "Експорт біометану", "MEDIUM", "CONFIRMED")),
];

const GENERIC: Item[] = [
  it("gen.permit", "Construction permit and national environmental approval / EIA screening", "Дозвіл на будівництво та національний екологічний дозвіл / скринінг ОВД", "New installation", "Нове будівництво", "MEDIUM"),
  it("gen.gas", "Gas-safety approval and hazardous-area classification (IECEx or national code)", "Погодження газової безпеки та класифікація вибухонебезпечних зон (IECEx або національні норми)", "Methane in the gas phase", "Метан у газовій фазі", "MEDIUM"),
  it("gen.effluent", "Effluent / digestate discharge or land-application permit", "Дозвіл на скидання стоків / внесення дигестату", "Digestate or treated effluent leaves the site", "Дигестат або очищені стоки виходять за межі площадки", "MEDIUM"),
  when((c) => c.exportsElectricity, it("gen.grid", "Power-purchase / net-metering agreement and grid connection", "Договір купівлі електроенергії / нетто-облік і приєднання до мережі", "Electricity export", "Експорт електрики", "MEDIUM")),
  when((c) => c.gasGridInjection, it("gen.gasgrid", "Gas-grid access or bio-CNG/LNG offtake contract", "Доступ до газової мережі або договір збуту bio-CNG/LNG", "Biomethane sales", "Продаж біометану", "HIGH")),
];

const REGIMES: Record<RegulatoryRegime, Item[]> = { EU, UK, US, CA, UA, GENERIC };

export function regulatoryFor(regime: RegulatoryRegime) {
  return (c: RegulatoryContext): RegulatoryItem[] => [...REGIMES[regime], ...COMMON].map((f) => f(c)).filter((x): x is RegulatoryItem => x !== null);
}

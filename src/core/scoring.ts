import type { CustomerDemand } from "./demand";
import { FEEDSTOCKS } from "./feedstockData";
import type { Tr } from "./i18n";
import type { DigestateAssessment, LogisticsAssessment, ProjectInput, ScenarioResult, Score } from "./types";

/** Piecewise-linear interpolation through (x,y) points; clamped at both ends. */
export function interp(x: number, pts: Array<[number, number]>): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export interface ScoreInputs {
  input: ProjectInput;
  base: ScenarioResult;
  cons: ScenarioResult;
  opt: ScenarioResult;
  demand: CustomerDemand;
  logistics: LogisticsAssessment;
  digestate: DigestateAssessment;
  regulatoryPoints: number;
  methaneLossShare: number;
  methaneLossGood: number;
  minChpKw: number;
  T: Tr;
}

export function computeScores(s: ScoreInputs): { scores: Score[]; overall: { value: number; explanation: string[] } } {
  const { base, cons, input, demand, logistics, digestate, T } = s;
  const feed = base.feed;
  const e = base.energy;
  const r0 = (n: number) => Math.round(n);

  // ---------------- Feedstock fit ----------------
  const scale = interp(base.kwElEquivalent, [[0, 0], [25, 20], [50, 45], [100, 65], [200, 80], [400, 92], [800, 100]]);
  const density = interp(feed.energyDensityKwhPerTonne, [[0, 0], [100, 20], [200, 45], [400, 65], [800, 85], [1500, 100]]);
  const monthsWithFeed = feed.monthlyTonnes.filter((t) => t > 0).length;
  const consistency = (monthsWithFeed / 12) * 100;
  const worstLogistics = Math.max(0, ...logistics.perLine.map((l) => l.transportShareOfEnergyValue));
  const logisticsScore = worstLogistics >= 0.5 ? 20 : worstLogistics >= 0.25 ? 55 : 100;
  let feedPenalty = 0;
  const feedNotes: string[] = [];
  const lowShare = feed.tonnesYear > 0 ? feed.lines.filter((l) => FEEDSTOCKS[l.typeId].confidence === "LOW").reduce((a, l) => a + l.tonnesYear, 0) / feed.tonnesYear : 0;
  if (lowShare > 0.5) { feedPenalty += 8; feedNotes.push(T("Most feedstock has low-confidence parameters", "Більшість сировини має низьку довіру параметрів")); }
  if (feed.inhibitionFactor < 1) { feedPenalty += 10; feedNotes.push(T("Ammonia / fat inhibition risk lowers the yield", "Ризик інгібування аміаком/жирами знижує вихід")); }
  if (feed.lines.some((l) => FEEDSTOCKS[l.typeId].flags.includes("competing_use") && l.opportunityCostEurYear === 0)) {
    feedPenalty += 5;
    feedNotes.push(T("Feedstock has an alternative use; its price is not given", "Сировина має альтернативне використання, ціна не вказана"));
  }
  const feedValue = clamp(0.4 * scale + 0.2 * density + 0.2 * consistency + 0.2 * logisticsScore - feedPenalty);
  const feedExpl = [
    T(`Energy equivalent ≈ ${r0(base.kwElEquivalent)} kWe (scale score ${r0(scale)}/100)`, `Енергетичний еквівалент ≈ ${r0(base.kwElEquivalent)} кВт ел. (оцінка масштабу ${r0(scale)}/100)`),
    T(`Feedstock energy ≈ ${r0(feed.energyDensityKwhPerTonne)} kWh of methane per tonne (score ${r0(density)}/100)`, `Енергія сировини ≈ ${r0(feed.energyDensityKwhPerTonne)} кВт·год метану на тонну (оцінка ${r0(density)}/100)`),
    T(`Feedstock available ${monthsWithFeed} of 12 months`, `Потік наявний ${monthsWithFeed} з 12 місяців`),
    ...(worstLogistics >= 0.25 ? [T(`Logistics take up to ${r0(worstLogistics * 100)} % of the feedstock's energy value`, `Логістика сировини забирає до ${r0(worstLogistics * 100)} % її енергетичної вартості`)] : []),
    ...feedNotes,
  ];

  // ---------------- Energy fit ----------------
  let energyValue: number;
  const energyExpl: string[] = [];
  if (base.route === "biomethane") {
    const km = input.site.gasGridKm;
    const distScore = km === undefined ? 40 : interp(km, [[0, 95], [2, 80], [5, 60], [10, 35], [20, 10]]);
    const scaleScore = interp(e.rawBiogasNm3PerHour, [[0, 5], [60, 15], [150, 45], [400, 80], [800, 100]]);
    energyValue = clamp(0.5 * distScore + 0.5 * scaleScore);
    energyExpl.push(T(`Biomethane: raw biogas ≈ ${r0(e.rawBiogasNm3PerHour)} Nm³/h (EU average plant ≈ 483 m³/h)`, `Біометан: сирого біогазу ≈ ${r0(e.rawBiogasNm3PerHour)} Нм³/год (орієнтир EU: середній завод ≈ 483 м³/год)`));
    energyExpl.push(km === undefined ? T("Distance to the gas grid not given", "Відстань до газової мережі не вказана") : T(`≈ ${km} km to the gas grid`, `До газової мережі ≈ ${km} км`));
  } else {
    const avail = e.elNetKwh + e.heatNetAvailableKwh;
    const used = e.elSelfConsumedKwh + 0.6 * e.elExportedKwh + e.heatUsefulKwh;
    energyValue = avail > 0 ? clamp((used / avail) * 100) : 0;
    const elShareSelf = e.elNetKwh > 0 ? e.elSelfConsumedKwh / e.elNetKwh : 0;
    energyExpl.push(T(`Own consumption absorbs ${r0(elShareSelf * 100)} % of the electricity produced`, `Власне споживання електрики покриває ${r0(elShareSelf * 100)} % виробленої`));
    energyExpl.push(T(`Useful heat ${r0(e.heatUsefulKwh / 1000)} MWh of ${r0(e.heatNetAvailableKwh / 1000)} MWh available after digester needs`, `Корисне тепло ${r0(e.heatUsefulKwh / 1000)} МВт·год із ${r0(e.heatNetAvailableKwh / 1000)} МВт·год доступних після потреб реактора`));
    if (!demand.electricityKnown) { energyValue = Math.max(0, energyValue - 10); energyExpl.push(T("Electricity consumption not given", "Споживання електрики не вказано")); }
    if (demand.heatWanted && !demand.heatKnown) { energyValue = Math.max(0, energyValue - 10); energyExpl.push(T("Heat consumption not given", "Обсяг теплоспоживання не вказано")); }
    if (!input.energy.hasGridConnection) energyExpl.push(T("No grid connection: surplus cannot be sold", "Немає мережевого підключення: надлишки не продаються"));
  }

  // ---------------- Location fit ----------------
  let loc = 100;
  const locExpl: string[] = [];
  if (input.site.neighboursWithin300m) { loc -= 25; locExpl.push(T("Neighbours within 300 m: odour, traffic, safety distances", "Сусіди ближче 300 м: запах, транспорт, відстані безпеки")); }
  if (input.site.nearProtectedOrWaterArea) { loc -= 30; locExpl.push(T("Water bodies or protected areas nearby", "Поряд водойми або природоохоронні території")); }
  if (digestate.adequacy === "SHORT") { loc -= 25; locExpl.push(T("Not enough land for the digestate", "Недостатньо землі для дигестату")); }
  else if (digestate.adequacy === "UNKNOWN") { loc -= 10; locExpl.push(T("Land for digestate unknown", "Площа полів для дигестату невідома")); }
  if (logistics.perLine.some((l) => l.distanceKm > 30)) { loc -= 20; locExpl.push(T("Some feedstock comes from more than 30 km", "Є сировина з відстані понад 30 км")); }
  if (!input.energy.hasGridConnection) { loc -= 10; locExpl.push(T("No electricity grid connection", "Немає підключення до електромережі")); }
  if (base.route === "biomethane" && (input.site.gasGridKm ?? 99) > 10) { loc -= 25; locExpl.push(T("Gas grid more than 10 km away", "Газова мережа далі 10 км")); }
  if (locExpl.length === 0) locExpl.push(T("No critical site constraints found from your answers", "Критичних обмежень площадки за наданими відповідями не виявлено"));
  const locValue = clamp(loc);

  // ---------------- Technical feasibility ----------------
  let tech = 100;
  const techExpl: string[] = [];
  if (base.kwElEquivalent < s.minChpKw) { tech -= 45; techExpl.push(T(`Energy equivalent below ${s.minChpKw} kWe: hardly sensible technically`, `Енергетичний еквівалент < ${s.minChpKw} кВт ел.: технічно сенсу майже немає`)); }
  else if (base.kwElEquivalent < 50) { tech -= 25; techExpl.push(T("Micro scale (< 50 kWe): high specific cost and complexity", "Мікромасштаб (< 50 кВт ел.): висока питома вартість і складність")); }
  if (feed.inhibitionFactor < 1) { tech -= 15; techExpl.push(T("Ammonia / fat inhibition needs active process control", "Аміачне інгібування / жири потребують керування процесом")); }
  if (feed.abpTonnesYear > 0) { tech -= 10; techExpl.push(T("ABP pasteurisation adds complexity", "Пастеризація ABP ускладнює схему")); }
  if (monthsWithFeed < 9) { tech -= 15; techExpl.push(T("Seasonal feedstock: equipment under-used", "Сезонна сировина: обладнання недовантажене")); }
  if (e.heatExternalPurchasedKwh > 0) { tech -= 15; techExpl.push(T("Own biogas does not cover digester heating in winter", "Власного біогазу не вистачає для обігріву реактора взимку")); }
  if (base.design.tech.digestion === "high_solids") { tech -= 5; techExpl.push(T("Dry digestion — fewer suppliers", "Суха ферментація — вужче коло постачальників")); }
  if (techExpl.length === 0) techExpl.push(T("Standard layout for this scale, no critical obstacles", "Типова схема для цього масштабу, критичних перешкод немає"));
  const techValue = clamp(tech);

  // ---------------- Economics ----------------
  const pb = base.fin.simplePaybackYears;
  let eco = pb === null ? 5 : interp(pb, [[0, 100], [3, 100], [5, 88], [7, 72], [9, 58], [11, 45], [13, 32], [15, 20], [20, 10]]);
  const ecoExpl: string[] = [];
  if (base.fin.npvEur < 0) { eco = Math.min(eco, 35); ecoExpl.push(T("Base-case NPV is negative", "NPV базового сценарію від'ємний")); }
  if (cons.fin.npvEur >= 0) { eco = Math.min(100, eco + 5); ecoExpl.push(T("NPV positive even in the conservative case", "NPV додатний навіть у консервативному сценарії")); }
  if (base.fin.dscrMin !== null && base.fin.dscrMin < 1.2) { eco = Math.max(0, eco - 10); ecoExpl.push(T(`Minimum DSCR ${base.fin.dscrMin.toFixed(2)} — below the usual bank threshold of 1.2–1.3`, `DSCR мін. ${base.fin.dscrMin.toFixed(2)} — нижче банківського порога 1,2–1,3`)); }
  ecoExpl.unshift(pb === null ? T("Operating margin ≤ 0 — no payback", "Операційний прибуток ≤ 0 — окупності немає") : T(`Base-case simple payback ≈ ${pb.toFixed(1)} years`, `Проста окупність базового сценарію ≈ ${pb.toFixed(1)} р.`));
  const ecoValue = clamp(eco);

  // ---------------- Risks ----------------
  const regRisk = clamp((s.regulatoryPoints - 5) * 4.5);
  const regExpl = [T(`Number and weight of permitting / regulatory steps: ${s.regulatoryPoints} points (more = harder)`, `Кількість і складність дозвільних та регуляторних кроків: ${s.regulatoryPoints} балів (чим більше — тим складніше)`)];
  let env = 20;
  const envExpl: string[] = [];
  const lossPct = (s.methaneLossShare * 100).toFixed(1);
  if (s.methaneLossShare > s.methaneLossGood) {
    env += Math.min(40, (s.methaneLossShare - s.methaneLossGood) * 800);
    envExpl.push(T(`Expected methane loss ${lossPct} % (good practice ≤ ${(s.methaneLossGood * 100).toFixed(0)} %)`, `Очікувані втрати метану ${lossPct} % (добра практика ≤ ${(s.methaneLossGood * 100).toFixed(0)} %)`));
  } else envExpl.push(T(`Expected methane loss ${lossPct} % — within good practice if gas-tight and monitored`, `Очікувані втрати метану ${lossPct} % — у межах доброї практики за умови гермітичності та моніторингу`));
  if (input.site.neighboursWithin300m) { env += 20; envExpl.push(T("Neighbours within 300 m: odour and incident exposure", "Сусіди ближче 300 м: запах і ризик інциденту")); }
  if (input.site.nearProtectedOrWaterArea) { env += 20; envExpl.push(T("Water bodies / protected areas nearby", "Водойми / природоохоронні території поруч")); }
  if (digestate.adequacy === "SHORT") { env += 15; envExpl.push(T("Surplus digestate: risk of nitrogen over-application", "Надлишок дигестату: ризик перевнесення N на поля")); }
  else if (digestate.adequacy === "UNKNOWN") { env += 5; envExpl.push(T("Unknown where the digestate will go", "Невідомо, куди вноситиметься дигестат")); }
  const envRisk = clamp(env);

  const scores: Score[] = [
    { id: "feedstock", label: T("Feedstock fit", "Придатність сировини"), value: r0(feedValue), isRisk: false, explanation: feedExpl },
    { id: "energy", label: T("Energy fit", "Відповідність енергопотребам"), value: r0(energyValue), isRisk: false, explanation: energyExpl },
    { id: "location", label: T("Location & logistics", "Локація та логістика"), value: r0(locValue), isRisk: false, explanation: locExpl },
    { id: "technical", label: T("Technical feasibility", "Технічна здійсненність"), value: r0(techValue), isRisk: false, explanation: techExpl },
    { id: "economics", label: T("Economics", "Економіка"), value: r0(ecoValue), isRisk: false, explanation: ecoExpl },
    { id: "regulatory", label: T("Regulatory complexity", "Регуляторна складність"), value: r0(regRisk), isRisk: true, explanation: regExpl },
    { id: "environmental", label: T("Environmental risk", "Екологічний ризик"), value: r0(envRisk), isRisk: true, explanation: envExpl },
  ];

  const w = { economics: 0.3, feedstock: 0.2, energy: 0.15, technical: 0.1, location: 0.1, regulatory: 0.075, environmental: 0.075 };
  let overall =
    w.economics * ecoValue + w.feedstock * feedValue + w.energy * energyValue + w.technical * techValue + w.location * locValue +
    w.regulatory * (100 - regRisk) + w.environmental * (100 - envRisk);
  const overallExpl: string[] = [T("Weighted: economics 30 %, feedstock 20 %, energy 15 %, technical 10 %, location 10 %, regulatory 7.5 %, environment 7.5 %.", "Зважена сума: економіка 30 %, сировина 20 %, енергія 15 %, техніка 10 %, локація 10 %, регуляторика 7,5 %, довкілля 7,5 %.")];
  if (ecoValue < 30) { if (overall > 40) overallExpl.push(T("Capped at 40: weak economics is not offset by other factors.", "Підсумок обмежено 40: слабка економіка не компенсується іншими факторами.")); overall = Math.min(overall, 40); }
  if (techValue < 30) { if (overall > 45) overallExpl.push(T("Capped at 45: technical feasibility in doubt.", "Підсумок обмежено 45: технічна здійсненність під питанням.")); overall = Math.min(overall, 45); }
  const sorted = [...scores].map((sc) => ({ sc, good: sc.isRisk ? 100 - sc.value : sc.value })).sort((a, b) => b.good - a.good);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  overallExpl.push(T(`Strongest: ${top.sc.label} (${r0(top.good)}); weakest: ${bottom.sc.label} (${r0(bottom.good)}).`, `Найсильніше: ${top.sc.label} (${r0(top.good)}); найслабше: ${bottom.sc.label} (${r0(bottom.good)}).`));
  return { scores, overall: { value: r0(overall), explanation: overallExpl } };
}

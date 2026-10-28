import { DAYS_IN_MONTH, HOURS_IN_MONTH, meanTemp, substrateTempC } from "./climate";
import type { RunContext } from "./context";
import { FEEDSTOCKS } from "./feedstockData";
import { digestateTonnes } from "./massBalance";
import type { DigesterDesign, FeedstockSummary, TechnologyRecommendation } from "./types";

/**
 * Digester sizing, heat demand and technology choice.
 * Volume is limited by BOTH retention time and organic loading rate — the larger wins.
 *
 * Country-dependent approach: in warm climates (annual mean ≥ 20 °C) unheated covered lagoons are
 * the industry standard for dilute effluents (POME, vinasse, pig slurry in SE Asia / Latin America);
 * in temperate climates heated tanks are needed and dilute industrial effluents go to high-rate
 * (UASB/EGSB-type) reactors.
 */
type Kind = TechnologyRecommendation["digestion"];

export function chooseDigestion(feed: FeedstockSummary, ctx: RunContext): Kind {
  const p = ctx.params;
  const dm = feed.dryMatterPct;
  const warm = meanTemp(ctx.region.monthlyTempC) >= 20;
  // An analysed solids stream has no demonstrated soluble COD / granular sludge basis.
  if (!ctx.input.process && warm && dm < 8) return "covered_lagoon";
  // Dilution alone is not evidence of soluble COD or suitability for a high-rate reactor.
  // UASB/EGSB sizing is available through the explicit COD process model.
  if (dm >= p.get("eng.dry_digestion_dm_pct")) return "high_solids";
  if (dm >= p.get("eng.wet_solids_feeding_dm_pct")) return "wet_with_solids_feeding";
  return "wet";
}

export function recommendTechnology(feed: FeedstockSummary, ctx: RunContext, hrt: number, digestion: Kind): TechnologyRecommendation {
  const T = ctx.t;
  const p = ctx.params;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const alternatives: string[] = [];
  const dm = feed.dryMatterPct;
  const dryThr = p.get("eng.dry_digestion_dm_pct");
  const solidsThr = p.get("eng.wet_solids_feeding_dm_pct");
  const tMean = meanTemp(ctx.region.monthlyTempC);
  const anySeasonal = feed.monthlyTonnes.some((t) => t === 0) && feed.tonnesYear > 0;

  let mode: TechnologyRecommendation["mode"] = "continuous";
  let reactor: string;
  let primary: string;

  switch (digestion) {
    case "covered_lagoon":
      primary = T("Covered anaerobic lagoon (unheated, ambient temperature)", "Накрита анаеробна лагуна (без підігріву)");
      reactor = T("Lined lagoon with HDPE gas-tight cover, sludge removal and gas collection", "Лагуна з геомембраною та газонепроникним накриттям HDPE, видалення осаду, збір газу");
      reasons.push(T(`Warm climate (annual mean ≈ ${tMean.toFixed(0)} °C) and a liquid feed (${dm.toFixed(1)} % DM): an unheated covered lagoon is the lowest-cost proven option.`, `Теплий клімат (середня ≈ ${tMean.toFixed(0)} °C) і рідка сировина (${dm.toFixed(1)} % DM): ненагріта накрита лагуна — найдешевше перевірене рішення.`));
      alternatives.push(T("Heated CSTR or UASB for higher, steadier gas yield per m³", "Нагрітий CSTR або UASB — вищий і стабільніший вихід на м³"));
      break;
    case "high_rate":
      primary = T("High-rate anaerobic reactor (UASB / EGSB / anaerobic filter)", "Високонавантажений анаеробний реактор (UASB / EGSB / анаеробний фільтр)");
      reactor = T("Granular-sludge reactor with pre-acidification and equalisation tank", "Реактор з гранульованим мулом, преацидифікація та буферна ємність");
      reasons.push(T(`Very dilute stream (${dm.toFixed(1)} % DM): a CSTR would be oversized; high-rate reactors retain the biomass and need a fraction of the volume.`, `Дуже розбавлений потік (${dm.toFixed(1)} % DM): CSTR вийшов би завеликим; високонавантажені реактори утримують біомасу і потребують у рази меншого об'єму.`));
      alternatives.push(T("Covered lagoon if land is available and the climate is warm", "Накрита лагуна, якщо є площа і теплий клімат"));
      break;
    case "high_solids":
      primary = T("Dry (high-solids) digestion, mesophilic", "Суха (high-solids) ферментація, мезофільна");
      reactor = T("Garage (box) batch digesters with percolate recirculation, or horizontal plug-flow", "Гаражні (box) реактори періодичної дії з рециркуляцією перколяту або горизонтальний plug-flow");
      mode = "batch";
      reasons.push(T(`Average mix dry matter ${dm.toFixed(0)} % ≥ ${dryThr} %: wet digestion would need dilution, increasing volume and heat losses.`, `Середня сухість суміші ${dm.toFixed(0)} % ≥ ${dryThr} % — мокра ферментація потребувала б розведення, збільшуючи об'єм і тепловтрати.`));
      alternatives.push(T("Wet digestion diluted with slurry/effluent — cheaper equipment, larger digester", "Мокра ферментація з розведенням гноївкою/стоками — дешевше обладнання, але більший ферментер"));
      break;
    case "wet_with_solids_feeding":
      primary = T("Wet mesophilic digestion with solids feeding", "Мокра мезофільна ферментація з подачею твердих");
      reactor = T("CSTR with a solids feeder and recirculation, or horizontal plug-flow for dairy manure", "CSTR з подачею твердих (feeder) і рециркуляцією, або горизонтальний plug-flow для гною ВРХ");
      reasons.push(T(`Dry matter ${dm.toFixed(0)} % is above the pumpable limit without a solids feeder (${solidsThr} %).`, `Сухість ${dm.toFixed(0)} % — вище порога перемішування без подачі твердих (${solidsThr} %).`));
      alternatives.push(T("Horizontal plug-flow (good for 10–14 % DM cattle manure)", "Горизонтальний plug-flow (добре для гною ВРХ 10–14 % DM)"));
      break;
    default:
      primary = T("Wet mesophilic digestion (CSTR)", "Мокра мезофільна ферментація (CSTR)");
      reactor = T("Vertical CSTR with mechanical mixing and a membrane gas holder", "Вертикальний CSTR з механічним змішуванням і мембранним газгольдером");
      reasons.push(T(`Dry matter ${dm.toFixed(1)} %: a liquid mix suited to wet mesophilic digestion.`, `Сухість ${dm.toFixed(1)} % — рідка суміш, придатна для мокрої мезофільної ферментації.`));
      if (feed.manureShareVs > 0.7) alternatives.push(T("Horizontal plug-flow as a simpler option for small cattle-manure plants", "Горизонтальний plug-flow як простіша альтернатива для невеликого гною ВРХ"));
  }

  if (digestion !== "high_solids") {
    if (anySeasonal && feed.manureShareVs < 0.5) {
      mode = "batch";
      reasons.push(T("Feedstock is seasonal: a continuous plant would sit idle; a campaign-based or buffered design is more flexible.", "Сировина сезонна: безперервний режим простоюватиме, кампанійна або буферизована схема гнучкіша."));
    } else {
      reasons.push(T("Continuous feed — continuous operation gives steady gas and the simplest control.", "Потік сировини безперервний — безперервний режим дає стабільний біогаз і найпростіше керування."));
    }
  }

  const temperature: TechnologyRecommendation["temperature"] = "mesophilic";
  if (digestion !== "covered_lagoon") {
    reasons.push(T("Mesophilic (≈38 °C): more robust, less heat and complexity. Thermophilic (≈52 °C) only when the benefit outweighs the complexity — rarely at this scale.", "Мезофільний режим (≈38 °C): стійкіший, менші витрати тепла й складність. Термофільний (≈52 °C) лише якщо вигода перевищує складність — для малих проєктів зазвичай ні."));
  }
  if (feed.abpTonnesYear > 0) alternatives.push(T("Separate pasteurisation (70 °C / 1 h) ahead of a mesophilic digester instead of thermophilic operation", "Окрема пастеризація 70 °C/1 год перед мезофільним реактором замість термофільного режиму"));

  const bigFlow = feed.biogasM3Year / 8000 > 120;
  const stages: TechnologyRecommendation["stages"] = feed.tonnesYear > 0 && (feed.fatShareVs > 0.1 || bigFlow) && digestion !== "covered_lagoon" ? "two_stage" : "single";
  reasons.push(
    stages === "single"
      ? T("Single stage plus a gas-tight digestate store as post-digester: sufficient at this scale.", "Одна ступінь + газонепроникне сховище дигестату як дозрівання: достатньо для цього масштабу.")
      : T("Two-stage layout (main + post-digester) for stability with fats or larger flows.", "Двоступенева схема (основний + дозрівальний реактор) — для стабільності при жирах/більших потоках."),
  );

  if (feed.poultryShareVs > 0.35) warnings.push(T("Poultry manure: limit its share, dilute, or use ammonia stripping — otherwise the process is inhibited.", "Птахівничий послід: обмежте частку, розводьте, або застосуйте відгонку аміаку — інакше процес гальмується."));
  if (feed.fatShareVs > 0.25) warnings.push(T("Fat fraction above 25 % of organic matter — high risk of process failure.", "Жирова фракція > 25 % органічної речовини — високий ризик збою процесу."));
  if (feed.lines.some((l) => l.typeId === "crop_straw")) warnings.push(T("Straw needs pretreatment; without it the yields are unrealistic.", "Солома потребує попередньої обробки; без неї виходи нереалістичні."));
  warnings.push(T("Energy crops (maize silage) are not modelled: priority is wastes and residues.", "Енергетичні культури (силос кукурудзи) не включені: пріоритет — відходи та залишки."));

  return { primary, digestion, temperature, stages, mode, reactor, hrtDays: hrt, reasons, warnings, alternatives };
}

export function designDigester(feed: FeedstockSummary, ctx: RunContext): DigesterDesign {
  const p = ctx.params;
  const tempDig = p.get("eng.digester_temp_c");
  const cp = p.get("eng.cp_substrate_kj_kgk");
  const uWall = p.get("eng.digester_u_value_w_m2k");
  const uFloor = p.get("eng.digester_floor_u_value_w_m2k");
  const hOverD = p.get("eng.digester_h_over_d");
  const headspace = p.get("eng.headspace_factor");
  const olrStd = p.get("eng.olr_max_kgvs_m3d");
  const olrHard = p.get("eng.olr_max_poultry_kgvs_m3d");
  const storageMonths = p.get("eng.storage_months");
  const heatRecovery = p.get("eng.pasteurisation_heat_recovery");
  const pasteurTemp = p.get("eng.pasteurisation_temp_c");

  const digestion = chooseDigestion(feed, ctx);
  const manure = feed.manureShareVs;
  const processingShare = 1 - manure;
  let hrt = manure > 0.7 ? p.get("eng.hrt_manure_days") : processingShare > 0.5 ? p.get("eng.hrt_waste_days") : p.get("eng.hrt_mixed_days");
  let olr = feed.poultryShareVs > 0.35 || feed.fatShareVs > 0.25 ? olrHard : olrStd;
  if (digestion === "high_rate") {
    hrt = p.get("eng.hrt_high_rate_days");
    olr = p.get("eng.olr_high_rate_kgvs_m3d");
  } else if (digestion === "covered_lagoon") {
    hrt = p.get("eng.hrt_lagoon_days");
    olr = p.get("eng.olr_lagoon_kgvs_m3d");
  }

  let qMax = 0;
  let vsMax = 0;
  for (let i = 0; i < 12; i++) {
    qMax = Math.max(qMax, feed.monthlyTonnes[i] / DAYS_IN_MONTH[i]);
    vsMax = Math.max(vsMax, feed.monthlyVsTonnes[i] / DAYS_IN_MONTH[i]);
  }
  if (ctx.input.process?.kind === "residue") {
    qMax = feed.tonnesYear / ctx.input.process.operatingDays * 1000 / ctx.input.process.densityKgM3;
    vsMax = feed.vsTonnesYear / ctx.input.process.operatingDays;
  }
  const byHrt = qMax * hrt; // t/d × d = t ≈ m³ (density ≈ 1)
  const byOlr = (vsMax * 1000) / olr;
  const working = Math.max(byHrt, byOlr);
  const total = working * headspace;

  // Geometry of a single cylinder: V = π/4·D²·H, H = r·D
  const D = Math.cbrt(total / ((Math.PI / 4) * hOverD));
  const H = hOverD * D;
  const wallRoof = Math.PI * D * H + (Math.PI * D * D) / 4;
  const floor = (Math.PI * D * D) / 4;
  const surface = wallRoof + floor;

  const heat: number[] = [];
  let pasteurisationHeat = 0;
  for (let i = 0; i < 12; i++) {
    const tAmb = ctx.region.monthlyTempC[i];
    const mass = feed.monthlyTonnes[i] * 1000; // kg
    if (mass <= 0 || digestion === "covered_lagoon") {
      heat.push(0);
      continue;
    }
    const dT = Math.max(0, tempDig - substrateTempC(tAmb));
    const eSub = (mass * cp * dT) / 3600; // kJ → kWh
    const abpMass = feed.lines.filter((l) => FEEDSTOCKS[l.typeId].abp !== "none")
      .reduce((acc, l) => acc + l.monthlyTonnes[i] * 1000, 0);
    const inletC = substrateTempC(tAmb);
    const pasteurDelta = Math.max(0, pasteurTemp - inletC);
    const recoverableDelta = Math.max(0, pasteurTemp - tempDig);
    const recoveredDelta = Math.min(pasteurDelta * heatRecovery, recoverableDelta);
    const extraPasteurisation = abpMass * cp * Math.max(0, pasteurDelta - recoveredDelta - dT) / 3600;
    pasteurisationHeat += extraPasteurisation;
    const lossW = uWall * wallRoof * (tempDig - tAmb) + uFloor * floor * Math.max(0, tempDig - (tAmb + 6));
    const eLoss = (Math.max(0, lossW) * HOURS_IN_MONTH[i]) / 1000;
    heat.push(eSub + eLoss + extraPasteurisation);
  }

  const digestateT = digestateTonnes(feed, p);
  // Dilute industrial effluent is typically treated & discharged/irrigated, not stored 6 months.
  const months = digestion === "high_rate" || digestion === "covered_lagoon" ? Math.min(storageMonths, 1) : storageMonths;
  const storageRequired = (digestateT * months) / 12; // m³ (density ≈ 1)
  const existing = Math.max(0, ctx.input.site.existingStorageM3 ?? 0);
  const covered = Math.min(existing, storageRequired);
  const newStorage = storageRequired - covered;

  const tech = recommendTechnology(feed, ctx, hrt, digestion);

  return {
    workingVolumeM3: working,
    totalVolumeM3: total,
    hrtDays: qMax > 0 ? working / qMax : hrt,
    olrKgVsM3Day: working > 0 ? (vsMax * 1000) / working : 0,
    monthlyHeatDemandKwh: heat,
    heatDemandKwhYear: heat.reduce((a, b) => a + b, 0),
    pasteurisationHeatKwhYear: pasteurisationHeat,
    storageVolumeM3: storageRequired,
    storageCovered: covered,
    storageNew: newStorage,
    surfaceAreaM2: surface,
    tech,
  };
}

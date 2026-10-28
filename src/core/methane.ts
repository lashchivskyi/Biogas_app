import type { Tr } from "./i18n";
import type { Params } from "./params";
import type { Assessment, ScenarioResult } from "./types";

/**
 * Climate check: a plant whose methane loss cancels the displaced fossil emissions is a climate
 * benefit only on paper. We always show the loss and the ratio, never only the benefit.
 */
export function methaneCheck(
  base: ScenarioResult,
  cons: ScenarioResult,
  opt: ScenarioResult,
  p: Params,
  T: Tr,
): Assessment["methane"] {
  const gwp = p.get("eng.gwp_ch4");
  const rho = p.get("eng.ch4_density_kg_m3");
  const lhv = p.get("eng.ch4_lhv_kwh_m3");
  const purity = base.energy.biomethaneCh4Share ?? p.get("eng.biomethane_ch4_purity");
  const efGrid = p.get("econ.grid_ef_t_mwh");
  const efGas = p.get("eng.gas_emission_factor_t_mwh");
  const good = p.get("eng.methane_loss_good");
  const high = p.get("eng.methane_loss_high");

  const e = base.energy;
  const lostM3 = e.ch4ProducedM3 * e.methaneLossShare;
  const co2e = (lostM3 * rho * gwp) / 1000;
  const displaced =
    ((e.elSelfConsumedKwh + e.elExportedKwh) / 1000) * efGrid +
    (e.heatUsefulKwh / 1000) * efGas +
    ((e.biomethaneNm3 * lhv * purity) / 1000) * efGas;
  const ratio = displaced > 0 ? co2e / displaced : co2e > 0 ? Infinity : 0;

  const advice = [
    T("Gas-tight covers on the digester and digestate storage (incl. lagoon covers) — the single most important measure.", "Газонепроникні покриття реактора та сховища дигестату (накриття лагуни) — головний захід."),
    T("Leak detection and repair (LDAR): optical gas imaging or tracer method at least yearly, plus an acceptance test after construction.", "Програма пошуку витоків (LDAR): ОГІ-камера або трасерний метод — раз на рік мінімум, плюс акт приймання після монтажу."),
    T("Continuous gas-holder pressure monitoring; a standby flare instead of venting.", "Постійний моніторинг тиску газгольдера, зарезервований факел замість випуску в атмосферу."),
    T("CHP with an oxidation catalyst and tuning regime to cut methane slip.", "КГУ з окислювальним каталізатором та регламентом налаштувань для зменшення проскоку метану."),
  ];
  const lp = (e.methaneLossShare * 100).toFixed(1);
  const gp = (good * 100).toFixed(0);
  if (e.methaneLossShare > good) advice.unshift(T(`Expected loss ${lp} % is above good practice (${gp} %): budget for monitoring.`, `Очікувані втрати ${lp} % вищі за добру практику (${gp} %): закладіть бюджет на моніторинг.`));
  if (e.methaneLossShare > high || ratio > 0.5) advice.unshift(T("Methane losses could cancel the climate benefit. Do not claim emission reductions without measurements.", "Втрати метану можуть знівелювати кліматичну вигоду. Не декларуйте зменшення викидів без вимірювань."));

  return {
    lossShare: e.methaneLossShare,
    lossShareRange: [opt.energy.methaneLossShare, cons.energy.methaneLossShare],
    co2eTonnesYear: co2e,
    displacedCo2eTonnesYear: displaced,
    ratio,
    advice,
  };
}

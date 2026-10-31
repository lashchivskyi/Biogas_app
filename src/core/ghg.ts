import type { Params } from "./params";
import { prov } from "./params";
import { FEEDSTOCKS } from "./feedstockData";
import type { Provenance, ScenarioResult } from "./types";

/**
 * Climate case: greenhouse-gas intensity of the product with the EU Renewable Energy Directive default values
 * (Directive (EU) 2018/2001, Annex VI). Shown as a separate case; it never changes the base verdict.
 * Outside the EU it is an indicative benchmark; US LCFS/RFS credits use CA-GREET and are shown as support cases.
 */
const RED = "Directive (EU) 2018/2001 (RED II), Annex VI part D default values as adopted (legislation.gov.uk/eudr/2018/2001/annex/VI); not changed by Directive (EU) 2023/2413, revision of Annexes V–VI pending";
const RED_B = "Directive (EU) 2018/2001, Annex VI part B";
const RED_DATE = "2018-12-21";
export type Substrate = "manure" | "maize" | "biowaste";
const SUBSTRATES: Substrate[] = ["manure", "maize", "biowaste"];
const gmj = (id: string, label: string, value: number, source = RED) => prov(id, label, value, "gCO₂e/MJ", "FACT", source, "HIGH", { date: RED_DATE });

/** Biomethane: open/closed digestate × off-gas combusted or not. Electricity: case 1 (CHP supplies the plant). Heat: case 3 (biogas boiler). */
const BIOMETHANE: Record<Substrate, [number, number, number, number]> = { manure: [22, 1, -79, -100], maize: [73, 52, 51, 30], biowaste: [71, 50, 35, 14] };
const ELECTRICITY: Record<Substrate, [number, number]> = { manure: [3, -84], maize: [47, 28], biowaste: [44, 13] };
const HEAT: Record<Substrate, [number, number]> = { manure: [9, -89], maize: [59, 38], biowaste: [57, 22] };
const ENERGY_YIELD: Record<Substrate, [number, number]> = { manure: [0.5, 0.9], maize: [4.16, 0.65], biowaste: [3.41, 0.76] };

export const GHG_PARAMS: Provenance[] = [
  ...SUBSTRATES.flatMap((s) => [
    gmj(`eng.ghg.bm.${s}.open`, `RED default, biomethane from ${s}, open digestate, off-gas not combusted`, BIOMETHANE[s][0]),
    gmj(`eng.ghg.bm.${s}.open_offgas`, `RED default, biomethane from ${s}, open digestate, off-gas combusted`, BIOMETHANE[s][1]),
    gmj(`eng.ghg.bm.${s}.closed`, `RED default, biomethane from ${s}, closed digestate, off-gas not combusted`, BIOMETHANE[s][2]),
    gmj(`eng.ghg.bm.${s}.closed_offgas`, `RED default, biomethane from ${s}, closed digestate, off-gas combusted`, BIOMETHANE[s][3]),
    gmj(`eng.ghg.el.${s}.open`, `RED default, biogas for electricity from ${s} (case 1), open digestate`, ELECTRICITY[s][0]),
    gmj(`eng.ghg.el.${s}.closed`, `RED default, biogas for electricity from ${s} (case 1), closed digestate`, ELECTRICITY[s][1]),
    gmj(`eng.ghg.heat.${s}.open`, `RED default, biogas in a boiler from ${s} (case 3), open digestate`, HEAT[s][0]),
    gmj(`eng.ghg.heat.${s}.closed`, `RED default, biogas in a boiler from ${s} (case 3), closed digestate`, HEAT[s][1]),
    prov(`eng.ghg.yield.${s}`, `RED energy yield P(${s}) for co-digestion weighting`, ENERGY_YIELD[s][0], "MJ biogas/kg FM", "FACT", RED_B, "HIGH", { date: RED_DATE }),
    prov(`eng.ghg.moisture.${s}`, `RED standard moisture SM(${s})`, ENERGY_YIELD[s][1], "kg water/kg FM", "FACT", RED_B, "HIGH", { date: RED_DATE }),
  ]),
  gmj("eng.ghg.cbm_transport_add", "RED default addition for compressed biomethane as transport fuel", 4.6),
  gmj("eng.ghg.comparator_el", "RED fossil comparator, electricity (per MJ electricity)", 183, RED_B + ", point 19"),
  prov("eng.ghg.carnot_heat_150c", "RED Carnot share for useful heat below 150 °C (CHP allocation)", 0.3546, "—", "FACT", RED_B + ", point 1(d)", "HIGH", { date: RED_DATE }),
  gmj("eng.ghg.comparator_heat", "RED fossil comparator, useful heat (per MJ heat)", 80, RED_B + ", point 19"),
  gmj("eng.ghg.comparator_transport", "RED fossil comparator, transport fuel", 94, RED_B + ", point 19"),
  prov("eng.ghg.min_saving_el_heat", "RED minimum saving, electricity/heat from installations starting 2026 or later", 0.8, "—", "FACT", "Directive (EU) 2018/2001, Art. 29(10)(d)", "HIGH", { date: RED_DATE }),
  prov("eng.ghg.min_saving_transport", "RED minimum saving, transport biogas from installations starting 2021 or later", 0.65, "—", "FACT", "Directive (EU) 2018/2001, Art. 29(10)(c)", "HIGH", { date: RED_DATE }),
  prov("eng.ghg.min_input_mw", "RED sustainability criteria apply to gaseous biomass fuel installations from this total rated thermal input", 2, "MW", "FACT", "Directive (EU) 2018/2001, Art. 29(1)", "HIGH", { date: RED_DATE }),
];

/** Our catalogue mapped to the three RED pathways; residues other than manure and energy crops use the biowaste values. */
function redSubstrate(typeId: keyof typeof FEEDSTOCKS): { substrate: Substrate; approximated: boolean } {
  const t = FEEDSTOCKS[typeId];
  if (t.category === "manure") return { substrate: "manure", approximated: typeId !== "dairy_slurry" && typeId !== "pig_slurry" };
  if (typeId === "maize_silage") return { substrate: "maize", approximated: false };
  return { substrate: "biowaste", approximated: typeId !== "food_waste" && typeId !== "municipal_biowaste" };
}

export interface GhgCase {
  product: "electricity" | "heat" | "biomethane";
  /** Energy shares by RED pathway after the Annex VI co-digestion weighting (fresh mass × moisture × energy yield). */
  shares: { substrate: Substrate; share: number }[];
  approximated: boolean;
  digestate: "open" | "closed";
  offGasCombusted: boolean;
  /** g CO₂e per MJ of biogas / biomethane (RED default, co-digestion weighted). */
  feedGMJ: number;
  /** g CO₂e per MJ of the final product (electricity, heat or biomethane). */
  productGMJ: number;
  comparatorGMJ: number;
  saving: number;
  minSaving: number;
  meetsMinimum: boolean;
  ratedInputMw: number;
  criteriaApply: boolean;
  /** Avoided emissions against the fossil comparators (CHP: electricity and useful heat), t CO₂e per year (base case). */
  avoidedTco2eYear: number;
}

/** Energy shares of a co-digested mix by RED pathway: S ∝ P × W, W = I × (1 − AM) / (1 − SM) (Annex VI part B). */
export function redShares(lines: { substrate: Substrate; tonnes: number; dryMatterPct: number }[], p: Params): { substrate: Substrate; share: number }[] {
  const weight = new Map<Substrate, number>();
  for (const l of lines) weight.set(l.substrate, (weight.get(l.substrate) ?? 0) + l.tonnes * (l.dryMatterPct / 100) / (1 - p.get(`eng.ghg.moisture.${l.substrate}`)) * p.get(`eng.ghg.yield.${l.substrate}`));
  const total = [...weight.values()].reduce((a, b) => a + b, 0);
  return total > 0 ? [...weight].map(([substrate, w]) => ({ substrate, share: w / total })) : [];
}

export function ghgCase(r: ScenarioResult, p: Params): GhgCase | null {
  const lines = r.feed.lines.filter((l) => l.tonnesYear > 0);
  if (!lines.length || r.process) return null;
  const mapped = lines.map((l) => ({ ...redSubstrate(l.typeId), tonnes: l.tonnesYear, dryMatterPct: l.dryMatterPct }));
  const approximated = mapped.some((l) => l.approximated);
  const shares = redShares(mapped, p);
  if (!shares.length) return null;
  const digestate = r.design.storageOpenNew > 0 ? "open" : "closed";
  const e = r.energy;
  const offGasCombusted = r.route === "biomethane" && e.upgradingSlipM3 <= 0;
  const option = r.route === "biomethane" ? `${digestate}${offGasCombusted ? "_offgas" : ""}` : digestate;
  const kind = r.route === "biomethane" ? "bm" : r.route === "chp" ? "el" : "heat";
  const feedGMJ = shares.reduce((a, s) => a + s.share * p.get(`eng.ghg.${kind}.${s.substrate}.${option}`), 0);
  const mj = 3.6;
  let productGMJ: number, comparatorGMJ: number, minSaving: number, productMjYear: number;
  let heatAvoided = 0;
  if (r.route === "biomethane") {
    const cng = r.opexRev.opex.some((l) => l.id === "cng_haul");
    productGMJ = feedGMJ + (cng ? p.get("eng.ghg.cbm_transport_add") : 0);
    comparatorGMJ = p.get("eng.ghg.comparator_transport");
    minSaving = p.get("eng.ghg.min_saving_transport");
    productMjYear = e.biomethaneNm3 * p.get("eng.ch4_lhv_kwh_m3") * (e.biomethaneCh4Share ?? p.get("eng.biomethane_ch4_purity")) * mj;
  } else if (r.route === "chp") {
    // Exergy allocation between electricity and useful heat (Annex VI part B point 1(d)): heat below 150 °C uses the
    // Carnot share at 150 °C. Digester heating is process heat, not useful heat.
    const etaEl = Math.max(e.chpEtaEl, 0.01);
    const fuel = e.elGrossKwh / etaEl;
    const etaH = fuel > 0 ? e.heatUsefulKwh / fuel : 0;
    const ch = p.get("eng.ghg.carnot_heat_150c");
    productGMJ = (feedGMJ / etaEl) * (etaEl / (etaEl + ch * etaH));
    comparatorGMJ = p.get("eng.ghg.comparator_el");
    minSaving = p.get("eng.ghg.min_saving_el_heat");
    productMjYear = e.elNetKwh * mj;
    if (etaH > 0) {
      const heatGMJ = (feedGMJ / etaH) * ((ch * etaH) / (etaEl + ch * etaH));
      heatAvoided = ((p.get("eng.ghg.comparator_heat") - heatGMJ) * e.heatUsefulKwh * mj) / 1e6;
    }
  } else {
    productGMJ = feedGMJ / p.get("eng.boiler_efficiency");
    comparatorGMJ = p.get("eng.ghg.comparator_heat");
    minSaving = p.get("eng.ghg.min_saving_el_heat");
    productMjYear = e.heatUsefulKwh * mj;
  }
  const saving = (comparatorGMJ - productGMJ) / comparatorGMJ;
  const ratedInputMw = (e.rawBiogasDesignNm3PerHour * e.rawBiogasCh4Share * p.get("eng.ch4_lhv_kwh_m3")) / 1000;
  return {
    product: r.route === "biomethane" ? "biomethane" : r.route === "chp" ? "electricity" : "heat",
    shares, approximated, digestate, offGasCombusted, feedGMJ, productGMJ, comparatorGMJ, saving, minSaving,
    meetsMinimum: saving >= minSaving,
    ratedInputMw,
    criteriaApply: ratedInputMw >= p.get("eng.ghg.min_input_mw"),
    avoidedTco2eYear: ((comparatorGMJ - productGMJ) * productMjYear) / 1e6 + heatAvoided,
  };
}

import type { CountryAdapter, Region } from "@/core/country";
import { prov } from "@/core/params";
import { regionsFor } from "./build";
import { regulatoryFor } from "./regulatory";
import { type Sourced, discountFor, electricityFor, spotFor, fertiliserFor, fxFor, gasFor, gridEfFor } from "./sources";

const SRC_NORMALS =
  "Climate normals 1991–2020 rounded by the project team (not a download). Replace with ERA5/Open-Meteo in phase 2";

const region = (id: string, en: string, uk: string, t: number[], altitudeM?: number): Region => ({
  id,
  name: en,
  names: { uk },
  monthlyTempC: t,
  tempSource: SRC_NORMALS,
  altitudeM,
});

export const UA_REGIONS: Region[] = [
  region("lviv", "Lviv oblast", "Львівська область", [-3.6, -2.6, 1.6, 8.6, 14.2, 17.5, 19.4, 18.8, 13.9, 8.5, 3.1, -1.7], 300),
  region("ternopil", "Ternopil oblast", "Тернопільська область", [-4.5, -3.5, 0.9, 8.3, 14.2, 17.5, 19.3, 18.7, 13.6, 8.0, 2.4, -2.6], 320),
  region("ivano-frankivsk", "Ivano-Frankivsk oblast", "Івано-Франківська область", [-4.6, -3.4, 1.1, 8.2, 13.8, 16.9, 18.7, 18.1, 13.5, 8.1, 2.5, -2.7], 290),
  region("volyn", "Volyn oblast", "Волинська область", [-4.2, -3.2, 1.2, 8.6, 14.4, 17.5, 19.2, 18.6, 13.7, 8.2, 2.6, -2.4], 190),
  region("zakarpattia", "Zakarpattia oblast", "Закарпатська область", [-1.8, -0.2, 4.7, 10.6, 15.7, 19.0, 20.8, 20.1, 15.5, 10.2, 4.9, 0.0], 120),
  region("chernivtsi", "Chernivtsi oblast", "Чернівецька область", [-3.8, -2.4, 2.1, 9.2, 14.6, 17.8, 19.5, 18.9, 14.1, 8.9, 3.4, -1.6], 250),
  region("rivne", "Rivne oblast", "Рівненська область", [-4.4, -3.6, 0.8, 8.4, 14.2, 17.3, 19.0, 18.3, 13.5, 8.0, 2.3, -2.6], 200),
  region("khmelnytskyi", "Khmelnytskyi oblast", "Хмельницька область", [-4.4, -3.3, 1.0, 8.8, 14.6, 17.8, 19.5, 18.9, 14.0, 8.4, 2.5, -2.7], 280),
  region("vinnytsia", "Vinnytsia oblast", "Вінницька область", [-4.6, -3.8, 0.8, 8.5, 14.6, 17.8, 19.6, 18.9, 13.9, 8.0, 2.2, -2.7], 280),
  region("kyiv", "Kyiv oblast", "Київська область", [-3.5, -2.9, 1.5, 9.0, 15.0, 18.4, 20.5, 19.6, 14.4, 8.3, 2.4, -2.0], 170),
];

const SRC_IEA = "IEA commentary 'From farms to fuel: Ukraine's biomethane opportunity' (2026)";

const src = (id: string, label: string, v: Sourced | undefined, unit: string, note?: string) =>
  prov(id, label, v!.value, unit, v!.kind, v!.source, v!.confidence, { country: "UA", date: v!.date, note });

export const UA_PARAMS = [
  src("econ.fx_local_per_eur", "Exchange rate", fxFor("UAH"), "UAH/EUR"),
  src("econ.electricity_retail_eur_kwh", "Average all-in business electricity price excl. VAT (default if the customer gives none)", electricityFor("UA"), "EUR/kWh", "Customer-supplied price always overrides"),
  src("econ.electricity_spot_eur_kwh", "Wholesale electricity price (market average)", spotFor("UA"), "EUR/kWh"),
  prov("econ.export_haircut", "Share of the wholesale price realised for surplus power", 0.7, "—", "ASSUMPTION", "30 % profile & balancing discount for a small seller (assumption)", "MEDIUM", { country: "UA" }),
  prov("econ.self_consumption_variable_share", "Share of the bill actually avoided by self-generation", 0.85, "—", "ASSUMPTION", "Capacity & fixed network charges are not avoided (≈ 10–20 % of a business bill, same rule as every market)", "MEDIUM", { country: "UA" }),
  src("econ.gas_price_eur_mwh", "Business natural-gas price", gasFor("UA"), "EUR/MWh"),
  prov("econ.heat_value_eur_kwh_th", "Value of useful heat (displaced industrial gas / 0.9 boiler efficiency)", +(gasFor("UA")!.value / 1000 / 0.9).toFixed(4), "EUR/kWh th", "CALCULATION", "Business gas price ÷ 0.9", "MEDIUM", { country: "UA" }),
  prov("econ.biomethane_price_cons_eur_nm3", "Realised biomethane price, conservative (domestic gas, no premium)", 0.4, "EUR/Nm³", "ESTIMATE", SRC_IEA + ": domestic gas ≈382 EUR/tcm before the Middle-East conflict", "LOW", { country: "UA" }),
  prov("econ.biomethane_price_base_eur_nm3", "Realised biomethane price, base (partly exported/certified)", 0.6, "EUR/Nm³", "ESTIMATE", SRC_IEA + ": production cost ≈650 EUR/tcm; profitable price 800–900", "LOW", { country: "UA" }),
  prov("econ.biomethane_price_opt_eur_nm3", "Realised biomethane price, optimistic (EU export with certificates)", 0.85, "EUR/Nm³", "ESTIMATE", SRC_IEA + ": top EU markets up to 1 000 EUR/tcm", "LOW", { country: "UA" }),
  prov("econ.labour_official_eur_h", "Official hourly labour cost, economy-wide (wages + employer costs)", 4.3, "EUR/h", "CALCULATION", "Derzhstat average wage 26.5 k UAH/month (Jul 2025) × 1.22 employer contributions ÷ 160 h ÷ 47.09 UAH/€", "MEDIUM", { country: "UA" }),
  prov("econ.operator_wage_ratio", "Plant operator wage relative to the economy-wide average", 1.14, "—", "ASSUMPTION", "Skilled plant operator ≈ 30 k UAH/month gross vs the 26.5 k average → ≈ 4.9 €/h operator cost", "MEDIUM", { country: "UA" }),
  prov("econ.transport_eur_tkm", "Road transport of liquid/solid organic feedstock", 0.11, "EUR/(t·km)", "ESTIMATE", "Tanker/tipper rate incl. empty return; diesel-driven; TO VERIFY with 3 hauliers", "LOW", { country: "UA" }),
  prov("econ.transport_fixed_eur_t", "Loading/unloading per tonne", 0.7, "EUR/t", "CALCULATION", "0.6 €/t pump & loader + 0.02 h/t × 4.9 €/h labour (same KTBL-based formula as every market)", "MEDIUM", { country: "UA" }),
  prov("econ.capex_factor", "Local CAPEX relative to EU baseline", 0.85, "—", "CALCULATION", "Calibrated on Ukrainian projects: with 0.85 the model is within +8 % of 320 kW and within the market band at 1.3 MW (docs/capex-benchmark.md); imported CHP/upgrading priced as EU, half of plant equipment local (IEA 2026)", "MEDIUM", { country: "UA" }),
  src("econ.discount_rate", "Discount rate (EUR-equivalent, incl. country & war risk)", discountFor("UA"), "—"),
  prov("econ.energy_escalation", "Annual real escalation of energy prices (EUR terms)", 0.02, "—", "ASSUMPTION", "Conservative; UAH price rises offset by depreciation (EUR terms)", "MEDIUM", { country: "UA" }),
  prov("econ.opex_escalation", "Annual escalation of operating costs (EUR terms)", 0.03, "—", "ASSUMPTION", "Wage growth > CPI in UA (NBU inflation report)", "MEDIUM", { country: "UA" }),
  prov("econ.horizon_years", "Evaluation horizon", 15, "a", "ASSUMPTION", "Shorter than the 20-y technical life — conservative", "MEDIUM", { country: "UA" }),
  prov("econ.debt_share", "Debt share for DSCR test", 0.5, "—", "ASSUMPTION", "Typical EBRD/IFI-style lending for agrifood", "MEDIUM", { country: "UA" }),
  prov("econ.debt_interest", "Debt interest rate (EUR)", 0.1, "—", "FACT", "EBRD / IFC-backed agri-food credit lines in Ukraine 8–11 % (2025–2026 programmes)", "MEDIUM", { country: "UA" }),
  prov("econ.debt_tenor_years", "Debt tenor", 7, "a", "ASSUMPTION", "Typical for agri/energy credit lines (EBRD, IFC, EIB programmes)", "MEDIUM", { country: "UA" }),
  src("econ.fert_n_eur_kg", "Mineral nitrogen price", fertiliserFor("N"), "EUR/kg N"),
  src("econ.fert_p2o5_eur_kg", "Mineral phosphorus price", fertiliserFor("P2O5"), "EUR/kg P₂O₅"),
  src("econ.fert_k2o_eur_kg", "Mineral potassium price", fertiliserFor("K2O"), "EUR/kg K₂O"),
  prov("econ.digestate_handling_eur_t", "Incremental digestate handling on adequate land", 1.6, "EUR/t", "CALCULATION", "1.2 €/t machinery + 0.08 h/t × 4.9 €/h labour (same formula as every market)", "MEDIUM", { country: "UA" }),
  prov("econ.digestate_excess_eur_t", "Digestate that has no adequate land", 3.6, "EUR/t", "CALCULATION", "2.5 €/t + 0.22 h/t × 4.9 €/h labour (same formula as every market)", "MEDIUM", { country: "UA" }),
  src("econ.grid_ef_t_mwh", "Grid emission factor", gridEfFor("UA"), "tCO₂/MWh"),
];

export const UA: CountryAdapter = {
  code: "UA",
  nameEn: "Ukraine",
  currency: "UAH",
  maturity: "operational",
  params: UA_PARAMS,
  regions: regionsFor("UA", UA_REGIONS),
  dataStatus: "calibrated",
  regime: "UA",
  biomethaneInjection: true,
  priceTier: "C",
  support: {
    summary: {
      en: "The biogas green tariff (≈ €0.124/kWh) remains for plants already commissioned (until 2030). New projects must win 'green auctions', but the 2024–2025 auctions failed (0.9 MW small hydro in 2024; no bidders in May 2025); bill No. 13219 passed only first reading (21 Aug 2025). No support is assumed.",
      uk: "«Зелений» тариф на біогаз (≈12,39 євроцента/кВт·год) залишається для вже введених об'єктів до 2030 р. Нові проєкти мають вигравати «зелені» аукціони, але аукціони 2024–2025 рр. не відбулися (0,9 МВт малої ГЕС у 2024; без учасників у травні 2025); законопроєкт №13219 прийнято лише в першому читанні (21.08.2025). Підтримка не враховується.",
    },
    availableForNewSmallProjects: false,
    checkedOn: "2026-10-23",
    schemes: [],
  },
  regulatory: regulatoryFor("UA"),
  approachNotes: {
    en: ["No subsidy for new small plants: the case rests on own electricity and heat, avoided disposal and energy resilience. Biomethane export to the EU (ISCC) is open to large producers."],
    uk: ["Для нових малих установок субсидій немає: економіка тримається на власній електриці й теплі, економії на утилізації та енергостійкості. Експорт біометану до ЄС (ISCC) доступний великим виробникам."],
  },
};

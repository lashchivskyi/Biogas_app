import type { CountryAdapter, Region } from "@/core/country";
import { prov } from "@/core/params";
import { regulatoryFor } from "./regulatory";

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

const SRC_PRICES = "GMK Center (2026-01-19): day-ahead market 5 548 UAH/MWh Jan-2025 → 6 881 UAH/MWh Dec-2025; gas $373→$498/tcm; NEURC transmission 686.23 UAH/MWh";
const SRC_IEA = "IEA commentary 'From farms to fuel: Ukraine's biomethane opportunity' (2026)";

export const UA_PARAMS = [
  prov("econ.fx_local_per_eur", "Exchange rate", 49, "UAH/EUR", "ASSUMPTION", "NBU level of late 2025/2026, rounded; adjust when stale", "MEDIUM", { country: "UA" }),
  prov("econ.electricity_retail_eur_kwh", "Average all-in business electricity price (default if customer gives none)", 0.17, "EUR/kWh", "ESTIMATE", SRC_PRICES + "; plus distribution & supplier margin (not found in a primary source)", "LOW", { country: "UA", note: "Customer-supplied price always overrides. TO VERIFY with 5 customer invoices." }),
  prov("econ.electricity_export_eur_kwh", "Value of surplus electricity exported without support", 0.085, "EUR/kWh", "ESTIMATE", SRC_PRICES + "; day-ahead average less profile/balancing discount", "LOW", { country: "UA" }),
  prov("econ.self_consumption_variable_share", "Share of the bill actually avoided by self-generation", 0.85, "—", "ASSUMPTION", "Fixed network/capacity charges remain", "LOW", { country: "UA" }),
  prov("econ.gas_price_eur_mwh", "Business natural-gas price", 46, "EUR/MWh", "ESTIMATE", SRC_PRICES + "; ≈ $498/tcm", "LOW", { country: "UA" }),
  prov("econ.heat_value_eur_kwh_th", "Value of useful heat (displaced industrial gas, delivered)", 0.058, "EUR/kWh th", "ESTIMATE", SRC_PRICES + "; ≈ $498/tcm ≈ 0.045 EUR/kWh fuel + network, / 0.9 boiler efficiency", "LOW", { country: "UA" }),
  prov("econ.biomethane_price_cons_eur_nm3", "Realised biomethane price, conservative (domestic gas, no premium)", 0.4, "EUR/Nm³", "ESTIMATE", SRC_IEA + ": domestic gas ≈382 EUR/tcm before the Middle-East conflict", "LOW", { country: "UA" }),
  prov("econ.biomethane_price_base_eur_nm3", "Realised biomethane price, base (partly exported/certified)", 0.6, "EUR/Nm³", "ESTIMATE", SRC_IEA + ": production cost ≈650 EUR/tcm; profitable price 800–900", "LOW", { country: "UA" }),
  prov("econ.biomethane_price_opt_eur_nm3", "Realised biomethane price, optimistic (EU export with certificates)", 0.85, "EUR/Nm³", "ESTIMATE", SRC_IEA + ": top EU markets up to 1 000 EUR/tcm", "LOW", { country: "UA" }),
  prov("econ.labour_eur_h", "Fully loaded operator cost", 4.5, "EUR/h", "ESTIMATE", "Operator ≈ 35 000 UAH/month loaded, 160 h; TO VERIFY", "LOW", { country: "UA" }),
  prov("econ.transport_eur_tkm", "Road transport of liquid/solid organic feedstock", 0.11, "EUR/(t·km)", "ESTIMATE", "Tanker/tipper rate incl. empty return; diesel-driven; TO VERIFY with 3 hauliers", "LOW", { country: "UA" }),
  prov("econ.transport_fixed_eur_t", "Loading/unloading per tonne", 1.2, "EUR/t", "ESTIMATE", "Handling estimate", "LOW", { country: "UA" }),
  prov("econ.capex_factor", "Local CAPEX relative to EU baseline", 0.85, "—", "ESTIMATE", "Cheaper civil/labour; imported CHP/upgrading priced as EU. Half of UA plant equipment is local (IEA 2026)", "LOW", { country: "UA" }),
  prov("econ.discount_rate", "Discount rate (EUR-equivalent, incl. country risk)", 0.13, "—", "ASSUMPTION", "WACC-type rate for a small UA project incl. war-risk premium; not a market quote", "LOW", { country: "UA" }),
  prov("econ.energy_escalation", "Annual real escalation of energy prices (EUR terms)", 0.02, "—", "ASSUMPTION", "Conservative; UAH price rises offset by depreciation", "LOW", { country: "UA" }),
  prov("econ.opex_escalation", "Annual escalation of operating costs (EUR terms)", 0.03, "—", "ASSUMPTION", "Wage growth > CPI in UA", "LOW", { country: "UA" }),
  prov("econ.horizon_years", "Evaluation horizon", 15, "a", "ASSUMPTION", "Shorter than the 20-y technical life — conservative", "MEDIUM", { country: "UA" }),
  prov("econ.debt_share", "Debt share for DSCR test", 0.5, "—", "ASSUMPTION", "Typical EBRD/IFI-style lending for agrifood", "LOW", { country: "UA" }),
  prov("econ.debt_interest", "Debt interest rate (EUR)", 0.1, "—", "ASSUMPTION", "IFI-backed credit lines 8–11 %", "LOW", { country: "UA" }),
  prov("econ.debt_tenor_years", "Debt tenor", 7, "a", "ASSUMPTION", "Typical for agri/energy credit lines", "LOW", { country: "UA" }),
  prov("econ.fert_n_eur_kg", "Mineral nitrogen price", 1.1, "EUR/kg N", "ESTIMATE", "Ammonium nitrate ≈ 18–22 k UAH/t; TO VERIFY", "LOW", { country: "UA" }),
  prov("econ.fert_p2o5_eur_kg", "Mineral phosphorus price", 1.2, "EUR/kg P₂O₅", "ESTIMATE", "TO VERIFY", "LOW", { country: "UA" }),
  prov("econ.fert_k2o_eur_kg", "Mineral potassium price", 0.7, "EUR/kg K₂O", "ESTIMATE", "TO VERIFY", "LOW", { country: "UA" }),
  prov("econ.digestate_handling_eur_t", "Incremental digestate handling on adequate land", 2.0, "EUR/t", "ESTIMATE", "Pumping + spreading", "LOW", { country: "UA" }),
  prov("econ.digestate_excess_eur_t", "Digestate that has no adequate land", 4.0, "EUR/t", "ESTIMATE", "Third-party spreading/transport", "LOW", { country: "UA" }),
  prov("econ.grid_ef_t_mwh", "Grid emission factor", 0.33, "tCO₂/MWh", "ESTIMATE", "Order of magnitude; TO VERIFY with national inventory", "LOW", { country: "UA" }),
];

export const UA: CountryAdapter = {
  code: "UA",
  nameEn: "Ukraine",
  currency: "UAH",
  maturity: "operational",
  params: UA_PARAMS,
  regions: UA_REGIONS,
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

import type { CountryAdapter, Region, SupportScheme } from "./country";
import type { CoreLang, Tr } from "./i18n";
import type { Params } from "./params";
import type { ScenarioDef } from "./scenarios";
import type { ProjectInput } from "./types";

/** Multipliers used by sensitivity analysis. 1 = unchanged. */
export interface Modifiers {
  methaneYield: number;
  capex: number;
  maintenance: number;
  energyPrice: number;
  heatUse: number;
  feedstock: number;
  transport: number;
  opex: number;
  /** Additional CHP downtime, percentage points of 8 760 h. */
  extraDowntimePp: number;
  /** Value of the route's main product only (CHP electricity, boiler heat, biomethane); used for break-even prices. */
  productPrice: number;
  /** Added net feedstock cost, EUR per tonne of every input stream (negative = gate fee); used for break-even feedstock prices. */
  feedstockEurT: number;
}

export const NO_MODS: Modifiers = {
  methaneYield: 1,
  capex: 1,
  maintenance: 1,
  energyPrice: 1,
  heatUse: 1,
  feedstock: 1,
  transport: 1,
  opex: 1,
  extraDowntimePp: 0,
  productPrice: 1,
  feedstockEurT: 0,
};

export interface RunContext {
  input: ProjectInput;
  country: CountryAdapter;
  params: Params;
  scenario: ScenarioDef;
  mods: Modifiers;
  region: Region;
  fx: number; // local currency per EUR
  lang: CoreLang;
  t: Tr;
  /** Set only for the "with support" case; the base verdict never uses it. */
  support?: SupportScheme;
}

import type { RegulatoryContext, RegulatoryRegime } from "@/core/country";
import { tr } from "@/core/i18n";
import type { RegulatoryItem } from "@/core/types";

/**
 * Permitting checklists by legal regime. These are orientation lists for a screening report, written
 * from general knowledge of each framework — every item is TO_VERIFY with a local lawyer/engineer
 * except where marked CONFIRMED. National transposition differs; thresholds below are indicative.
 */
type Item = (c: RegulatoryContext) => RegulatoryItem | null;

const it = (id: string, en: string, whyEn: string, effort: RegulatoryItem["effort"], status: RegulatoryItem["status"] = "TO_VERIFY"): Item => (c) => {
  const T = tr(c.lang);
  return { id, title: T(en), appliesBecause: T(whyEn), effort, status };
};
const when = (cond: (c: RegulatoryContext) => boolean, item: Item): Item => (c) => (cond(c) ? item(c) : null);
const bigWaste = (c: RegulatoryContext) => c.tonnesYear / 365 > 100 && c.abpTonnesYear + c.tonnesYear > 0;

const COMMON: Item[] = [
  when((c) => c.abpTonnesYear > 0, it("abp", "Animal by-products approval: pasteurisation 70 °C / 1 h (Cat. 3) or pressure sterilisation (Cat. 2), veterinary registration", "Slaughter / dairy / food residues in the feed", "HIGH")),
  when((c) => c.neighboursWithin300m, it("setback", "Setback distances, odour assessment and community consultation", "Housing within 300 m", "HIGH")),
  when((c) => c.nearProtectedOrWaterArea, it("protected", "Water-protection / protected-area restrictions and spill containment", "Water bodies or protected areas nearby", "HIGH")),
];

const EU: Item[] = [
  it("eu.permit", "Building permit and environmental permit; EIA screening (Directive 2011/92/EU as transposed)", "New installation", "MEDIUM"),
  when(bigWaste, it("eu.ied", "Industrial Emissions Directive (2010/75/EU) permit — anaerobic digestion of waste above ~100 t/day", "Throughput above the IED threshold", "HIGH")),
  it("eu.nitrates", "Nitrates Directive (91/676/EEC): 170 kg N/ha from organic manures in vulnerable zones; closed spreading periods", "Digestate is spread on land", "MEDIUM", "CONFIRMED"),
  it("eu.atex", "ATEX hazardous-area zoning (Directives 2014/34/EU, 1999/92/EC)", "Methane in the gas phase", "MEDIUM", "CONFIRMED"),
  when((c) => c.route === "chp" && c.kwElEquivalent > 380, it("eu.mcpd", "Medium Combustion Plant Directive (2015/2193): registration and emission limits for CHP ≥ 1 MW thermal input", "CHP above 1 MWth input", "MEDIUM")),
  when((c) => c.exportsElectricity, it("eu.grid", "Grid-connection agreement with the DSO and generator registration", "Surplus electricity is exported", "MEDIUM")),
  when((c) => c.gasGridInjection, it("eu.red", "RED III sustainability & GHG certification (e.g. ISCC EU / REDcert) and Guarantees of Origin for biomethane", "Biomethane is sold as a renewable product", "MEDIUM", "CONFIRMED")),
  when((c) => c.gasGridInjection, it("eu.injection", "Gas-grid injection: connection request, gas-quality specification, metering (TSO/DSO)", "Grid injection", "HIGH")),
];

const UK: Item[] = [
  it("uk.planning", "Planning permission (local planning authority) incl. odour, traffic and landscape", "New installation", "HIGH"),
  it("uk.permit", "Environmental Permit (Environment Agency / SEPA / NRW / NIEA): standard rules or bespoke", "Treatment of waste or manure", "HIGH"),
  it("uk.dsear", "DSEAR hazardous-area assessment", "Methane in the gas phase", "MEDIUM", "CONFIRMED"),
  it("uk.nvz", "Nitrate Vulnerable Zone rules and Farming Rules for Water", "Digestate is spread on land", "MEDIUM"),
  when((c) => c.gasGridInjection, it("uk.ggss", "Green Gas Support Scheme registration (Ofgem) and Green Gas Certificates", "Biomethane injection", "MEDIUM")),
  when((c) => c.exportsElectricity, it("uk.dno", "DNO connection offer (G99) and export agreement", "Electricity export", "MEDIUM")),
];

const US: Item[] = [
  it("us.air", "State air permit (CHP/flare) and possibly Title V; EPA NSPS/NESHAP for engines", "Combustion of biogas", "MEDIUM"),
  it("us.water", "CAFO / NPDES and state nutrient-management plan for digestate", "Manure / digestate land application", "MEDIUM"),
  it("us.zoning", "County zoning / conditional-use permit and building permits", "New installation", "MEDIUM"),
  when((c) => c.gasGridInjection, it("us.rfs", "EPA RFS registration (D3 RINs), LCFS pathway (California/Oregon/Washington) and utility interconnection", "RNG sold for transport credits", "HIGH")),
  when((c) => c.exportsElectricity, it("us.interconnect", "Utility interconnection agreement (state rules / FERC for wholesale)", "Electricity export", "MEDIUM")),
];

const CA: Item[] = [
  it("ca.env", "Provincial environmental approval (e.g. Ontario ECA / O.Reg 267/03 for on-farm AD)", "New installation", "MEDIUM"),
  it("ca.nutrient", "Nutrient-management regulation for digestate (provincial)", "Digestate is spread on land", "MEDIUM"),
  when((c) => c.gasGridInjection, it("ca.rng", "RNG offtake contract with gas utility and Clean Fuel Regulations credits", "Biomethane injection", "HIGH")),
];

const UA: Item[] = [
  it("ua.construction", "Urban-planning conditions and construction permit (consequence class to be confirmed)", "New installation", "MEDIUM"),
  it("ua.eia", "Environmental impact assessment / screening (thresholds to be confirmed)", "Biogas plant as an organic-waste facility", "MEDIUM"),
  it("ua.hazard", "Registration of high-hazard equipment and gas-system expert review", "Gas holders, CHP under pressure", "MEDIUM"),
  it("ua.fire", "Fire safety and explosion-hazard zoning", "Methane in the gas phase", "MEDIUM"),
  it("ua.air", "Air-emission permit for stationary sources (CHP, flare)", "Biogas combustion", "LOW"),
  when((c) => c.digestateTonnesYear > 0, it("ua.digestate", "Digestate use as fertiliser: status under the pesticides & agrochemicals law and application rules", "Digestate goes to fields", "MEDIUM")),
  when((c) => c.exportsElectricity, it("ua.license", "Generator licence/registration and grid-connection agreement", "Electricity export", "MEDIUM")),
  when((c) => c.gasGridInjection, it("ua.register", "Biomethane register (SAEE): producer verification and guarantees of origin", "Biomethane as a product", "MEDIUM", "CONFIRMED")),
  when((c) => c.gasGridInjection, it("ua.gasgrid", "Connection to the gas distribution / transmission network and metering", "Biomethane injection", "HIGH")),
  when((c) => c.gasGridInjection, it("ua.iscc", "ISCC EU certification for export to the EU", "Biomethane export", "MEDIUM", "CONFIRMED")),
];

const GENERIC: Item[] = [
  it("gen.permit", "Construction permit and national environmental approval / EIA screening", "New installation", "MEDIUM"),
  it("gen.gas", "Gas-safety approval and hazardous-area classification (IECEx or national code)", "Methane in the gas phase", "MEDIUM"),
  it("gen.effluent", "Effluent / digestate discharge or land-application permit", "Digestate or treated effluent leaves the site", "MEDIUM"),
  when((c) => c.exportsElectricity, it("gen.grid", "Power-purchase / net-metering agreement and grid connection", "Electricity export", "MEDIUM")),
  when((c) => c.gasGridInjection, it("gen.gasgrid", "Gas-grid access or bio-CNG/LNG offtake contract", "Biomethane sales", "HIGH")),
];

const REGIMES: Record<RegulatoryRegime, Item[]> = { EU, UK, US, CA, UA, GENERIC };

export function regulatoryFor(regime: RegulatoryRegime) {
  return (c: RegulatoryContext): RegulatoryItem[] => [...REGIMES[regime], ...COMMON].map((f) => f(c)).filter((x): x is RegulatoryItem => x !== null);
}

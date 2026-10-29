import type { BusinessTypeId } from "@/core/businesses";

/** Deployment evidence is not a probability of buying, a local feedstock survey or an investment verdict. */
export const SECTOR_REVIEW_DATE = "2026-10-28";
export const SECTOR_SOURCES = {
  starchStudy: {"title":"Lerdlattaporn et al. — cassava starch / wastewater field study","period":"2021","url":"https://link.springer.com/article/10.1186/s42834-021-00093-9"},
  paperUs: {"title":"Veolia — US recycled-paper wastewater design reference","period":"—","url":"https://www.veoliawatertech.com/en/case-studies/robust-biological-wastewater-system-treats-challenging-wastewater-recycled-paper"},
  fawdon: {"title":"Clearfleau — food production residues, supplier presentation","period":"2014-12","url":"https://conferences.aquaenviro.co.uk/proceedings/clearfleau-three-case-studies-converting-food-production-residues-into-energy/richard-gueterbock-2/"},
  fish: {"title":"Food Nation / Landia — salmon residues, Creed IWMF","period":"2017–2022","url":"https://foodnationdenmark.com/cases/salmon-waste-powers-biogas-production/"},
  apsley: {"title":"IEA Bioenergy — Apsley Farms crop-based biomethane","period":"2025-12","url":"https://www.ieabioenergy.com/wp-content/uploads/2026/02/2025_IEA-Bio_T37_Case-story_Biomethane-from-break-crops.pdf"},
  retail: {"title":"SARIA — food manufacturing and retail collection","period":"—","url":"https://www.saria.co.uk/anaerobic-digestion/food-waste-recycling/"},
  aquaculture: {"title":"NIBIO — SUFFICIENT research programme, 2025–2028","period":"2026-01-13","url":"https://www.nibio.no/en/projects/sufficient"},
  sleeman: { title: "Veolia — Sleeman brewery wastewater, Ontario (technical reference; date unspecified)", period: "—", url: "https://www.veoliawatertech.com/en/case-studies/reducing-bod-brewery-wastewater-sleeman" },
  paper: { title: "Veolia — Modern Karton, Turkey (2014 technical reference)", period: "2014", url: "https://www.veoliawatertechnologies.com.cn/sites/g/files/dvc3481/files/document/2019/08/160019_VWT_MOD_Brochure_Pulp%26Paper_ENG_A4_LR.pdf%20-%200.pdf" },
  iea: { title: "IEA — Outlook for Biogas and Biomethane", period: "2025", url: "https://www.iea.org/reports/outlook-for-biogas-and-biomethane" },
  food: { title: "IEA Bioenergy Task 37 — Food and beverage AD", period: "2025", url: "https://www.ieabioenergy.com/wp-content/uploads/2025/03/IEA-Bioenergy-Task-37-Food-and-Beverage_20250302.pdf" },
  eba: { title: "European Biogas Association — Statistical Report", period: "2024–2025", url: "https://www.europeanbiogas.eu/news/eba-statistical-report-2025/" },
  eurostat: { title: "Eurostat — livestock indicators by NUTS 2", period: "2023", url: "https://ec.europa.eu/eurostat/databrowser/product/page/ef_lsk_main" },
  ua: { title: "IEA — Ukraine biomethane deployment", period: "2026-06", url: "https://www.iea.org/commentaries/from-farms-to-fuel-ukraines-biomethane-opportunity-for-energy-security-and-european-decarbonisation" },
  dk: { title: "Danish Energy Agency — production of biogas", period: "2025–2026", url: "https://ens.dk/energikilder/produktion-af-biogas" },
  us: { title: "US EPA AgSTAR — livestock digester database", period: "2024", url: "https://www.epa.gov/agstar/livestock-anaerobic-digester-database" },
  landfill: { title: "US EPA LMOP — landfill and project database", period: "2024", url: "https://www.epa.gov/lmop/lmop-landfill-and-project-database" },
  ca: { title: "Canadian Biogas Association — Biogas Insights", period: "2025", url: "https://biogasassociation.ca/images/uploads/documents/2025/resources/2025_Biogas_Insights_Report.pdf" },
  br: { title: "CIBiogás — Panorama do Biogás", period: "2024", url: "https://abiogas.org.br/wp-content/uploads/2025/06/PANORAMA-DO-BIOGAS-2024.pdf" },
  ar: { title: "Argentina — agroindustrial biogas opportunities", period: "2025", url: "https://www.magyp.gob.ar/sitio/areas/bioenergia/biogas/" },
  india: { title: "PIB — functional CBG projects by state", period: "2026-01-27", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2222150&lang=1&reg=6" },
  indiaPolicy: { title: "Government of India — GOBARdhan approval", period: "2026-08-06", url: "https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=292873" },
  th: { title: "Repower — palm and tapioca project references", period: "2005–2018", url: "https://www.repower.co.th/references" },
  se: { title: "Energigas Sverige — biogas production statistics", period: "2024", url: "https://www.energigas.se/Media/mvwmqi3h/biogasstatistik-rapport_2024.pdf" },
  buyer: { title: "Joint Biomethane Offtakers Declaration", period: "2025", url: "https://www.biomethane-offtake-declaration.eu/wp-content/uploads/2025/01/Biomethane-Offtakers-Declaration.pdf" },
  refood: { title: "ReFood — operating facilities", period: "—", url: "https://refood.co.uk/our-facilities/" },
  mccain: { title: "LEK/HABO — McCain biogas CHP projects", period: "—", url: "https://www.lekhabo.nl/lek-habo/projecten/mccain" },
  de: { title: "FNR — Basisdaten Bioenergie Deutschland 2026", period: "2024", url: "https://www.fnr.de/fileadmin/Projekte/2025/Mediathek/Brosch_Basisdaten_Bioenergie_2025_11_web.pdf" },
  fr: { title: "SDES — renouvelables, tableaux de bord", period: "2026-06-30", url: "https://www.statistiques.developpement-durable.gouv.fr/les-energies-renouvelables" },
  it: { title: "CREA — biogas e biometano, zootecnia", period: "2024–2025", url: "https://creafuturo.crea.gov.it/15927/" },
  md: { title: "Ministry of Energy Moldova — Garma-Grup", period: "2026-09-03", url: "https://www.energie.gov.md/en/content/agriculture-can-become-important-source-dispatchable-renewable-energy-says-energy-minister" },
  rs: { title: "Serbian Biogas Association — commissioning records", period: "2011–2021", url: "https://biogas.org.rs/en/biogas-sector-in-serbia/biogas-power-plants-in-serbia/" },
  tr: { title: "Botres — EPC references", period: "2014–2024", url: "https://www.botres.com/project/" },
  mx: { title: "SADER — biodigestores, agricultura y ganadería", period: "2024-07-19", url: "https://www.gob.mx/agricultura/articulos/147526" },
  vn: { title: "VNU — swine wastewater digestate field study", period: "2025", url: "https://js.vnu.edu.vn/EES/article/download/5416/4281" },
  kz: { title: "Kazakhstan Energy Ministry — renewables in 2025", period: "2025", url: "https://www.gov.kz/org/energo/press/news/details/1137212?lang=kk" },
  kzResource: { title: "WKATU — livestock manure resource assessment", period: "2023–2024", url: "https://energy.wkau.kz/index.php/jee/en/article/view/5" },
} as const;
type SourceId = keyof typeof SECTOR_SOURCES;
interface Review { observed: readonly BusinessTypeId[]; resource: readonly BusinessTypeId[]; sources: readonly SourceId[] }
const review = (observed: BusinessTypeId[], resource: BusinessTypeId[], sources: SourceId[]): Review => ({ observed, resource, sources });
const euResource = () => review([], ["dairy_farm", "cattle_farm", "pig_farm", "poultry_farm", "crop_farm"], ["eurostat", "eba"]);
const unknown = () => review([], [], ["iea"]);
/** All 33 markets are explicit. Empty evidence is a disclosed research gap, never 'no demand'. */
export const BUSINESS_MARKETS: Record<string, Review> = {
  UA: review(["biogas_developer"], ["crop_farm", "sugar_beet_factory", "poultry_farm", "municipal_biowaste"], ["ua", "iea"]),
  PL: review(["poultry_farm", "biogas_developer"], ["dairy_farm", "cattle_farm", "pig_farm", "crop_farm"], ["tr", "eurostat", "eba"]),
  CZ: euResource(), SK: euResource(), HU: euResource(), RO: euResource(),
  MD: review(["cattle_farm", "biogas_developer"], ["food_manufacturer"], ["md"]),
  BG: euResource(), RS: review(["biogas_developer"], [], ["rs"]), GR: euResource(),
  TR: review(["cattle_farm", "poultry_farm", "municipal_biowaste", "biogas_developer", "pulp_paper"], [], ["tr", "paper"]),
  LT: euResource(), LV: euResource(), EE: euResource(),
  DK: review(["dairy_farm", "pig_farm", "central_biogas_plant", "biogas_developer", "wastewater_treatment", "wastewater_organic", "landfill_operator"], ["crop_farm", "food_manufacturer"], ["dk"]),
  SE: review(["municipal_biowaste", "wastewater_treatment", "dairy_farm", "biogas_developer", "landfill_operator"], ["food_manufacturer"], ["se"]),
  FI: euResource(),
  DE: review(["cattle_farm", "pig_farm", "poultry_farm", "crop_farm", "municipal_biowaste", "biogas_developer"], ["dairy_farm", "food_manufacturer"], ["de"]),
  AT: review(["biogas_developer"], ["dairy_farm", "cattle_farm", "pig_farm", "crop_farm"], ["tr", "eurostat"]),
  IT: review(["biogas_developer"], ["dairy_farm", "cattle_farm", "pig_farm", "crop_farm", "food_manufacturer"], ["it", "eurostat"]),
  FR: review(["biogas_developer"], ["dairy_farm", "cattle_farm", "pig_farm", "crop_farm"], ["fr", "eurostat"]),
  ES: euResource(), NL: review(["potato_processor"], ["dairy_farm", "pig_farm", "poultry_farm"], ["mccain", "eurostat"]),
  GB: review(["municipal_biowaste", "biogas_developer", "food_manufacturer", "fish_processor", "food_business"], [], ["refood", "fawdon", "fish", "retail"]),
  US: review(["dairy_farm", "pig_farm", "biogas_developer", "landfill_operator", "pulp_paper"], [], ["us", "landfill", "paperUs"]),
  CA: review(["biogas_developer", "municipal_biowaste", "wastewater_treatment", "landfill_operator", "brewery"], ["dairy_farm", "food_business"], ["ca", "sleeman"]),
  MX: review([], ["dairy_farm", "cattle_farm", "pig_farm", "crop_farm"], ["mx"]),
  AR: review([], ["dairy_farm", "cattle_farm", "pig_farm", "poultry_farm", "slaughterhouse", "biogas_developer"], ["ar"]),
  BR: review(["biogas_developer"], ["pig_farm", "slaughterhouse", "sugar_ethanol", "landfill_operator"], ["br", "food"]),
  IN: review(["biogas_developer"], ["cattle_farm", "crop_farm", "sugar_ethanol", "municipal_biowaste", "energy_offtaker"], ["india", "indiaPolicy"]),
  TH: review(["palm_oil_mill", "starch_processor"], ["wastewater_organic"], ["th", "starchStudy"]),
  VN: review(["pig_farm"], [], ["vn"]),
  KZ: review(["biogas_developer"], ["dairy_farm", "cattle_farm", "pig_farm", "poultry_farm"], ["kz", "kzResource"]),
};

interface RegionEvidence { businesses: readonly BusinessTypeId[]; sources: readonly SourceId[] }
const region = (businesses: BusinessTypeId[], sources: SourceId[]): RegionEvidence => ({ businesses, sources });
/** Exact profile IDs only: ERA5 proximity and city coordinates never infer local commercial demand. */
export const REGIONAL_BUSINESS_EVIDENCE: Record<string, RegionEvidence> = {
  "CA:ontario": region(["brewery"], ["sleeman"]),
  "UA:chernihiv": region(["biogas_developer"], ["ua"]),
  "UA:kyiv": region(["biogas_developer"], ["ua"]),
  "UA:khmelnytskyi": region(["biogas_developer"], ["ua"]),
  "UA:vinnytsia": region(["biogas_developer"], ["ua"]),
  "UA:dnipro": region(["biogas_developer"], ["ua"]),
  "DK:jutland": region(["central_biogas_plant", "biogas_developer", "dairy_farm", "pig_farm"], ["dk"]),
  "DK:south-jutland": region(["biogas_developer", "dairy_farm", "pig_farm"], ["dk"]),
  "DK:north-jutland": region(["biogas_developer", "dairy_farm", "pig_farm"], ["dk"]),
  "GB:yorkshire": region(["municipal_biowaste"], ["refood"]),
  "GB:north-west": region(["municipal_biowaste"], ["refood"]),
  "RS:vojvodina": region(["biogas_developer"], ["rs"]),
  "TR:ankara": region(["cattle_farm", "biogas_developer"], ["tr"]),
  "TR:aegean": region(["cattle_farm", "poultry_farm", "biogas_developer"], ["tr"]),
  "VN:red-river": region(["pig_farm"], ["vn"]),
  ...Object.fromEntries(["andhra-pradesh", "gujarat", "haryana", "karnataka", "madhya-pradesh", "maharashtra", "punjab", "rajasthan", "tamil-nadu", "uttar-pradesh", "west-bengal"].map((id) => [`IN:${id}`, region(["biogas_developer"], ["india"])])),
  "TH:south": region(["palm_oil_mill"], ["th"]),
  "TH:east": region(["starch_processor"], ["th"]),
  "TH:northeast": region(["starch_processor"], ["th"]),
};
const cane = new Set(["BR", "IN", "TH", "VN", "MX", "AR", "US"]);
const palm = new Set(["TH", "BR", "MX"]);
const olives = new Set(["ES", "IT", "GR", "TR", "FR", "AR", "US"]);
export type BusinessSignal = "observed" | "resource" | "unverified";
export function businessMarket(id: BusinessTypeId, country: string, regionId?: string) {
  const national = BUSINESS_MARKETS[country] ?? unknown();
  const local = regionId?.startsWith("city:") ? undefined : REGIONAL_BUSINESS_EVIDENCE[`${country}:${regionId}`];
  const regional = Boolean(local?.businesses.includes(id));
  const signal: BusinessSignal = regional || national.observed.includes(id) ? "observed" : national.resource.includes(id) ? "resource" : "unverified";
  const sourceIds = regional ? local!.sources : national.sources;
  return { signal, regional, checkedOn: SECTOR_REVIEW_DATE,
    uncommon: id === "palm_oil_mill" ? !palm.has(country) : id === "olive_oil_mill" ? !olives.has(country) : id === "sugar_ethanol" ? !cane.has(country) : false,
    sources: sourceIds.map((key) => SECTOR_SOURCES[key]),
  };
}

/** Category admission is an engineering/product rationale, not measured demand or UX validation. */
export const BUSINESS_BASIS: Partial<Record<BusinessTypeId,{reason: string; distinction: string; sources: readonly SourceId[]; evidence: "application_reference" | "resource_signal" | "fallback"}>> = {
  "central_biogas_plant": {
    "reason": "portfolio",
    "distinction": "Multiple suppliers, contracted logistics and ownership boundary",
    "sources": [
      "dk"
    ],
    "evidence": "application_reference"
  },
  "dairy_farm": {
    "reason": "preset",
    "distinction": "Dairy slurry collection and dairy-herd inputs",
    "sources": [
      "us"
    ],
    "evidence": "application_reference"
  },
  "cattle_farm": {
    "reason": "preset",
    "distinction": "Beef cattle and housing/collection differ from dairy herds",
    "sources": [
      "us",
      "eurostat"
    ],
    "evidence": "application_reference"
  },
  "pig_farm": {
    "reason": "preset",
    "distinction": "Pig slurry and wash-water dilution",
    "sources": [
      "us",
      "dk"
    ],
    "evidence": "application_reference"
  },
  "poultry_farm": {
    "reason": "constraint",
    "distinction": "Poultry manure and nitrogen inhibition",
    "sources": [
      "tr",
      "de"
    ],
    "evidence": "application_reference"
  },
  "crop_farm": {
    "reason": "constraint",
    "distinction": "Harvest/storage and alternative feed/crop value",
    "sources": [
      "apsley"
    ],
    "evidence": "application_reference"
  },
  "aquaculture": {
    "reason": "constraint",
    "distinction": "Collected sludge, salinity and very dilute solids; no commercial promise",
    "sources": [
      "aquaculture"
    ],
    "evidence": "resource_signal"
  },
  "dairy_processor": {
    "reason": "inlet",
    "distinction": "Whey and DAF sludge, or measured COD effluent",
    "sources": [
      "food",
      "fawdon"
    ],
    "evidence": "application_reference"
  },
  "slaughterhouse": {
    "reason": "constraint",
    "distinction": "Animal by-products, hygienisation and fats",
    "sources": [
      "food"
    ],
    "evidence": "application_reference"
  },
  "fish_processor": {
    "reason": "constraint",
    "distinction": "Fish residues, feed competition and legal pretreatment",
    "sources": [
      "fish"
    ],
    "evidence": "application_reference"
  },
  "fruit_veg_processor": {
    "reason": "preset",
    "distinction": "Seasonal produce residues and storage",
    "sources": [
      "food"
    ],
    "evidence": "application_reference"
  },
  "potato_processor": {
    "reason": "preset",
    "distinction": "Potato processing side-stream properties",
    "sources": [
      "mccain",
      "food"
    ],
    "evidence": "application_reference"
  },
  "starch_processor": {
    "reason": "inlet",
    "distinction": "COD flow; lagoon or granular-sludge design",
    "sources": [
      "starchStudy"
    ],
    "evidence": "application_reference"
  },
  "food_manufacturer": {
    "reason": "inlet",
    "distinction": "Mixed production rejects or existing factory gas",
    "sources": [
      "fawdon",
      "retail"
    ],
    "evidence": "application_reference"
  },
  "sugar_beet_factory": {
    "reason": "constraint",
    "distinction": "Pressed pulp with alternative feed value and campaigns",
    "sources": [
      "food"
    ],
    "evidence": "application_reference"
  },
  "sugar_ethanol": {
    "reason": "inlet",
    "distinction": "Vinasse/press mud, sulfate and seasonal loading",
    "sources": [
      "br",
      "food"
    ],
    "evidence": "application_reference"
  },
  "brewery": {
    "reason": "inlet",
    "distinction": "Spent grain and liquid COD are separate input bases",
    "sources": [
      "sleeman",
      "food"
    ],
    "evidence": "application_reference"
  },
  "distillery": {
    "reason": "inlet",
    "distinction": "Stillage/co-products differ from brewery solids",
    "sources": [
      "fawdon",
      "food"
    ],
    "evidence": "application_reference"
  },
  "olive_oil_mill": {
    "reason": "constraint",
    "distinction": "Pomace, phenolics and seasonal availability",
    "sources": [
      "iea",
      "food"
    ],
    "evidence": "resource_signal"
  },
  "palm_oil_mill": {
    "reason": "inlet",
    "distinction": "POME wastewater and warm-climate lagoons",
    "sources": [
      "th"
    ],
    "evidence": "application_reference"
  },
  "pulp_paper": {
    "reason": "inlet",
    "distinction": "Biodegradable industrial COD; exclude wood and black liquor",
    "sources": [
      "paperUs",
      "paper"
    ],
    "evidence": "application_reference"
  },
  "other_industry": {
    "reason": "fallback",
    "distinction": "Characterised stream required; no generic food-waste substitution",
    "sources": [
      "iea"
    ],
    "evidence": "fallback"
  },
  "food_business": {
    "reason": "portfolio",
    "distinction": "Retail aggregation and disposal versus external treatment",
    "sources": [
      "retail"
    ],
    "evidence": "application_reference"
  },
  "municipal_biowaste": {
    "reason": "portfolio",
    "distinction": "Source-separated waste, gate fees and contamination",
    "sources": [
      "refood"
    ],
    "evidence": "application_reference"
  },
  "wastewater_treatment": {
    "reason": "inlet",
    "distinction": "Sludge digestion or existing gas, not raw sewage by wet tonnage",
    "sources": [
      "se",
      "dk"
    ],
    "evidence": "application_reference"
  },
  "landfill_operator": {
    "reason": "inlet",
    "distinction": "Existing gas or closed-landfill FOD; no new digester",
    "sources": [
      "landfill"
    ],
    "evidence": "application_reference"
  }
};

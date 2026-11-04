import type { Locale } from "./config";

/**
 * Localisation glossary and style data (LISA / ISO 17100 practice). It is data for the automatic QA in
 * `__tests__/qa.test.ts`; the human-readable style guide is `.claude/skills/localization/SKILL.md`.
 * Terms are the ones the interface of each language already uses (docs/ai/DECISIONS.md, 2026-11-01): change a term
 * here only together with every string that uses it.
 */

/** Tokens that stay exactly as written in every language (a local equivalent may follow in parentheses). */
export const DO_NOT_TRANSLATE = [
  "Methalytics", "Stripe", "BMP", "VS", "UASB", "EGSB", "CSTR", "POME", "RNG", "Bio-CNG", "PPA", "EPC",
  "Monte Carlo", "P10", "P50", "P90", "EVPI", "EU RED", "HHV", "LHV",
  // Provenance and confidence codes of the methodology register.
  "FACT", "ASSUMPTION", "CALCULATION", "ESTIMATE", "HIGH", "MEDIUM", "LOW",
  // Source names.
  "Eurostat", "IEA", "EPA AgSTAR", "Damodaran",
] as const;

/** DM / TS (dry matter / total solids) is a local abbreviation in most languages: see `Terms.dm`. */
export const DRY_MATTER_TOKENS = ["DM", "TS"] as const;

/** SI symbols stay Latin. Languages that already write Cyrillic units may do so (`CYRILLIC_UNITS`). */
export const SI_UNITS = ["kWh", "MWh", "GWh", "kWe", "kW", "MW", "Nm³", "m³", "t", "ha", "kg", "km"] as const;
export type SiUnit = (typeof SI_UNITS)[number];

/** Ukrainian already writes units in Cyrillic (ДСТУ / ISO 80000 national usage); each equivalent is accepted. */
export const CYRILLIC_UNITS: Partial<Record<Locale, Partial<Record<SiUnit, readonly string[]>>>> = {
  uk: { kWh: ["кВт·год"], MWh: ["МВт·год"], GWh: ["ГВт·год"], kWe: ["кВт ел", "кВт(ел)"], kW: ["кВт"], MW: ["МВт"], "Nm³": ["Нм³", "нм³"], "m³": ["м³"], t: ["т"], ha: ["га"], kg: ["кг"], km: ["км"] },
};

export interface Terms {
  /** Anaerobic digester (the vessel). */
  digester: string;
  /** What leaves the digester. */
  digestate: string;
  /** Input material of the plant. */
  feedstock: string;
  /** Combined heat and power. */
  chp: string;
  biomethane: string;
  payback: string;
  /** Net present value. */
  npv: string;
  /** Internal rate of return. */
  irr: string;
  /** Chemical oxygen demand. */
  cod: string;
  /** Dry matter / total solids. */
  dm: string;
  conservative: string;
  base: string;
  optimistic: string;
  /** Paid plans: Standard, Extended (Stripe product names stay English). */
  planStandard: string;
  planExtended: string;
}

export interface Style {
  /** Form of address to the reader. */
  address: "formal" | "tu" | "usted" | "du" | "sinä";
  /** Space before "%": product convention is a space ("30 %"); "prefix" = "%30" (Turkish). */
  percent: "space" | "tight" | "prefix";
  decimal: "," | ".";
  /** Characters allowed to open/close double quotes in running text; ASCII " is never allowed. */
  quotes: string;
}

export interface LocaleGlossary {
  terms: Terms;
  /** Variants that must not appear (matched as word stems, case-insensitive). `use` names the approved term. */
  forbidden: readonly { stem: string; use: string }[];
  style: Style;
}

/** English words that must not leak into translations (matched as whole words). */
export const ENGLISH_LEAKS = ["feedstock", "digestate", "pessimistic"] as const;

/** English abbreviations replaced by a local one where the language has it (a mention beside the local term is fine). */
export const LOCALISED_ABBREVIATIONS: readonly { en: string; term: keyof Terms }[] = [
  { en: "NPV", term: "npv" }, { en: "IRR", term: "irr" }, { en: "CHP", term: "chp" }, { en: "COD", term: "cod" },
];

export interface FixedTerm {
  /** English concept. */
  concept: string;
  /** Approved term; must appear in the locale's UI or model text. */
  term: string;
  /** Stems that must not appear in that text (matched like `forbidden`). */
  rejected?: readonly string[];
  why?: string;
}

/**
 * Terms fixed in the MQM rounds of 2026-11-01/02 without a native reviewer: change one only with a native, and together
 * with every string that uses it. Checked over UI and model catalogs by `__tests__/fixed-terms.test.ts`.
 * Everywhere: Monte Carlo is a probability range, never "certainty".
 */
export const FIXED_TERMS: Partial<Record<Locale, readonly FixedTerm[]>> = {
  uk: [
    { concept: "Monte Carlo range", term: "Діапазон ймовірностей" },
    { concept: "EBITDA", term: "Операційна маржа", why: "\"прибуток\" reads as EBIT" },
    { concept: "confidence", term: "Достовірність" },
  ],
  de: [
    { concept: "EBITDA", term: "Betriebsergebnis vor Abschreibungen", why: "the bare word means EBIT" },
    { concept: "confidence", term: "Vertrauensniveau" },
    { concept: "verdict", term: "Einschätzung" },
  ],
  nl: [
    { concept: "EBITDA", term: "Bedrijfsresultaat vóór afschrijvingen" },
    { concept: "confidence", term: "betrouwbaarheid" },
    { concept: "biomethane", term: "groen gas" },
    { concept: "upgrading", term: "opwerking" },
  ],
  da: [
    { concept: "EBITDA", term: "Driftsresultat før afskrivninger" },
    { concept: "confidence", term: "pålidelighed", rejected: ["datasikkerhed"], why: "Datasikkerhed = IT security" },
    { concept: "refund", term: "refusion", why: "tilbagebetaling = payback" },
  ],
  sv: [
    { concept: "verdict", term: "Besked" },
    { concept: "screening", term: "översiktlig bedömning", why: "förstudie is the feasibility study" },
    { concept: "confidence", term: "", rejected: ["datasäkerhet"], why: "Datasäkerhet = IT security" },
  ],
  fi: [
    { concept: "verdict", term: "Arvio" },
    { concept: "NPV", term: "nettonykyarvo" },
    { concept: "feedstock mix", term: "seossyöte" },
  ],
  pt: [
    { concept: "slurry", term: "dejeto líquido", rejected: ["chorume"], why: "chorume = landfill leachate" },
    { concept: "EBITDA", term: "Resultado operacional" },
    { concept: "DSCR", term: "DSCR", rejected: ["ICSD"] },
  ],
  es: [
    { concept: "upgrading", term: "purificación", why: "depuración = wastewater treatment" },
    { concept: "permit difficulty", term: "dificultad" },
  ],
  fr: [
    { concept: "never pays back", term: "non atteint" },
    { concept: "pasteurisation", term: "pasteurisation" },
    { concept: "FR biomethane scheme", term: "Tarif d’achat du biométhane injecté" },
    { concept: "UK planning", term: "Autorisation d’urbanisme" },
  ],
  it: [
    { concept: "route", term: "percorso", why: "filiera only for the supply chain" },
    { concept: "palm oil mills", term: "oleifici di palma" },
  ],
  ro: [
    { concept: "upgrading", term: "purificare", why: "epurare = wastewater treatment" },
    { concept: "gate fee", term: "taxă de primire" },
    { concept: "Monte Carlo range", term: "interval de probabilitate", rejected: ["certitudine"] },
  ],
  cs: [{ concept: "gate fee", term: "poplatek za převzetí" }],
  sk: [{ concept: "slurry", term: "hnojovica", rejected: ["kejd"], why: "kejda is Czech" }],
  bg: [
    { concept: "verdict", term: "Заключение", why: "Оценка also means score" },
    { concept: "upgrading", term: "Обогатяване до биометан" },
  ],
  sr: [
    { concept: "verdict", term: "Zaključak", why: "Procena also means score" },
    { concept: "economics", term: "ekonomika", why: "ekonomija = economy" },
  ],
  vi: [
    { concept: "Monte Carlo range", term: "Khoảng xác suất" },
    { concept: "Possible with conditions", term: "Có thể, nếu đáp ứng điều kiện", why: "khả thi reads as a feasibility study" },
  ],
  th: [
    { concept: "Monte Carlo range", term: "ช่วงความน่าจะเป็น" },
    { concept: "economics", term: "ความคุ้มค่าทางเศรษฐกิจ", why: "เศรษฐศาสตร์ = the discipline" },
    { concept: "whey", term: "เวย์" },
    { concept: "slurry", term: "สเลอร์รี" },
  ],
};

const Q = {
  en: "“”‘’", uk: "«»„“", pl: "„”«»", de: "„“»«‚‘", fr: "«»“”", it: "«»“”", es: "«»“”", pt: "“”‘’", nl: "“”„‘’", cs: "„“‚‘", sk: "„“‚‘",
  hu: "„”»«", ro: "„”«»", bg: "„“", sr: "„“”’", el: "«»“”", tr: "“”‘’", lt: "„“‚‘", lv: "„“«»", et: "„“", da: "„“»«”", sv: "”»’", fi: "”»’",
  vi: "“”", th: "“”‘’",
} satisfies Record<Locale, string>;

const stem = (stems: string, use: string) => stems.split("|").map((s) => ({ stem: s, use }));

export const GLOSSARY: Record<Locale, LocaleGlossary> = {
  en: {
    terms: { digester: "Digester", digestate: "Digestate", feedstock: "Feedstock", chp: "CHP", biomethane: "Biomethane", payback: "Payback", npv: "NPV", irr: "IRR", cod: "COD", dm: "DM", conservative: "Conservative", base: "Base", optimistic: "Optimistic", planStandard: "Standard Report", planExtended: "Extended Report" },
    forbidden: [...stem("pessimistic", "Conservative"), ...stem("fermenter", "Digester")],
    style: { address: "formal", percent: "space", decimal: ".", quotes: Q.en },
  },
  uk: {
    terms: { digester: "Реактор", digestate: "Дигестат", feedstock: "Сировина", chp: "Когенерація", biomethane: "Біометан", payback: "Окупність", npv: "NPV", irr: "IRR", cod: "ХСК", dm: "СР", conservative: "Консервативний", base: "Базовий", optimistic: "Оптимістичний", planStandard: "Основний звіт", planExtended: "Розширений звіт" },
    forbidden: [...stem("песиміст", "Консервативний"), ...stem("існуюч", "наявний"), ...stem("дайджестер|дигестер|дигестор", "Реактор"), ...stem("фідсток|фідстоки", "Сировина")],
    style: { address: "formal", percent: "space", decimal: ",", quotes: Q.uk },
  },
  pl: {
    terms: { digester: "Komora fermentacyjna", digestate: "Poferment", feedstock: "Substrat", chp: "Kogeneracja", biomethane: "Biometan", payback: "Okres zwrotu", npv: "NPV", irr: "IRR", cod: "ChZT", dm: "s.m.", conservative: "Ostrożny", base: "Bazowy", optimistic: "Optymistyczny", planStandard: "Raport podstawowy", planExtended: "Raport rozszerzony" },
    forbidden: [...stem("pesymisty", "Ostrożny"), ...stem("digestat|dygestat", "Poferment"), ...stem("fidstok", "Substrat")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.pl },
  },
  de: {
    terms: { digester: "Fermenter", digestate: "Gärrest", feedstock: "Substrat", chp: "BHKW", biomethane: "Biomethan", payback: "Amortisation", npv: "Kapitalwert", irr: "Interner Zinsfuß", cod: "CSB", dm: "TS", conservative: "Konservativ", base: "Basis", optimistic: "Optimistisch", planStandard: "Basisbericht", planExtended: "Erweiterter Bericht" },
    forbidden: [...stem("pessimist", "Konservativ"), ...stem("digestat|digestor", "Gärrest / Fermenter"), ...stem("feedstock", "Substrat")],
    style: { address: "formal", percent: "space", decimal: ",", quotes: Q.de },
  },
  fr: {
    terms: { digester: "Digesteur", digestate: "Digestat", feedstock: "Intrants", chp: "Cogénération", biomethane: "Biométhane", payback: "Temps de retour", npv: "VAN", irr: "TRI", cod: "DCO", dm: "MS", conservative: "Prudent", base: "Base", optimistic: "Optimiste", planStandard: "Rapport essentiel", planExtended: "Rapport approfondi" },
    forbidden: [...stem("pessimiste", "Prudent"), ...stem("digestor|digester", "Digesteur"), ...stem("feedstock", "Intrants")],
    style: { address: "formal", percent: "space", decimal: ",", quotes: Q.fr },
  },
  it: {
    terms: { digester: "Digestore", digestate: "Digestato", feedstock: "Matrici", chp: "Cogenerazione", biomethane: "Biometano", payback: "Tempo di rientro", npv: "VAN", irr: "TIR", cod: "COD", dm: "SS", conservative: "Prudente", base: "Base", optimistic: "Ottimistico", planStandard: "Report essenziale", planExtended: "Report approfondito" },
    forbidden: [...stem("pessimist", "Prudente"), ...stem("digester", "Digestore"), ...stem("feedstock", "Matrici")],
    style: { address: "tu", percent: "tight", decimal: ",", quotes: Q.it },
  },
  es: {
    terms: { digester: "Digestor", digestate: "Digestato", feedstock: "Materia prima", chp: "Cogeneración", biomethane: "Biometano", payback: "Retorno", npv: "VAN", irr: "TIR", cod: "DQO", dm: "MS", conservative: "Conservador", base: "Base", optimistic: "Optimista", planStandard: "Informe esencial", planExtended: "Informe ampliado" },
    forbidden: [...stem("pesimist", "Conservador"), ...stem("digester", "Digestor"), ...stem("feedstock", "Materia prima")],
    style: { address: "usted", percent: "space", decimal: ",", quotes: Q.es },
  },
  pt: {
    terms: { digester: "Biodigestor", digestate: "Digestato", feedstock: "Substrato", chp: "Cogeração", biomethane: "Biometano", payback: "Payback", npv: "VPL", irr: "TIR", cod: "DQO", dm: "MS", conservative: "Conservador", base: "Base", optimistic: "Otimista", planStandard: "Relatório essencial", planExtended: "Relatório completo" },
    forbidden: [...stem("pessimist", "Conservador"), ...stem("digester|digestor", "Biodigestor"), ...stem("feedstock", "Substrato")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.pt },
  },
  nl: {
    terms: { digester: "Vergister", digestate: "Digestaat", feedstock: "Reststromen", chp: "WKK", biomethane: "Groen gas", payback: "Terugverdientijd", npv: "NCW", irr: "IRR", cod: "CZV", dm: "DS", conservative: "Voorzichtig", base: "Basis", optimistic: "Optimistisch", planStandard: "Basisrapport", planExtended: "Uitgebreid rapport" },
    forbidden: [...stem("pessimist", "Voorzichtig"), ...stem("fermenter|digester", "Vergister"), ...stem("feedstock", "Reststromen")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.nl },
  },
  cs: {
    terms: { digester: "Fermentor", digestate: "Digestát", feedstock: "Vstupní suroviny", chp: "Kogenerace", biomethane: "Biometan", payback: "Návratnost", npv: "NPV", irr: "IRR", cod: "CHSK", dm: "sušina", conservative: "Konzervativní", base: "Základní", optimistic: "Optimistický", planStandard: "Základní zpráva", planExtended: "Rozšířená zpráva" },
    forbidden: [...stem("pesimist", "Konzervativní"), ...stem("digester|digestor", "Fermentor"), ...stem("feedstock|fidstok", "Suroviny")],
    style: { address: "formal", percent: "space", decimal: ",", quotes: Q.cs },
  },
  sk: {
    terms: { digester: "Fermentor", digestate: "Digestát", feedstock: "Vstupné suroviny", chp: "Kogenerácia", biomethane: "Biometán", payback: "Návratnosť", npv: "NPV", irr: "IRR", cod: "CHSK", dm: "sušina", conservative: "Konzervatívny", base: "Základný", optimistic: "Optimistický", planStandard: "Základná správa", planExtended: "Rozšírená správa" },
    forbidden: [...stem("pesimist", "Konzervatívny"), ...stem("digester|digestor", "Fermentor"), ...stem("feedstock|fidstok", "Suroviny")],
    style: { address: "formal", percent: "space", decimal: ",", quotes: Q.sk },
  },
  hu: {
    terms: { digester: "Fermentor", digestate: "Digestátum", feedstock: "Alapanyag", chp: "Kogeneráció", biomethane: "Biometán", payback: "Megtérülés", npv: "NPV", irr: "IRR", cod: "KOI", dm: "sz.a.", conservative: "Óvatos", base: "Alap", optimistic: "Optimista", planStandard: "Alapjelentés", planExtended: "Bővített jelentés" },
    forbidden: [...stem("pesszimist", "Óvatos"), ...stem("digester|digestor", "Fermentor"), ...stem("feedstock", "Alapanyag")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.hu },
  },
  ro: {
    terms: { digester: "Fermentator", digestate: "Digestat", feedstock: "Materie primă", chp: "Cogenerare", biomethane: "Biometan", payback: "Recuperare", npv: "VAN", irr: "RIR", cod: "CCO", dm: "SU", conservative: "Prudent", base: "Bază", optimistic: "Optimist", planStandard: "Raport de bază", planExtended: "Raport extins" },
    forbidden: [...stem("pesimist", "Prudent"), ...stem("digester|digestor", "Fermentator"), ...stem("feedstock", "Materie primă")],
    style: { address: "formal", percent: "space", decimal: ",", quotes: Q.ro },
  },
  bg: {
    terms: { digester: "Ферментатор", digestate: "Дигестат", feedstock: "Суровина", chp: "Когенерация", biomethane: "Биометан", payback: "Откупуване", npv: "NPV", irr: "IRR", cod: "ХПК", dm: "СВ", conservative: "Консервативен", base: "Базов", optimistic: "Оптимистичен", planStandard: "Основен доклад", planExtended: "Разширен доклад" },
    forbidden: [...stem("песимист", "Консервативен"), ...stem("дайджестер|дигестор", "Ферментатор"), ...stem("фийдсток|фидсток", "Суровина")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.bg },
  },
  sr: {
    terms: { digester: "Fermentor", digestate: "Digestat", feedstock: "Sirovina", chp: "Kogeneracija", biomethane: "Biometan", payback: "Povraćaj", npv: "NPV", irr: "IRR", cod: "HPK", dm: "SM", conservative: "Konzervativni", base: "Osnovni", optimistic: "Optimistični", planStandard: "Osnovni izveštaj", planExtended: "Prošireni izveštaj" },
    forbidden: [...stem("pesimist", "Konzervativni"), ...stem("digester|digestor", "Fermentor"), ...stem("feedstock|fidstok", "Sirovina")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.sr },
  },
  el: {
    terms: { digester: "Χωνευτήρας", digestate: "Χώνευμα", feedstock: "Πρώτη ύλη", chp: "ΣΗΘ", biomethane: "Βιομεθάνιο", payback: "Απόσβεση", npv: "ΚΠΑ", irr: "IRR", cod: "COD", dm: "ΞΟ", conservative: "Συντηρητικό", base: "Βασικό", optimistic: "Αισιόδοξο", planStandard: "Βασική αναφορά", planExtended: "Εκτεταμένη αναφορά" },
    forbidden: [...stem("απαισιόδοξ", "Συντηρητικό")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.el },
  },
  tr: {
    terms: { digester: "Fermantör", digestate: "Digestat", feedstock: "Hammadde", chp: "Kojenerasyon", biomethane: "Biyometan", payback: "Geri ödeme", npv: "NBD", irr: "İVO", cod: "KOİ", dm: "KM", conservative: "Temkinli", base: "Baz", optimistic: "İyimser", planStandard: "Temel Rapor", planExtended: "Kapsamlı Rapor" },
    forbidden: [...stem("kötümser", "Temkinli"), ...stem("digester|digestor", "Fermantör"), ...stem("feedstock", "Hammadde")],
    style: { address: "formal", percent: "prefix", decimal: ",", quotes: Q.tr },
  },
  lt: {
    terms: { digester: "Fermentatorius", digestate: "Digestatas", feedstock: "Žaliava", chp: "Kogeneracija", biomethane: "Biometanas", payback: "Atsipirkimas", npv: "GDV", irr: "VGN", cod: "ChDS", dm: "SM", conservative: "Atsargus", base: "Bazinis", optimistic: "Optimistinis", planStandard: "Pagrindinė ataskaita", planExtended: "Išplėstinė ataskaita" },
    forbidden: [...stem("pesimist", "Atsargus"), ...stem("digester|digestor", "Fermentatorius"), ...stem("feedstock", "Žaliava")],
    style: { address: "formal", percent: "space", decimal: ",", quotes: Q.lt },
  },
  lv: {
    terms: { digester: "Fermentators", digestate: "Digestāts", feedstock: "Izejviela", chp: "Koģenerācija", biomethane: "Biometāns", payback: "Atmaksāšanās", npv: "NPV", irr: "IRR", cod: "ĶSP", dm: "SV", conservative: "Piesardzīgs", base: "Bāzes", optimistic: "Optimistisks", planStandard: "Pamata pārskats", planExtended: "Paplašināts pārskats" },
    forbidden: [...stem("pesimist", "Piesardzīgs"), ...stem("digester|digestor", "Fermentators"), ...stem("feedstock", "Izejviela")],
    style: { address: "formal", percent: "space", decimal: ",", quotes: Q.lv },
  },
  et: {
    terms: { digester: "Reaktor", digestate: "Kääritusjääk", feedstock: "Tooraine", chp: "Koostootmine", biomethane: "Biometaan", payback: "Tasuvus", npv: "NPV", irr: "IRR", cod: "KHT", dm: "KA", conservative: "Konservatiivne", base: "Baas", optimistic: "Optimistlik", planStandard: "Põhiaruanne", planExtended: "Laiendatud aruanne" },
    forbidden: [...stem("pessimist", "Konservatiivne"), ...stem("digester|digestor|digestaat", "Reaktor / Kääritusjääk"), ...stem("feedstock", "Tooraine")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.et },
  },
  da: {
    terms: { digester: "Reaktortank", digestate: "Afgasset biomasse", feedstock: "Biomasse", chp: "Kraftvarme", biomethane: "Biometan", payback: "Tilbagebetaling", npv: "Nutidsværdi", irr: "Intern rente", cod: "COD", dm: "TS", conservative: "Forsigtigt", base: "Basis", optimistic: "Optimistisk", planStandard: "Basisrapport", planExtended: "Udvidet rapport" },
    forbidden: [...stem("pessimist", "Forsigtigt"), ...stem("digester|digestat", "Reaktortank / Afgasset biomasse"), ...stem("feedstock", "Biomasse")],
    style: { address: "du", percent: "space", decimal: ",", quotes: Q.da },
  },
  sv: {
    terms: { digester: "Rötkammare", digestate: "Rötrest", feedstock: "Substrat", chp: "Kraftvärme", biomethane: "Biometan", payback: "Återbetalning", npv: "Nuvärde", irr: "Internränta", cod: "COD", dm: "TS", conservative: "Försiktigt", base: "Bas", optimistic: "Optimistiskt", planStandard: "Basrapport", planExtended: "Utökad rapport" },
    forbidden: [...stem("pessimist", "Försiktigt"), ...stem("digester|digestat", "Rötkammare / Rötrest"), ...stem("feedstock", "Substrat")],
    style: { address: "du", percent: "space", decimal: ",", quotes: Q.sv },
  },
  fi: {
    terms: { digester: "Reaktori", digestate: "Mädäte", feedstock: "Syöte", chp: "CHP", biomethane: "Biometaani", payback: "Takaisinmaksu", npv: "Nettonykyarvo", irr: "Sisäinen korkokanta", cod: "COD", dm: "KA", conservative: "Varovainen", base: "Perus", optimistic: "Optimistinen", planStandard: "Perusraportti", planExtended: "Laajennettu raportti" },
    forbidden: [...stem("pessimisti", "Varovainen"), ...stem("digester|digestaatti", "Reaktori / Mädäte"), ...stem("feedstock", "Syöte"), ...stem("mäde|mädävarast|ko-substraat", "Mädäte / Mädätevarasto / Seossyöte")],
    style: { address: "sinä", percent: "space", decimal: ",", quotes: Q.fi },
  },
  vi: {
    terms: { digester: "Bể phân hủy", digestate: "Chất thải sau phân hủy", feedstock: "Nguyên liệu", chp: "Đồng phát", biomethane: "Biomethane", payback: "Hoàn vốn", npv: "NPV", irr: "IRR", cod: "COD", dm: "CK", conservative: "Thận trọng", base: "Cơ sở", optimistic: "Lạc quan", planStandard: "Báo cáo cơ bản", planExtended: "Báo cáo chuyên sâu" },
    forbidden: [...stem("bi quan", "Thận trọng"), ...stem("feedstock", "Nguyên liệu")],
    style: { address: "formal", percent: "tight", decimal: ",", quotes: Q.vi },
  },
  th: {
    terms: { digester: "บ่อหมัก", digestate: "กากหลังหมัก", feedstock: "วัตถุดิบ", chp: "ผลิตไฟฟ้าและความร้อนร่วม", biomethane: "ไบโอมีเทน", payback: "ระยะคืนทุน", npv: "NPV", irr: "IRR", cod: "COD", dm: "TS", conservative: "ระมัดระวัง", base: "ฐาน", optimistic: "มองบวก", planStandard: "รายงานพื้นฐาน", planExtended: "รายงานเชิงลึก" },
    forbidden: [...stem("feedstock", "วัตถุดิบ")],
    style: { address: "formal", percent: "tight", decimal: ".", quotes: Q.th },
  },
};

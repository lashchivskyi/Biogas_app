import type { QualityGapId } from "@/core/types";
import type { Dict, Locale } from ".";

const laboratory: Record<Locale, string> = {
  en: "Laboratory DM, VS and BMP results for every feedstock stream",
  uk: "Лабораторні DM, VS і BMP для кожного потоку сировини",
  pl: "Wyniki laboratoryjne DM, VS i BMP dla każdego strumienia substratów",
  de: "Laborwerte für DM, VS und BMP für jeden Substratstrom",
  fr: "Résultats d’analyse DM, VS et BMP pour chaque flux d’intrants",
  it: "Analisi di laboratorio DM, VS e BMP per ciascuna matrice",
  es: "Resultados de laboratorio de DM, VS y BMP de cada sustrato",
  pt: "Resultados laboratoriais de DM, VS e BMP de cada fluxo de substrato",
  nl: "Laboratoriumwaarden voor DM, VS en BMP van elke grondstofstroom",
  cs: "Laboratorní hodnoty DM, VS a BMP pro každý substrát",
  sk: "Laboratórne hodnoty DM, VS a BMP pre každý substrát",
  hu: "Laboratóriumi DM-, VS- és BMP-értékek minden alapanyagáramhoz",
  ro: "Rezultate de laborator DM, VS și BMP pentru fiecare flux de substrat",
  bg: "Лабораторни стойности на DM, VS и BMP за всеки поток суровина",
  sr: "Laboratorijske vrednosti DM, VS i BMP za svaki tok sirovine",
  el: "Εργαστηριακές τιμές DM, VS και BMP για κάθε ρεύμα πρώτης ύλης",
  tr: "Her hammadde akışı için laboratuvar DM, VS ve BMP sonuçları",
  lt: "Kiekvieno žaliavos srauto laboratoriniai DM, VS ir BMP duomenys",
  lv: "Laboratoriskie DM, VS un BMP rezultāti katrai izejvielu plūsmai",
  et: "Iga toormevoo laboratoorsed DM-, VS- ja BMP-tulemused",
  da: "Laboratorieværdier for DM, VS og BMP for hver biomassestrøm",
  sv: "Laboratorievärden för DM, VS och BMP för varje substratflöde",
  fi: "Jokaisen syötevirran laboratoriossa mitatut DM-, VS- ja BMP-arvot",
  vi: "Kết quả phân tích DM, VS và BMP trong phòng thí nghiệm cho từng dòng nguyên liệu",
  th: "ผลตรวจ DM, VS และ BMP จากห้องปฏิบัติการสำหรับวัตถุดิบแต่ละประเภท",
};

const electricity: Record<Locale, string> = {
  en: "Annual electricity consumption — savings from self-consumption cannot be counted without it",
  uk: "Річне споживання електроенергії — без нього економію на власному споживанні не враховано",
  pl: "Roczne zużycie energii elektrycznej — bez tej wartości nie uwzględniamy oszczędności z autokonsumpcji",
  de: "Jährlicher Stromverbrauch — ohne diese Angabe werden keine Einsparungen durch Eigenverbrauch angerechnet",
  fr: "Consommation annuelle d’électricité — sans cette donnée, les économies d’autoconsommation ne sont pas comptabilisées",
  it: "Consumo annuo di elettricità — senza questo dato non si conteggia il risparmio da autoconsumo",
  es: "Consumo anual de electricidad — sin este dato no se contabiliza el ahorro por autoconsumo",
  pt: "Consumo anual de eletricidade — sem esse dado, a economia com autoconsumo não é contabilizada",
  nl: "Jaarlijks elektriciteitsverbruik — zonder dit gegeven tellen besparingen door eigen verbruik niet mee",
  cs: "Roční spotřeba elektřiny — bez tohoto údaje se úspora z vlastní spotřeby nezapočítává",
  sk: "Ročná spotreba elektriny — bez tohto údaja sa úspora z vlastnej spotreby nezapočítava",
  hu: "Éves villamosenergia-fogyasztás — enélkül a saját felhasználás megtakarítása nem számolható el",
  ro: "Consumul anual de electricitate — fără această valoare nu se includ economiile din autoconsum",
  bg: "Годишно потребление на електроенергия — без него не се отчитат икономии от собствено потребление",
  sr: "Godišnja potrošnja električne energije — bez ovog podatka uštede od sopstvene potrošnje se ne uračunavaju",
  el: "Ετήσια κατανάλωση ηλεκτρικής ενέργειας — χωρίς αυτή δεν συνυπολογίζεται εξοικονόμηση από ιδιοκατανάλωση",
  tr: "Yıllık elektrik tüketimi — bu bilgi olmadan öz tüketim tasarrufu hesaba katılmaz",
  lt: "Metinis elektros suvartojimas — be šių duomenų neįskaičiuojamas sutaupymas naudojant elektrą savoms reikmėms",
  lv: "Gada elektroenerģijas patēriņš — bez šiem datiem pašpatēriņa ietaupījums netiek ieskaitīts",
  et: "Aastane elektritarbimine — ilma selleta ei arvestata oma tarbimisest saadavat kokkuhoidu",
  da: "Årligt elforbrug — uden dette tal medregnes besparelsen ved eget elforbrug ikke",
  sv: "Årlig elförbrukning — utan denna uppgift räknas ingen besparing från egen elanvändning",
  fi: "Vuotuinen sähkönkulutus — ilman tätä tietoa oman sähkönkäytön säästöä ei lasketa mukaan",
  vi: "Lượng điện tiêu thụ hằng năm — nếu thiếu dữ liệu này, khoản tiết kiệm từ điện tự dùng sẽ không được tính",
  th: "ปริมาณการใช้ไฟฟ้าต่อปี หากไม่มีข้อมูลนี้จะยังไม่รวมค่าไฟที่ประหยัดได้จากการใช้ไฟฟ้าที่ผลิตเอง",
};

/** IDs come from the quality rules, not from matching English fragments. */
export function qualityGapCopy(locale: Locale, d: Pick<Dict, "calc" | "labels">, currency: string): Record<QualityGapId, string> {
  const C = d.calc, U = d.labels.units;
  return {
    lab: laboratory[locale],
    electricity: `${electricity[locale]} (${U.kwh})`,
    electricity_price: `${C.elecPrice} (${currency}/${U.kwh})`,
    heat: `${C.heatKwh}. ${C.heatKwhHint}`,
    land: `${C.land} (${U.ha})`,
    distance: `${C.delivered}: ${C.distance} (${U.km})`,
    disposal: `${C.disposalCost} (${currency}/${U.t}). ${C.disposalHint}`,
  };
}

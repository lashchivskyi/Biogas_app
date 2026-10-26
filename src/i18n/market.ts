import type { Locale } from "./config";

type MarketCopy = readonly [string, string, string, string, string, string, string, string, string];
// Five benchmark labels, followed by official study / trade press / vendor / single project.
const copy: Record<Locale, MarketCopy> = {
  en: ["Small manure plants, Germany", "Cattle-manure plant, IEA Task 37", "Flexible plant, Germany", "Agricultural plants, Poland", "Biogas plants, Ukraine", "Official study", "Trade press", "Supplier estimate", "Single project"],
  uk: ["Малі гнойові установки, Німеччина", "Установка на гної ВРХ, IEA Task 37", "Установка з гнучкою генерацією, Німеччина", "Аграрні установки, Польща", "Біогазові установки, Україна", "Офіційне дослідження", "Галузева преса", "Оцінка постачальника", "Окремий проєкт"],
  pl: ["Małe instalacje na nawozy naturalne, Niemcy", "Instalacja na obornik bydlęcy, IEA Task 37", "Instalacja z elastyczną generacją, Niemcy", "Biogazownie rolnicze, Polska", "Biogazownie, Ukraina", "Badanie urzędowe", "Prasa branżowa", "Szacunek dostawcy", "Pojedynczy projekt"],
  de: ["Kleine Gülleanlagen, Deutschland", "Rindergülleanlage, IEA Task 37", "Flexibel betriebene Anlage, Deutschland", "Landwirtschaftliche Anlagen, Polen", "Biogasanlagen, Ukraine", "Offizielle Studie", "Fachpresse", "Anbieterschätzung", "Einzelprojekt"],
  fr: ["Petites unités sur effluents d’élevage, Allemagne", "Unité sur effluents bovins, IEA Task 37", "Unité à production flexible, Allemagne", "Unités agricoles, Pologne", "Unités de méthanisation, Ukraine", "Étude officielle", "Presse spécialisée", "Estimation fournisseur", "Projet individuel"],
  it: ["Piccoli impianti a reflui zootecnici, Germania", "Impianto a reflui bovini, IEA Task 37", "Impianto a produzione flessibile, Germania", "Impianti agricoli, Polonia", "Impianti a biogas, Ucraina", "Studio ufficiale", "Stampa di settore", "Stima del fornitore", "Singolo progetto"],
  es: ["Pequeñas plantas de estiércol, Alemania", "Planta de estiércol bovino, IEA Task 37", "Planta de generación flexible, Alemania", "Plantas agrícolas, Polonia", "Plantas de biogás, Ucrania", "Estudio oficial", "Prensa especializada", "Estimación del proveedor", "Proyecto individual"],
  pt: ["Pequenas plantas de dejetos animais, Alemanha", "Planta de dejetos bovinos, IEA Task 37", "Planta de geração flexível, Alemanha", "Plantas agrícolas, Polônia", "Plantas de biogás, Ucrânia", "Estudo oficial", "Imprensa especializada", "Estimativa do fornecedor", "Projeto individual"],
  nl: ["Kleine mestvergisters, Duitsland", "Rundermestvergister, IEA Task 37", "Installatie met flexibele productie, Duitsland", "Agrarische installaties, Polen", "Biogasinstallaties, Oekraïne", "Officieel onderzoek", "Vakpers", "Leveranciersraming", "Afzonderlijk project"],
  cs: ["Malé stanice na statková hnojiva, Německo", "Stanice na skotová statková hnojiva, IEA Task 37", "Stanice s flexibilní výrobou, Německo", "Zemědělské stanice, Polsko", "Bioplynové stanice, Ukrajina", "Oficiální studie", "Odborný tisk", "Odhad dodavatele", "Jednotlivý projekt"],
  sk: ["Malé stanice na hospodárske hnojivá, Nemecko", "Stanica na hnojivá z chovu dobytka, IEA Task 37", "Stanica s flexibilnou výrobou, Nemecko", "Poľnohospodárske stanice, Poľsko", "Bioplynové stanice, Ukrajina", "Oficiálna štúdia", "Odborná tlač", "Odhad dodávateľa", "Jednotlivý projekt"],
  hu: ["Kis trágyafeldolgozó üzemek, Németország", "Szarvasmarhatrágya-alapú üzem, IEA Task 37", "Rugalmas termelésű üzem, Németország", "Mezőgazdasági üzemek, Lengyelország", "Biogázüzemek, Ukrajna", "Hivatalos tanulmány", "Szakmai sajtó", "Beszállítói becslés", "Egyedi projekt"],
  ro: ["Instalații mici pe dejecții, Germania", "Instalație pe dejecții bovine, IEA Task 37", "Instalație cu producție flexibilă, Germania", "Instalații agricole, Polonia", "Instalații de biogaz, Ucraina", "Studiu oficial", "Presă de specialitate", "Estimare a furnizorului", "Proiect individual"],
  bg: ["Малки инсталации за оборски тор, Германия", "Инсталация за говежди тор, IEA Task 37", "Инсталация с гъвкаво производство, Германия", "Селскостопански инсталации, Полша", "Биогазови инсталации, Украйна", "Официално проучване", "Специализирана преса", "Оценка на доставчика", "Отделен проект"],
  sr: ["Mala postrojenja na stajnjak, Nemačka", "Postrojenje na goveđi stajnjak, IEA Task 37", "Postrojenje sa fleksibilnom proizvodnjom, Nemačka", "Poljoprivredna postrojenja, Poljska", "Biogasna postrojenja, Ukrajina", "Zvanična studija", "Stručna štampa", "Procena dobavljača", "Pojedinačni projekat"],
  el: ["Μικρές μονάδες κοπριάς, Γερμανία", "Μονάδα κοπριάς βοοειδών, IEA Task 37", "Μονάδα ευέλικτης παραγωγής, Γερμανία", "Αγροτικές μονάδες, Πολωνία", "Μονάδες βιοαερίου, Ουκρανία", "Επίσημη μελέτη", "Κλαδικός Τύπος", "Εκτίμηση προμηθευτή", "Μεμονωμένο έργο"],
  tr: ["Küçük gübre tesisleri, Almanya", "Sığır gübresi tesisi, IEA Task 37", "Esnek üretimli tesis, Almanya", "Tarımsal tesisler, Polonya", "Biyogaz tesisleri, Ukrayna", "Resmî çalışma", "Sektör basını", "Tedarikçi tahmini", "Tekil proje"],
  lt: ["Mažos mėšlo biodujų gamyklos, Vokietija", "Galvijų mėšlo biodujų gamykla, IEA Task 37", "Lanksčios gamybos įrenginys, Vokietija", "Žemės ūkio įrenginiai, Lenkija", "Biodujų gamyklos, Ukraina", "Oficialus tyrimas", "Sektoriaus spauda", "Tiekėjo įvertis", "Atskiras projektas"],
  lv: ["Mazas kūtsmēslu biogāzes ražotnes, Vācija", "Liellopu kūtsmēslu ražotne, IEA Task 37", "Ražotne ar elastīgu izstrādi, Vācija", "Lauksaimniecības ražotnes, Polija", "Biogāzes ražotnes, Ukraina", "Oficiāls pētījums", "Nozares prese", "Piegādātāja aplēse", "Atsevišķs projekts"],
  et: ["Väikesed sõnnikujaamad, Saksamaa", "Veisesõnnikujaam, IEA Task 37", "Paindliku tootmisega jaam, Saksamaa", "Põllumajandusjaamad, Poola", "Biogaasijaamad, Ukraina", "Ametlik uuring", "Erialameedia", "Tarnija hinnang", "Üksikprojekt"],
  da: ["Små gyllebaserede anlæg, Tyskland", "Kvæggyllebaseret anlæg, IEA Task 37", "Anlæg med fleksibel produktion, Tyskland", "Landbrugsanlæg, Polen", "Biogasanlæg, Ukraine", "Officiel undersøgelse", "Fagpresse", "Leverandørskøn", "Enkeltprojekt"],
  sv: ["Små gödselanläggningar, Tyskland", "Nötgödselanläggning, IEA Task 37", "Anläggning med flexibel produktion, Tyskland", "Lantbruksanläggningar, Polen", "Biogasanläggningar, Ukraina", "Officiell studie", "Fackpress", "Leverantörsuppskattning", "Enskilt projekt"],
  fi: ["Pienet lantapohjaiset laitokset, Saksa", "Naudanlantapohjainen laitos, IEA Task 37", "Joustavan tuotannon laitos, Saksa", "Maatalouslaitokset, Puola", "Biokaasulaitokset, Ukraina", "Virallinen tutkimus", "Ammattilehdistö", "Toimittajan arvio", "Yksittäinen hanke"],
  vi: ["Nhà máy nhỏ sử dụng phân chuồng, Đức", "Nhà máy sử dụng phân bò, IEA Task 37", "Nhà máy phát điện linh hoạt, Đức", "Nhà máy nông nghiệp, Ba Lan", "Nhà máy biogas, Ukraine", "Nghiên cứu chính thức", "Báo chuyên ngành", "Ước tính của nhà cung cấp", "Dự án riêng lẻ"],
  th: ["โรงงานขนาดเล็กใช้มูลสัตว์ เยอรมนี", "โรงงานใช้มูลโค IEA Task 37", "โรงงานผลิตพลังงานแบบยืดหยุ่น เยอรมนี", "โรงงานภาคเกษตร โปแลนด์", "โรงงานก๊าซชีวภาพ ยูเครน", "การศึกษาอย่างเป็นทางการ", "สื่ออุตสาหกรรม", "ประมาณการจากผู้จัดจำหน่าย", "โครงการรายแห่ง"],
};
const ids = ["de_small_manure", "task37_manure_200", "de_500_flex", "pl_500_1000", "ua_1mw"];
const quality = ["official study", "trade press", "vendor", "single project"];
export function marketLabel(locale: Locale, id: string): string | undefined {
  const i = ids.indexOf(id);
  return i < 0 ? undefined : copy[locale][i];
}
export function marketQuality(locale: Locale, value: string): string | undefined {
  const i = quality.indexOf(value);
  return i < 0 ? undefined : copy[locale][5 + i];
}

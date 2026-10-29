import type { Locale } from "./config";

type Copy = readonly [string, string, string, string, string, string, string, string, string, string, string];
const copy: Record<Locale, Copy> = {
  en: ["Specialist design needed", "Separate assessment", "This opportunity needs a different technical model. Paid reports for it are not available in this calculator.", "National evidence only; local demand and feedstock availability are not confirmed.", "Documented sector activity", "Resource or policy signal", "Evidence needs verification", "Feedstock range: engineering assumption", "Check local feedstock: this industry is usually concentrated in producing regions.", "Market context", "Sector activity does not establish a customer's buying intent or project profitability."],
  uk: ["Потрібен спеціалізований проєкт", "Окрема оцінка", "Для цього напрямку потрібна інша технічна модель. Оплачені звіти для нього в цьому калькуляторі недоступні.", "Є лише країнові дані: місцевий попит і доступність сировини не підтверджено.", "Підтверджена галузева активність", "Ресурсні або регуляторні передумови", "Дані потребують перевірки", "Діапазон сировини: інженерне припущення", "Уточніть місцеву сировинну базу: ця галузь зазвичай зосереджена в регіонах виробництва.", "Ринковий контекст", "Галузева активність не підтверджує наміру конкретного клієнта купувати чи прибутковості проєкту."],
  pl: ["Potrzebny projekt specjalistyczny", "Odrębna ocena", "Ten kierunek wymaga innego modelu technicznego. Płatne raporty nie są dla niego dostępne w tym kalkulatorze.", "Dostępne są tylko dane krajowe; lokalny popyt i dostępność substratów nie są potwierdzone.", "Udokumentowana aktywność branży", "Przesłanki surowcowe lub regulacyjne", "Dane wymagają weryfikacji", "Zakres ilości substratu: założenie inżynierskie", "Sprawdź lokalne substraty: ta branża skupia się zwykle w regionach produkcyjnych.", "Kontekst rynkowy", "Aktywność branży nie potwierdza zamiaru zakupu konkretnego klienta ani rentowności projektu."],
  de: ["Fachspezifische Planung nötig", "Gesonderte Bewertung", "Dieser Bereich erfordert ein anderes technisches Modell. Dafür sind in diesem Rechner keine kostenpflichtigen Berichte verfügbar.", "Nur nationale Daten; lokale Nachfrage und Substratverfügbarkeit sind nicht bestätigt.", "Dokumentierte Branchenaktivität", "Rohstoff- oder politisches Signal", "Daten müssen geprüft werden", "Substratbandbreite: technische Annahme", "Lokale Substrate prüfen: Diese Branche konzentriert sich meist auf Erzeugungsregionen.", "Marktumfeld", "Branchenaktivität belegt weder die Kaufabsicht eines Kunden noch die Projektrentabilität."],
  fr: ["Conception spécialisée nécessaire", "Évaluation distincte", "Cette activité exige un autre modèle technique. Aucun rapport payant n’est proposé pour elle dans ce calculateur.", "Données nationales uniquement ; demande locale et disponibilité des intrants non confirmées.", "Activité sectorielle documentée", "Potentiel de ressources ou signal réglementaire", "Données à vérifier", "Fourchette d’intrants : hypothèse technique", "Vérifiez les intrants locaux : cette activité se concentre généralement dans les régions productrices.", "Contexte de marché", "L’activité du secteur ne prouve ni l’intention d’achat d’un client ni la rentabilité d’un projet."],
  it: ["Serve una progettazione specialistica", "Valutazione separata", "Questo settore richiede un modello tecnico diverso. Per questo caso il calcolatore non offre report a pagamento.", "Solo dati nazionali: domanda locale e disponibilità delle matrici non sono confermate.", "Attività di settore documentata", "Disponibilità di risorse o segnali normativi", "Dati da verificare", "Intervallo di matrici: ipotesi tecnica", "Verifica le matrici locali: questa attività si concentra di norma nelle aree di produzione.", "Contesto di mercato", "L’attività del settore non dimostra l’intenzione d’acquisto di un cliente né la redditività del progetto."],
  es: ["Requiere diseño especializado", "Evaluación independiente", "Este sector necesita otro modelo técnico. Este calculador no ofrece informes de pago para ese caso.", "Solo hay datos nacionales; no se han confirmado la demanda local ni los sustratos disponibles.", "Actividad sectorial documentada", "Disponibilidad de recursos o señal regulatoria", "Datos pendientes de verificación", "Rango de sustrato: supuesto técnico", "Comprueba los sustratos locales: esta actividad suele concentrarse en las zonas productoras.", "Contexto de mercado", "La actividad del sector no demuestra la intención de compra de un cliente ni la rentabilidad del proyecto."],
  pt: ["Exige projeto especializado", "Avaliação separada", "Este segmento exige outro modelo técnico. O calculador não oferece relatórios pagos para esse caso.", "Há apenas dados nacionais; a demanda local e a disponibilidade de substratos não foram confirmadas.", "Atividade setorial documentada", "Potencial de recursos ou sinal regulatório", "Dados precisam de verificação", "Faixa de substrato: premissa de engenharia", "Confira os substratos locais: esse setor costuma se concentrar nas regiões produtoras.", "Contexto de mercado", "A atividade do setor não comprova a intenção de compra de um cliente nem a rentabilidade do projeto."],
  nl: ["Specialistisch ontwerp nodig", "Afzonderlijke beoordeling", "Deze activiteit vraagt om een ander technisch model. Deze calculator biedt daarvoor geen betaalde rapporten.", "Alleen landelijke gegevens; lokale vraag en beschikbaarheid van grondstoffen zijn niet bevestigd.", "Gedocumenteerde sectoractiviteit", "Grondstoffen- of beleidssignaal", "Gegevens moeten worden geverifieerd", "Grondstoffenbereik: technische aanname", "Controleer lokale grondstoffen: deze sector bevindt zich meestal in productiegebieden.", "Marktcontext", "Sectoractiviteit bewijst niet dat een klant wil kopen of dat een project rendabel is."],
  cs: ["Nutný specializovaný návrh", "Samostatné posouzení", "Tento obor vyžaduje jiný technický model. Kalkulačka pro něj nenabízí placené zprávy.", "Pouze celostátní údaje; místní poptávka ani dostupnost substrátů nejsou potvrzeny.", "Doložená aktivita v oboru", "Surovinové nebo regulační předpoklady", "Údaje je nutné ověřit", "Rozsah substrátu: technický předpoklad", "Ověřte místní substráty: tento obor se obvykle soustřeďuje do produkčních oblastí.", "Tržní kontext", "Aktivita oboru nedokládá nákupní záměr zákazníka ani rentabilitu projektu."],
  sk: ["Potrebný špecializovaný návrh", "Samostatné posúdenie", "Tento odbor vyžaduje iný technický model. Kalkulačka preň neponúka platené správy.", "Len celoštátne údaje; miestny dopyt ani dostupnosť substrátov nie sú potvrdené.", "Doložená aktivita v odvetví", "Surovinové alebo regulačné predpoklady", "Údaje treba overiť", "Rozsah substrátu: technický predpoklad", "Overte miestne substráty: toto odvetvie sa zvyčajne sústreďuje do produkčných oblastí.", "Trhový kontext", "Aktivita odvetvia nedokladá nákupný zámer zákazníka ani rentabilitu projektu."],
  hu: ["Szakági tervezés szükséges", "Külön értékelés", "Ez az ágazat más műszaki modellt igényel. A kalkulátor ehhez nem kínál fizetős jelentést.", "Csak országos adatok állnak rendelkezésre; a helyi kereslet és alapanyag-ellátás nem igazolt.", "Dokumentált ágazati tevékenység", "Alapanyag- vagy szabályozási lehetőség", "Az adatok ellenőrzendők", "Alapanyagtartomány: műszaki feltételezés", "Ellenőrizze a helyi alapanyagokat: ez az ágazat jellemzően a termelő térségekben összpontosul.", "Piaci környezet", "Az ágazati tevékenység nem igazolja egy ügyfél vásárlási szándékát vagy a projekt jövedelmezőségét."],
  ro: ["Este necesară proiectare specializată", "Evaluare separată", "Acest sector necesită un alt model tehnic. Calculatorul nu oferă rapoarte plătite pentru acest caz.", "Doar date naționale; cererea locală și disponibilitatea substraturilor nu sunt confirmate.", "Activitate sectorială documentată", "Premise de resurse sau de reglementare", "Datele necesită verificare", "Interval de substrat: ipoteză inginerească", "Verificați substraturile locale: acest sector se concentrează de obicei în regiunile producătoare.", "Context de piață", "Activitatea sectorului nu confirmă intenția de cumpărare a unui client sau rentabilitatea proiectului."],
  bg: ["Необходим е специализиран проект", "Отделна оценка", "Това направление изисква друг технически модел. Калкулаторът не предлага платени доклади за този случай.", "Има само национални данни; местното търсене и наличността на суровини не са потвърдени.", "Документирана секторна активност", "Ресурсни или регулаторни предпоставки", "Данните изискват проверка", "Диапазон на суровината: инженерно допускане", "Проверете местните суровини: този отрасъл обикновено е съсредоточен в производствените региони.", "Пазарен контекст", "Секторната активност не доказва намерението на клиент да купи или рентабилността на проекта."],
  sr: ["Potreban je specijalistički projekat", "Posebna procena", "Ova delatnost zahteva drugačiji tehnički model. Kalkulator za nju ne nudi plaćene izveštaje.", "Dostupni su samo nacionalni podaci; lokalna tražnja i raspoloživost sirovina nisu potvrđene.", "Dokumentovana aktivnost sektora", "Sirovinski ili regulatorni preduslovi", "Podatke treba proveriti", "Raspon sirovine: inženjerska pretpostavka", "Proverite lokalne sirovine: ova delatnost je obično vezana za proizvodne regione.", "Tržišni kontekst", "Aktivnost sektora ne potvrđuje nameru kupovine konkretnog klijenta niti isplativost projekta."],
  el: ["Απαιτείται εξειδικευμένη μελέτη", "Ξεχωριστή αξιολόγηση", "Αυτός ο τομέας απαιτεί διαφορετικό τεχνικό μοντέλο. Ο υπολογιστής δεν παρέχει πληρωμένες αναφορές για αυτή την περίπτωση.", "Μόνο εθνικά δεδομένα· η τοπική ζήτηση και η διαθεσιμότητα πρώτων υλών δεν έχουν επιβεβαιωθεί.", "Τεκμηριωμένη κλαδική δραστηριότητα", "Δυνατότητα πόρων ή ρυθμιστικό σήμα", "Τα δεδομένα χρειάζονται επαλήθευση", "Εύρος πρώτης ύλης: τεχνική παραδοχή", "Ελέγξτε τις τοπικές πρώτες ύλες: αυτός ο κλάδος συγκεντρώνεται συνήθως στις περιοχές παραγωγής.", "Συνθήκες αγοράς", "Η δραστηριότητα του κλάδου δεν αποδεικνύει πρόθεση αγοράς πελάτη ή κερδοφορία έργου."],
  tr: ["Uzmanlık gerektiren tasarım", "Ayrı değerlendirme", "Bu alan farklı bir teknik model gerektirir. Hesaplayıcı bu durum için ücretli rapor sunmaz.", "Yalnızca ulusal veriler var; yerel talep ve hammadde bulunabilirliği doğrulanmadı.", "Belgelenmiş sektör faaliyeti", "Kaynak veya mevzuat göstergesi", "Verilerin doğrulanması gerekiyor", "Hammadde aralığı: mühendislik varsayımı", "Yerel hammaddeyi kontrol edin: bu sektör genellikle üretim bölgelerinde yoğunlaşır.", "Piyasa bağlamı", "Sektör faaliyeti, belirli bir müşterinin satın alma niyetini veya projenin kârlılığını kanıtlamaz."],
  lt: ["Reikia specializuoto projekto", "Atskiras vertinimas", "Šiai veiklai reikia kito techninio modelio. Skaičiuoklė jai nesiūlo mokamų ataskaitų.", "Tik šalies duomenys; vietos paklausa ir žaliavų prieinamumas nepatvirtinti.", "Dokumentuota sektoriaus veikla", "Išteklių ar reguliavimo prielaidos", "Duomenis reikia patikrinti", "Žaliavų intervalas: inžinerinė prielaida", "Patikrinkite vietines žaliavas: šis sektorius paprastai telkiasi gamybos regionuose.", "Rinkos kontekstas", "Sektoriaus veikla nepatvirtina kliento ketinimo pirkti ar projekto pelningumo."],
  lv: ["Vajadzīgs specializēts projekts", "Atsevišķs izvērtējums", "Šai darbībai vajadzīgs cits tehniskais modelis. Kalkulators tai nepiedāvā maksas pārskatus.", "Tikai valsts līmeņa dati; vietējais pieprasījums un izejvielu pieejamība nav apstiprināti.", "Dokumentēta nozares aktivitāte", "Resursu vai regulējuma priekšnosacījumi", "Dati jāpārbauda", "Izejvielu diapazons: inženiertehnisks pieņēmums", "Pārbaudiet vietējās izejvielas: šī nozare parasti koncentrējas ražošanas reģionos.", "Tirgus konteksts", "Nozares aktivitāte nepierāda klienta pirkuma nodomu vai projekta rentabilitāti."],
  et: ["Vajalik on eriprojekt", "Eraldi hindamine", "See tegevus vajab teistsugust tehnilist mudelit. Kalkulaator ei paku selle jaoks tasulisi aruandeid.", "Ainult riigi tasandi andmed; kohalik nõudlus ja toorme kättesaadavus pole kinnitatud.", "Dokumenteeritud tegevus sektoris", "Ressursi- või poliitikasignaal", "Andmed vajavad kontrollimist", "Toormevahemik: insenertehniline eeldus", "Kontrollige kohalikku tooret: see sektor koondub tavaliselt tootmispiirkondadesse.", "Turukontekst", "Sektori tegevus ei tõenda kliendi ostusoovi ega projekti tasuvust."],
  da: ["Specialiseret projektering nødvendig", "Særskilt vurdering", "Denne aktivitet kræver en anden teknisk model. Beregneren tilbyder ikke betalte rapporter til dette tilfælde.", "Kun nationale data; lokal efterspørgsel og biomassetilgængelighed er ikke bekræftet.", "Dokumenteret aktivitet i branchen", "Ressource- eller politisk signal", "Data skal verificeres", "Biomasseinterval: teknisk antagelse", "Kontrollér lokal biomasse: branchen er som regel koncentreret i produktionsområder.", "Markedsforhold", "Brancheaktivitet dokumenterer ikke en kundes købsintention eller et projekts rentabilitet."],
  sv: ["Specialiserad projektering krävs", "Separat bedömning", "Denna verksamhet kräver en annan teknisk modell. Kalkylatorn erbjuder inga betalrapporter för detta fall.", "Endast nationella data; lokal efterfrågan och substrattillgång är inte bekräftade.", "Dokumenterad aktivitet i branschen", "Resurs- eller regelverkssignal", "Uppgifterna behöver verifieras", "Substratintervall: tekniskt antagande", "Kontrollera lokala substrat: branschen finns vanligen i produktionsområden.", "Marknadsförutsättningar", "Branschaktivitet bevisar inte en kunds köpavsikt eller ett projekts lönsamhet."],
  fi: ["Erikoissuunnittelu tarpeen", "Erillinen arviointi", "Tämä toiminta tarvitsee toisen teknisen mallin. Laskuri ei tarjoa tähän tapaukseen maksullisia raportteja.", "Vain valtakunnallisia tietoja; paikallista kysyntää ja syötteen saatavuutta ei ole vahvistettu.", "Dokumentoitu toimialan toiminta", "Resurssi- tai politiikkasignaali", "Tiedot on tarkistettava", "Syöteväli: tekninen oletus", "Tarkista paikalliset syötteet: tämä ala keskittyy yleensä tuotantoalueille.", "Markkinatilanne", "Toimialan toiminta ei osoita asiakkaan ostoaikomusta tai hankkeen kannattavuutta."],
  vi: ["Cần thiết kế chuyên biệt", "Đánh giá riêng", "Lĩnh vực này cần mô hình kỹ thuật khác. Công cụ không cung cấp báo cáo trả phí cho trường hợp này.", "Chỉ có dữ liệu cấp quốc gia; chưa xác nhận nhu cầu và nguồn nguyên liệu tại địa phương.", "Hoạt động ngành đã được ghi nhận", "Tiềm năng nguyên liệu hoặc tín hiệu chính sách", "Dữ liệu cần được xác minh", "Khoảng nguyên liệu: giả định kỹ thuật", "Kiểm tra nguồn nguyên liệu địa phương: ngành này thường tập trung tại các vùng sản xuất.", "Bối cảnh thị trường", "Hoạt động của ngành không chứng minh ý định mua của một khách hàng hay lợi nhuận của dự án."],
  th: ["ต้องออกแบบเฉพาะทาง", "ประเมินแยกต่างหาก", "กิจการประเภทนี้ต้องใช้แบบจำลองทางเทคนิคอื่น เครื่องคำนวณนี้ไม่จำหน่ายรายงานสำหรับกรณีนี้", "มีเพียงข้อมูลระดับประเทศ ยังไม่ยืนยันความต้องการและวัตถุดิบในพื้นที่", "มีหลักฐานกิจกรรมในอุตสาหกรรม", "มีปัจจัยด้านวัตถุดิบหรือนโยบาย", "ข้อมูลยังต้องตรวจสอบ", "ช่วงปริมาณวัตถุดิบ: สมมติฐานทางวิศวกรรม", "ตรวจสอบวัตถุดิบในพื้นที่ อุตสาหกรรมนี้มักกระจุกตัวในแหล่งผลิต", "บริบทตลาด", "กิจกรรมในอุตสาหกรรมไม่ได้ยืนยันว่าลูกค้ารายใดต้องการซื้อหรือโครงการจะมีกำไร"],
};
export function businessCopy(locale: Locale) {
  const [specialist, outside, scopeNote, national, observed, resource, unverified, scale, uncommon, market, caveat] = copy[locale];
  return { specialist, outside, scopeNote, national, observed, resource, unverified, scale, uncommon, market, caveat };
}

const groups: Record<Locale, readonly [string,string,string]> = {
  "en": [
    "Farming and aquaculture",
    "Industry and food trade",
    "Waste, wastewater and biogas facilities"
  ],
  "uk": [
    "Сільське господарство й аквакультура",
    "Промисловість і торгівля продуктами",
    "Переробка відходів, очисні та біогазові станції"
  ],
  "pl": [
    "Rolnictwo i akwakultura",
    "Przemysł i handel żywnością",
    "Odpady, oczyszczalnie i biogazownie"
  ],
  "de": [
    "Landwirtschaft und Aquakultur",
    "Industrie und Lebensmittelhandel",
    "Abfallwirtschaft, Kläranlagen und Biogasanlagen"
  ],
  "fr": [
    "Agriculture et aquaculture",
    "Industrie et commerce alimentaire",
    "Déchets, stations d’épuration et unités de méthanisation"
  ],
  "it": [
    "Agricoltura e acquacoltura",
    "Industria e commercio alimentare",
    "Rifiuti, depuratori e impianti di biogas"
  ],
  "es": [
    "Agricultura y acuicultura",
    "Industria y comercio alimentario",
    "Residuos, depuradoras y plantas de biogás"
  ],
  "pt": [
    "Agropecuária e aquicultura",
    "Indústria e comércio de alimentos",
    "Resíduos, estações de tratamento e usinas de biogás"
  ],
  "nl": [
    "Landbouw en aquacultuur",
    "Industrie en levensmiddelenhandel",
    "Afvalverwerking, waterzuivering en biogasinstallaties"
  ],
  "cs": [
    "Zemědělství a akvakultura",
    "Průmysl a obchod s potravinami",
    "Odpady, čistírny a bioplynové stanice"
  ],
  "sk": [
    "Poľnohospodárstvo a akvakultúra",
    "Priemysel a obchod s potravinami",
    "Odpady, čistiarne a bioplynové stanice"
  ],
  "hu": [
    "Mezőgazdaság és akvakultúra",
    "Ipar és élelmiszer-kereskedelem",
    "Hulladékkezelők, szennyvíztisztítók és biogázüzemek"
  ],
  "ro": [
    "Agricultură și acvacultură",
    "Industrie și comerț alimentar",
    "Deșeuri, stații de epurare și instalații de biogaz"
  ],
  "bg": [
    "Земеделие и аквакултури",
    "Промишленост и търговия с храни",
    "Отпадъци, пречиствателни станции и биогазови инсталации"
  ],
  "sr": [
    "Poljoprivreda i akvakultura",
    "Industrija i trgovina hranom",
    "Otpad, postrojenja za prečišćavanje i biogas"
  ],
  "el": [
    "Γεωργία, κτηνοτροφία και υδατοκαλλιέργεια",
    "Βιομηχανία και εμπόριο τροφίμων",
    "Απόβλητα, μονάδες λυμάτων και βιοαερίου"
  ],
  "tr": [
    "Tarım, hayvancılık ve su ürünleri",
    "Sanayi ve gıda ticareti",
    "Atık, atık su ve biyogaz tesisleri"
  ],
  "lt": [
    "Žemės ūkis ir akvakultūra",
    "Pramonė ir prekyba maistu",
    "Atliekų, nuotekų ir biodujų įrenginiai"
  ],
  "lv": [
    "Lauksaimniecība un akvakultūra",
    "Rūpniecība un pārtikas tirdzniecība",
    "Atkritumu, notekūdeņu un biogāzes iekārtas"
  ],
  "et": [
    "Põllumajandus ja vesiviljelus",
    "Tööstus ja toidukaubandus",
    "Jäätmekäitlus, reoveepuhastid ja biogaasijaamad"
  ],
  "da": [
    "Landbrug og akvakultur",
    "Industri og fødevarehandel",
    "Affaldsbehandling, renseanlæg og biogasanlæg"
  ],
  "sv": [
    "Lantbruk och vattenbruk",
    "Industri och livsmedelshandel",
    "Avfallsbehandling, reningsverk och biogasanläggningar"
  ],
  "fi": [
    "Maatalous ja vesiviljely",
    "Teollisuus ja elintarvikekauppa",
    "Jätteenkäsittely, jätevedenpuhdistamot ja biokaasulaitokset"
  ],
  "vi": [
    "Nông nghiệp và nuôi trồng thủy sản",
    "Công nghiệp và kinh doanh thực phẩm",
    "Cơ sở xử lý chất thải, nước thải và khí sinh học"
  ],
  "th": [
    "เกษตรกรรมและการเพาะเลี้ยงสัตว์น้ำ",
    "อุตสาหกรรมและการค้าอาหาร",
    "โรงบำบัดของเสีย น้ำเสีย และก๊าซชีวภาพ"
  ]
};
export const businessGroupLabel = (id: string, locale: Locale) => groups[locale][id === "farm" ? 0 : id === "food" ? 1 : 2];

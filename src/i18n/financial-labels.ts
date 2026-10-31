import type { Dict, Locale } from ".";
import { processFieldLabels } from "./processes";

const keys = ["storage_cover", "storage_new", "feed", "gas_system", "heat_network", "backup_boiler", "electrical", "piping", "civil", "engineering", "contingency", "labour", "chp_service", "maintenance", "insurance", "monitoring", "feedstock", "opportunity", "transport", "digestate_handling", "el_purchased", "heat_external", "cng_haul", "certification", "el_self", "el_export", "disposal", "digestate", "rejects", "storage_open"] as const;
const rows: Record<Locale, string> = {
  en: "Covering existing storage|New covered storage|Feedstock reception and preparation|Gas handling and cleaning|Heat network|Backup boiler|Electrical systems and controls|Pipework|Civil works|Engineering and permits|Contingency|Staff|CHP service and overhaul reserve|Maintenance|Insurance|Testing and monitoring|Feedstock purchase, net of gate fees|Foregone alternative revenue|Feedstock transport|Digestate handling|Purchased electricity|Purchased process heat|Bio-CNG transport|Certification and balancing|Electricity self-consumption savings|Electricity sales|Avoided disposal cost|Incremental digestate value|Disposal of pre-treatment rejects|New open storage",
  uk: "Накриття існуючого сховища|Нове накрите сховище|Приймання й підготовка сировини|Збирання й очищення газу|Тепломережа|Резервний котел|Електрика й автоматика|Трубопроводи|Будівельні роботи|Проєктування й дозволи|Непередбачені витрати|Персонал|Сервіс CHP і резерв на капремонт|Технічне обслуговування|Страхування|Аналізи й моніторинг|Закупівля сировини мінус плата за прийом|Втрачений дохід від альтернативного використання|Перевезення сировини|Поводження з дигестатом|Купована електроенергія|Куповане технологічне тепло|Перевезення Bio-CNG|Сертифікація й балансування|Економія на власній електроенергії|Продаж електроенергії|Економія на утилізації|Додаткова цінність дигестату|Утилізація відходів сортування|Нове відкрите сховище",
  pl: "Przykrycie istniejącego zbiornika|Nowy zbiornik z przykryciem|Przyjęcie i przygotowanie substratów|Odbiór i oczyszczanie gazu|Sieć ciepłownicza|Kocioł rezerwowy|Instalacje elektryczne i automatyka|Rurociągi|Roboty budowlane|Projektowanie i pozwolenia|Rezerwa kosztowa|Personel|Serwis CHP i rezerwa na remont|Utrzymanie techniczne|Ubezpieczenie|Badania i monitoring|Zakup substratów po odjęciu opłat za przyjęcie|Utracone przychody z innego wykorzystania|Transport substratów|Zagospodarowanie pofermentu|Zakup energii elektrycznej|Zakup ciepła procesowego|Transport Bio-CNG|Certyfikacja i bilansowanie|Oszczędności dzięki autokonsumpcji|Sprzedaż energii elektrycznej|Uniknięte koszty utylizacji|Dodatkowa wartość pofermentu|Unieszkodliwianie odrzutów z obróbki wstępnej|Nowy zbiornik otwarty",
  de: "Abdeckung vorhandener Lager|Neues abgedecktes Lager|Substratannahme und Aufbereitung|Gasfassung und Gasreinigung|Wärmenetz|Reservekessel|Elektrotechnik und Steuerung|Rohrleitungen|Bauarbeiten|Planung und Genehmigungen|Kostenreserve|Personal|CHP-Service und Revisionsrücklage|Instandhaltung|Versicherung|Analytik und Überwachung|Substratbezug abzüglich Annahmeerlösen|Entgangene Erlöse aus anderer Nutzung|Substrattransport|Gärrestbewirtschaftung|Strombezug|Zugekaufte Prozesswärme|Bio-CNG-Transport|Zertifizierung und Bilanzierung|Ersparnis durch Eigenstromnutzung|Stromverkauf|Vermiedene Entsorgungskosten|Zusätzlicher Gärrestwert|Entsorgung von Störstoffen aus der Aufbereitung|Neues offenes Lager",
  fr: "Couverture du stockage existant|Nouveau stockage couvert|Réception et préparation des intrants|Collecte et épuration du gaz|Réseau de chaleur|Chaudière de secours|Électricité et automatismes|Tuyauterie|Génie civil|Études et autorisations|Provision pour imprévus|Personnel|Entretien CHP et provision pour révision|Maintenance|Assurance|Analyses et suivi|Achat des intrants net des redevances d’acceptation|Recettes perdues sur les autres débouchés|Transport des intrants|Gestion du digestat|Électricité achetée|Chaleur de procédé achetée|Transport du Bio-CNG|Certification et équilibrage|Économies d’autoconsommation électrique|Vente d’électricité|Coûts de traitement évités|Valeur supplémentaire du digestat|Élimination des refus de prétraitement|Nouveau stockage ouvert",
  it: "Copertura dello stoccaggio esistente|Nuovo stoccaggio coperto|Ricezione e preparazione delle matrici|Raccolta e pulizia del gas|Rete di calore|Caldaia di riserva|Impianti elettrici e automazione|Tubazioni|Opere civili|Progettazione e autorizzazioni|Fondo imprevisti|Personale|Assistenza CHP e fondo revisione|Manutenzione|Assicurazione|Analisi e monitoraggio|Acquisto matrici al netto delle tariffe di conferimento|Ricavi persi da impieghi alternativi|Trasporto delle matrici|Gestione del digestato|Elettricità acquistata|Calore di processo acquistato|Trasporto Bio-CNG|Certificazione e bilanciamento|Risparmio da autoconsumo elettrico|Vendita di elettricità|Costi di smaltimento evitati|Valore aggiuntivo del digestato|Smaltimento degli scarti di pretrattamento|Nuovo stoccaggio aperto",
  es: "Cubierta del almacenamiento existente|Nuevo almacenamiento cubierto|Recepción y preparación de sustratos|Captación y limpieza del gas|Red de calor|Caldera de reserva|Instalaciones eléctricas y control|Tuberías|Obra civil|Ingeniería y permisos|Reserva para imprevistos|Personal|Servicio CHP y reserva para revisión|Mantenimiento|Seguro|Análisis y seguimiento|Compra de sustratos neta de tarifas de recepción|Ingresos perdidos por usos alternativos|Transporte de sustratos|Gestión del digestato|Electricidad comprada|Calor de proceso comprado|Transporte de Bio-CNG|Certificación y balance|Ahorro por autoconsumo eléctrico|Venta de electricidad|Costes de eliminación evitados|Valor adicional del digestato|Eliminación de rechazos del pretratamiento|Nuevo almacenamiento abierto",
  pt: "Cobertura do armazenamento existente|Novo armazenamento coberto|Recepção e preparo de substratos|Coleta e limpeza do gás|Rede de calor|Caldeira de reserva|Instalações elétricas e automação|Tubulações|Obras civis|Engenharia e licenças|Reserva para imprevistos|Equipe|Serviço CHP e reserva para revisão|Manutenção|Seguro|Análises e monitoramento|Compra de substratos líquida das taxas de recebimento|Receita perdida com usos alternativos|Transporte de substratos|Manejo do digestato|Eletricidade comprada|Calor de processo comprado|Transporte de Bio-CNG|Certificação e balanceamento|Economia com autoconsumo elétrico|Venda de eletricidade|Custos de destinação evitados|Valor adicional do digestato|Destinação de rejeitos do pré-tratamento|Novo armazenamento aberto",
  nl: "Afdekking bestaande opslag|Nieuwe afgedekte opslag|Ontvangst en voorbehandeling van grondstoffen|Gasopvang en gasreiniging|Warmtenet|Reserveketel|Elektrotechniek en besturing|Leidingwerk|Civiele werken|Ontwerp en vergunningen|Onvoorzien|Personeel|CHP-service en revisiereserve|Onderhoud|Verzekering|Analyses en monitoring|Grondstofinkoop minus acceptatievergoedingen|Gederfde opbrengst uit ander gebruik|Grondstoftransport|Beheer van digestaat|Ingekochte elektriciteit|Ingekochte proceswarmte|Bio-CNG-transport|Certificering en balancering|Besparing door eigen stroomgebruik|Verkoop van elektriciteit|Vermeden verwerkingskosten|Extra waarde van digestaat|Afvoer van zeefresten uit voorbehandeling|Nieuwe open opslag",
  cs: "Zakrytí stávajícího skladu|Nový zakrytý sklad|Příjem a příprava substrátů|Sběr a čištění plynu|Tepelná síť|Záložní kotel|Elektroinstalace a řízení|Potrubí|Stavební práce|Projekt a povolení|Rezerva na nepředvídané náklady|Personál|Servis CHP a rezerva na generální opravu|Údržba|Pojištění|Analýzy a monitoring|Nákup substrátů po odečtení poplatků za příjem|Ušlé výnosy z jiného využití|Doprava substrátů|Nakládání s digestátem|Nakoupená elektřina|Nakoupené procesní teplo|Doprava Bio-CNG|Certifikace a vyrovnávání|Úspora z vlastní spotřeby elektřiny|Prodej elektřiny|Ušetřené náklady na likvidaci|Dodatečná hodnota digestátu|Likvidace odpadu z předúpravy|Nový otevřený sklad",
  sk: "Zakrytie existujúceho skladu|Nový zakrytý sklad|Príjem a príprava substrátov|Zber a čistenie plynu|Tepelná sieť|Záložný kotol|Elektroinštalácie a riadenie|Potrubia|Stavebné práce|Projekt a povolenia|Rezerva na nepredvídané náklady|Personál|Servis CHP a rezerva na generálnu opravu|Údržba|Poistenie|Analýzy a monitoring|Nákup substrátov po odpočítaní poplatkov za príjem|Ušlé výnosy z iného využitia|Doprava substrátov|Nakladanie s digestátom|Nakúpená elektrina|Nakúpené procesné teplo|Doprava Bio-CNG|Certifikácia a vyrovnávanie|Úspora z vlastnej spotreby elektriny|Predaj elektriny|Ušetrené náklady na likvidáciu|Dodatočná hodnota digestátu|Likvidácia odpadu z predúpravy|Nový otvorený sklad",
  hu: "Meglévő tároló lefedése|Új fedett tároló|Alapanyag-átvétel és előkészítés|Gázgyűjtés és gáztisztítás|Hőhálózat|Tartalék kazán|Elektromos rendszerek és vezérlés|Csővezetékek|Építési munkák|Tervezés és engedélyek|Költségtartalék|Személyzet|CHP-szerviz és nagyjavítási tartalék|Karbantartás|Biztosítás|Vizsgálatok és monitoring|Alapanyag-vásárlás az átvételi díjakkal csökkentve|Más hasznosításból kieső bevétel|Alapanyag-szállítás|Fermentlékezelés|Vásárolt villamos energia|Vásárolt technológiai hő|Bio-CNG-szállítás|Tanúsítás és kiegyenlítés|Saját áramfogyasztás megtakarítása|Villamosenergia-értékesítés|Elkerült ártalmatlanítási költség|A fermentlé többletértéke|Az előkezelési maradék ártalmatlanítása|Új nyitott tároló",
  ro: "Acoperirea stocării existente|Stocare nouă acoperită|Recepția și pregătirea substraturilor|Colectarea și curățarea gazului|Rețea termică|Cazan de rezervă|Instalații electrice și automatizare|Conducte|Lucrări civile|Proiectare și autorizații|Rezervă pentru neprevăzute|Personal|Service CHP și rezervă pentru revizie|Întreținere|Asigurare|Analize și monitorizare|Achiziția substraturilor minus taxele de recepție|Venituri pierdute din utilizări alternative|Transportul substraturilor|Gestionarea digestatului|Electricitate cumpărată|Căldură de proces cumpărată|Transport Bio-CNG|Certificare și echilibrare|Economii din autoconsumul electric|Vânzarea electricității|Costuri de eliminare evitate|Valoarea suplimentară a digestatului|Eliminarea refuzurilor de la pretratare|Stocare nouă deschisă",
  bg: "Покриване на съществуващото хранилище|Ново покрито хранилище|Приемане и подготовка на суровината|Събиране и пречистване на газа|Топлопреносна мрежа|Резервен котел|Електрически системи и автоматика|Тръбопроводи|Строителни работи|Проектиране и разрешителни|Резерв за непредвидени разходи|Персонал|Сервиз на CHP и резерв за основен ремонт|Поддръжка|Застраховка|Анализи и мониторинг|Покупка на суровина минус таксите за приемане|Пропуснати приходи от друго използване|Транспорт на суровината|Управление на дигестата|Закупена електроенергия|Закупена технологична топлина|Транспорт на Bio-CNG|Сертифициране и балансиране|Икономия от собствено потребление на ток|Продажба на електроенергия|Спестени разходи за обезвреждане|Допълнителна стойност на дигестата|Обезвреждане на отпадъци от предварителната обработка|Ново открито хранилище",
  sr: "Pokrivanje postojećeg skladišta|Novo pokriveno skladište|Prijem i priprema sirovine|Sakupljanje i prečišćavanje gasa|Toplovodna mreža|Rezervni kotao|Elektroinstalacije i automatika|Cevovodi|Građevinski radovi|Projektovanje i dozvole|Rezerva za nepredviđene troškove|Osoblje|Servis CHP i rezerva za remont|Održavanje|Osiguranje|Analize i praćenje|Nabavka sirovine umanjena za naknade za prijem|Izgubljeni prihodi od druge namene|Prevoz sirovine|Upravljanje digestatom|Kupljena električna energija|Kupljena procesna toplota|Prevoz Bio-CNG|Sertifikacija i balansiranje|Ušteda od sopstvene potrošnje struje|Prodaja električne energije|Izbegnuti troškovi zbrinjavanja|Dodatna vrednost digestata|Odlaganje otpada iz predtretmana|Novo otvoreno skladište",
  el: "Κάλυψη υφιστάμενης αποθήκευσης|Νέα καλυμμένη αποθήκευση|Παραλαβή και προετοιμασία πρώτων υλών|Συλλογή και καθαρισμός αερίου|Δίκτυο θερμότητας|Εφεδρικός λέβητας|Ηλεκτρικά συστήματα και αυτοματισμοί|Σωληνώσεις|Έργα υποδομής|Μελέτη και άδειες|Αποθεματικό απροβλέπτων|Προσωπικό|Συντήρηση CHP και αποθεματικό επισκευής|Συντήρηση|Ασφάλιση|Αναλύσεις και παρακολούθηση|Αγορά πρώτων υλών μετά τις χρεώσεις παραλαβής|Απολεσθέντα έσοδα από άλλες χρήσεις|Μεταφορά πρώτων υλών|Διαχείριση χωνεμένου υπολείμματος|Αγοραζόμενη ηλεκτρική ενέργεια|Αγοραζόμενη θερμότητα διεργασίας|Μεταφορά Bio-CNG|Πιστοποίηση και εξισορρόπηση|Εξοικονόμηση από ιδιοκατανάλωση ρεύματος|Πώληση ηλεκτρικής ενέργειας|Αποφευγόμενο κόστος διάθεσης|Πρόσθετη αξία χωνεμένου υπολείμματος|Διάθεση απορριμμάτων προεπεξεργασίας|Νέα ανοιχτή αποθήκευση",
  tr: "Mevcut depolamanın örtülmesi|Yeni kapalı depolama|Hammadde kabulü ve hazırlama|Gaz toplama ve temizleme|Isı şebekesi|Yedek kazan|Elektrik sistemleri ve otomasyon|Borulama|İnşaat işleri|Mühendislik ve izinler|Beklenmeyen gider payı|Personel|CHP servisi ve revizyon rezervi|Bakım|Sigorta|Analiz ve izleme|Kabul bedelleri düşülmüş hammadde alımı|Alternatif kullanımdan vazgeçilen gelir|Hammadde taşımacılığı|Fermente ürün yönetimi|Satın alınan elektrik|Satın alınan proses ısısı|Bio-CNG taşımacılığı|Sertifikasyon ve dengeleme|Öz tüketimden elektrik tasarrufu|Elektrik satışı|Önlenen bertaraf gideri|Fermente ürünün ek değeri|Ön işlem atıklarının bertarafı|Yeni açık depolama",
  lt: "Esamos saugyklos uždengimas|Nauja dengta saugykla|Žaliavos priėmimas ir paruošimas|Dujų surinkimas ir valymas|Šilumos tinklas|Rezervinis katilas|Elektros sistemos ir automatika|Vamzdynai|Statybos darbai|Projektavimas ir leidimai|Nenumatytų išlaidų rezervas|Darbuotojai|CHP priežiūra ir kapitalinio remonto rezervas|Techninė priežiūra|Draudimas|Tyrimai ir stebėsena|Žaliavos pirkimas atėmus priėmimo pajamas|Prarastos pajamos iš kito panaudojimo|Žaliavos transportas|Digestato tvarkymas|Perkama elektra|Perkama technologinė šiluma|Bio-CNG transportas|Sertifikavimas ir balansavimas|Elektros sutaupymas savoms reikmėms|Elektros pardavimas|Išvengtos šalinimo išlaidos|Papildoma digestato vertė|Pirminio apdorojimo atliekų šalinimas|Nauja atvira saugykla",
  lv: "Esošās krātuves pārsegšana|Jauna pārsegta krātuve|Izejvielu pieņemšana un sagatavošana|Gāzes savākšana un attīrīšana|Siltumtīkls|Rezerves katls|Elektrosistēmas un automatizācija|Cauruļvadi|Būvdarbi|Projektēšana un atļaujas|Rezerve neparedzētiem izdevumiem|Personāls|CHP apkope un kapitālā remonta rezerve|Tehniskā apkope|Apdrošināšana|Analīzes un uzraudzība|Izejvielu iegāde pēc pieņemšanas ieņēmumu atskaitīšanas|Zaudētie ieņēmumi no cita izmantojuma|Izejvielu transports|Digestāta apsaimniekošana|Iegādātā elektroenerģija|Iegādātais tehnoloģiskais siltums|Bio-CNG transports|Sertifikācija un balansēšana|Elektroenerģijas pašpatēriņa ietaupījums|Elektroenerģijas pārdošana|Novērstās apglabāšanas izmaksas|Digestāta papildu vērtība|Priekšapstrādes atkritumu apsaimniekošana|Jauna atvērta krātuve",
  et: "Olemasoleva hoidla katmine|Uus kaetud hoidla|Toorme vastuvõtt ja ettevalmistus|Gaasi kogumine ja puhastamine|Soojusvõrk|Varukatel|Elektrisüsteemid ja automaatika|Torustik|Ehitustööd|Projekteerimine ja load|Ettenägematute kulude reserv|Töötajad|CHP hooldus ja kapitaalremondi reserv|Hooldus|Kindlustus|Analüüsid ja seire|Toorme ost miinus vastuvõtutasud|Muust kasutusest saamata jääv tulu|Toorme vedu|Kääritusjäägi käitlemine|Ostetav elekter|Ostetav protsessisoojus|Bio-CNG vedu|Sertifitseerimine ja tasakaalustamine|Oma elektritarbimise kokkuhoid|Elektri müük|Välditud kõrvaldamiskulud|Kääritusjäägi lisaväärtus|Eeltöötluse jääkide kõrvaldamine|Uus avatud hoidla",
  da: "Overdækning af eksisterende lager|Nyt overdækket lager|Modtagelse og forbehandling af biomasse|Gasopsamling og gasrensning|Varmenet|Reservekedel|Elanlæg og styring|Rørføring|Anlægsarbejder|Projektering og tilladelser|Reserve til uforudsete udgifter|Personale|CHP-service og reserve til hovedeftersyn|Vedligeholdelse|Forsikring|Analyser og overvågning|Biomassekøb fratrukket modtagegebyrer|Tabt indtægt fra anden anvendelse|Transport af biomasse|Håndtering af afgasset biomasse|Købt elektricitet|Købt procesvarme|Bio-CNG-transport|Certificering og balancering|Besparelse ved eget elforbrug|Salg af elektricitet|Sparede bortskaffelsesomkostninger|Merværdi af afgasset biomasse|Bortskaffelse af frasortering fra forbehandling|Nyt åbent lager",
  sv: "Täckning av befintligt lager|Nytt täckt lager|Mottagning och förbehandling av substrat|Gasuppsamling och gasrening|Värmenät|Reservpanna|Elsystem och styrning|Rörledningar|Mark- och byggarbeten|Projektering och tillstånd|Reserv för oförutsedda kostnader|Personal|CHP-service och reserv för översyn|Underhåll|Försäkring|Analyser och övervakning|Substratinköp efter avdrag för mottagningsavgifter|Utebliven intäkt från annan användning|Substrattransport|Hantering av rötrest|Inköpt el|Inköpt processvärme|Bio-CNG-transport|Certifiering och balansering|Besparing genom egen elanvändning|Försäljning av el|Undvikna bortskaffningskostnader|Rötrestens mervärde|Bortskaffande av rejekt från förbehandling|Nytt öppet lager",
  fi: "Nykyisen varaston kattaminen|Uusi katettu varasto|Syötteen vastaanotto ja esikäsittely|Kaasunkeräys ja puhdistus|Lämpöverkko|Varakattila|Sähköjärjestelmät ja automaatio|Putkistot|Rakennustyöt|Suunnittelu ja luvat|Varaus ennakoimattomiin kuluihin|Henkilöstö|CHP-huolto ja peruskorjausvaraus|Kunnossapito|Vakuutus|Analyysit ja seuranta|Syötteen hankinta porttimaksut vähennettyinä|Muusta käytöstä menetetty tulo|Syötteen kuljetus|Mädätteen käsittely|Ostettu sähkö|Ostettu prosessilämpö|Bio-CNG-kuljetus|Sertifiointi ja tasapainotus|Oman sähkönkäytön säästö|Sähkön myynti|Vältetyt käsittelykustannukset|Mädätteen lisäarvo|Esikäsittelyn rejektin hävitys|Uusi avoin varasto",
  vi: "Che phủ bể chứa hiện có|Bể chứa mới có che phủ|Tiếp nhận và sơ chế nguyên liệu|Thu gom và làm sạch khí|Mạng cấp nhiệt|Lò hơi dự phòng|Hệ thống điện và điều khiển|Đường ống|Xây dựng hạ tầng|Thiết kế và giấy phép|Dự phòng chi phí|Nhân sự|Bảo dưỡng CHP và dự phòng đại tu|Bảo trì|Bảo hiểm|Phân tích và giám sát|Mua nguyên liệu sau khi trừ phí tiếp nhận|Doanh thu mất đi từ cách sử dụng khác|Vận chuyển nguyên liệu|Xử lý bã thải sau lên men|Điện mua ngoài|Nhiệt công nghệ mua ngoài|Vận chuyển Bio-CNG|Chứng nhận và cân bằng|Tiết kiệm điện tự dùng|Bán điện|Chi phí xử lý tránh được|Giá trị tăng thêm của bã thải sau lên men|Xử lý chất thải loại từ khâu sơ chế|Bể chứa hở mới",
  th: "คลุมบ่อเก็บเดิม|บ่อเก็บใหม่แบบมีหลังคา|รับและเตรียมวัตถุดิบ|รวบรวมและทำความสะอาดก๊าซ|ระบบจ่ายความร้อน|หม้อไอน้ำสำรอง|ระบบไฟฟ้าและควบคุม|ระบบท่อ|งานโยธา|งานออกแบบและใบอนุญาต|เงินสำรองค่าใช้จ่ายไม่คาดคิด|บุคลากร|บำรุงรักษา CHP และสำรองค่าซ่อมใหญ่|บำรุงรักษา|ประกันภัย|วิเคราะห์และติดตามผล|ค่าวัตถุดิบหักรายได้จากค่ารับของเสีย|รายได้ที่สูญเสียจากการใช้ประโยชน์อื่น|ขนส่งวัตถุดิบ|จัดการกากหลังย่อย|ไฟฟ้าที่ซื้อ|ความร้อนในกระบวนการที่ซื้อ|ขนส่ง Bio-CNG|การรับรองและปรับสมดุล|ค่าไฟที่ประหยัดจากการใช้เอง|ขายไฟฟ้า|ค่ากำจัดของเสียที่ประหยัดได้|มูลค่าเพิ่มของกากหลังย่อย|กำจัดของเสียคัดทิ้งจากการเตรียมวัตถุดิบ|บ่อเก็บแบบเปิดใหม่",
};

const extra: Record<Locale, readonly [string, string, string]> = {
  en: ["Energy prices", "CHP downtime", "Grid connection"], uk: ["Ціни на енергію", "Простої CHP", "Приєднання до мережі"],
  pl: ["Ceny energii", "Przestoje CHP", "Przyłączenie do sieci"], de: ["Energiepreise", "CHP-Ausfallzeit", "Netzanschluss"],
  fr: ["Prix de l’énergie", "Indisponibilité CHP", "Raccordement au réseau"], it: ["Prezzi dell’energia", "Fermi CHP", "Allacciamento alla rete"],
  es: ["Precios de la energía", "Paradas CHP", "Conexión a la red"], pt: ["Preços de energia", "Paradas CHP", "Conexão à rede"],
  nl: ["Energieprijzen", "CHP-stilstand", "Netaansluiting"], cs: ["Ceny energií", "Odstávky CHP", "Připojení k síti"],
  sk: ["Ceny energií", "Odstávky CHP", "Pripojenie k sieti"], hu: ["Energiaárak", "CHP-állásidő", "Hálózati csatlakozás"],
  ro: ["Prețurile energiei", "Opriri CHP", "Racordare la rețea"], bg: ["Цени на енергията", "Престои на CHP", "Присъединяване към мрежата"],
  sr: ["Cene energije", "Zastoji CHP", "Priključenje na mrežu"], el: ["Τιμές ενέργειας", "Διακοπές CHP", "Σύνδεση στο δίκτυο"],
  tr: ["Enerji fiyatları", "CHP duruş süresi", "Şebeke bağlantısı"], lt: ["Energijos kainos", "CHP prastovos", "Prijungimas prie tinklo"],
  lv: ["Enerģijas cenas", "CHP dīkstāve", "Pieslēgums tīklam"], et: ["Energiahinnad", "CHP seisakud", "Võrguühendus"],
  da: ["Energipriser", "CHP-nedetid", "Nettilslutning"], sv: ["Energipriser", "CHP-stillestånd", "Nätanslutning"],
  fi: ["Energian hinnat", "CHP-seisokit", "Verkkoliitäntä"], vi: ["Giá năng lượng", "Thời gian dừng CHP", "Đấu nối lưới"],
  th: ["ราคาพลังงาน", "ระยะเวลาหยุด CHP", "การเชื่อมต่อโครงข่าย"],
};

const clamp: Record<Locale, string> = {
  en: "Bunker silo for the crop harvest",
  uk: "Силосна траншея для врожаю",
  pl: "Silos przejazdowy na plon",
  de: "Fahrsilo für die Ernte",
  fr: "Silo couloir pour la récolte",
  it: "Trincea per l’insilato",
  es: "Silo trinchera para la cosecha",
  pt: "Silo trincheira para a colheita",
  nl: "Sleufsilo voor de oogst",
  cs: "Žlabové silo pro sklizeň",
  sk: "Žľabové silo pre úrodu",
  hu: "Falközi siló a termésnek",
  ro: "Siloz tip tranșee pentru recoltă",
  bg: "Силозна траншея за реколтата",
  sr: "Trenč silos za useve",
  el: "Τάφρος ενσίρωσης για τη σοδειά",
  tr: "Silaj çukuru (hasat için)",
  lt: "Tranšėja silosui",
  lv: "Skābbarības tranšeja ražai",
  et: "Silohoidla saagi jaoks",
  da: "Plansilo til afgrøden",
  sv: "Plansilo för skörden",
  fi: "Laakasiilo sadolle",
  vi: "Hầm ủ chua cho vụ thu hoạch",
  th: "บ่อหมักพืชสำหรับผลผลิต",
};

const equipment: Record<Locale, readonly [string, string, string]> = {
  en: ["Pasteurisation", "Gas-grid injection", "Gas pipeline"],
  uk: ["Пастеризація", "Подача до газової мережі", "Газопровід"],
  pl: ["Pasteryzacja", "Zatłaczanie do sieci gazowej", "Gazociąg"],
  de: ["Pasteurisierung", "Einspeisung ins Gasnetz", "Gasleitung"],
  fr: ["Hygiénisation", "Injection dans le réseau de gaz", "Canalisation de gaz"],
  it: ["Pastorizzazione", "Immissione nella rete del gas", "Gasdotto"],
  es: ["Pasteurización", "Inyección en la red de gas", "Gasoducto"],
  pt: ["Pasteurização", "Injeção na rede de gás", "Gasoduto"],
  nl: ["Hygiënisatie", "Invoeding in het gasnet", "Gasleiding"],
  cs: ["Hygienizace", "Vtláčení do plynárenské sítě", "Plynovod"],
  sk: ["Hygienizácia", "Vtláčanie do plynárenskej siete", "Plynovod"],
  hu: ["Higiénizálás", "Betáplálás a gázhálózatba", "Gázvezeték"],
  ro: ["Igienizare", "Injecție în rețeaua de gaze", "Conductă de gaze"],
  bg: ["Хигиенизация", "Подаване в газовата мрежа", "Газопровод"],
  sr: ["Higijenizacija", "Utiskivanje u gasnu mrežu", "Gasovod"],
  el: ["Παστερίωση", "Έγχυση στο δίκτυο αερίου", "Αγωγός αερίου"],
  tr: ["Pastörizasyon", "Gaz şebekesine enjeksiyon", "Gaz boru hattı"],
  lt: ["Higienizavimas", "Tiekimas į dujų tinklą", "Dujotiekis"],
  lv: ["Higienizācija", "Ievade gāzes tīklā", "Gāzesvads"],
  et: ["Hügieniseerimine", "Sisestamine gaasivõrku", "Gaasitorustik"],
  da: ["Hygiejnisering", "Tilførsel til gasnettet", "Gasledning"],
  sv: ["Hygienisering", "Inmatning på gasnätet", "Gasledning"],
  fi: ["Hygienisointi", "Syöttö kaasuverkkoon", "Kaasuputki"],
  vi: ["Thanh trùng", "Bơm khí vào lưới", "Đường ống dẫn khí"],
  th: ["การพาสเจอไรซ์", "การจ่ายเข้าระบบท่อก๊าซ", "ท่อส่งก๊าซ"],
};

export function financialLabels(locale: Locale, d: Pick<Dict, "labels" | "result"> & Partial<Pick<Dict, "flow">>): Record<string, string> {
  const values = rows[locale].split("|");
  const process = processFieldLabels(locale);
  return {
    process: `CAPEX · ${d.result.dTech}`, process_operation: process.processOpexLocalYear,
    residual_disposal: process.residualCostLocalT, gas_supply: process.gasPriceLocalNm3, treatment: process.avoidedTreatmentLocalM3,
    ...Object.fromEntries(keys.map((k, i) => [k, values[i]])),
    digester: d.flow?.digester ?? d.result.dTech, chp: d.labels.route.chp, boiler: d.labels.route.boiler,
    pasteurisation: `${equipment[locale][0]} (70 °C / 1 h)`, upgrading: "Upgrading", cng: "Bio-CNG (250 bar)",
    silage_clamp: clamp[locale], grid: extra[locale][2], injection: equipment[locale][1], pipeline: equipment[locale][2], upgrading_maintenance: `${values[13]} (Upgrading)`,
    el_tariff: `${values[25]} (${d.result.colScheme})`, heat: d.result.heatUseful, biomethane: d.labels.route.biomethane, support: d.result.assumedSupport,
  };
}

export function sensitivityLabels(locale: Locale, d: Pick<Dict, "labels" | "result">): Record<string, string> {
  const money = financialLabels(locale, d);
  return {
    yield: "CH₄ −20 %", capex: "CAPEX +20 %", maintenance: `${money.maintenance} +30 %`, process_opex: "OPEX +30 %",
    energy_price: `${extra[locale][0]} −20 %`, heat_use: `${d.result.heatUseful} −50 %`,
    feedstock: `${d.result.feedstock} −20 %`, transport: `${money.transport} +50 %`, downtime: `${extra[locale][1]} +10 pp`,
  };
}

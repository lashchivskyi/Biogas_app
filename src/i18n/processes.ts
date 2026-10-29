import type { Locale } from "./config";
import type { ProcessKind } from "@/core/processes";

// Same semantic order in every locale: four inlet models, role, four roles, cost scope, input guidance.
const copy: Record<Locale, readonly string[]> = {
  en: ["Analysed organic residues", "Industrial wastewater", "Gas from a closed landfill", "Existing biogas supply", "Your role in the project", "Feedstock owner", "Waste treatment operator", "Project developer", "Energy buyer", "Enter the project budget for the upstream process, including pretreatment, logistics, storage and final treatment. Gas conversion equipment and energy are calculated separately. Enter zero only for a confirmed zero cost.", "Use laboratory results, operating records and supplier quotations. Values are user inputs, not independently verified measurements. All numeric fields are required; costs use the project’s local currency."],
  uk: ["Органічні залишки з результатами аналізу", "Промислові стічні води", "Газ закритого полігона відходів", "Наявний потік біогазу", "Ваша роль у проєкті", "Власник сировини", "Підприємство з оброблення відходів", "Розробник проєкту", "Покупець енергії", "Вкажіть бюджет технологічної частини: підготовка, логістика, зберігання та кінцева обробка. Обладнання для використання газу й енергія розраховуються окремо. Нуль означає підтверджену відсутність витрат.", "Використовуйте лабораторні аналізи, експлуатаційні записи та пропозиції постачальників. Введені дані не є незалежно перевіреними вимірюваннями. Усі числові поля обов’язкові; витрати — у місцевій валюті проєкту."],
  pl: ["Pozostałości organiczne z wynikami badań", "Ścieki przemysłowe", "Gaz z zamkniętego składowiska", "Istniejący strumień biogazu", "Twoja rola w projekcie", "Właściciel substratów", "Operator przetwarzania odpadów", "Deweloper projektu", "Odbiorca energii", "Podaj budżet części technologicznej: przygotowanie, logistyka, magazynowanie i końcowe przetwarzanie. Urządzenia do wykorzystania gazu i energia są liczone osobno. Zero wpisuj tylko przy potwierdzonym braku kosztu.", "Korzystaj z badań laboratoryjnych, danych eksploatacyjnych i ofert dostawców. Dane użytkownika nie są niezależnie zweryfikowanymi pomiarami. Wszystkie pola liczbowe są wymagane; koszty podawaj w lokalnej walucie projektu."],
  de: ["Analysierte organische Reststoffe", "Industrieabwasser", "Gas aus einer stillgelegten Deponie", "Vorhandener Biogasstrom", "Ihre Rolle im Projekt", "Substratbesitzer", "Abfallbehandlungsunternehmen", "Projektentwickler", "Energieabnehmer", "Geben Sie das Budget für Vorbehandlung, Logistik, Lagerung und abschließende Behandlung an. Gasverwertung und Energie werden separat berechnet. Null nur bei nachweislich entfallenden Kosten eintragen.", "Verwenden Sie Laboranalysen, Betriebsdaten und Lieferantenangebote. Eingaben gelten nicht als unabhängig geprüfte Messwerte. Alle Zahlenfelder sind Pflichtfelder; Kosten in der Landeswährung des Projekts."],
  fr: ["Résidus organiques caractérisés", "Effluents industriels", "Gaz d’un site de stockage fermé", "Flux de biogaz existant", "Votre rôle dans le projet", "Détenteur des matières", "Exploitant du traitement des déchets", "Développeur de projet", "Acheteur d’énergie", "Indiquez le budget du procédé amont : prétraitement, logistique, stockage et traitement final. La valorisation du gaz et l’énergie sont calculées séparément. Saisissez zéro uniquement si l’absence de coût est confirmée.", "Utilisez les analyses de laboratoire, les données d’exploitation et les devis. Les données saisies ne sont pas des mesures vérifiées indépendamment. Tous les champs numériques sont obligatoires ; les coûts sont exprimés dans la monnaie locale du projet."],
  it: ["Residui organici caratterizzati", "Reflui industriali", "Gas da discarica chiusa", "Flusso di biogas esistente", "Il tuo ruolo nel progetto", "Proprietario delle matrici", "Gestore del trattamento rifiuti", "Sviluppatore del progetto", "Acquirente di energia", "Inserisci il budget per pretrattamento, logistica, stoccaggio e trattamento finale. Le apparecchiature di valorizzazione del gas e l’energia sono calcolate separatamente. Indica zero solo per costi effettivamente assenti.", "Usa analisi di laboratorio, dati di esercizio e preventivi. I dati inseriti non sono misure verificate in modo indipendente. Tutti i campi numerici sono obbligatori; i costi sono nella valuta locale del progetto."],
  es: ["Residuos orgánicos caracterizados", "Aguas residuales industriales", "Gas de un vertedero clausurado", "Caudal de biogás existente", "Tu papel en el proyecto", "Propietario de las materias primas", "Gestor de tratamiento de residuos", "Promotor del proyecto", "Comprador de energía", "Introduce el presupuesto de pretratamiento, logística, almacenamiento y tratamiento final. Los equipos de aprovechamiento del gas y la energía se calculan por separado. Indica cero solo si se confirma que no hay coste.", "Utiliza análisis de laboratorio, registros de operación y ofertas de proveedores. Los datos introducidos no son mediciones verificadas de forma independiente. Todos los campos numéricos son obligatorios; los costes se indican en la moneda local del proyecto."],
  pt: ["Resíduos orgânicos caracterizados", "Efluentes industriais", "Gás de aterro encerrado", "Vazão de biogás existente", "Seu papel no projeto", "Proprietário dos substratos", "Operador de tratamento de resíduos", "Desenvolvedor do projeto", "Comprador de energia", "Informe o orçamento de pré-tratamento, logística, armazenamento e tratamento final. Os equipamentos de aproveitamento do gás e a energia são calculados separadamente. Use zero somente quando não houver custo comprovadamente.", "Utilize análises laboratoriais, registros operacionais e propostas de fornecedores. Os dados informados não são medições verificadas de forma independente. Todos os campos numéricos são obrigatórios; os custos são na moeda local do projeto."],
  nl: ["Geanalyseerde organische reststromen", "Industrieel afvalwater", "Gas van een gesloten stortplaats", "Bestaande biogasstroom", "Uw rol in het project", "Eigenaar van de grondstoffen", "Afvalverwerker", "Projectontwikkelaar", "Energieafnemer", "Vul het budget in voor voorbehandeling, logistiek, opslag en eindbehandeling. Gasbenuttingsapparatuur en energie worden apart berekend. Vul alleen nul in als vaststaat dat er geen kosten zijn.", "Gebruik laboratoriumanalyses, bedrijfsgegevens en offertes. Invoer is geen onafhankelijk geverifieerde meting. Alle numerieke velden zijn verplicht; kosten worden in de lokale projectvaluta ingevoerd."],
  cs: ["Organické zbytky s laboratorním rozborem", "Průmyslové odpadní vody", "Plyn z uzavřené skládky", "Stávající tok bioplynu", "Vaše role v projektu", "Vlastník substrátů", "Provozovatel zpracování odpadů", "Developer projektu", "Odběratel energie", "Zadejte rozpočet na předúpravu, logistiku, skladování a konečné zpracování. Zařízení pro využití plynu a energie se počítají zvlášť. Nulu zadejte jen při potvrzené absenci nákladů.", "Použijte laboratorní rozbory, provozní záznamy a nabídky dodavatelů. Zadané údaje nejsou nezávisle ověřená měření. Všechna číselná pole jsou povinná; náklady jsou v místní měně projektu."],
  sk: ["Organické zvyšky s laboratórnym rozborom", "Priemyselné odpadové vody", "Plyn z uzavretej skládky", "Existujúci tok bioplynu", "Vaša úloha v projekte", "Vlastník substrátov", "Prevádzkovateľ spracovania odpadov", "Developer projektu", "Odberateľ energie", "Zadajte rozpočet na predúpravu, logistiku, skladovanie a konečné spracovanie. Zariadenia na využitie plynu a energia sa počítajú samostatne. Nulu zadajte len pri potvrdenej absencii nákladov.", "Použite laboratórne rozbory, prevádzkové záznamy a ponuky dodávateľov. Zadané údaje nie sú nezávisle overené merania. Všetky číselné polia sú povinné; náklady sú v miestnej mene projektu."],
  hu: ["Bevizsgált szerves maradékanyagok", "Ipari szennyvíz", "Lezárt hulladéklerakó gáza", "Meglévő biogázáram", "Az Ön szerepe a projektben", "Alapanyag-tulajdonos", "Hulladékkezelő", "Projektfejlesztő", "Energiavásárló", "Adja meg az előkezelés, logisztika, tárolás és utókezelés költségkeretét. A gázhasznosító berendezéseket és az energiát külön számítjuk. Nullát csak igazoltan elmaradó költségnél adjon meg.", "Használjon laboreredményeket, üzemi adatokat és szállítói ajánlatokat. A bevitt adatok nem függetlenül ellenőrzött mérések. Minden numerikus mező kötelező; a költségeket a projekt helyi pénznemében adja meg."],
  ro: ["Reziduuri organice analizate", "Ape uzate industriale", "Gaz dintr-un depozit de deșeuri închis", "Flux de biogaz existent", "Rolul dumneavoastră în proiect", "Deținător de materii prime", "Operator de tratare a deșeurilor", "Dezvoltator de proiect", "Cumpărător de energie", "Introduceți bugetul pentru pretratare, logistică, stocare și tratare finală. Echipamentele de valorificare a gazului și energia se calculează separat. Introduceți zero doar pentru costuri confirmate ca inexistente.", "Folosiți analize de laborator, date de exploatare și oferte. Datele introduse nu sunt măsurători verificate independent. Toate câmpurile numerice sunt obligatorii; costurile sunt în moneda locală a proiectului."],
  bg: ["Органични остатъци с лабораторен анализ", "Промишлени отпадъчни води", "Газ от закрито депо", "Наличен поток биогаз", "Вашата роля в проекта", "Собственик на суровините", "Оператор за третиране на отпадъци", "Разработчик на проекта", "Купувач на енергия", "Въведете бюджет за предварителна обработка, логистика, съхранение и крайно третиране. Оборудването за оползотворяване на газа и енергията се изчисляват отделно. Нула означава потвърдена липса на разход.", "Използвайте лабораторни анализи, експлоатационни данни и оферти. Въведените данни не са независимо проверени измервания. Всички числови полета са задължителни; разходите са в местната валута на проекта."],
  sr: ["Organski ostaci sa laboratorijskom analizom", "Industrijske otpadne vode", "Gas sa zatvorene deponije", "Postojeći tok biogasa", "Vaša uloga u projektu", "Vlasnik sirovine", "Operater tretmana otpada", "Razvijač projekta", "Kupac energije", "Unesite budžet za predtretman, logistiku, skladištenje i završni tretman. Oprema za iskorišćenje gasa i energija računaju se odvojeno. Nulu unesite samo kada je potvrđeno da trošak ne postoji.", "Koristite laboratorijske analize, podatke o radu i ponude dobavljača. Uneti podaci nisu nezavisno proverena merenja. Sva numerička polja su obavezna; troškovi su u lokalnoj valuti projekta."],
  el: ["Αναλυμένα οργανικά υπολείμματα", "Βιομηχανικά υγρά απόβλητα", "Αέριο από κλειστό χώρο ταφής", "Υφιστάμενη ροή βιοαερίου", "Ο ρόλος σας στο έργο", "Κάτοχος πρώτων υλών", "Φορέας επεξεργασίας αποβλήτων", "Φορέας ανάπτυξης έργου", "Αγοραστής ενέργειας", "Εισαγάγετε τον προϋπολογισμό προεπεξεργασίας, μεταφοράς, αποθήκευσης και τελικής επεξεργασίας. Ο εξοπλισμός αξιοποίησης αερίου και η ενέργεια υπολογίζονται χωριστά. Μηδέν μόνο για επιβεβαιωμένα μηδενικό κόστος.", "Χρησιμοποιήστε εργαστηριακές αναλύσεις, λειτουργικά στοιχεία και προσφορές. Τα δεδομένα εισόδου δεν αποτελούν ανεξάρτητα επαληθευμένες μετρήσεις. Όλα τα αριθμητικά πεδία είναι υποχρεωτικά· τα κόστη δίνονται στο τοπικό νόμισμα του έργου."],
  tr: ["Analiz edilmiş organik artıklar", "Endüstriyel atık su", "Kapatılmış düzenli depolama sahası gazı", "Mevcut biyogaz akışı", "Projedeki rolünüz", "Hammadde sahibi", "Atık işleme işletmecisi", "Proje geliştiricisi", "Enerji alıcısı", "Ön arıtma, lojistik, depolama ve nihai arıtma bütçesini girin. Gaz değerlendirme ekipmanı ve enerji ayrı hesaplanır. Yalnızca maliyetin olmadığı doğrulandığında sıfır girin.", "Laboratuvar analizlerini, işletme kayıtlarını ve tedarikçi tekliflerini kullanın. Girilen veriler bağımsız doğrulanmış ölçümler değildir. Tüm sayısal alanlar zorunludur; maliyetler projenin yerel para birimindedir."],
  lt: ["Ištirtos organinės liekanos", "Pramoninės nuotekos", "Uždaryto sąvartyno dujos", "Esamas biodujų srautas", "Jūsų vaidmuo projekte", "Žaliavų savininkas", "Atliekų tvarkymo operatorius", "Projekto plėtotojas", "Energijos pirkėjas", "Įveskite pirminio apdorojimo, logistikos, saugojimo ir galutinio apdorojimo biudžetą. Dujų panaudojimo įranga ir energija skaičiuojamos atskirai. Nulį įveskite tik patvirtinus, kad sąnaudų nėra.", "Naudokite laboratorinius tyrimus, eksploatacijos duomenis ir tiekėjų pasiūlymus. Įvesti duomenys nėra nepriklausomai patikrinti matavimai. Visi skaitiniai laukai privalomi; sąnaudos nurodomos vietine projekto valiuta."],
  lv: ["Analizētas organiskās atliekas", "Rūpnieciskie notekūdeņi", "Slēgta poligona gāze", "Esoša biogāzes plūsma", "Jūsu loma projektā", "Izejvielu īpašnieks", "Atkritumu apstrādes operators", "Projekta attīstītājs", "Enerģijas pircējs", "Ievadiet priekšapstrādes, loģistikas, uzglabāšanas un gala apstrādes budžetu. Gāzes izmantošanas iekārtas un enerģiju aprēķina atsevišķi. Nulli ievadiet tikai tad, ja izmaksu nav.", "Izmantojiet laboratorijas analīzes, ekspluatācijas datus un piegādātāju piedāvājumus. Ievadītie dati nav neatkarīgi pārbaudīti mērījumi. Visi skaitliskie lauki ir obligāti; izmaksas norādiet projekta vietējā valūtā."],
  et: ["Analüüsitud orgaanilised jäägid", "Tööstusreovesi", "Suletud prügila gaas", "Olemasolev biogaasivoog", "Teie roll projektis", "Tooraine omanik", "Jäätmekäitlusettevõte", "Projekti arendaja", "Energia ostja", "Sisestage eeltöötluse, logistika, ladustamise ja lõpptöötluse eelarve. Gaasi kasutamise seadmed ja energia arvutatakse eraldi. Null sisestage ainult kinnitatud kulude puudumisel.", "Kasutage laborianalüüse, käitusandmeid ja tarnijate pakkumisi. Sisestatud andmed ei ole sõltumatult kontrollitud mõõtmised. Kõik arvuväljad on kohustuslikud; kulud esitatakse projekti kohalikus vääringus."],
  da: ["Analyserede organiske restprodukter", "Industrispildevand", "Gas fra et lukket deponi", "Eksisterende biogasstrøm", "Din rolle i projektet", "Ejer af råvarer", "Affaldsbehandler", "Projektudvikler", "Energiaftager", "Angiv budgettet for forbehandling, logistik, lagring og slutbehandling. Gasudnyttelsesudstyr og energi beregnes separat. Angiv kun nul ved bekræftet fravær af omkostninger.", "Brug laboratorieanalyser, driftsdata og leverandørtilbud. Indtastede data er ikke uafhængigt verificerede målinger. Alle talfelter er obligatoriske; omkostninger angives i projektets lokale valuta."],
  sv: ["Analyserade organiska restprodukter", "Industriellt avloppsvatten", "Gas från en avslutad deponi", "Befintligt biogasflöde", "Din roll i projektet", "Råvaruägare", "Avfallsbehandlare", "Projektutvecklare", "Energiköpare", "Ange budget för förbehandling, logistik, lagring och slutbehandling. Utrustning för gasutnyttjande och energi beräknas separat. Ange noll endast när det är bekräftat att kostnaden saknas.", "Använd laboratorieanalyser, driftdata och leverantörsofferter. Inmatade uppgifter är inte oberoende verifierade mätningar. Alla numeriska fält är obligatoriska; kostnader anges i projektets lokala valuta."],
  fi: ["Analysoidut orgaaniset jäännökset", "Teollisuuden jätevesi", "Suljetun kaatopaikan kaasu", "Olemassa oleva biokaasuvirta", "Roolisi hankkeessa", "Raaka-aineen omistaja", "Jätteenkäsittelytoimija", "Hankekehittäjä", "Energian ostaja", "Anna esikäsittelyn, logistiikan, varastoinnin ja loppukäsittelyn budjetti. Kaasun hyödyntämislaitteet ja energia lasketaan erikseen. Syötä nolla vain, jos kustannusta ei varmasti ole.", "Käytä laboratorioanalyysejä, käyttötietoja ja toimittajien tarjouksia. Syötetyt tiedot eivät ole riippumattomasti varmennettuja mittauksia. Kaikki numerokentät ovat pakollisia; kustannukset annetaan hankkeen paikallisessa valuutassa."],
  vi: ["Phụ phẩm hữu cơ đã phân tích", "Nước thải công nghiệp", "Khí từ bãi chôn lấp đã đóng cửa", "Nguồn khí sinh học hiện có", "Vai trò của bạn trong dự án", "Chủ nguồn nguyên liệu", "Đơn vị xử lý chất thải", "Đơn vị phát triển dự án", "Bên mua năng lượng", "Nhập ngân sách tiền xử lý, vận chuyển, lưu trữ và xử lý cuối cùng. Thiết bị tận dụng khí và năng lượng được tính riêng. Chỉ nhập số không khi xác nhận không có chi phí.", "Sử dụng kết quả xét nghiệm, số liệu vận hành và báo giá. Dữ liệu nhập không phải số đo đã được xác minh độc lập. Tất cả các trường số đều bắt buộc; chi phí tính theo nội tệ của dự án."],
  th: ["กากอินทรีย์ที่มีผลวิเคราะห์", "น้ำเสียอุตสาหกรรม", "ก๊าซจากหลุมฝังกลบที่ปิดแล้ว", "แหล่งก๊าซชีวภาพที่มีอยู่", "บทบาทของคุณในโครงการ", "เจ้าของวัตถุดิบ", "ผู้ดำเนินการบำบัดของเสีย", "ผู้พัฒนาโครงการ", "ผู้ซื้อพลังงาน", "ระบุงบประมาณการปรับสภาพ การขนส่ง การจัดเก็บ และการบำบัดขั้นสุดท้าย อุปกรณ์ใช้ประโยชน์จากก๊าซและพลังงานจะคำนวณแยกต่างหาก ระบุศูนย์เฉพาะเมื่อยืนยันว่าไม่มีค่าใช้จ่าย", "ใช้ผลวิเคราะห์จากห้องปฏิบัติการ ข้อมูลการดำเนินงาน และใบเสนอราคา ข้อมูลที่กรอกไม่ใช่ผลวัดที่ผ่านการตรวจสอบโดยอิสระ ต้องกรอกช่องตัวเลขทุกช่องและระบุค่าใช้จ่ายเป็นสกุลเงินท้องถิ่นของโครงการ"],
};
const scopeLabels: Record<Locale, readonly [string,string]> = {
  "en": [
    "Assessment basis",
    "Exclude from this budget; calculated separately"
  ],
  "uk": [
    "Що оцінюємо",
    "Не включайте в цей бюджет — розраховується окремо"
  ],
  "pl": [
    "Co oceniamy",
    "Nie uwzględniaj w tym budżecie — liczone osobno"
  ],
  "de": [
    "Bewertungsgrundlage",
    "Nicht in dieses Budget aufnehmen; wird separat berechnet"
  ],
  "fr": [
    "Périmètre de l’évaluation",
    "À exclure de ce budget ; calculé séparément"
  ],
  "it": [
    "Oggetto della valutazione",
    "Da escludere da questo budget; calcolato separatamente"
  ],
  "es": [
    "Objeto de la evaluación",
    "Excluir de este presupuesto; se calcula por separado"
  ],
  "pt": [
    "Objeto da avaliação",
    "Não incluir neste orçamento; calculado separadamente"
  ],
  "nl": [
    "Grondslag van de beoordeling",
    "Niet in dit budget opnemen; wordt apart berekend"
  ],
  "cs": [
    "Co hodnotíme",
    "Nezahrnujte do tohoto rozpočtu; počítá se samostatně"
  ],
  "sk": [
    "Čo hodnotíme",
    "Nezahŕňajte do tohto rozpočtu; počíta sa samostatne"
  ],
  "hu": [
    "Az értékelés tárgya",
    "Ne számítsa bele ebbe a költségvetésbe; külön számítjuk"
  ],
  "ro": [
    "Ce evaluăm",
    "Nu includeți în acest buget; se calculează separat"
  ],
  "bg": [
    "Какво оценяваме",
    "Не включвайте в този бюджет; изчислява се отделно"
  ],
  "sr": [
    "Šta procenjujemo",
    "Ne uključujte u ovaj budžet; obračunava se zasebno"
  ],
  "el": [
    "Αντικείμενο αξιολόγησης",
    "Μην το συμπεριλάβετε σε αυτόν τον προϋπολογισμό· υπολογίζεται χωριστά"
  ],
  "tr": [
    "Değerlendirme kapsamı",
    "Bu bütçeye dahil etmeyin; ayrı hesaplanır"
  ],
  "lt": [
    "Ką vertiname",
    "Neįtraukite į šį biudžetą; skaičiuojama atskirai"
  ],
  "lv": [
    "Ko vērtējam",
    "Neiekļaujiet šajā budžetā; aprēķina atsevišķi"
  ],
  "et": [
    "Mida hindame",
    "Ärge lisage sellesse eelarvesse; arvutatakse eraldi"
  ],
  "da": [
    "Hvad vurderer vi",
    "Medtag ikke i dette budget; beregnes separat"
  ],
  "sv": [
    "Vad bedömer vi",
    "Ta inte med i denna budget; beräknas separat"
  ],
  "fi": [
    "Arvioinnin kohde",
    "Älä sisällytä tähän budjettiin; lasketaan erikseen"
  ],
  "vi": [
    "Nội dung đánh giá",
    "Không tính vào ngân sách này; được tính riêng"
  ],
  "th": [
    "ขอบเขตการประเมิน",
    "ไม่รวมในงบประมาณนี้ เนื่องจากคำนวณแยกต่างหาก"
  ]
};
export function processCopy(locale: Locale) {
  const c = copy[locale], fields = processFieldLabels(locale);
  return { models: { residue: c[0], wastewater: c[1], landfill: c[2], gas: c[3] } as Record<ProcessKind,string>, role: c[4], roles: { feedstock_owner: c[5], waste_operator: c[6], developer: c[7], offtaker: c[8] }, modelLabel: scopeLabels[locale][0], costHint: `${c[9]} ${scopeLabels[locale][1]}: ${fields.residualCostLocalT.toLocaleLowerCase()}, ${fields.gasPriceLocalNm3.toLocaleLowerCase()}.`, inputHint: usage[locale][1] };
}

const fieldKeys = ["operatingDays", "monthsActive", "startMonth", "uncertaintyPct", "tonnesYear", "removalPct", "methaneRecoveryPct", "biomassCodPct", "sludgeTsPct", "inletTempC", "heatRecoveryPct", "avoidedTreatmentLocalM3", "annualWasteTonnes", "depositionYears", "yearsSinceClosure", "collectionPct", "availabilityPct", "declinePctYear", "gasPriceLocalNm3", "residualCostLocalT", "auxiliaryKwhYear", "auxiliaryHeatKwhYear"];
const fields: Record<Locale, string> = {
  en: "Operating days|Active months|Starting month (1–12)|Scenario uncertainty|Collected wet material|COD removal|Methane capture|Removed COD to biomass|Sludge dry solids|Inlet temperature|Heat recovery|Avoided treatment charge|Waste deposited per year|Years of waste deposition|Years since closure|Gas collection efficiency|Gas supply availability|Annual gas decline|Biogas purchase price|Residuals disposal cost|Upstream electricity use|Additional process heat",
  uk: "Дні роботи|Місяці роботи|Перший місяць (1–12)|Невизначеність сценаріїв|Зібрана волога сировина|Видалення COD|Уловлювання метану|Частка видаленого COD у біомасі|Суха речовина осаду|Температура на вході|Рекуперація тепла|Уникнена плата за очищення|Захоронення відходів за рік|Тривалість приймання відходів|Роки після закриття|Ефективність збору газу|Доступність подачі газу|Щорічне зниження потоку газу|Ціна закупівлі біогазу|Витрати на утилізацію залишків|Електроспоживання технологічної частини|Додаткове технологічне тепло",
  pl: "Dni pracy|Miesiące pracy|Pierwszy miesiąc (1–12)|Niepewność scenariuszy|Zebrany mokry substrat|Usuwanie ChZT|Wychwyt metanu|Usunięta ChZT w biomasie|Sucha masa osadu|Temperatura na wlocie|Odzysk ciepła|Uniknięta opłata za oczyszczanie|Odpady składowane rocznie|Lata składowania odpadów|Lata od zamknięcia|Sprawność zbierania gazu|Dostępność dostaw gazu|Roczny spadek ilości gazu|Cena zakupu biogazu|Koszt zagospodarowania pozostałości|Zużycie energii w procesie|Dodatkowe ciepło procesowe",
  de: "Betriebstage|Betriebsmonate|Startmonat (1–12)|Szenariounsicherheit|Erfasste Frischmasse|CSB-Abbau|Methanerfassung|Abgebauter CSB in Biomasse|Schlamm-Trockensubstanz|Zulauftemperatur|Wärmerückgewinnung|Vermiedene Behandlungsgebühr|Jährlich abgelagerter Abfall|Jahre der Abfallablagerung|Jahre seit Stilllegung|Gaserfassungsgrad|Verfügbarkeit der Gaszufuhr|Jährlicher Gasrückgang|Biogas-Einkaufspreis|Entsorgungskosten der Reststoffe|Strombedarf der Vorstufe|Zusätzliche Prozesswärme",
  fr: "Jours de fonctionnement|Mois d’activité|Premier mois (1–12)|Incertitude des scénarios|Matière humide collectée|Abattement de DCO|Captage du méthane|DCO éliminée vers la biomasse|Matière sèche des boues|Température d’entrée|Récupération de chaleur|Redevance de traitement évitée|Déchets stockés par an|Années de stockage|Années depuis la fermeture|Efficacité de collecte du gaz|Disponibilité du gaz|Baisse annuelle du débit de gaz|Prix d’achat du biogaz|Coût d’élimination des résidus|Électricité du procédé amont|Chaleur supplémentaire du procédé",
  it: "Giorni di esercizio|Mesi di attività|Mese iniziale (1–12)|Incertezza degli scenari|Materiale umido raccolto|Rimozione del COD|Captazione del metano|COD rimosso destinato alla biomassa|Sostanza secca dei fanghi|Temperatura in ingresso|Recupero di calore|Tariffa di trattamento evitata|Rifiuti conferiti ogni anno|Anni di conferimento|Anni dalla chiusura|Efficienza di captazione del gas|Disponibilità del gas|Calo annuo del flusso di gas|Prezzo d’acquisto del biogas|Costo di smaltimento dei residui|Consumo elettrico del processo a monte|Calore di processo aggiuntivo",
  es: "Días de operación|Meses de actividad|Mes inicial (1–12)|Incertidumbre de los escenarios|Material húmedo recogido|Eliminación de DQO|Captación de metano|DQO eliminada destinada a biomasa|Materia seca del lodo|Temperatura de entrada|Recuperación de calor|Tarifa de tratamiento evitada|Residuos depositados al año|Años de depósito|Años desde la clausura|Eficiencia de captación de gas|Disponibilidad del gas|Descenso anual del caudal de gas|Precio de compra del biogás|Coste de gestión de residuos|Electricidad del proceso previo|Calor de proceso adicional",
  pt: "Dias de operação|Meses de atividade|Mês inicial (1–12)|Incerteza dos cenários|Material úmido coletado|Remoção de DQO|Captação de metano|DQO removida destinada à biomassa|Sólidos secos do lodo|Temperatura de entrada|Recuperação de calor|Tarifa de tratamento evitada|Resíduos depositados por ano|Anos de deposição|Anos desde o encerramento|Eficiência de captação do gás|Disponibilidade do gás|Queda anual da vazão de gás|Preço de compra do biogás|Custo de destinação dos resíduos|Consumo elétrico do processo anterior|Calor de processo adicional",
  nl: "Bedrijfsdagen|Actieve maanden|Startmaand (1–12)|Scenario-onzekerheid|Ingezamelde natte massa|CZV-verwijdering|Methaanopvang|Verwijderde CZV naar biomassa|Drogestofgehalte slib|Inlaattemperatuur|Warmteterugwinning|Vermeden zuiveringsheffing|Jaarlijks gestort afval|Jaren van afvalstorting|Jaren sinds sluiting|Gasopvangrendement|Beschikbaarheid gastoevoer|Jaarlijkse gasafname|Inkoopprijs biogas|Afvoerkosten reststoffen|Stroomverbruik voorproces|Aanvullende proceswarmte",
  cs: "Provozní dny|Provozní měsíce|Počáteční měsíc (1–12)|Nejistota scénářů|Sesbíraná mokrá hmota|Odstranění CHSK|Záchyt metanu|Odstraněná CHSK do biomasy|Sušina kalu|Vstupní teplota|Zpětné získávání tepla|Ušetřený poplatek za čištění|Ročně uložený odpad|Roky ukládání odpadu|Roky od uzavření|Účinnost jímání plynu|Dostupnost dodávky plynu|Roční pokles množství plynu|Nákupní cena bioplynu|Náklady na odstranění zbytků|Spotřeba elektřiny předřazeného procesu|Dodatečné procesní teplo",
  sk: "Prevádzkové dni|Prevádzkové mesiace|Začiatočný mesiac (1–12)|Neistota scenárov|Zozbieraná mokrá hmota|Odstránenie CHSK|Záchyt metánu|Odstránená CHSK do biomasy|Sušina kalu|Vstupná teplota|Spätné získavanie tepla|Ušetrený poplatok za čistenie|Ročne uložený odpad|Roky ukladania odpadu|Roky od uzavretia|Účinnosť zachytávania plynu|Dostupnosť dodávky plynu|Ročný pokles množstva plynu|Nákupná cena bioplynu|Náklady na zneškodnenie zvyškov|Spotreba elektriny predchádzajúceho procesu|Dodatočné procesné teplo",
  hu: "Üzemnapok|Üzemhónapok|Kezdő hónap (1–12)|Forgatókönyvek bizonytalansága|Begyűjtött nedves anyag|KOI-eltávolítás|Metánbefogás|Eltávolított KOI biomasszává alakuló része|Iszap szárazanyag-tartalma|Belépő hőmérséklet|Hővisszanyerés|Elkerült kezelési díj|Évente lerakott hulladék|Hulladéklerakás évei|Lezárás óta eltelt évek|Gázgyűjtés hatásfoka|Gázellátás rendelkezésre állása|Éves gázhozamcsökkenés|Biogáz beszerzési ára|Maradékanyag-kezelés költsége|Előkezelés villamosenergia-igénye|További technológiai hőigény",
  ro: "Zile de funcționare|Luni de activitate|Luna de început (1–12)|Incertitudinea scenariilor|Material umed colectat|Eliminarea CCO|Captarea metanului|CCO eliminat transformat în biomasă|Substanța uscată a nămolului|Temperatura la intrare|Recuperarea căldurii|Tarif de tratare evitat|Deșeuri depozitate anual|Ani de depozitare|Ani de la închidere|Eficiența colectării gazului|Disponibilitatea gazului|Scăderea anuală a debitului de gaz|Prețul de achiziție a biogazului|Costul eliminării reziduurilor|Consumul electric al procesului amonte|Căldură suplimentară de proces",
  bg: "Работни дни|Работни месеци|Начален месец (1–12)|Неопределеност на сценариите|Събрана влажна суровина|Отстраняване на ХПК|Улавяне на метан|Отстранен ХПК в биомасата|Сухо вещество на утайката|Входяща температура|Оползотворяване на топлината|Спестена такса за пречистване|Депонирани отпадъци годишно|Години на депониране|Години след закриване|Ефективност на събиране на газ|Наличност на подавания газ|Годишен спад на газовия поток|Покупна цена на биогаза|Разходи за обезвреждане на остатъци|Електропотребление на предходния процес|Допълнителна технологична топлина",
  sr: "Radni dani|Meseci rada|Početni mesec (1–12)|Neizvesnost scenarija|Sakupljena vlažna sirovina|Uklanjanje HPK|Hvatanje metana|Uklonjena HPK u biomasi|Suva materija mulja|Ulazna temperatura|Povrat toplote|Izbegnuta naknada za prečišćavanje|Godišnje deponovan otpad|Godine odlaganja otpada|Godine od zatvaranja|Efikasnost sakupljanja gasa|Raspoloživost dovoda gasa|Godišnji pad protoka gasa|Nabavna cena biogasa|Trošak zbrinjavanja ostataka|Potrošnja električne energije prethodnog procesa|Dodatna procesna toplota",
  el: "Ημέρες λειτουργίας|Μήνες λειτουργίας|Μήνας έναρξης (1–12)|Αβεβαιότητα σεναρίων|Συλλεγμένη υγρή πρώτη ύλη|Απομάκρυνση COD|Συλλογή μεθανίου|Απομακρυνόμενο COD προς βιομάζα|Ξηρά στερεά ιλύος|Θερμοκρασία εισόδου|Ανάκτηση θερμότητας|Αποφευγόμενο τέλος επεξεργασίας|Ετήσια απόθεση αποβλήτων|Έτη απόθεσης|Έτη από το κλείσιμο|Απόδοση συλλογής αερίου|Διαθεσιμότητα παροχής αερίου|Ετήσια μείωση αερίου|Τιμή αγοράς βιοαερίου|Κόστος διάθεσης υπολειμμάτων|Ηλεκτρική κατανάλωση προηγούμενου σταδίου|Πρόσθετη θερμότητα διεργασίας",
  tr: "İşletme günleri|Faaliyet ayları|Başlangıç ayı (1–12)|Senaryo belirsizliği|Toplanan yaş malzeme|KOİ giderimi|Metan yakalama|Giderilen KOİ’nin biyokütle payı|Çamur kuru maddesi|Giriş sıcaklığı|Isı geri kazanımı|Önlenen arıtma bedeli|Yıllık depolanan atık|Atık depolama süresi|Kapatmadan itibaren geçen yıl|Gaz toplama verimi|Gaz arzının kullanılabilirliği|Yıllık gaz debisi düşüşü|Biyogaz alım fiyatı|Kalıntı bertaraf maliyeti|Ön proses elektrik tüketimi|Ek proses ısısı",
  lt: "Darbo dienos|Darbo mėnesiai|Pradžios mėnuo (1–12)|Scenarijų neapibrėžtumas|Surinkta drėgna žaliava|ChDS šalinimas|Metano surinkimas|Pašalinta ChDS dalis biomasėje|Dumblo sausosios medžiagos|Įtekėjimo temperatūra|Šilumos atgavimas|Išvengtas valymo mokestis|Per metus pašalintos atliekos|Atliekų šalinimo metai|Metai nuo uždarymo|Dujų surinkimo efektyvumas|Dujų tiekimo prieinamumas|Metinis dujų srauto mažėjimas|Biodujų pirkimo kaina|Liekanų šalinimo sąnaudos|Pirminio proceso elektros sąnaudos|Papildoma proceso šiluma",
  lv: "Darba dienas|Darba mēneši|Sākuma mēnesis (1–12)|Scenāriju nenoteiktība|Savāktā mitrā izejviela|ĶSP samazinājums|Metāna uztveršana|Noņemtā ĶSP daļa biomasā|Dūņu sausnas saturs|Ieplūdes temperatūra|Siltuma atgūšana|Novērstā attīrīšanas maksa|Gadā apglabātie atkritumi|Atkritumu apglabāšanas gadi|Gadi kopš slēgšanas|Gāzes savākšanas efektivitāte|Gāzes padeves pieejamība|Gāzes plūsmas gada samazinājums|Biogāzes iepirkuma cena|Atlieku apglabāšanas izmaksas|Iepriekšējā procesa elektroenerģija|Papildu procesa siltums",
  et: "Tööpäevad|Töökuud|Alguskuu (1–12)|Stsenaariumide määramatus|Kogutud märg tooraine|KHT eemaldamine|Metaani kogumine|Eemaldatud KHT osa biomassis|Sette kuivainesisaldus|Sisendtemperatuur|Soojuse taaskasutus|Välditud puhastustasu|Aastas ladestatud jäätmed|Jäätmete ladestamise aastad|Aastad sulgemisest|Gaasi kogumise tõhusus|Gaasivarustuse kättesaadavus|Aastane gaasivoo vähenemine|Biogaasi ostuhind|Jääkide kõrvaldamise kulu|Eelprotsessi elektritarve|Täiendav protsessisoojus",
  da: "Driftsdage|Driftsmåneder|Startmåned (1–12)|Scenarieusikkerhed|Indsamlet våd biomasse|COD-fjernelse|Metanopsamling|Fjernet COD til biomasse|Slamtørstof|Indløbstemperatur|Varmegenvinding|Sparet behandlingsafgift|Årligt deponeret affald|År med deponering|År siden lukning|Gasopsamlingseffektivitet|Gastilførslens tilgængelighed|Årligt fald i gasmængden|Indkøbspris for biogas|Omkostninger til restproduktbortskaffelse|Elforbrug i forprocessen|Ekstra procesvarme",
  sv: "Driftdagar|Driftmånader|Startmånad (1–12)|Scenarioosäkerhet|Insamlad våt biomassa|COD-reduktion|Metaninsamling|Avskild COD till biomassa|Slammets torrsubstans|Inloppstemperatur|Värmeåtervinning|Undviken behandlingsavgift|Årligen deponerat avfall|Antal deponeringsår|År sedan avslutning|Gasinsamlingens verkningsgrad|Gastillförselns tillgänglighet|Årlig minskning av gasflödet|Inköpspris för biogas|Kostnad för hantering av rester|Elförbrukning i föregående process|Ytterligare processvärme",
  fi: "Käyttöpäivät|Toimintakuukaudet|Aloituskuukausi (1–12)|Skenaarioiden epävarmuus|Kerätty märkä raaka-aine|COD-poistuma|Metaanin talteenotto|Poistetun COD:n osuus biomassassa|Lietteen kuiva-aine|Tulolämpötila|Lämmön talteenotto|Vältetty käsittelymaksu|Vuosittain sijoitettu jäte|Jätteen sijoitusvuodet|Vuodet sulkemisesta|Kaasun keräystehokkuus|Kaasunsyötön käytettävyys|Kaasuvirran vuotuinen vähenemä|Biokaasun ostohinta|Jäännösten käsittelykustannus|Esiprosessin sähkönkulutus|Prosessin lisälämpö",
  vi: "Số ngày vận hành|Số tháng hoạt động|Tháng bắt đầu (1–12)|Độ bất định của kịch bản|Nguyên liệu ướt thu gom|Hiệu suất loại bỏ COD|Thu hồi metan|COD loại bỏ chuyển thành sinh khối|Chất rắn khô trong bùn|Nhiệt độ đầu vào|Thu hồi nhiệt|Phí xử lý tránh được|Lượng chất thải chôn lấp mỗi năm|Số năm tiếp nhận chất thải|Số năm từ khi đóng cửa|Hiệu suất thu gom khí|Độ sẵn sàng của nguồn khí|Mức giảm lưu lượng khí hằng năm|Giá mua khí sinh học|Chi phí xử lý phần còn lại|Điện tiêu thụ của công đoạn đầu|Nhiệt bổ sung cho quy trình",
  th: "วันเดินระบบ|เดือนที่เดินระบบ|เดือนเริ่มต้น (1–12)|ความไม่แน่นอนของสถานการณ์|วัตถุดิบเปียกที่รวบรวมได้|การกำจัด COD|การดักจับมีเทน|สัดส่วน COD ที่กำจัดแล้วเปลี่ยนเป็นชีวมวล|ของแข็งแห้งในตะกอน|อุณหภูมิขาเข้า|การนำความร้อนกลับมาใช้|ค่าบำบัดที่ประหยัดได้|ขยะที่ฝังกลบต่อปี|จำนวนปีที่รับขยะ|จำนวนปีหลังปิดหลุมฝังกลบ|ประสิทธิภาพการรวบรวมก๊าซ|ความพร้อมของแหล่งก๊าซ|การลดลงของปริมาณก๊าซต่อปี|ราคาซื้อก๊าซชีวภาพ|ค่ากำจัดกากที่เหลือ|ไฟฟ้าที่ใช้ในกระบวนการต้นทาง|ความร้อนเพิ่มเติมสำหรับกระบวนการ",
};
export function processFieldLabels(locale: Locale): Record<string, string> {
  const evidence: Record<Locale, readonly [string,string]> = {
    en: ["Data date (optional)","Source or quotation reference (optional)"], uk: ["Дата даних (необов’язково)","Джерело або номер пропозиції (необов’язково)"], pl: ["Data danych (opcjonalnie)","Źródło lub numer oferty (opcjonalnie)"], de: ["Datenstand (optional)","Quelle oder Angebotsreferenz (optional)"], fr: ["Date des données (facultatif)","Source ou référence du devis (facultatif)"], it: ["Data dei dati (facoltativa)","Fonte o riferimento del preventivo (facoltativo)"], es: ["Fecha de los datos (opcional)","Fuente o referencia de la oferta (opcional)"], pt: ["Data dos dados (opcional)","Fonte ou referência da proposta (opcional)"], nl: ["Datum van de gegevens (optioneel)","Bron of offertereferentie (optioneel)"], cs: ["Datum údajů (nepovinné)","Zdroj nebo číslo nabídky (nepovinné)"], sk: ["Dátum údajov (nepovinné)","Zdroj alebo číslo ponuky (nepovinné)"], hu: ["Adatok dátuma (nem kötelező)","Forrás vagy ajánlatszám (nem kötelező)"], ro: ["Data informațiilor (opțional)","Sursa sau referința ofertei (opțional)"], bg: ["Дата на данните (незадължително)","Източник или номер на оферта (незадължително)"], sr: ["Datum podataka (opciono)","Izvor ili broj ponude (opciono)"], el: ["Ημερομηνία δεδομένων (προαιρετικά)","Πηγή ή αριθμός προσφοράς (προαιρετικά)"], tr: ["Veri tarihi (isteğe bağlı)","Kaynak veya teklif numarası (isteğe bağlı)"], lt: ["Duomenų data (neprivaloma)","Šaltinis arba pasiūlymo numeris (neprivaloma)"], lv: ["Datu datums (neobligāti)","Avots vai piedāvājuma numurs (neobligāti)"], et: ["Andmete kuupäev (valikuline)","Allikas või pakkumise viide (valikuline)"], da: ["Datadato (valgfrit)","Kilde eller tilbudsreference (valgfrit)"], sv: ["Datadatum (valfritt)","Källa eller offertreferens (valfritt)"], fi: ["Tietojen päivämäärä (valinnainen)","Lähde tai tarjouksen viite (valinnainen)"], vi: ["Ngày dữ liệu (không bắt buộc)","Nguồn hoặc mã báo giá (không bắt buộc)"], th: ["วันที่ข้อมูล (ไม่บังคับ)","แหล่งข้อมูลหรือเลขที่ใบเสนอราคา (ไม่บังคับ)"],
  };
  return { basisDate: evidence[locale][0], basisReference: evidence[locale][1], ...Object.fromEntries(fields[locale].split("|").map((label,i) => [fieldKeys[i],label])), reactorTechnology: "Reactor", densityKgM3: "ρ = m/V", sludgeVsPct: "VS / TS", nitrogenPct: "N₂", oxygenPct: "O₂", h2sPpm: "H₂S", upgradingCapexLocal: "Upgrading · CAPEX", upgradingRecoveryPct: "Upgrading · η CH₄", upgradingKwhNm3: "Upgrading · kWh/Nm³", productMethanePct: "Upgrading → CH₄", processCapexLocal: "CAPEX", processOpexLocalYear: "OPEX", dmPct: "DM / TS", vsPct: "VS / DM", bmp: "BMP", methanePct: "CH₄", nKgT: "N", hrtDays: "HRT", olr: "OLR", flowM3Day: "Q", codMgL: "COD", decayPerYear: "k", potentialNm3T: "L₀", rawGasNm3Hour: "Q (biogas)" };
}

const usage: Record<Locale,readonly [string,string,string]> = {
  "en": [
    "Optional",
    "Leave unknown costs and auxiliary loads blank. Economics require these inputs. Zero means a confirmed absence of cost or load.",
    "Covered anaerobic lagoon"
  ],
  "uk": [
    "Необов’язково",
    "Невідомі витрати й власні потреби залишайте порожніми. Без них економічний висновок недоступний. Нуль означає підтверджену відсутність витрат або навантаження.",
    "Накрита анаеробна лагуна"
  ],
  "pl": [
    "Opcjonalnie",
    "Nieznane koszty i potrzeby własne pozostaw puste. Bez nich nie można ocenić ekonomiki. Zero oznacza potwierdzony brak kosztu lub zużycia.",
    "Przykryta laguna beztlenowa"
  ],
  "de": [
    "Optional",
    "Unbekannte Kosten und Eigenverbräuche leer lassen. Ohne diese Angaben ist keine Wirtschaftlichkeitsaussage möglich. Null bedeutet nachweislich keine Kosten oder Verbräuche.",
    "Abgedeckte anaerobe Lagune"
  ],
  "fr": [
    "Facultatif",
    "Laissez vides les coûts et consommations auxiliaires inconnus. Ils sont nécessaires à l’évaluation économique. Zéro signifie une absence confirmée.",
    "Lagune anaérobie couverte"
  ],
  "it": [
    "Facoltativo",
    "Lascia vuoti costi e consumi ausiliari sconosciuti. Servono per valutare la redditività. Zero indica un’assenza confermata.",
    "Laguna anaerobica coperta"
  ],
  "es": [
    "Opcional",
    "Deja en blanco los costes y consumos auxiliares desconocidos. Son necesarios para evaluar la rentabilidad. Cero indica una ausencia confirmada.",
    "Laguna anaerobia cubierta"
  ],
  "pt": [
    "Opcional",
    "Deixe em branco custos e consumos auxiliares desconhecidos. Eles são necessários para avaliar a viabilidade econômica. Zero indica ausência confirmada.",
    "Lagoa anaeróbia coberta"
  ],
  "nl": [
    "Optioneel",
    "Laat onbekende kosten en eigen verbruik leeg. Deze gegevens zijn nodig voor de economische beoordeling. Nul betekent dat kosten of verbruik aantoonbaar ontbreken.",
    "Afgedekte anaerobe lagune"
  ],
  "cs": [
    "Nepovinné",
    "Neznámé náklady a vlastní spotřebu ponechte prázdné. Bez nich nelze posoudit ekonomiku. Nula znamená potvrzenou absenci nákladu či spotřeby.",
    "Zakrytá anaerobní laguna"
  ],
  "sk": [
    "Nepovinné",
    "Neznáme náklady a vlastnú spotrebu nechajte prázdne. Bez nich nemožno posúdiť ekonomiku. Nula znamená potvrdenú absenciu nákladu či spotreby.",
    "Zakrytá anaeróbna lagúna"
  ],
  "hu": [
    "Nem kötelező",
    "Az ismeretlen költségeket és saját fogyasztást hagyja üresen. Ezek nélkül nem adható gazdasági értékelés. A nulla igazoltan hiányzó költséget vagy fogyasztást jelent.",
    "Fedett anaerob lagúna"
  ],
  "ro": [
    "Opțional",
    "Lăsați necompletate costurile și consumurile auxiliare necunoscute. Sunt necesare pentru evaluarea economică. Zero înseamnă absență confirmată.",
    "Lagună anaerobă acoperită"
  ],
  "bg": [
    "Незадължително",
    "Оставете неизвестните разходи и собствено потребление празни. Без тях няма икономическа оценка. Нула означава потвърдена липса на разход или потребление.",
    "Покрита анаеробна лагуна"
  ],
  "sr": [
    "Opciono",
    "Nepoznate troškove i sopstvenu potrošnju ostavite prazne. Bez njih nije moguća ekonomska procena. Nula znači potvrđeno odsustvo troška ili potrošnje.",
    "Pokrivena anaerobna laguna"
  ],
  "el": [
    "Προαιρετικά",
    "Αφήστε κενά τα άγνωστα κόστη και τις βοηθητικές καταναλώσεις. Απαιτούνται για την οικονομική αξιολόγηση. Το μηδέν σημαίνει επιβεβαιωμένη απουσία.",
    "Καλυμμένη αναερόβια λιμνοδεξαμενή"
  ],
  "tr": [
    "İsteğe bağlı",
    "Bilinmeyen maliyet ve yardımcı tüketim alanlarını boş bırakın. Ekonomik değerlendirme için bunlar gereklidir. Sıfır, maliyet veya tüketimin olmadığının doğrulandığını belirtir.",
    "Örtülü anaerobik lagün"
  ],
  "lt": [
    "Neprivaloma",
    "Nežinomas sąnaudas ir savąjį energijos poreikį palikite tuščius. Be jų ekonominis vertinimas negalimas. Nulis reiškia patvirtintą sąnaudų ar vartojimo nebuvimą.",
    "Dengta anaerobinė lagūna"
  ],
  "lv": [
    "Neobligāti",
    "Nezināmas izmaksas un pašpatēriņu atstājiet tukšu. Bez tiem ekonomiskais novērtējums nav iespējams. Nulle nozīmē apstiprinātu izmaksu vai patēriņa neesamību.",
    "Pārklāta anaerobā lagūna"
  ],
  "et": [
    "Valikuline",
    "Jätke teadmata kulud ja omatarve tühjaks. Ilma nendeta ei saa majanduslikku hinnangut anda. Null tähendab kinnitatud kulu või tarbimise puudumist.",
    "Kaetud anaeroobne laguun"
  ],
  "da": [
    "Valgfrit",
    "Lad ukendte omkostninger og eget energiforbrug stå tomme. De er nødvendige for økonomivurderingen. Nul betyder dokumenteret fravær af omkostning eller forbrug.",
    "Overdækket anaerob lagune"
  ],
  "sv": [
    "Valfritt",
    "Lämna okända kostnader och egenförbrukning tomma. De krävs för den ekonomiska bedömningen. Noll betyder bekräftad avsaknad av kostnad eller förbrukning.",
    "Täckt anaerob lagun"
  ],
  "fi": [
    "Valinnainen",
    "Jätä tuntemattomat kustannukset ja omakäyttö tyhjiksi. Niitä tarvitaan talousarvioon. Nolla tarkoittaa vahvistettua kustannuksen tai kulutuksen puuttumista.",
    "Katettu anaerobinen laguuni"
  ],
  "vi": [
    "Không bắt buộc",
    "Để trống chi phí và nhu cầu năng lượng phụ trợ chưa biết. Cần các dữ liệu này để đánh giá kinh tế. Số không nghĩa là đã xác nhận không có chi phí hoặc tiêu thụ.",
    "Hồ kỵ khí có phủ bạt"
  ],
  "th": [
    "ไม่บังคับ",
    "เว้นว่างต้นทุนและการใช้พลังงานของระบบที่ยังไม่ทราบ ต้องมีข้อมูลนี้จึงจะประเมินความคุ้มค่าได้ ศูนย์หมายถึงยืนยันแล้วว่าไม่มีต้นทุนหรือการใช้พลังงาน",
    "บ่อบำบัดไร้อากาศแบบคลุม"
  ]
};
export const processUsage = (locale: Locale) => ({ optional: usage[locale][0], unknown: usage[locale][1], lagoon: usage[locale][2] });

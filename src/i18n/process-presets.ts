import type { Locale } from "./config";

/** Starch-plant wastewater presets and the note on modelled wastewater costs (`core/wastewaterPresets.ts`, `core/processes.ts`). */
export interface PresetCopy {
  title: string;
  potato_starch: string;
  cereal_starch: string;
  cassava_starch: string;
  throughput: string;
  apply: string;
  note: string;
  /** Shown next to the cost fields and above the list of modelled costs in the result. */
  modelledWastewater: string;
}

const copy: Record<Locale, PresetCopy> = {
  en: {
    title: "Typical values for a starch plant", potato_starch: "Potato starch", cereal_starch: "Wheat or maize starch", cassava_starch: "Cassava (tapioca) starch",
    throughput: "Raw material processed on a working day, t", apply: "Fill in",
    note: "Fills flow, COD, removal, gas and reactor values from published sector data (EU BAT conclusions 2019, IEA Bioenergy 2025; cassava: studies of Thai plants). Cost fields stay blank for the model estimate; enter your current treatment or sewer charge per m³ yourself. Replace each value with your plant’s records when you have them.",
    modelledWastewater: "Cost fields left blank are estimated from the reactor volume (UASB/EGSB or covered lagoon) at a unit cost set by engineering judgement, because no dated public cost curve exists for these reactors, plus a maintenance share, own power use and the surplus-digestate price for the sludge. Pretreatment, aerobic polishing and discharge are not included. Without your reactor budget the result cannot reach the top verdict. Each figure you enter replaces its estimate.",
  },
  uk: {
    title: "Типові значення для крохмального заводу", potato_starch: "Картопляний крохмаль", cereal_starch: "Пшеничний або кукурудзяний крохмаль", cassava_starch: "Крохмаль із маніоки (тапіока)",
    throughput: "Переробка сировини за робочу добу, т", apply: "Заповнити",
    note: "Заповнює витрату стоків, ХСК, ступінь очищення, параметри газу та реактора за опублікованими галузевими даними (висновки ЄС щодо НДТ 2019, IEA Bioenergy 2025; маніока — дослідження заводів Таїланду). Поля витрат лишаються порожніми для модельної оцінки; поточну плату за очищення чи скид у каналізацію за м³ вкажіть самі. Замініть кожне значення даними свого заводу, щойно вони будуть.",
    modelledWastewater: "Порожні поля витрат модель оцінює за об’ємом реактора (UASB/EGSB або накрита лагуна) з питомою вартістю за інженерним судженням, бо датованої публічної кривої вартості таких реакторів немає, а також частку на обслуговування, власне електроспоживання і ціну вивезення надлишку дигестату для мулу. Попереднє очищення, аеробне доочищення та скид не враховано. Без вашого бюджету реактора результат не може отримати найвищий вердикт. Кожне введене вами значення замінює свою оцінку.",
  },
  pl: {
    title: "Typowe wartości dla krochmalni", potato_starch: "Skrobia ziemniaczana", cereal_starch: "Skrobia pszenna lub kukurydziana", cassava_starch: "Skrobia z manioku (tapioka)",
    throughput: "Surowiec przerabiany w dniu pracy, t", apply: "Uzupełnij",
    note: "Uzupełnia przepływ, ChZT, stopień usuwania, parametry gazu i reaktora na podstawie opublikowanych danych branżowych (konkluzje BAT UE 2019, IEA Bioenergy 2025; maniok: badania zakładów w Tajlandii). Pola kosztów pozostają puste dla szacunku modelu; obecną opłatę za oczyszczanie lub zrzut do kanalizacji za m³ podaj samodzielnie. Zastąp każdą wartość danymi swojego zakładu, gdy tylko je masz.",
    modelledWastewater: "Puste pola kosztów model szacuje na podstawie objętości reaktora (UASB/EGSB lub przykryta laguna) z kosztem jednostkowym przyjętym na podstawie oceny inżynierskiej, bo nie istnieje datowana publiczna krzywa kosztów takich reaktorów, a także udział na utrzymanie, zużycie własne energii i cenę odbioru nadwyżki pofermentu dla osadu. Podczyszczanie, doczyszczanie tlenowe i zrzut nie są ujęte. Bez Twojego budżetu reaktora wynik nie może uzyskać najwyższej oceny. Każda wpisana wartość zastępuje swój szacunek.",
  },
  de: {
    title: "Typische Werte für eine Stärkefabrik", potato_starch: "Kartoffelstärke", cereal_starch: "Weizen- oder Maisstärke", cassava_starch: "Maniokstärke (Tapioka)",
    throughput: "Verarbeiteter Rohstoff je Betriebstag, t", apply: "Ausfüllen",
    note: "Füllt Abwassermenge, CSB, Abbaugrad, Gas- und Reaktorwerte aus veröffentlichten Branchendaten (BVT-Schlussfolgerungen der EU 2019, IEA Bioenergy 2025; Maniok: Studien thailändischer Werke). Die Kostenfelder bleiben für die Modellschätzung leer; Ihre heutigen Kosten für Behandlung oder Indirekteinleitung je m³ tragen Sie selbst ein. Ersetzen Sie jeden Wert durch die Betriebsdaten Ihres Werks, sobald Sie sie haben.",
    modelledWastewater: "Leere Kostenfelder schätzt das Modell aus dem Reaktorvolumen (UASB/EGSB oder abgedeckte Lagune) mit einem ingenieurmäßig geschätzten Einheitspreis, da es keine datierte öffentliche Kostenkurve für solche Reaktoren gibt, dazu einen Instandhaltungsanteil, den Eigenstrombedarf und den Preis für überschüssige Gärreste für den Schlamm. Vorbehandlung, aerobe Nachreinigung und Einleitung sind nicht enthalten. Ohne Ihr Reaktorbudget erreicht das Ergebnis nicht die beste Bewertung. Jeder Wert, den Sie eintragen, ersetzt seine Schätzung.",
  },
  fr: {
    title: "Valeurs types pour une amidonnerie", potato_starch: "Fécule de pomme de terre", cereal_starch: "Amidon de blé ou de maïs", cassava_starch: "Amidon de manioc (tapioca)",
    throughput: "Matière première traitée par jour de marche, t", apply: "Remplir",
    note: "Remplit le débit, la DCO, le taux d’abattement, les paramètres du gaz et du réacteur à partir de données sectorielles publiées (conclusions MTD de l’UE 2019, IEA Bioenergy 2025 ; manioc : études d’usines thaïlandaises). Les coûts restent vides pour l’estimation du modèle ; indiquez vous-même votre coût actuel de traitement ou de rejet au réseau par m³. Remplacez chaque valeur par les relevés de votre usine dès que vous les avez.",
    modelledWastewater: "Les coûts laissés vides sont estimés à partir du volume du réacteur (UASB/EGSB ou lagune couverte) avec un coût unitaire fixé à dire d’ingénieur, faute de courbe de coûts publique et datée pour ces réacteurs, plus une part d’entretien, l’autoconsommation électrique et le prix d’enlèvement du digestat excédentaire pour les boues. Le prétraitement, l’affinage aérobie et le rejet ne sont pas inclus. Sans votre budget de réacteur, le résultat ne peut pas obtenir le meilleur verdict. Chaque valeur saisie remplace son estimation.",
  },
  it: {
    title: "Valori tipici per un amidificio", potato_starch: "Fecola di patate", cereal_starch: "Amido di frumento o di mais", cassava_starch: "Amido di manioca (tapioca)",
    throughput: "Materia prima lavorata in un giorno di esercizio, t", apply: "Compila",
    note: "Compila portata, COD, rimozione, parametri del gas e del reattore con dati di settore pubblicati (conclusioni BAT UE 2019, IEA Bioenergy 2025; manioca: studi su stabilimenti thailandesi). I campi di costo restano vuoti per la stima del modello; inserisci tu il costo attuale di depurazione o di scarico in fognatura per m³. Sostituisci ogni valore con i dati del tuo stabilimento appena li hai.",
    modelledWastewater: "I campi di costo lasciati vuoti sono stimati dal volume del reattore (UASB/EGSB o laguna coperta) con un costo unitario fissato per giudizio ingegneristico, perché non esiste una curva dei costi pubblica e datata per questi reattori, più una quota di manutenzione, l’autoconsumo elettrico e il prezzo di ritiro del digestato in eccesso per il fango. Pretrattamento, affinamento aerobico e scarico non sono inclusi. Senza il tuo budget del reattore il risultato non può ottenere il giudizio migliore. Ogni valore che inserisci sostituisce la sua stima.",
  },
  es: {
    title: "Valores típicos para una almidonera", potato_starch: "Fécula de patata", cereal_starch: "Almidón de trigo o maíz", cassava_starch: "Almidón de yuca (tapioca)",
    throughput: "Materia prima procesada por día de trabajo, t", apply: "Rellenar",
    note: "Rellena caudal, DQO, eliminación, parámetros del gas y del reactor con datos sectoriales publicados (conclusiones MTD de la UE 2019, IEA Bioenergy 2025; yuca: estudios de plantas tailandesas). Los costes quedan en blanco para la estimación del modelo; introduzca usted el coste actual de depuración o de vertido al alcantarillado por m³. Sustituya cada valor por los registros de su planta en cuanto los tenga.",
    modelledWastewater: "Los costes que deje en blanco se estiman a partir del volumen del reactor (UASB/EGSB o laguna cubierta) con un coste unitario basado en criterio de ingeniería, porque no existe una curva de costes pública y fechada para estos reactores, más una cuota de mantenimiento, el autoconsumo eléctrico y el precio de retirada del digestato sobrante para el lodo. No se incluyen el pretratamiento, el afino aerobio ni el vertido. Sin su presupuesto de reactor el resultado no puede obtener el mejor veredicto. Cada valor que introduzca sustituye su estimación.",
  },
  pt: {
    title: "Valores típicos para uma fecularia", potato_starch: "Fécula de batata", cereal_starch: "Amido de trigo ou milho", cassava_starch: "Fécula de mandioca (tapioca)",
    throughput: "Matéria-prima processada por dia de operação, t", apply: "Preencher",
    note: "Preenche vazão, DQO, remoção, parâmetros do gás e do reator com dados setoriais publicados (conclusões BAT da UE 2019, IEA Bioenergy 2025; mandioca: estudos de fecularias tailandesas). Os custos ficam em branco para a estimativa do modelo; informe você mesmo o custo atual de tratamento ou de lançamento na rede por m³. Substitua cada valor pelos registros da sua planta assim que os tiver.",
    modelledWastewater: "Os custos deixados em branco são estimados pelo volume do reator (UASB/EGSB ou lagoa coberta) com um custo unitário definido por julgamento de engenharia, pois não existe curva de custos pública e datada para esses reatores, mais uma parcela de manutenção, o consumo próprio de energia e o preço de retirada do digestato excedente para o lodo. Pré-tratamento, polimento aeróbio e lançamento não estão incluídos. Sem o seu orçamento do reator, o resultado não pode alcançar o melhor veredito. Cada valor que você informar substitui a estimativa correspondente.",
  },
  nl: {
    title: "Typische waarden voor een zetmeelfabriek", potato_starch: "Aardappelzetmeel", cereal_starch: "Tarwe- of maïszetmeel", cassava_starch: "Cassavezetmeel (tapioca)",
    throughput: "Verwerkte grondstof per bedrijfsdag, t", apply: "Invullen",
    note: "Vult debiet, CZV, verwijdering, gas- en reactorwaarden in op basis van gepubliceerde sectorgegevens (BBT-conclusies EU 2019, IEA Bioenergy 2025; cassave: studies van Thaise fabrieken). De kostenvelden blijven leeg voor de modelschatting; vul uw huidige zuiverings- of lozingsheffing per m³ zelf in. Vervang elke waarde door de gegevens van uw fabriek zodra u die hebt.",
    modelledWastewater: "Lege kostenvelden schat het model op basis van het reactorvolume (UASB/EGSB of afgedekte lagune) met een eenheidsprijs volgens technisch oordeel, omdat er geen gedateerde openbare kostencurve voor zulke reactoren bestaat, plus een onderhoudsaandeel, eigen stroomverbruik en de prijs voor afvoer van overtollig digestaat voor het slib. Voorbehandeling, aerobe nazuivering en lozing zijn niet inbegrepen. Zonder uw reactorbudget kan de uitkomst het hoogste oordeel niet halen. Elke waarde die u invult, vervangt de schatting.",
  },
  cs: {
    title: "Typické hodnoty pro škrobárnu", potato_starch: "Bramborový škrob", cereal_starch: "Pšeničný nebo kukuřičný škrob", cassava_starch: "Škrob z manioku (tapioka)",
    throughput: "Zpracovaná surovina za provozní den, t", apply: "Vyplnit",
    note: "Vyplní průtok, CHSK, účinnost odstranění, parametry plynu a reaktoru podle zveřejněných oborových dat (závěry o BAT EU 2019, IEA Bioenergy 2025; maniok: studie thajských závodů). Pole nákladů zůstanou prázdná pro odhad modelu; současnou cenu za čištění nebo vypouštění do kanalizace za m³ zadejte sami. Každou hodnotu nahraďte provozními daty svého závodu, jakmile je budete mít.",
    modelledWastewater: "Prázdná pole nákladů model odhaduje z objemu reaktoru (UASB/EGSB nebo zakrytá laguna) s jednotkovou cenou podle inženýrského úsudku, protože datovaná veřejná nákladová křivka pro tyto reaktory neexistuje, a dále podíl na údržbu, vlastní spotřebu elektřiny a cenu odvozu přebytečného digestátu pro kal. Předčištění, aerobní dočištění a vypouštění nejsou zahrnuty. Bez vašeho rozpočtu reaktoru nemůže výsledek získat nejlepší hodnocení. Každá zadaná hodnota nahrazuje svůj odhad.",
  },
  sk: {
    title: "Typické hodnoty pre škrobáreň", potato_starch: "Zemiakový škrob", cereal_starch: "Pšeničný alebo kukuričný škrob", cassava_starch: "Škrob z manioku (tapioka)",
    throughput: "Spracovaná surovina za prevádzkový deň, t", apply: "Vyplniť",
    note: "Vyplní prietok, CHSK, účinnosť odstránenia, parametre plynu a reaktora podľa zverejnených odvetvových údajov (závery o BAT EÚ 2019, IEA Bioenergy 2025; maniok: štúdie thajských závodov). Polia nákladov zostanú prázdne pre odhad modelu; súčasnú cenu za čistenie alebo vypúšťanie do kanalizácie za m³ zadajte sami. Každú hodnotu nahraďte prevádzkovými údajmi svojho závodu, hneď ako ich budete mať.",
    modelledWastewater: "Prázdne polia nákladov model odhaduje z objemu reaktora (UASB/EGSB alebo zakrytá lagúna) s jednotkovou cenou podľa inžinierskeho úsudku, pretože datovaná verejná nákladová krivka pre tieto reaktory neexistuje, a ďalej podiel na údržbu, vlastnú spotrebu elektriny a cenu odvozu prebytočného digestátu pre kal. Predčistenie, aeróbne dočistenie a vypúšťanie nie sú zahrnuté. Bez vášho rozpočtu reaktora nemôže výsledok získať najlepšie hodnotenie. Každá zadaná hodnota nahrádza svoj odhad.",
  },
  hu: {
    title: "Jellemző értékek keményítőgyárhoz", potato_starch: "Burgonyakeményítő", cereal_starch: "Búza- vagy kukoricakeményítő", cassava_starch: "Maniókakeményítő (tápióka)",
    throughput: "Egy üzemnapon feldolgozott nyersanyag, t", apply: "Kitöltés",
    note: "A szennyvízhozamot, a KOI-t, az eltávolítási fokot, a gáz és a reaktor adatait közzétett ágazati adatokból tölti ki (EU BAT-következtetések 2019, IEA Bioenergy 2025; manióka: thaiföldi üzemek vizsgálatai). A költségmezők üresek maradnak a modell becsléséhez; a jelenlegi tisztítási vagy csatornabebocsátási díjat m³-enként Ön adja meg. Minden értéket cseréljen le üzeme saját adataira, amint rendelkezésre állnak.",
    modelledWastewater: "Az üresen hagyott költségmezőket a modell a reaktortérfogatból becsüli (UASB/EGSB vagy fedett lagúna) mérnöki becslésen alapuló egységárral, mert ilyen reaktorokra nincs keltezett nyilvános költséggörbe, hozzáadva a karbantartási hányadot, a saját villamosenergia-igényt és a felesleges digestátum elszállításának árát az iszapra. Az előtisztítás, az aerob utótisztítás és a bebocsátás nincs benne. Az Ön reaktorköltségvetése nélkül az eredmény nem kaphatja meg a legjobb minősítést. Minden megadott érték felülírja a saját becslését.",
  },
  ro: {
    title: "Valori tipice pentru o fabrică de amidon", potato_starch: "Amidon din cartofi", cereal_starch: "Amidon din grâu sau porumb", cassava_starch: "Amidon din manioc (tapioca)",
    throughput: "Materie primă procesată într-o zi de lucru, t", apply: "Completează",
    note: "Completează debitul, CCO, gradul de eliminare, parametrii gazului și ai reactorului din date sectoriale publicate (concluziile BAT ale UE 2019, IEA Bioenergy 2025; manioc: studii ale fabricilor din Thailanda). Câmpurile de cost rămân goale pentru estimarea modelului; introduceți dumneavoastră costul actual de epurare sau de evacuare la canalizare pe m³. Înlocuiți fiecare valoare cu datele fabricii dumneavoastră de îndată ce le aveți.",
    modelledWastewater: "Costurile lăsate goale sunt estimate din volumul reactorului (UASB/EGSB sau lagună acoperită) cu un cost unitar stabilit prin judecată inginerească, deoarece nu există o curbă de costuri publică și datată pentru acești reactori, plus o cotă de întreținere, consumul propriu de energie și prețul preluării digestatului excedentar pentru nămol. Preepurarea, epurarea aerobă finală și evacuarea nu sunt incluse. Fără bugetul dumneavoastră pentru reactor, rezultatul nu poate obține cel mai bun verdict. Fiecare valoare introdusă înlocuiește estimarea respectivă.",
  },
  bg: {
    title: "Типични стойности за нишестен завод", potato_starch: "Картофено нишесте", cereal_starch: "Пшенично или царевично нишесте", cassava_starch: "Нишесте от маниока (тапиока)",
    throughput: "Преработена суровина за работен ден, t", apply: "Попълване",
    note: "Попълва дебита, ХПК, степента на пречистване, параметрите на газа и реактора по публикувани отраслови данни (заключения за НДНТ на ЕС 2019, IEA Bioenergy 2025; маниока: проучвания на тайландски заводи). Полетата за разходи остават празни за оценката на модела; сегашната такса за пречистване или заустване в канализацията на m³ въведете сами. Заменете всяка стойност с данните на Вашия завод, щом ги имате.",
    modelledWastewater: "Празните полета за разходи моделът оценява по обема на реактора (UASB/EGSB или покрита лагуна) с единична цена по инженерна преценка, тъй като няма датирана публична крива на разходите за такива реактори, плюс дял за поддръжка, собствена консумация на ток и цената за извозване на излишния дигестат за утайката. Предварителното пречистване, аеробното допречистване и заустването не са включени. Без Вашия бюджет за реактора резултатът не може да получи най-добрата оценка. Всяка въведена от Вас стойност заменя своята оценка.",
  },
  sr: {
    title: "Tipične vrednosti za fabriku skroba", potato_starch: "Krompirov skrob", cereal_starch: "Pšenični ili kukuruzni skrob", cassava_starch: "Skrob od manioke (tapioka)",
    throughput: "Prerađena sirovina po radnom danu, t", apply: "Popuni",
    note: "Popunjava protok, HPK, stepen uklanjanja, parametre gasa i reaktora na osnovu objavljenih sektorskih podataka (zaključci EU o NDT 2019, IEA Bioenergy 2025; manioka: studije tajlandskih fabrika). Polja troškova ostaju prazna za procenu modela; sadašnju cenu prečišćavanja ili ispuštanja u kanalizaciju po m³ unesite sami. Zamenite svaku vrednost podacima svoje fabrike čim ih budete imali.",
    modelledWastewater: "Prazna polja troškova model procenjuje iz zapremine reaktora (UASB/EGSB ili pokrivena laguna) sa jediničnom cenom po inženjerskoj proceni, jer ne postoji datirana javna kriva troškova za takve reaktore, uz udeo za održavanje, sopstvenu potrošnju struje i cenu odvoza viška digestata za mulj. Predtretman, aerobno doprečišćavanje i ispuštanje nisu uključeni. Bez vašeg budžeta za reaktor rezultat ne može dobiti najbolju ocenu. Svaka vrednost koju unesete zamenjuje svoju procenu.",
  },
  el: {
    title: "Τυπικές τιμές για εργοστάσιο αμύλου", potato_starch: "Άμυλο πατάτας", cereal_starch: "Άμυλο σιταριού ή καλαμποκιού", cassava_starch: "Άμυλο μανιόκας (ταπιόκα)",
    throughput: "Πρώτη ύλη που επεξεργάζεται ανά ημέρα λειτουργίας, t", apply: "Συμπλήρωση",
    note: "Συμπληρώνει παροχή, COD, βαθμό απομάκρυνσης, τιμές αερίου και αντιδραστήρα από δημοσιευμένα κλαδικά στοιχεία (συμπεράσματα ΒΔΤ της ΕΕ 2019, IEA Bioenergy 2025· μανιόκα: μελέτες εργοστασίων της Ταϊλάνδης). Τα πεδία κόστους μένουν κενά για την εκτίμηση του μοντέλου· το σημερινό κόστος επεξεργασίας ή διάθεσης στο αποχετευτικό δίκτυο ανά m³ το εισάγετε εσείς. Αντικαταστήστε κάθε τιμή με τα στοιχεία του εργοστασίου σας μόλις τα έχετε.",
    modelledWastewater: "Τα κενά πεδία κόστους το μοντέλο τα εκτιμά από τον όγκο του αντιδραστήρα (UASB/EGSB ή καλυμμένη λιμνοδεξαμενή) με μοναδιαίο κόστος κατά μηχανική κρίση, επειδή δεν υπάρχει χρονολογημένη δημόσια καμπύλη κόστους για τέτοιους αντιδραστήρες, συν ποσοστό συντήρησης, ιδιοκατανάλωση ρεύματος και την τιμή απομάκρυνσης πλεονάζοντος χωνεύματος για τη λάσπη. Η προεπεξεργασία, η αερόβια τελική επεξεργασία και η διάθεση δεν περιλαμβάνονται. Χωρίς τον δικό σας προϋπολογισμό αντιδραστήρα το αποτέλεσμα δεν μπορεί να λάβει την καλύτερη ετυμηγορία. Κάθε τιμή που εισάγετε αντικαθιστά την αντίστοιχη εκτίμηση.",
  },
  tr: {
    title: "Nişasta fabrikası için tipik değerler", potato_starch: "Patates nişastası", cereal_starch: "Buğday veya mısır nişastası", cassava_starch: "Manyok (tapyoka) nişastası",
    throughput: "Bir çalışma gününde işlenen hammadde, t", apply: "Doldur",
    note: "Debi, KOİ, giderim, gaz ve reaktör değerlerini yayımlanmış sektör verilerinden doldurur (AB BAT sonuçları 2019, IEA Bioenergy 2025; manyok: Tayland fabrikalarına ilişkin çalışmalar). Maliyet alanları model tahmini için boş kalır; m³ başına mevcut arıtma veya kanalizasyona deşarj bedelinizi kendiniz girin. Her değeri, elinize geçtiğinde tesisinizin kayıtlarıyla değiştirin.",
    modelledWastewater: "Boş bırakılan maliyet alanları, reaktör hacminden (UASB/EGSB veya örtülü lagün) mühendislik yargısına dayanan bir birim maliyetle tahmin edilir; çünkü bu reaktörler için tarihli, kamuya açık bir maliyet eğrisi yoktur. Buna bakım payı, iç elektrik tüketimi ve çamur için fazla digestatın uzaklaştırılma fiyatı eklenir. Ön arıtma, aerobik son arıtma ve deşarj dahil değildir. Reaktör bütçeniz olmadan sonuç en iyi değerlendirmeyi alamaz. Girdiğiniz her değer kendi tahmininin yerini alır.",
  },
  lt: {
    title: "Tipinės krakmolo gamyklos vertės", potato_starch: "Bulvių krakmolas", cereal_starch: "Kviečių arba kukurūzų krakmolas", cassava_starch: "Maniokų krakmolas (tapijoka)",
    throughput: "Per darbo dieną perdirbama žaliava, t", apply: "Užpildyti",
    note: "Užpildo srautą, ChDS, šalinimo laipsnį, dujų ir reaktoriaus vertes pagal paskelbtus sektoriaus duomenis (ES GPGB išvados 2019, IEA Bioenergy 2025; maniokai: Tailando gamyklų tyrimai). Išlaidų laukai lieka tušti modelio įverčiui; dabartinį valymo ar išleidimo į kanalizaciją mokestį už m³ įveskite patys. Kiekvieną vertę pakeiskite savo gamyklos duomenimis, kai tik juos turėsite.",
    modelledWastewater: "Tuščius išlaidų laukus modelis įvertina pagal reaktoriaus tūrį (UASB/EGSB arba uždengta lagūna) taikydamas inžinerine nuovoka nustatytą vieneto kainą, nes datuotos viešos tokių reaktorių sąnaudų kreivės nėra, taip pat priežiūros dalį, savąsias elektros sąnaudas ir digestato pertekliaus išvežimo kainą dumblui. Pirminis valymas, aerobinis valymas ir išleidimas neįskaičiuoti. Be jūsų reaktoriaus biudžeto rezultatas negali gauti geriausio vertinimo. Kiekviena įvesta vertė pakeičia savo įvertį.",
  },
  lv: {
    title: "Tipiskās vērtības cietes rūpnīcai", potato_starch: "Kartupeļu ciete", cereal_starch: "Kviešu vai kukurūzas ciete", cassava_starch: "Maniokas ciete (tapioka)",
    throughput: "Darba dienā pārstrādātā izejviela, t", apply: "Aizpildīt",
    note: "Aizpilda plūsmu, ĶSP, attīrīšanas pakāpi, gāzes un reaktora vērtības pēc publicētiem nozares datiem (ES LPTP secinājumi 2019, IEA Bioenergy 2025; manioka: Taizemes rūpnīcu pētījumi). Izmaksu lauki paliek tukši modeļa novērtējumam; pašreizējo attīrīšanas vai novadīšanas kanalizācijā maksu par m³ ievadiet paši. Aizstājiet katru vērtību ar savas rūpnīcas datiem, tiklīdz tie jums ir.",
    modelledWastewater: "Tukšos izmaksu laukus modelis novērtē pēc reaktora tilpuma (UASB/EGSB vai nosegta lagūna) ar inženiertehniski novērtētu vienības cenu, jo datētas publiskas šādu reaktoru izmaksu līknes nav, kā arī apkopes daļu, pašpatēriņa elektrību un digestāta pārpalikuma izvešanas cenu dūņām. Priekšattīrīšana, aerobā pēcattīrīšana un novadīšana nav iekļautas. Bez jūsu reaktora budžeta rezultāts nevar saņemt labāko vērtējumu. Katra ievadītā vērtība aizstāj savu novērtējumu.",
  },
  et: {
    title: "Tärklisetehase tüüpilised väärtused", potato_starch: "Kartulitärklis", cereal_starch: "Nisu- või maisitärklis", cassava_starch: "Maniokitärklis (tapioka)",
    throughput: "Tööpäevas töödeldud tooraine, t", apply: "Täida",
    note: "Täidab vooluhulga, KHT, eemaldusastme, gaasi ja reaktori väärtused avaldatud valdkonna andmete põhjal (EL PVT-järeldused 2019, IEA Bioenergy 2025; maniok: Tai tehaste uuringud). Kuluväljad jäävad mudeli hinnangu jaoks tühjaks; praeguse puhastus- või kanalisatsiooni juhtimise tasu m³ kohta sisestage ise. Asendage iga väärtus oma tehase andmetega niipea, kui need on olemas.",
    modelledWastewater: "Tühjaks jäetud kuluväljad hindab mudel reaktori mahu põhjal (UASB/EGSB või kaetud laguun) insenerihinnangul põhineva ühikuhinnaga, sest selliste reaktorite kohta pole dateeritud avalikku kulukõverat, lisades hooldusosa, omatarbeelektri ja liigse kääritusjäägi äraveo hinna setete jaoks. Eelpuhastus, aeroobne järelpuhastus ja suublasse juhtimine ei ole arvestatud. Ilma teie reaktori eelarveta ei saa tulemus parimat hinnangut. Iga sisestatud väärtus asendab oma hinnangu.",
  },
  da: {
    title: "Typiske værdier for en stivelsesfabrik", potato_starch: "Kartoffelstivelse", cereal_starch: "Hvede- eller majsstivelse", cassava_starch: "Maniokstivelse (tapioka)",
    throughput: "Forarbejdet råvare pr. driftsdøgn, t", apply: "Udfyld",
    note: "Udfylder flow, COD, fjernelsesgrad, gas- og reaktorværdier ud fra offentliggjorte branchedata (EU’s BAT-konklusioner 2019, IEA Bioenergy 2025; maniok: undersøgelser af thailandske fabrikker). Omkostningsfelterne forbliver tomme til modellens skøn; din nuværende pris for rensning eller udledning til kloak pr. m³ indtaster du selv. Erstat hver værdi med din fabriks egne data, så snart du har dem.",
    modelledWastewater: "Tomme omkostningsfelter skønnes ud fra reaktorvolumenet (UASB/EGSB eller overdækket lagune) med en enhedspris efter ingeniørskøn, fordi der ikke findes en dateret offentlig omkostningskurve for sådanne reaktorer, plus en vedligeholdelsesandel, eget elforbrug og prisen for bortkørsel af overskydende afgasset biomasse for slammet. Forbehandling, aerob efterpolering og udledning er ikke medregnet. Uden dit reaktorbudget kan resultatet ikke opnå den bedste vurdering. Hver værdi, du indtaster, erstatter sit skøn.",
  },
  sv: {
    title: "Typiska värden för ett stärkelsebruk", potato_starch: "Potatisstärkelse", cereal_starch: "Vete- eller majsstärkelse", cassava_starch: "Kassavastärkelse (tapioka)",
    throughput: "Bearbetad råvara per driftdygn, t", apply: "Fyll i",
    note: "Fyller i flöde, COD, avskiljning, gas- och reaktorvärden från publicerade branschdata (EU:s BAT-slutsatser 2019, IEA Bioenergy 2025; kassava: studier av thailändska bruk). Kostnadsfälten lämnas tomma för modellens uppskattning; din nuvarande kostnad för rening eller utsläpp till avlopp per m³ anger du själv. Ersätt varje värde med ditt bruks egna data så snart du har dem.",
    modelledWastewater: "Tomma kostnadsfält uppskattas utifrån reaktorvolymen (UASB/EGSB eller täckt damm) med ett enhetspris enligt ingenjörsbedömning, eftersom det saknas en daterad offentlig kostnadskurva för sådana reaktorer, plus en underhållsandel, egen elanvändning och priset för bortforsling av överskott av rötrest för slammet. Förbehandling, aerob efterpolering och utsläpp ingår inte. Utan din reaktorbudget kan resultatet inte få det bästa omdömet. Varje värde du anger ersätter sin uppskattning.",
  },
  fi: {
    title: "Tärkkelystehtaan tyypilliset arvot", potato_starch: "Perunatärkkelys", cereal_starch: "Vehnä- tai maissitärkkelys", cassava_starch: "Maniokkitärkkelys (tapioka)",
    throughput: "Käsitelty raaka-aine käyttöpäivää kohti, t", apply: "Täytä",
    note: "Täyttää virtaaman, COD:n, poistoasteen sekä kaasun ja reaktorin arvot julkaistuista toimialatiedoista (EU:n BAT-päätelmät 2019, IEA Bioenergy 2025; maniokki: thaimaalaisten tehtaiden tutkimukset). Kustannuskentät jäävät tyhjiksi mallin arviota varten; syötä itse nykyinen käsittely- tai viemäriin johtamisen maksusi m³:ltä. Korvaa jokainen arvo tehtaasi omilla tiedoilla heti, kun ne ovat käytössäsi.",
    modelledWastewater: "Tyhjiksi jätetyt kustannuskentät arvioidaan reaktorin tilavuudesta (UASB/EGSB tai katettu allas) insinööriarvioon perustuvalla yksikköhinnalla, koska tällaisille reaktoreille ei ole päivättyä julkista kustannuskäyrää, lisäksi kunnossapito-osuus, oma sähkönkulutus ja ylimääräisen mädätteen poiskuljetuksen hinta lietteelle. Esikäsittely, aerobinen jälkikäsittely ja johtaminen eivät sisälly. Ilman reaktorisi budjettia tulos ei voi saada parasta arviota. Jokainen syöttämäsi arvo korvaa oman arvionsa.",
  },
  vi: {
    title: "Giá trị điển hình cho nhà máy tinh bột", potato_starch: "Tinh bột khoai tây", cereal_starch: "Tinh bột lúa mì hoặc ngô", cassava_starch: "Tinh bột sắn (tapioca)",
    throughput: "Nguyên liệu chế biến trong một ngày vận hành, t", apply: "Điền",
    note: "Điền lưu lượng, COD, hiệu suất khử, thông số khí và bể phản ứng theo số liệu ngành đã công bố (kết luận BAT của EU 2019, IEA Bioenergy 2025; sắn: các nghiên cứu nhà máy ở Thái Lan). Các ô chi phí để trống cho ước tính của mô hình; quý vị tự nhập chi phí xử lý hoặc phí xả vào hệ thống thoát nước hiện tại trên m³. Hãy thay từng giá trị bằng số liệu của nhà máy khi có.",
    modelledWastewater: "Các ô chi phí để trống được ước tính theo thể tích bể phản ứng (UASB/EGSB hoặc hồ phủ bạt) với đơn giá theo đánh giá kỹ thuật, vì chưa có đường cong chi phí công khai có ghi ngày cho loại bể này, cộng thêm phần bảo trì, điện tự dùng và giá thu gom phần chất thải sau phân hủy dư cho bùn. Chưa gồm tiền xử lý, xử lý hiếu khí sau cùng và xả thải. Nếu không có ngân sách bể phản ứng của quý vị, kết quả không thể đạt mức đánh giá cao nhất. Mỗi giá trị quý vị nhập sẽ thay thế ước tính tương ứng.",
  },
  th: {
    title: "ค่าทั่วไปสำหรับโรงงานแป้ง", potato_starch: "แป้งมันฝรั่ง", cereal_starch: "แป้งสาลีหรือแป้งข้าวโพด", cassava_starch: "แป้งมันสำปะหลัง (tapioca)",
    throughput: "วัตถุดิบที่แปรรูปต่อวันทำงาน, t", apply: "กรอกค่า",
    note: "กรอกอัตราไหล COD ประสิทธิภาพการกำจัด ค่าก๊าซและถังปฏิกรณ์จากข้อมูลอุตสาหกรรมที่เผยแพร่ (ข้อสรุป BAT ของสหภาพยุโรป 2019, IEA Bioenergy 2025; มันสำปะหลัง: งานศึกษาโรงงานในประเทศไทย) ช่องต้นทุนจะเว้นว่างไว้ให้แบบจำลองประมาณ ส่วนค่าบำบัดหรือค่าระบายลงท่อสาธารณะต่อ m³ ในปัจจุบัน ท่านกรอกเอง เมื่อมีข้อมูลจริงของโรงงาน ให้แทนที่ทุกค่า",
    modelledWastewater: "ช่องต้นทุนที่เว้นว่างจะประมาณจากปริมาตรถังปฏิกรณ์ (UASB/EGSB หรือบ่อคลุมพลาสติก) ด้วยราคาต่อหน่วยตามดุลยพินิจทางวิศวกรรม เนื่องจากยังไม่มีเส้นโค้งต้นทุนสาธารณะที่ระบุปีสำหรับระบบประเภทนี้ รวมกับสัดส่วนค่าบำรุงรักษา ไฟฟ้าที่ใช้เอง และค่าขนย้ายกากหลังหมักส่วนเกินสำหรับตะกอน ไม่รวมการบำบัดขั้นต้น การบำบัดแบบใช้อากาศขั้นสุดท้าย และการระบายน้ำทิ้ง หากไม่มีงบประมาณถังปฏิกรณ์ของท่าน ผลลัพธ์จะไม่ได้รับการประเมินระดับสูงสุด ทุกค่าที่ท่านกรอกจะใช้แทนค่าประมาณของรายการนั้น",
  },
};

export const presetCopy = (locale: Locale): PresetCopy => copy[locale];

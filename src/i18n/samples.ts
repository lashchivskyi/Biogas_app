import { processCopy, processFieldLabels } from "./processes";
import { PROCESS_UNITS } from "@/core/processes";
import type { ExampleCase } from "@/core/examples";
import { ANIMALS, FEEDSTOCKS } from "@/core/feedstockData";
import { getCountry } from "@/countries";
import { countryName, type Dict } from ".";
import { INTL_TAG, type Locale } from "./config";

// Authored by operating context, not by verdict: the text must never promise profitability.
// Order: farm, processing site, collected waste, competing use, seasonality, dilute effluent.
const contexts: Record<Locale, readonly [string, string, string, string, string, string]> = {
  en: ["The farm is assessing energy recovery from manure. The result depends on how much can actually be collected, the plant's scale and a useful energy outlet.", "The factory is assessing its own organic residues. Only material without a better food or feed outlet should enter the digester.", "This is a central treatment plant receiving separately collected organic waste. Supply contracts, gate fees and transport determine its business case.", "The feedstock already has a buyer or another productive use. Diverting it to digestion means giving up that value; it is not free waste.", "Supply varies through the year. Check the monthly production schedule, storage losses and whether energy demand coincides with gas production.", "This liquid stream needs measured flow and COD data. A standard tank-digester estimate cannot replace the design of a specialised wastewater or covered-lagoon system."],
  uk: ["Господарство розглядає отримання енергії з гною. Результат залежить від фактичного збору сировини, масштабу установки та можливості корисно використати енергію.", "Підприємство оцінює переробку власних органічних залишків. У реактор варто спрямовувати лише ту частину, яку недоцільно використовувати у харчовому виробництві чи як корм.", "Це централізована установка для обробки роздільно зібраних органічних відходів. Її економіку визначають договори постачання, плата за приймання та логістика.", "Сировина вже має покупця або інше корисне застосування. Зброджування означає втрату цієї цінності: це не безкоштовні відходи.", "Надходження сировини змінюється протягом року. Потрібно звірити помісячний графік, втрати зберігання та збіг виробництва газу з попитом на енергію.", "Для цього рідкого потоку потрібні виміряні витрата та COD. Оцінка звичайного метантенка не замінює проєктування спеціалізованих очисних споруд або накритої лагуни."],
  pl: ["Gospodarstwo rozważa odzysk energii z nawozów naturalnych. Wynik zależy od ilości rzeczywiście zbieranego substratu, skali instalacji i możliwości wykorzystania energii.", "Zakład ocenia zagospodarowanie własnych pozostałości organicznych. Do fermentacji należy kierować tylko materiał, którego nie opłaca się wykorzystać w żywności lub paszach.", "To instalacja zbiorcza przetwarzająca selektywnie zebrane odpady organiczne. O jej opłacalności decydują umowy dostaw, opłaty za przyjęcie i transport.", "Substrat ma już nabywcę lub inne zastosowanie. Skierowanie go do fermentacji oznacza utratę tej wartości — nie jest to darmowy odpad.", "Dostawy zmieniają się w ciągu roku. Należy sprawdzić harmonogram miesięczny, straty magazynowe i zgodność produkcji gazu z zapotrzebowaniem na energię.", "Dla tego strumienia cieczy potrzebne są pomiary przepływu i COD. Wycena standardowego fermentora nie zastępuje projektu specjalistycznej oczyszczalni lub przykrytej laguny."],
  de: ["Der Betrieb prüft die energetische Nutzung von Wirtschaftsdünger. Entscheidend sind die tatsächlich erfassbare Menge, die Anlagengröße und die nutzbare Energieabnahme.", "Der Verarbeitungsbetrieb prüft die Verwertung eigener organischer Reststoffe. Vergoren werden sollten nur Stoffe, für die keine sinnvollere Verwendung als Lebensmittel oder Futtermittel besteht.", "Die zentrale Anlage nimmt getrennt erfasste organische Abfälle an. Lieferverträge, Annahmeentgelte und Transportkosten bestimmen die Wirtschaftlichkeit.", "Das Substrat wird bereits verkauft oder anderweitig genutzt. Bei der Vergärung entfällt dieser Wert; es handelt sich nicht um einen kostenlosen Abfallstoff.", "Die Mengen fallen saisonal an. Monatliche Verfügbarkeit, Lagerverluste und die zeitliche Übereinstimmung von Gaserzeugung und Energiebedarf sind zu prüfen.", "Für diesen Flüssigstrom sind gemessene Durchflüsse und COD-Werte erforderlich. Eine Standardkalkulation für Rührkessel ersetzt keine Auslegung einer speziellen Abwasseranlage oder abgedeckten Lagune."],
  fr: ["L’exploitation étudie la valorisation énergétique de ses effluents d’élevage. Le résultat dépend du volume réellement récupérable, de la taille de l’installation et des débouchés énergétiques.", "L’usine étudie la valorisation de ses propres résidus organiques. Seules les matières sans débouché plus pertinent en alimentation humaine ou animale devraient être méthanisées.", "Cette unité centralisée traite des déchets organiques collectés séparément. Les contrats d’approvisionnement, les recettes de traitement et le transport déterminent sa rentabilité.", "La matière a déjà un acheteur ou un autre usage. La méthaniser implique de renoncer à cette valeur : ce n’est pas un déchet gratuit.", "Les apports varient au fil de l’année. Il faut vérifier le calendrier mensuel, les pertes au stockage et la concordance entre production de gaz et besoins énergétiques.", "Ce flux liquide nécessite des mesures de débit et de COD. Le chiffrage d’un digesteur classique ne remplace pas la conception d’un traitement d’effluents spécialisé ou d’une lagune couverte."],
  it: ["L’azienda agricola valuta il recupero di energia dagli effluenti zootecnici. Il risultato dipende dalle quantità effettivamente raccoglibili, dalla taglia dell’impianto e dall’utilizzo dell’energia.", "Lo stabilimento valuta la valorizzazione dei propri residui organici. Al digestore vanno destinate solo le matrici prive di un impiego alimentare o zootecnico più conveniente.", "L’impianto centralizzato tratta rifiuti organici raccolti separatamente. Contratti di conferimento, tariffe di trattamento e trasporto ne determinano la sostenibilità economica.", "La matrice ha già un acquirente o un altro impiego. Avviarla alla digestione significa rinunciare a quel valore: non è un rifiuto gratuito.", "La disponibilità cambia durante l’anno. Occorre verificare i conferimenti mensili, le perdite di stoccaggio e la coincidenza tra produzione di gas e fabbisogni energetici.", "Per questo flusso liquido servono misure di portata e COD. La stima di un digestore convenzionale non sostituisce il progetto di un trattamento specifico delle acque reflue o di una laguna coperta."],
  es: ["La explotación estudia el aprovechamiento energético del estiércol y los purines. El resultado depende de la cantidad realmente recogida, la escala de la planta y el uso de la energía.", "La fábrica evalúa sus propios residuos orgánicos. Solo deberían destinarse al digestor los materiales sin una salida más adecuada en alimentación humana o animal.", "Esta planta centralizada recibe residuos orgánicos recogidos por separado. Los contratos de suministro, las tarifas de recepción y el transporte determinan su viabilidad.", "El sustrato ya tiene comprador u otro uso. Destinarlo a digestión implica renunciar a ese valor; no es un residuo gratuito.", "El suministro varía a lo largo del año. Hay que comprobar el calendario mensual, las pérdidas de almacenamiento y la coincidencia entre producción de gas y demanda energética.", "Este flujo líquido requiere mediciones de caudal y COD. Una estimación para un digestor convencional no sustituye el diseño de un tratamiento específico de aguas residuales o de una laguna cubierta."],
  pt: ["A propriedade avalia o aproveitamento energético dos dejetos. O resultado depende da quantidade efetivamente coletada, da escala da usina e do uso da energia gerada.", "A indústria avalia seus próprios resíduos orgânicos. Só devem seguir para o biodigestor os materiais sem destinação mais vantajosa na alimentação humana ou animal.", "Esta unidade centralizada recebe resíduos orgânicos segregados. Contratos de fornecimento, tarifas de recebimento e transporte determinam a viabilidade econômica.", "O substrato já tem comprador ou outro uso. Encaminhá-lo à biodigestão significa abrir mão desse valor; não se trata de resíduo gratuito.", "O fornecimento varia ao longo do ano. É preciso conferir o calendário mensal, as perdas no armazenamento e a coincidência entre produção de gás e demanda de energia.", "Este efluente exige medições de vazão e COD. A estimativa de um biodigestor convencional não substitui o projeto de um tratamento específico de efluentes ou de uma lagoa coberta."],
  nl: ["Het bedrijf onderzoekt energiewinning uit mest. De uitkomst hangt af van de werkelijk inzamelbare hoeveelheid, de schaal van de installatie en de nuttige afzet van energie.", "De fabriek onderzoekt de verwerking van eigen organische reststromen. Alleen materiaal zonder zinvollere bestemming als voedsel of diervoeder hoort in de vergister.", "Deze centrale installatie verwerkt gescheiden ingezameld organisch afval. Leveringscontracten, verwerkingstarieven en transport bepalen de businesscase.", "De grondstof heeft al een afnemer of een andere toepassing. Vergisting betekent dat die waarde vervalt; het is geen gratis afvalstroom.", "Het aanbod varieert gedurende het jaar. Controleer het maandelijkse aanvoerpatroon, opslagverliezen en de samenhang tussen gasproductie en energievraag.", "Voor deze vloeistofstroom zijn gemeten debieten en COD-waarden nodig. Een raming voor een standaardvergister vervangt geen ontwerp voor gespecialiseerde afvalwaterzuivering of een afgedekte lagune."],
  cs: ["Farma posuzuje energetické využití statkových hnojiv. Výsledek závisí na skutečně dostupném množství, velikosti zařízení a využití vyrobené energie.", "Závod posuzuje využití vlastních organických zbytků. Do fermentoru mají směřovat pouze materiály bez vhodnějšího potravinářského nebo krmivářského využití.", "Jde o centrální zařízení pro odděleně sbírané organické odpady. Ekonomiku určují dodavatelské smlouvy, poplatky za převzetí a doprava.", "Substrát už má odběratele nebo jiné využití. Jeho převedení do fermentoru znamená ztrátu této hodnoty; nejde o odpad zdarma.", "Dodávky během roku kolísají. Je nutné ověřit měsíční harmonogram, ztráty při skladování a souběh výroby plynu s potřebou energie.", "Pro tento kapalný proud jsou nutná měření průtoku a COD. Odhad běžného fermentoru nenahrazuje návrh specializované čistírny nebo zakryté laguny."],
  sk: ["Farma posudzuje energetické využitie hospodárskych hnojív. Výsledok závisí od skutočne dostupného množstva, veľkosti zariadenia a využitia vyrobenej energie.", "Závod posudzuje využitie vlastných organických zvyškov. Do fermentora majú smerovať len materiály bez vhodnejšieho potravinárskeho alebo krmivárskeho využitia.", "Ide o centrálne zariadenie na spracovanie oddelene zbieraného organického odpadu. Ekonomiku určujú dodávateľské zmluvy, poplatky za prevzatie a doprava.", "Substrát už má odberateľa alebo iné využitie. Jeho presmerovanie do fermentora znamená stratu tejto hodnoty; nejde o odpad zadarmo.", "Dodávky sa počas roka menia. Treba overiť mesačný harmonogram, straty pri skladovaní a súbeh výroby plynu s potrebou energie.", "Pre tento kvapalný prúd sú potrebné merania prietoku a COD. Odhad bežného fermentora nenahrádza návrh špecializovanej čistiarne alebo zakrytej lagúny."],
  hu: ["A gazdaság a trágya energetikai hasznosítását vizsgálja. Az eredmény a ténylegesen összegyűjthető mennyiségtől, az üzem méretétől és az energia hasznosításától függ.", "Az üzem saját szerves maradékanyagainak hasznosítását vizsgálja. A fermentorba csak olyan anyag kerüljön, amelynek nincs előnyösebb élelmiszeripari vagy takarmányozási felhasználása.", "A központi üzem elkülönítetten gyűjtött szerves hulladékot fogad. A gazdaságosságot a beszállítói szerződések, az átvételi díjak és a szállítás határozzák meg.", "Az alapanyagnak már van vevője vagy más felhasználása. A biogáztermelés ezzel az értékkel való felhagyást jelenti; az anyag nem ingyenes hulladék.", "A beszállítás év közben változik. Ellenőrizni kell a havi ütemezést, a tárolási veszteségeket, valamint a gáztermelés és az energiaigény időbeli egyezését.", "Ehhez a folyadékáramhoz mért térfogatáram- és COD-adatok szükségesek. Egy hagyományos fermentor becslése nem helyettesíti a speciális szennyvízkezelő vagy fedett lagúna tervezését."],
  ro: ["Ferma analizează valorificarea energetică a dejecțiilor. Rezultatul depinde de cantitatea care poate fi colectată efectiv, de capacitatea instalației și de utilizarea energiei.", "Fabrica analizează valorificarea propriilor reziduuri organice. În digestor ar trebui să intre doar materialele fără o utilizare mai avantajoasă în alimentație sau furajare.", "Această instalație centralizată primește deșeuri organice colectate separat. Contractele de aprovizionare, tarifele de preluare și transportul determină rentabilitatea.", "Materia primă are deja un cumpărător sau o altă utilizare. Trimiterea la digestie înseamnă renunțarea la acea valoare; nu este un deșeu gratuit.", "Aprovizionarea variază pe parcursul anului. Trebuie verificate calendarul lunar, pierderile la stocare și corelarea producției de gaz cu necesarul de energie.", "Pentru acest flux lichid sunt necesare măsurători de debit și COD. Estimarea unui digestor convențional nu înlocuiește proiectarea unui sistem specializat de epurare sau a unei lagune acoperite."],
  bg: ["Стопанството оценява производството на енергия от оборски тор. Резултатът зависи от реално събираемото количество, мащаба на инсталацията и полезното използване на енергията.", "Предприятието оценява оползотворяването на собствените органични остатъци. В реактора следва да постъпват само материали без по-подходяща употреба за храна или фураж.", "Това е централизирана инсталация за разделно събрани органични отпадъци. Договорите за доставка, таксите за приемане и транспортът определят икономическата ѝ жизнеспособност.", "Суровината вече има купувач или друга употреба. Насочването ѝ към ферментация означава загуба на тази стойност; тя не е безплатен отпадък.", "Доставките се променят през годината. Трябва да се проверят месечният график, загубите при съхранение и съвпадението на газопроизводството с енергийните нужди.", "За този течен поток са нужни измервания на дебита и COD. Оценката на стандартен ферментатор не заменя проектирането на специализирано пречистване или покрита лагуна."],
  sr: ["Gazdinstvo procenjuje dobijanje energije iz stajnjaka. Rezultat zavisi od količine koja se zaista može prikupiti, veličine postrojenja i korisne potrošnje energije.", "Fabrika razmatra iskorišćenje sopstvenih organskih ostataka. U digestor treba usmeravati samo materijal bez pogodnije upotrebe u ishrani ljudi ili životinja.", "Ovo centralno postrojenje prima odvojeno prikupljen organski otpad. Ugovori o snabdevanju, naknade za prijem i prevoz određuju isplativost.", "Sirovina već ima kupca ili drugu namenu. Usmeravanje u digestor znači odricanje od te vrednosti; to nije besplatan otpad.", "Snabdevanje se menja tokom godine. Treba proveriti mesečni raspored, gubitke pri skladištenju i usklađenost proizvodnje gasa s potrošnjom energije.", "Za ovaj tečni tok potrebna su merenja protoka i COD. Procena standardnog digestora ne zamenjuje projektovanje posebnog sistema za otpadne vode ili pokrivene lagune."],
  el: ["Η εκμετάλλευση εξετάζει την ενεργειακή αξιοποίηση της κοπριάς. Το αποτέλεσμα εξαρτάται από την ποσότητα που μπορεί πράγματι να συλλεχθεί, την κλίμακα της μονάδας και τη χρήση της ενέργειας.", "Το εργοστάσιο εξετάζει την αξιοποίηση των δικών του οργανικών υπολειμμάτων. Στον χωνευτή πρέπει να οδηγούνται μόνο υλικά χωρίς καταλληλότερη χρήση ως τρόφιμα ή ζωοτροφές.", "Η κεντρική αυτή μονάδα δέχεται οργανικά απόβλητα από χωριστή συλλογή. Οι συμβάσεις τροφοδοσίας, τα τέλη παραλαβής και η μεταφορά καθορίζουν τη βιωσιμότητά της.", "Η πρώτη ύλη έχει ήδη αγοραστή ή άλλη χρήση. Η αναερόβια χώνευση συνεπάγεται απώλεια αυτής της αξίας· δεν πρόκειται για δωρεάν απόβλητο.", "Η τροφοδοσία μεταβάλλεται μέσα στο έτος. Χρειάζεται έλεγχος του μηνιαίου προγράμματος, των απωλειών αποθήκευσης και της χρονικής αντιστοίχισης παραγωγής αερίου και ενεργειακών αναγκών.", "Για αυτό το υγρό ρεύμα απαιτούνται μετρήσεις παροχής και COD. Η εκτίμηση ενός συμβατικού χωνευτή δεν αντικαθιστά τη μελέτη ειδικής επεξεργασίας λυμάτων ή καλυμμένης λιμνοδεξαμενής."],
  tr: ["İşletme, hayvan gübresinden enerji üretimini değerlendiriyor. Sonuç; gerçekten toplanabilecek miktara, tesis ölçeğine ve üretilen enerjinin kullanılabilmesine bağlıdır.", "Fabrika kendi organik artıklarını değerlendirmeyi planlıyor. Çürütücüye yalnızca gıda veya yem olarak daha uygun bir kullanımı olmayan malzemeler yönlendirilmelidir.", "Bu merkezi tesis, ayrı toplanan organik atıkları kabul eder. Tedarik sözleşmeleri, atık kabul bedelleri ve taşıma maliyetleri ekonomik sonucu belirler.", "Hammaddenin zaten bir alıcısı veya başka bir kullanım alanı vardır. Biyogaz üretimine yönlendirilmesi bu değerden vazgeçmek demektir; ücretsiz atık sayılmaz.", "Tedarik yıl içinde değişir. Aylık takvim, depolama kayıpları ve gaz üretiminin enerji ihtiyacıyla aynı döneme denk gelip gelmediği kontrol edilmelidir.", "Bu sıvı akış için ölçülmüş debi ve COD verileri gerekir. Standart bir çürütücü tahmini, özel atık su arıtma sistemi veya örtülü lagün tasarımının yerini tutmaz."],
  lt: ["Ūkis vertina energijos gamybą iš mėšlo. Rezultatas priklauso nuo faktiškai surenkamo kiekio, įrenginio masto ir galimybių naudingai panaudoti energiją.", "Gamykla vertina savo organinių liekanų panaudojimą. Į reaktorių turėtų patekti tik medžiagos, kurių netikslinga naudoti maistui ar pašarams.", "Šis centralizuotas įrenginys priima atskirai surinktas organines atliekas. Ekonominį pagrįstumą lemia tiekimo sutartys, priėmimo mokesčiai ir transportas.", "Žaliava jau turi pirkėją arba kitą paskirtį. Naudojant ją biodujoms gaminti prarandama ši vertė; tai nėra nemokama atlieka.", "Tiekimas per metus kinta. Reikia patikrinti mėnesinį grafiką, laikymo nuostolius ir dujų gamybos bei energijos poreikio sutapimą.", "Šiam skystam srautui būtini išmatuoti debito ir COD duomenys. Įprasto reaktoriaus sąmata nepakeičia specializuoto nuotekų valymo ar dengtos lagūnos projekto."],
  lv: ["Saimniecība izvērtē enerģijas ieguvi no kūtsmēsliem. Rezultāts ir atkarīgs no faktiski savācamā daudzuma, iekārtas mēroga un enerģijas lietderīgas izmantošanas.", "Rūpnīca izvērtē savu organisko atlikumu izmantošanu. Reaktorā būtu jānovirza tikai materiāli bez izdevīgāka pielietojuma pārtikā vai lopbarībā.", "Šī centralizētā iekārta pieņem dalīti savāktus organiskos atkritumus. Ekonomisko pamatojumu nosaka piegādes līgumi, pieņemšanas maksa un transports.", "Izejvielai jau ir pircējs vai cits pielietojums. Novirzot to biogāzes ražošanai, šī vērtība tiek zaudēta; tie nav bezmaksas atkritumi.", "Piegādes gada laikā mainās. Jāpārbauda mēnešu grafiks, uzglabāšanas zudumi un gāzes ražošanas atbilstība enerģijas pieprasījumam.", "Šai šķidrajai plūsmai vajadzīgi izmērīti caurplūduma un COD dati. Parasta reaktora aprēķins neaizstāj specializētas notekūdeņu attīrīšanas vai pārsegtas lagūnas projektu."],
  et: ["Ettevõte hindab sõnnikust energia tootmist. Tulemus sõltub tegelikult kogutavast kogusest, käitise suurusest ja energia kasuliku kasutamise võimalustest.", "Tehas hindab oma orgaaniliste jääkide kasutamist. Kääritisse tuleks suunata üksnes materjal, millel pole sobivamat kasutust toidu või söödana.", "See keskne käitis võtab vastu liigiti kogutud orgaanilisi jäätmeid. Tasuvuse määravad tarnelepingud, vastuvõtutasud ja veokulud.", "Toormel on juba ostja või muu kasutus. Selle suunamine kääritusse tähendab loobumist senisest väärtusest; tegemist pole tasuta jäätmega.", "Tarned muutuvad aasta jooksul. Kontrollida tuleb kuugraafikut, ladustamiskadusid ning gaasitootmise ja energiavajaduse ajalist kattuvust.", "Selle vedelikuvoo puhul on vaja mõõdetud vooluhulka ja COD-andmeid. Tavalise kääriti hinnang ei asenda spetsiaalse reoveepuhasti või kaetud laguuni projekti."],
  da: ["Bedriften undersøger energiudnyttelse af husdyrgødning. Resultatet afhænger af den mængde, der faktisk kan opsamles, anlæggets størrelse og muligheden for at udnytte energien.", "Fabrikken vurderer udnyttelse af egne organiske restprodukter. Kun materiale uden en mere hensigtsmæssig anvendelse til fødevarer eller foder bør gå til biogasanlægget.", "Dette fælles anlæg modtager særskilt indsamlet organisk affald. Leveringsaftaler, modtagegebyrer og transport afgør økonomien.", "Biomassen har allerede en køber eller en anden anvendelse. Ved at bruge den til biogas mister man denne værdi; det er ikke gratis affald.", "Tilførslen varierer hen over året. Kontrollér månedsplanen, lagertab og om gasproduktionen falder sammen med energibehovet.", "Denne væskestrøm kræver målte flow- og COD-data. Et overslag for en almindelig reaktortank erstatter ikke projektering af særlig spildevandsrensning eller en overdækket lagune."],
  sv: ["Gården undersöker energiutvinning ur gödsel. Resultatet beror på hur mycket som faktiskt kan samlas in, anläggningens storlek och möjligheten att använda energin.", "Fabriken bedömer hur de egna organiska restprodukterna kan användas. Bara material utan lämpligare användning som livsmedel eller foder bör gå till rötkammaren.", "Denna gemensamma anläggning tar emot separat insamlat organiskt avfall. Leveransavtal, mottagningsavgifter och transporter avgör lönsamheten.", "Substratet har redan en köpare eller en annan användning. Rötning innebär att det värdet går förlorat; det är inte gratis avfall.", "Tillförseln varierar över året. Kontrollera månadsplanen, lagringsförlusterna och om gasproduktionen sammanfaller med energibehovet.", "För detta vätskeflöde behövs uppmätta flöden och COD-värden. En uppskattning för en vanlig rötkammare ersätter inte projektering av särskild avloppsrening eller en täckt lagun."],
  fi: ["Tila arvioi energian tuotantoa lannasta. Tulos riippuu todella kerättävissä olevasta määrästä, laitoksen koosta ja energian hyödyntämismahdollisuuksista.", "Tehdas arvioi omien orgaanisten sivuvirtojensa hyödyntämistä. Reaktoriin tulisi ohjata vain materiaali, jolla ei ole tarkoituksenmukaisempaa käyttöä elintarvikkeena tai rehuna.", "Tämä keskitetty laitos vastaanottaa erilliskerättyä orgaanista jätettä. Toimitussopimukset, porttimaksut ja kuljetukset ratkaisevat kannattavuuden.", "Syötteellä on jo ostaja tai muu käyttötarkoitus. Sen ohjaaminen mädätykseen tarkoittaa tästä arvosta luopumista; kyse ei ole ilmaisesta jätteestä.", "Saatavuus vaihtelee vuoden aikana. Tarkista kuukausittainen aikataulu, varastointihävikki sekä kaasuntuotannon ja energiantarpeen ajoittuminen.", "Tälle nestevirralle tarvitaan mitatut virtaama- ja COD-tiedot. Tavallisen mädättämön kustannusarvio ei korvaa erityisen jätevedenpuhdistamon tai katetun laguunin suunnittelua."],
  vi: ["Trang trại đang đánh giá khả năng thu hồi năng lượng từ phân chăn nuôi. Kết quả phụ thuộc vào lượng thực tế có thể thu gom, quy mô hệ thống và khả năng sử dụng năng lượng.", "Nhà máy đánh giá việc tận dụng phụ phẩm hữu cơ của mình. Chỉ nên đưa vào bể phân hủy những nguyên liệu không có phương án sử dụng phù hợp hơn làm thực phẩm hoặc thức ăn chăn nuôi.", "Đây là cơ sở xử lý tập trung, tiếp nhận chất thải hữu cơ đã phân loại. Hợp đồng cung cấp, phí tiếp nhận và vận chuyển quyết định tính khả thi về kinh tế.", "Nguyên liệu đã có người mua hoặc mục đích sử dụng khác. Đưa vào phân hủy đồng nghĩa với việc từ bỏ giá trị đó; đây không phải chất thải miễn phí.", "Nguồn cung thay đổi theo mùa. Cần kiểm tra kế hoạch từng tháng, hao hụt khi lưu trữ và mức độ trùng khớp giữa sản lượng khí với nhu cầu năng lượng.", "Dòng thải lỏng này cần số liệu đo lưu lượng và COD. Dự toán cho bể phân hủy thông thường không thay thế thiết kế hệ thống xử lý nước thải chuyên dụng hoặc hồ phủ bạt."],
  th: ["ฟาร์มกำลังประเมินการผลิตพลังงานจากมูลสัตว์ ผลขึ้นอยู่กับปริมาณที่เก็บรวบรวมได้จริง ขนาดระบบ และการนำพลังงานไปใช้ให้เกิดประโยชน์", "โรงงานกำลังประเมินการใช้ประโยชน์จากเศษอินทรีย์ของตนเอง ควรส่งเข้าถังย่อยเฉพาะส่วนที่ไม่มีทางเลือกที่เหมาะสมกว่าในการใช้เป็นอาหารหรืออาหารสัตว์", "นี่คือโรงงานส่วนกลางที่รับของเสียอินทรีย์ซึ่งคัดแยกแล้ว ความคุ้มค่าขึ้นอยู่กับสัญญาจัดหาวัตถุดิบ ค่ารับของเสีย และค่าขนส่ง", "วัตถุดิบนี้มีผู้ซื้อหรือการใช้งานอื่นอยู่แล้ว การนำมาผลิตก๊าซชีวภาพจึงหมายถึงการเสียมูลค่านั้นไป ไม่ใช่ของเสียที่ไม่มีต้นทุน", "ปริมาณวัตถุดิบเปลี่ยนแปลงตลอดปี ต้องตรวจสอบแผนรายเดือน การสูญเสียระหว่างเก็บรักษา และช่วงเวลาที่ผลิตก๊าซเทียบกับความต้องการพลังงาน", "ของเหลวประเภทนี้ต้องมีข้อมูลอัตราการไหลและ COD ที่ตรวจวัดจริง การประเมินถังย่อยทั่วไปใช้แทนการออกแบบระบบบำบัดน้ำเสียเฉพาะทางหรือบ่อคลุมไม่ได้"],
};

/** Localised factual brief; quantities and operating conditions come from the calculation input. */
export function sampleNotes(e: ExampleCase, locale: Locale, d: Dict) {
  const input = e.input;
  const { labels: L, calc: C, result: R } = d;
  const n = new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 2 }).format;
  const price = new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 6 }).format;
  const currency = getCountry(input.countryCode).currency;
  const money = (v: number) => `${price(v)} ${currency}/${L.units.t}`;
  const copy = contexts[locale];
  const merchant = input.feedstocks.some((f) => f.delivered);
  const farm = input.feedstocks.some((f) => f.animal);
  const competing = input.feedstocks.some((f) => f.handling === "sold_as_feed");
  const seasonal = input.feedstocks.some((f) => f.animal ? f.housing === "seasonal" : (f.monthsActive ?? FEEDSTOCKS[f.type!].defaultMonths) < 12);
  const dilute = input.feedstocks.some((f) => f.type === "pome" || f.type === "vinasse");
  const context = [
    `${countryName(input.countryCode, locale)} · ${L.business[input.businessType].label}.`,
    input.process ? processCopy(locale).models[input.process.kind] : copy[merchant ? 2 : farm ? 0 : 1], competing ? copy[3] : "", seasonal ? copy[4] : "", dilute ? copy[5] : "",
  ].filter(Boolean).join(" ");
  const operations = input.feedstocks.map((f) => {
    const type = f.type ?? ANIMALS[f.animal!].feedstock;
    const label = f.animal ? L.animal[f.animal].label : L.feedstock[type];
    const quantity = f.animal ? n(f.quantity) : `${n(f.quantity)} ${L.units.tYear}`;
    const values = [`${label}: ${quantity}`];
    if (f.animal && f.housing) values.push(L.housing[f.housing]);
    if (!f.animal) {
      const months = f.monthsActive ?? FEEDSTOCKS[type].defaultMonths;
      const start = f.startMonth ?? FEEDSTOCKS[type].defaultStartMonth;
      values.push(`DM: ${n(f.dryMatterPct ?? FEEDSTOCKS[type].dryMatterPct)} %`);
      values.push(`${n(months)} ${L.units.months}`);
      if (months < 12) values.push(`${C.seasonStart}: ${new Intl.DateTimeFormat(INTL_TAG[locale], { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, start - 1, 1)))}`);
    }
    if (f.handling) values.push(L.handling[f.handling]);
    if (f.delivered) {
      values.push(`${C.delivered}: ${f.distanceKm === undefined ? "—" : `${n(f.distanceKm)} ${L.units.km}`}`);
      if (f.purchasePricePerTonneLocal !== undefined) values.push(`${C.purchase}: ${money(f.purchasePricePerTonneLocal)}`);
    } else {
      if (f.currentDisposalCostPerTonneLocal !== undefined) values.push(`${C.disposalCost}: ${money(f.currentDisposalCostPerTonneLocal)}`);
      if (f.opportunityValuePerTonneLocal !== undefined) values.push(`${C.saleValue}: ${money(f.opportunityValuePerTonneLocal)}`);
    }
    return values.join(" · ");
  });
  if (input.process) { const labels = processFieldLabels(locale); for (const [key,value] of Object.entries(input.process)) if (typeof value === "number") operations.push(`${labels[key]}: ${n(value)} ${(PROCESS_UNITS[key] ?? "").replace("local",currency)}`); }
  operations.push(`${d.flow.electricity}: ${input.energy.electricityKwhYear === undefined ? "—" : `${n(input.energy.electricityKwhYear)} ${L.units.kwh}/${L.units.years}`} · ${C.elecPrice}: ${input.energy.electricityPriceLocalPerKwh === undefined ? "—" : `${price(input.energy.electricityPriceLocalPerKwh)} ${currency}/${L.units.kwh}`}`);
  operations.push(`${L.heat[input.energy.heatNeed]}${input.energy.gasM3Year === undefined ? "" : ` · ${C.gasToggle.replace(/^\d+\.\s*/, "")}: ${n(input.energy.gasM3Year)} ${L.units.m3}/${L.units.years}`}${input.energy.gasPriceLocalPerM3 === undefined ? "" : ` · ${C.gasPrice}: ${price(input.energy.gasPriceLocalPerM3)} ${currency}/${L.units.m3}`}${input.energy.heatKwhYear === undefined ? "" : ` · ${C.heatKwh}: ${n(input.energy.heatKwhYear)} ${L.units.kwh}/${L.units.years}`}`);
  operations.push(`${C.land}: ${input.site.landHa === undefined ? "—" : `${n(input.site.landHa)} ${L.units.ha}`} · ${C.gasGrid}: ${input.site.gasGridKm === undefined ? "—" : `${n(input.site.gasGridKm)} ${L.units.km}`}`);
  if (input.site.existingStorageM3 !== undefined) operations.push(`${C.storage}: ${n(input.site.existingStorageM3)} ${L.units.m3}`);
  operations.push(`${C.grid} ${input.energy.hasGridConnection ? d.common.yes : d.common.no}`);
  const segment = input.businessType === "slaughterhouse" ? "meat"
    : input.businessType === "dairy_processor" ? "dairyproc"
      : input.businessType === "sugar_beet_factory" ? "sugar"
        : input.businessType === "municipal_biowaste" ? "foodwaste"
          : input.businessType === "brewery" ? "brewery" : undefined;
  // Preserve sector-specific checks in every language without asserting that they are satisfied.
  const verify = [R.robust.accuracy, segment ? d.fit.segments[segment].conditions.join("; ") : ""].filter(Boolean).join(" ");
  return { context, operations, verify };
}

const referenceLabels: Record<Locale,readonly [string,string,string,string,string]> = {
  "en": [
    "Reported",
    "Design limit",
    "Derived",
    "Reference data",
    "Source checked"
  ],
  "uk": [
    "Оприлюднене",
    "Проєктна межа",
    "Розраховане",
    "Дані референсу",
    "Джерело перевірено"
  ],
  "pl": [
    "Opublikowane",
    "Limit projektowy",
    "Obliczone",
    "Dane referencyjne",
    "Źródło sprawdzono"
  ],
  "de": [
    "Veröffentlicht",
    "Auslegungsgrenze",
    "Abgeleitet",
    "Referenzdaten",
    "Quelle geprüft"
  ],
  "fr": [
    "Publié",
    "Limite de conception",
    "Calculé",
    "Données de référence",
    "Source vérifiée"
  ],
  "it": [
    "Pubblicato",
    "Limite di progetto",
    "Calcolato",
    "Dati di riferimento",
    "Fonte verificata"
  ],
  "es": [
    "Publicado",
    "Límite de diseño",
    "Calculado",
    "Datos de referencia",
    "Fuente comprobada"
  ],
  "pt": [
    "Publicado",
    "Limite de projeto",
    "Calculado",
    "Dados de referência",
    "Fonte verificada"
  ],
  "nl": [
    "Gepubliceerd",
    "Ontwerpgrens",
    "Berekend",
    "Referentiegegevens",
    "Bron gecontroleerd"
  ],
  "cs": [
    "Zveřejněno",
    "Projektový limit",
    "Vypočteno",
    "Referenční údaje",
    "Zdroj ověřen"
  ],
  "sk": [
    "Zverejnené",
    "Projektový limit",
    "Vypočítané",
    "Referenčné údaje",
    "Zdroj overený"
  ],
  "hu": [
    "Közzétett",
    "Tervezési határ",
    "Számított",
    "Referenciaadatok",
    "Forrás ellenőrizve"
  ],
  "ro": [
    "Publicat",
    "Limită de proiectare",
    "Calculat",
    "Date de referință",
    "Sursă verificată"
  ],
  "bg": [
    "Публикувано",
    "Проектна граница",
    "Изчислено",
    "Референтни данни",
    "Източникът е проверен"
  ],
  "sr": [
    "Objavljeno",
    "Projektna granica",
    "Izračunato",
    "Referentni podaci",
    "Izvor proveren"
  ],
  "el": [
    "Δημοσιευμένο",
    "Όριο σχεδιασμού",
    "Υπολογισμένο",
    "Στοιχεία αναφοράς",
    "Έλεγχος πηγής"
  ],
  "tr": [
    "Yayımlanmış",
    "Tasarım sınırı",
    "Hesaplanmış",
    "Referans verileri",
    "Kaynak kontrolü"
  ],
  "lt": [
    "Paskelbta",
    "Projektinė riba",
    "Apskaičiuota",
    "Referenciniai duomenys",
    "Šaltinis patikrintas"
  ],
  "lv": [
    "Publicēts",
    "Projektētā robeža",
    "Aprēķināts",
    "Atsauces dati",
    "Avots pārbaudīts"
  ],
  "et": [
    "Avaldatud",
    "Projekteeritud piir",
    "Arvutatud",
    "Võrdlusandmed",
    "Allikas kontrollitud"
  ],
  "da": [
    "Offentliggjort",
    "Designgrænse",
    "Beregnet",
    "Referencedata",
    "Kilde kontrolleret"
  ],
  "sv": [
    "Publicerat",
    "Dimensioneringsgräns",
    "Beräknat",
    "Referensdata",
    "Källan kontrollerad"
  ],
  "fi": [
    "Julkaistu",
    "Suunnitteluraja",
    "Laskettu",
    "Viitetiedot",
    "Lähde tarkistettu"
  ],
  "vi": [
    "Đã công bố",
    "Giới hạn thiết kế",
    "Được tính toán",
    "Dữ liệu tham chiếu",
    "Ngày kiểm tra nguồn"
  ],
  "th": [
    "ข้อมูลที่เผยแพร่",
    "ขีดจำกัดการออกแบบ",
    "คำนวณจากข้อมูล",
    "ข้อมูลอ้างอิง",
    "ตรวจสอบแหล่งข้อมูลแล้ว"
  ]
};
export const sampleReferenceCopy = (locale: Locale) => { const c=referenceLabels[locale]; return {reported:c[0],capacity:c[1],derived:c[2],title:c[3],checked:c[4]}; };

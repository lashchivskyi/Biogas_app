import type { Locale } from "./config";

// Definitions checked against EPA AgSTAR and the BPC Instruments BMP protocol.
// https://www.epa.gov/sites/default/files/2020-11/documents/agstar-operator-guidebook.pdf
// https://bpcinstruments.com/protocols/protocol-bmp-test/
// DM is a fraction of fresh mass; VS is a fraction of DM; BMP measures CH4 per kg VS.
type HelpCopy = readonly [dm: string, vs: string, bmp: string, season: string, unknown: string];
const copy: Record<Locale, HelpCopy> = {
  en: [
    "DM is the material left after water is removed. At 20% DM, 100 kg of fresh feedstock contains 20 kg of dry matter. Look for DM or TS in the laboratory report.",
    "VS is the organic part of the dry matter, which provides the material for biogas production. At 80% VS, 100 kg of dry matter contains 80 kg of organic matter. The percentage refers to dry matter, not fresh feedstock.",
    "BMP is the methane potential measured in a laboratory: litres of CH₄ per kilogram of VS. Enter methane yield, not total biogas yield. Actual plant production also depends on operating conditions and losses.",
    "Enter how many months the feedstock is available and the first month of that period. The model uses these to distribute supply through the year. If seasonal material is stored and fed all year, use the actual feeding schedule and allow for storage losses in the quantity.",
    "If you do not know the value, leave the field blank: the model will use a reference assumption.",
  ],
  uk: [
    "DM — це те, що залишається в сировині після видалення води. За 20% DM у 100 кг свіжої сировини є 20 кг сухої речовини. У лабораторному протоколі шукайте DM або TS.",
    "VS — органічна частина сухої речовини, з якої може утворюватися біогаз. За 80% VS у 100 кг сухої речовини є 80 кг органіки. Це відсоток від сухої маси, а не від усієї вологої сировини.",
    "BMP — лабораторний потенціал утворення метану: літри CH₄ з одного кілограма VS. Вводьте вихід саме метану, а не всього біогазу. Фактичне виробництво на установці залежить також від режиму роботи та втрат.",
    "Вкажіть, скільки місяців доступна сировина та з якого місяця починається цей період. Так модель розподіляє надходження протягом року. Якщо сезонну сировину зберігають і подають цілий рік, задайте фактичний графік подачі, а в кількості врахуйте втрати зберігання.",
    "Якщо значення невідоме, залиште поле порожнім: модель використає довідкове припущення.",
  ],
  pl: [
    "DM to sucha masa pozostała po usunięciu wody. Przy 20% DM w 100 kg świeżego substratu jest 20 kg suchej masy. W wynikach laboratoryjnych szukaj oznaczenia DM, TS lub s.m.",
    "VS to organiczna część suchej masy, z której może powstawać biogaz. Przy 80% VS w 100 kg suchej masy jest 80 kg materii organicznej. Procent dotyczy suchej masy, a nie całego mokrego substratu.",
    "BMP to laboratoryjny potencjał produkcji metanu: litry CH₄ na kilogram VS. Wpisz uzysk metanu, nie całego biogazu. Rzeczywista produkcja zależy także od warunków pracy i strat.",
    "Podaj liczbę miesięcy dostępności substratu i pierwszy miesiąc tego okresu. Model rozłoży dostawy w ciągu roku. Jeśli substrat sezonowy jest magazynowany i podawany przez cały rok, przyjmij rzeczywisty harmonogram podawania i pomniejsz ilość o straty magazynowe.",
    "Jeśli nie znasz wartości, zostaw pole puste: model przyjmie wartość referencyjną.",
  ],
  de: [
    "DM bezeichnet die Trockenmasse nach dem Entzug des Wassers. Bei 20% DM enthalten 100 kg Frischsubstrat 20 kg Trockenmasse. Im Laborbericht finden Sie dafür auch die Bezeichnung TS.",
    "VS bezeichnet die organische Trockenmasse, aus der Biogas entstehen kann. Bei 80% VS enthalten 100 kg Trockenmasse 80 kg organische Substanz. Der Anteil bezieht sich auf die Trockenmasse, nicht auf die Frischmasse; im Laborbericht oft als oTS angegeben.",
    "BMP ist das im Labor ermittelte Methanpotenzial: Liter CH₄ je Kilogramm VS. Tragen Sie den Methanertrag ein, nicht den gesamten Biogasertrag. Der tatsächliche Anlagenertrag hängt auch von Betriebsbedingungen und Verlusten ab.",
    "Geben Sie die Anzahl der Monate mit verfügbarer Substratmenge und den ersten Monat dieses Zeitraums an. Daraus ergibt sich die monatliche Verteilung. Wird saisonales Material gelagert und ganzjährig verfüttert, gilt der tatsächliche Fütterungsplan; Lagerverluste sind von der Menge abzuziehen.",
    "Ist der Wert unbekannt, lassen Sie das Feld leer. Das Modell verwendet dann eine Referenzannahme.",
  ],
  fr: [
    "DM désigne la matière sèche restant après élimination de l’eau. À 20% de DM, 100 kg d’intrant brut contiennent 20 kg de matière sèche. Le laboratoire peut aussi utiliser les sigles TS ou MS.",
    "VS désigne la part organique de la matière sèche, qui peut produire du biogaz. À 80% de VS, 100 kg de matière sèche contiennent 80 kg de matière organique. Ce pourcentage porte sur la matière sèche, pas sur la masse brute humide.",
    "Le BMP est le potentiel méthanogène mesuré en laboratoire : litres de CH₄ par kilogramme de VS. Saisissez le rendement en méthane, pas le volume total de biogaz. La production réelle dépend aussi des conditions d’exploitation et des pertes.",
    "Indiquez le nombre de mois de disponibilité de l’intrant et le premier mois de cette période. Le modèle répartira ainsi les apports sur l’année. Si un intrant saisonnier est stocké puis alimenté toute l’année, utilisez le calendrier réel d’alimentation et déduisez les pertes au stockage de la quantité.",
    "Si vous ne connaissez pas la valeur, laissez le champ vide : le modèle utilisera une hypothèse de référence.",
  ],
  it: [
    "DM indica la sostanza secca che rimane dopo la rimozione dell’acqua. Con il 20% di DM, 100 kg di matrice fresca contengono 20 kg di sostanza secca. Nel referto di laboratorio può essere indicata anche come TS o SS.",
    "VS indica la frazione organica della sostanza secca, da cui può formarsi biogas. Con l’80% di VS, 100 kg di sostanza secca contengono 80 kg di sostanza organica. La percentuale si riferisce alla sostanza secca, non alla massa umida totale.",
    "Il BMP è il potenziale metanigeno misurato in laboratorio: litri di CH₄ per chilogrammo di VS. Inserisci la resa in metano, non quella dell’intero biogas. La produzione reale dipende anche dalle condizioni operative e dalle perdite.",
    "Indica per quanti mesi è disponibile la matrice e il primo mese del periodo. Il modello distribuirà così gli apporti nell’anno. Se una matrice stagionale viene stoccata e alimentata tutto l’anno, usa il calendario effettivo di alimentazione e sottrai le perdite di stoccaggio dalla quantità.",
    "Se non conosci il valore, lascia il campo vuoto: il modello userà un’ipotesi di riferimento.",
  ],
  es: [
    "DM es la materia seca que queda al eliminar el agua. Con un 20% de DM, 100 kg de sustrato fresco contienen 20 kg de materia seca. En el informe del laboratorio también puede figurar como TS o MS.",
    "VS es la fracción orgánica de la materia seca, a partir de la cual puede producirse biogás. Con un 80% de VS, 100 kg de materia seca contienen 80 kg de materia orgánica. El porcentaje se refiere a la materia seca, no al peso húmedo total.",
    "El BMP es el potencial de metano medido en laboratorio: litros de CH₄ por kilogramo de VS. Introduce el rendimiento de metano, no el volumen total de biogás. La producción real depende también de las condiciones de operación y las pérdidas.",
    "Indica cuántos meses está disponible el sustrato y el primer mes de ese periodo. El modelo distribuirá así los aportes durante el año. Si un material estacional se almacena y se alimenta todo el año, usa el calendario real de alimentación y descuenta las pérdidas de almacenamiento de la cantidad.",
    "Si no conoces el valor, deja el campo vacío: el modelo utilizará un supuesto de referencia.",
  ],
  pt: [
    "DM é a matéria seca que resta após a retirada da água. Com 20% de DM, 100 kg de substrato fresco contêm 20 kg de matéria seca. No laudo, esse parâmetro também pode aparecer como TS, ST ou MS.",
    "VS é a fração orgânica da matéria seca, que pode dar origem ao biogás. Com 80% de VS, 100 kg de matéria seca contêm 80 kg de matéria orgânica. A porcentagem se refere à matéria seca, não à massa úmida total.",
    "BMP é o potencial de produção de metano medido em laboratório: litros de CH₄ por quilograma de VS. Informe o rendimento de metano, não o volume total de biogás. A produção real depende também das condições de operação e das perdas.",
    "Informe por quantos meses o substrato está disponível e o primeiro mês desse período. O modelo distribuirá a oferta ao longo do ano. Se o material sazonal for armazenado e alimentado durante o ano inteiro, use o calendário real de alimentação e desconte as perdas de armazenamento da quantidade.",
    "Se não souber o valor, deixe o campo em branco: o modelo usará uma premissa de referência.",
  ],
  nl: [
    "DM is de droge stof die overblijft na verwijdering van het water. Bij 20% DM bevat 100 kg vers substraat 20 kg droge stof. In het laboratoriumrapport kan dit ook als TS of DS staan.",
    "VS is het organische deel van de droge stof, waaruit biogas kan ontstaan. Bij 80% VS bevat 100 kg droge stof 80 kg organische stof. Het percentage gaat over droge stof, niet over het totale natte gewicht.",
    "BMP is het in het laboratorium gemeten methaanpotentieel: liters CH₄ per kilogram VS. Vul de methaanopbrengst in, niet de totale biogasopbrengst. De werkelijke productie hangt ook af van bedrijfsomstandigheden en verliezen.",
    "Geef aan hoeveel maanden het substraat beschikbaar is en in welke maand die periode begint. Zo verdeelt het model de aanvoer over het jaar. Wordt seizoensmateriaal opgeslagen en het hele jaar gevoerd, gebruik dan het werkelijke voedingsschema en trek opslagverliezen van de hoeveelheid af.",
    "Weet u de waarde niet, laat het veld dan leeg. Het model gebruikt een referentieaanname.",
  ],
  cs: [
    "DM je sušina, která zůstane po odstranění vody. Při 20% DM obsahuje 100 kg čerstvého substrátu 20 kg sušiny. V laboratorním protokolu hledejte DM, TS nebo sušinu.",
    "VS je organická část sušiny, ze které může vznikat bioplyn. Při 80% VS obsahuje 100 kg sušiny 80 kg organické hmoty. Procento se vztahuje k sušině, ne k celkové hmotnosti vlhkého substrátu.",
    "BMP je laboratorně stanovený metanový potenciál: litry CH₄ na kilogram VS. Zadejte výtěžnost metanu, nikoli celého bioplynu. Skutečná produkce závisí také na provozních podmínkách a ztrátách.",
    "Uveďte počet měsíců dostupnosti substrátu a první měsíc tohoto období. Model podle toho rozloží dodávky během roku. Pokud sezónní materiál skladujete a dávkujete celoročně, použijte skutečný plán dávkování a množství snižte o ztráty při skladování.",
    "Pokud hodnotu neznáte, ponechte pole prázdné. Model použije referenční předpoklad.",
  ],
  sk: [
    "DM je sušina, ktorá zostane po odstránení vody. Pri 20% DM obsahuje 100 kg čerstvého substrátu 20 kg sušiny. V laboratórnom protokole hľadajte DM, TS alebo sušinu.",
    "VS je organická časť sušiny, z ktorej môže vznikať bioplyn. Pri 80% VS obsahuje 100 kg sušiny 80 kg organickej hmoty. Percento sa vzťahuje na sušinu, nie na celkovú hmotnosť vlhkého substrátu.",
    "BMP je laboratórne stanovený metánový potenciál: litre CH₄ na kilogram VS. Zadajte výťažnosť metánu, nie celého bioplynu. Skutočná produkcia závisí aj od prevádzkových podmienok a strát.",
    "Uveďte počet mesiacov dostupnosti substrátu a prvý mesiac tohto obdobia. Model podľa toho rozdelí dodávky počas roka. Ak sezónny materiál skladujete a dávkujete celoročne, použite skutočný plán dávkovania a množstvo znížte o straty pri skladovaní.",
    "Ak hodnotu nepoznáte, nechajte pole prázdne. Model použije referenčný predpoklad.",
  ],
  hu: [
    "A DM a víz eltávolítása után visszamaradó szárazanyag. 20% DM esetén 100 kg friss alapanyag 20 kg szárazanyagot tartalmaz. A laboreredményben DM, TS vagy szárazanyag néven szerepelhet.",
    "A VS a szárazanyag szerves része, amelyből biogáz képződhet. 80% VS esetén 100 kg szárazanyagban 80 kg szerves anyag van. A százalék a szárazanyagra vonatkozik, nem a teljes nedves tömegre.",
    "A BMP a laboratóriumban mért metánpotenciál: liter CH₄ egy kilogramm VS-re vetítve. A metánhozamot adja meg, ne a teljes biogázhozamot. A tényleges termelés az üzemi feltételektől és a veszteségektől is függ.",
    "Adja meg, hány hónapig áll rendelkezésre az alapanyag, és melyik hónapban kezdődik ez az időszak. A modell így osztja el az éves ellátást. Ha a szezonális anyagot tárolják és egész évben adagolják, a tényleges adagolási tervet használja, a mennyiséget pedig csökkentse a tárolási veszteséggel.",
    "Ha nem ismeri az értéket, hagyja üresen a mezőt. A modell referenciafeltevést használ.",
  ],
  ro: [
    "DM este substanța uscată rămasă după îndepărtarea apei. La 20% DM, 100 kg de substrat proaspăt conțin 20 kg de substanță uscată. În buletinul de analiză poate apărea și ca TS sau SU.",
    "VS reprezintă partea organică a substanței uscate, din care se poate forma biogaz. La 80% VS, 100 kg de substanță uscată conțin 80 kg de materie organică. Procentul se raportează la substanța uscată, nu la masa umedă totală.",
    "BMP este potențialul de metan măsurat în laborator: litri de CH₄ pe kilogram de VS. Introduceți randamentul de metan, nu volumul total de biogaz. Producția reală depinde și de condițiile de exploatare și de pierderi.",
    "Indicați numărul de luni în care substratul este disponibil și prima lună a perioadei. Modelul va distribui astfel aprovizionarea pe parcursul anului. Dacă materialul sezonier este stocat și alimentat tot anul, folosiți calendarul real de alimentare și scădeți pierderile la stocare din cantitate.",
    "Dacă nu cunoașteți valoarea, lăsați câmpul necompletat. Modelul va folosi o ipoteză de referință.",
  ],
  bg: [
    "DM е сухото вещество, останало след отстраняване на водата. При 20% DM в 100 kg прясна суровина има 20 kg сухо вещество. В лабораторния протокол търсете DM, TS или сухо вещество.",
    "VS е органичната част на сухото вещество, от която може да се образува биогаз. При 80% VS в 100 kg сухо вещество има 80 kg органична материя. Процентът се отнася до сухото вещество, не до общата влажна маса.",
    "BMP е метановият потенциал, измерен в лаборатория: литри CH₄ на килограм VS. Въведете добива на метан, не общото количество биогаз. Реалното производство зависи и от работните условия и загубите.",
    "Посочете колко месеца е налична суровината и първия месец на периода. Така моделът разпределя доставките през годината. Ако сезонният материал се съхранява и подава целогодишно, използвайте действителния график на подаване и намалете количеството със загубите при съхранение.",
    "Ако не знаете стойността, оставете полето празно. Моделът ще използва референтно допускане.",
  ],
  sr: [
    "DM je suva materija koja ostaje nakon uklanjanja vode. Pri 20% DM, 100 kg sveže sirovine sadrži 20 kg suve materije. U laboratorijskom nalazu tražite DM, TS ili suvu materiju.",
    "VS je organski deo suve materije, iz kojeg može nastati biogas. Pri 80% VS, 100 kg suve materije sadrži 80 kg organske materije. Procenat se odnosi na suvu materiju, a ne na ukupnu vlažnu masu.",
    "BMP je metanski potencijal izmeren u laboratoriji: litri CH₄ po kilogramu VS. Unesite prinos metana, ne ukupnog biogasa. Stvarna proizvodnja zavisi i od uslova rada i gubitaka.",
    "Navedite koliko meseci je sirovina dostupna i prvi mesec tog perioda. Model tako raspoređuje snabdevanje tokom godine. Ako se sezonski materijal skladišti i dozira cele godine, koristite stvarni raspored doziranja i umanjite količinu za gubitke pri skladištenju.",
    "Ako ne znate vrednost, ostavite polje prazno. Model će koristiti referentnu pretpostavku.",
  ],
  el: [
    "DM είναι η ξηρά ουσία που απομένει μετά την απομάκρυνση του νερού. Με 20% DM, 100 kg νωπής πρώτης ύλης περιέχουν 20 kg ξηράς ουσίας. Στην εργαστηριακή έκθεση αναζητήστε DM, TS ή ξηρά ουσία.",
    "VS είναι το οργανικό μέρος της ξηράς ουσίας, από το οποίο μπορεί να παραχθεί βιοαέριο. Με 80% VS, 100 kg ξηράς ουσίας περιέχουν 80 kg οργανικής ύλης. Το ποσοστό αφορά την ξηρά ουσία, όχι το συνολικό υγρό βάρος.",
    "BMP είναι το δυναμικό μεθανίου που μετράται στο εργαστήριο: λίτρα CH₄ ανά κιλό VS. Εισαγάγετε την απόδοση σε μεθάνιο, όχι τον συνολικό όγκο βιοαερίου. Η πραγματική παραγωγή εξαρτάται και από τις συνθήκες λειτουργίας και τις απώλειες.",
    "Δηλώστε για πόσους μήνες είναι διαθέσιμη η πρώτη ύλη και τον πρώτο μήνα της περιόδου. Έτσι κατανέμεται η τροφοδοσία μέσα στο έτος. Αν το εποχικό υλικό αποθηκεύεται και τροφοδοτείται όλο τον χρόνο, χρησιμοποιήστε το πραγματικό πρόγραμμα τροφοδοσίας και αφαιρέστε τις απώλειες αποθήκευσης από την ποσότητα.",
    "Αν δεν γνωρίζετε την τιμή, αφήστε το πεδίο κενό. Το μοντέλο θα χρησιμοποιήσει μια παραδοχή αναφοράς.",
  ],
  tr: [
    "DM, su uzaklaştırıldıktan sonra kalan kuru maddedir. %20 DM olduğunda 100 kg taze hammadde 20 kg kuru madde içerir. Laboratuvar raporunda DM, TS veya kuru madde başlığını arayın.",
    "VS, kuru maddenin biyogaz oluşumuna kaynak olabilen organik kısmıdır. %80 VS olduğunda 100 kg kuru maddede 80 kg organik madde bulunur. Yüzde, toplam yaş ağırlığa değil kuru maddeye göre hesaplanır.",
    "BMP, laboratuvarda ölçülen metan potansiyelidir: kilogram VS başına litre CH₄. Toplam biyogaz verimini değil metan verimini girin. Gerçek üretim, işletme koşullarına ve kayıplara da bağlıdır.",
    "Hammaddenin kaç ay temin edilebildiğini ve bu dönemin ilk ayını belirtin. Model yıllık tedariki buna göre dağıtır. Mevsimlik malzeme depolanıp tüm yıl besleniyorsa gerçek besleme takvimini kullanın ve miktardan depolama kayıplarını düşün.",
    "Değeri bilmiyorsanız alanı boş bırakın. Model bir referans varsayımı kullanır.",
  ],
  lt: [
    "DM yra sausoji medžiaga, likusi pašalinus vandenį. Esant 20% DM, 100 kg šviežios žaliavos yra 20 kg sausosios medžiagos. Laboratorinėje ataskaitoje ieškokite DM, TS arba sausosios medžiagos rodiklio.",
    "VS yra organinė sausosios medžiagos dalis, iš kurios gali susidaryti biodujos. Esant 80% VS, 100 kg sausosios medžiagos yra 80 kg organinės medžiagos. Procentas skaičiuojamas nuo sausosios medžiagos, ne nuo bendros drėgnos masės.",
    "BMP yra laboratorijoje nustatytas metano potencialas: litrai CH₄ vienam kilogramui VS. Įveskite metano išeigą, o ne bendrą biodujų kiekį. Faktinė gamyba priklauso ir nuo eksploatavimo sąlygų bei nuostolių.",
    "Nurodykite, kiek mėnesių žaliava prieinama ir kurį mėnesį šis laikotarpis prasideda. Taip modelis paskirsto tiekimą per metus. Jei sezoninė žaliava laikoma ir tiekiama visus metus, naudokite faktinį padavimo grafiką, o kiekį sumažinkite laikymo nuostoliais.",
    "Jei vertės nežinote, palikite lauką tuščią. Modelis naudos orientacinę prielaidą.",
  ],
  lv: [
    "DM ir sausna, kas paliek pēc ūdens atdalīšanas. Ja DM ir 20%, tad 100 kg svaigas izejvielas satur 20 kg sausnas. Laboratorijas pārskatā meklējiet DM, TS vai sausnas saturu.",
    "VS ir sausnas organiskā daļa, no kuras var veidoties biogāze. Ja VS ir 80%, tad 100 kg sausnas satur 80 kg organiskās vielas. Procentu aprēķina no sausnas, nevis no kopējās mitrās masas.",
    "BMP ir laboratorijā noteiktais metāna potenciāls: litri CH₄ uz kilogramu VS. Ievadiet metāna iznākumu, nevis kopējo biogāzes daudzumu. Faktiskā ražošana ir atkarīga arī no darbības apstākļiem un zudumiem.",
    "Norādiet, cik mēnešus izejviela ir pieejama un kurā mēnesī šis periods sākas. Tā modelis sadala piegādes gada laikā. Ja sezonālo materiālu uzglabā un padod visu gadu, izmantojiet faktisko padeves grafiku un samaziniet daudzumu par uzglabāšanas zudumiem.",
    "Ja vērtība nav zināma, atstājiet lauku tukšu. Modelis izmantos orientējošu pieņēmumu.",
  ],
  et: [
    "DM on kuivaine, mis jääb alles pärast vee eemaldamist. 20% DM korral sisaldab 100 kg värsket tooret 20 kg kuivainet. Laboriaruandes otsige tähist DM või TS või kuivaine sisaldust.",
    "VS on kuivaine orgaaniline osa, millest võib tekkida biogaas. 80% VS korral sisaldab 100 kg kuivainet 80 kg orgaanilist ainet. Protsent käib kuivaine, mitte kogu märgmassi kohta.",
    "BMP on laboris mõõdetud metaanipotentsiaal: liitrit CH₄ ühe kilogrammi VS kohta. Sisestage metaanisaagis, mitte biogaasi kogusaagis. Tegelik tootmine sõltub ka töötingimustest ja kadudest.",
    "Märkige, mitu kuud on toore saadaval ja millisel kuul see ajavahemik algab. Nii jaotab mudel tarned aasta peale. Kui hooajalist materjali ladustatakse ja söödetakse aasta ringi, kasutage tegelikku söötmisgraafikut ning vähendage kogust ladustamiskadude võrra.",
    "Kui te väärtust ei tea, jätke väli tühjaks. Mudel kasutab võrdluseeldust.",
  ],
  da: [
    "DM er det tørstof, der er tilbage, når vandet er fjernet. Ved 20% DM indeholder 100 kg frisk biomasse 20 kg tørstof. I laboratoriesvaret kan det også stå som TS eller tørstof.",
    "VS er den organiske del af tørstoffet, som kan danne biogas. Ved 80% VS indeholder 100 kg tørstof 80 kg organisk stof. Procenten gælder tørstoffet, ikke den samlede våde masse.",
    "BMP er det metanpotentiale, der måles i laboratoriet: liter CH₄ pr. kilogram VS. Indtast metanudbyttet, ikke det samlede biogasudbytte. Den faktiske produktion afhænger også af driftsforhold og tab.",
    "Angiv, hvor mange måneder biomassen er tilgængelig, og hvilken måned perioden starter. Modellen fordeler så tilførslen over året. Hvis sæsonbiomasse lagres og tilføres hele året, skal den faktiske indfødningsplan bruges, og lagertab trækkes fra mængden.",
    "Kender du ikke værdien, så lad feltet stå tomt. Modellen bruger en referenceantagelse.",
  ],
  sv: [
    "DM är den torrsubstans som finns kvar efter att vattnet tagits bort. Vid 20% DM innehåller 100 kg färskt substrat 20 kg torrsubstans. I laboratorierapporten kan det också stå TS eller torrsubstans.",
    "VS är den organiska delen av torrsubstansen, som kan ge upphov till biogas. Vid 80% VS innehåller 100 kg torrsubstans 80 kg organiskt material. Procenten avser torrsubstansen, inte den totala våtvikten.",
    "BMP är den metanpotential som mäts i laboratoriet: liter CH₄ per kilogram VS. Ange metanutbytet, inte den totala biogasmängden. Den faktiska produktionen beror också på driftförhållanden och förluster.",
    "Ange hur många månader substratet finns tillgängligt och vilken månad perioden börjar. Modellen fördelar då tillförseln över året. Om säsongsmaterial lagras och matas in året runt ska det faktiska inmatningsschemat användas och lagringsförluster dras av från mängden.",
    "Om du inte känner till värdet, lämna fältet tomt. Modellen använder ett referensantagande.",
  ],
  fi: [
    "DM on kuiva-aine, joka jää jäljelle veden poistamisen jälkeen. Kun DM on 20%, 100 kg tuoretta syötettä sisältää 20 kg kuiva-ainetta. Laboratorioraportissa merkintä voi olla myös TS tai kuiva-aine.",
    "VS on kuiva-aineen orgaaninen osa, josta voi muodostua biokaasua. Kun VS on 80%, 100 kg kuiva-ainetta sisältää 80 kg orgaanista ainetta. Prosentti lasketaan kuiva-aineesta, ei koko märkäpainosta.",
    "BMP on laboratoriossa mitattu metaanipotentiaali: litraa CH₄:ää yhtä VS-kilogrammaa kohti. Syötä metaanisaanto, älä biokaasun kokonaismäärää. Toteutuva tuotanto riippuu myös käyttöolosuhteista ja häviöistä.",
    "Ilmoita, kuinka monta kuukautta syötettä on saatavilla ja mistä kuukaudesta jakso alkaa. Malli jakaa syötön vuoden ajalle. Jos kausiluonteista materiaalia varastoidaan ja syötetään ympäri vuoden, käytä todellista syöttöaikataulua ja vähennä varastointihävikki määrästä.",
    "Jos et tiedä arvoa, jätä kenttä tyhjäksi. Malli käyttää viiteoletusta.",
  ],
  vi: [
    "DM là chất khô còn lại sau khi loại bỏ nước. Với DM 20%, 100 kg nguyên liệu tươi chứa 20 kg chất khô. Trong phiếu phân tích, chỉ tiêu này có thể được ghi là DM, TS hoặc tổng chất rắn.",
    "VS là phần hữu cơ của chất khô, có khả năng tạo ra khí sinh học. Với VS 80%, 100 kg chất khô chứa 80 kg chất hữu cơ. Tỷ lệ này tính trên chất khô, không phải toàn bộ khối lượng nguyên liệu ướt.",
    "BMP là tiềm năng sinh metan đo trong phòng thí nghiệm: lít CH₄ trên mỗi kilôgam VS. Hãy nhập sản lượng metan, không phải tổng lượng khí sinh học. Sản lượng thực tế còn phụ thuộc vào điều kiện vận hành và tổn thất.",
    "Nhập số tháng có nguyên liệu và tháng bắt đầu giai đoạn đó. Mô hình sẽ phân bổ nguồn cung trong năm. Nếu nguyên liệu mùa vụ được lưu trữ và nạp quanh năm, hãy dùng lịch nạp thực tế và trừ hao hụt lưu trữ khỏi khối lượng.",
    "Nếu chưa biết giá trị, hãy để trống: mô hình sẽ dùng giá trị giả định tham khảo.",
  ],
  th: [
    "DM คือเนื้อแห้งที่เหลือหลังเอาน้ำออก หาก DM เท่ากับ 20% วัตถุดิบสด 100 กก. จะมีเนื้อแห้ง 20 กก. ในรายงานผลวิเคราะห์อาจใช้คำว่า DM หรือ TS (ของแข็งทั้งหมด)",
    "VS คือส่วนอินทรีย์ของเนื้อแห้งที่สามารถนำไปผลิตก๊าซชีวภาพได้ หาก VS เท่ากับ 80% เนื้อแห้ง 100 กก. จะมีส่วนอินทรีย์ 80 กก. เปอร์เซ็นต์นี้คิดจากเนื้อแห้ง ไม่ใช่น้ำหนักเปียกทั้งหมด",
    "BMP คือศักยภาพการผลิตมีเทนที่วัดในห้องปฏิบัติการ หน่วยเป็นลิตร CH₄ ต่อกิโลกรัม VS ให้กรอกผลผลิตมีเทน ไม่ใช่ปริมาณก๊าซชีวภาพทั้งหมด การผลิตจริงยังขึ้นอยู่กับสภาวะการเดินระบบและการสูญเสีย",
    "ระบุจำนวนเดือนที่มีวัตถุดิบและเดือนเริ่มต้น เพื่อให้แบบจำลองกระจายวัตถุดิบตามช่วงเวลาในปี หากเก็บวัตถุดิบตามฤดูกาลไว้ป้อนตลอดปี ให้ใช้แผนการป้อนจริงและหักการสูญเสียระหว่างเก็บออกจากปริมาณด้วย",
    "หากไม่ทราบค่า ให้เว้นช่องว่างไว้ แบบจำลองจะใช้ค่าสมมติฐานอ้างอิง",
  ],
};

export function calculatorHelp(locale: Locale) {
  const [dm, vs, bmp, season, unknown] = copy[locale];
  return { dm: `${dm} ${unknown}`, vs: `${vs} ${unknown}`, bmp: `${bmp} ${unknown}`, season: `${season} ${unknown}` };
}

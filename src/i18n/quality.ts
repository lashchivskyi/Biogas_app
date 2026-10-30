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

/** title, lead {score}, client heading, reach {n}, model heading, model note, nothing left, ceiling {max}, biggest gain. */
type Panel = readonly [string, string, string, string, string, string, string, string, string];
const panel: Record<Locale, Panel> = {
  en: ["How far you can rely on these numbers", "{score}/100 shows how much of the result rests on your own data instead of typical values. It is not a rating of the project.", "What you can add", "With all of it: up to {n}/100", "Limits on our side", "These come from our country price and cost data or the screening scope, not from your project. We update them.", "You have entered everything this screening can use.", "High requires verified laboratory and project documents, so a screening stops at {max}/100.", "Biggest gain"],
  uk: ["Наскільки можна покладатися на ці цифри", "{score}/100 показує, яка частина результату спирається на ваші дані, а не на типові значення. Це не оцінка самого проєкту.", "Що можете додати ви", "З усім цим: до {n}/100", "Обмеження з нашого боку", "Вони походять з наших даних про ціни й витрати в країні або з меж скринінгу, а не з вашого проєкту. Ми їх оновлюємо.", "Ви ввели все, що може використати цей скринінг.", "Висока достовірність потребує перевірених лабораторних і проєктних документів, тому скринінг зупиняється на {max}/100.", "Найбільший ефект"],
  pl: ["Na ile można polegać na tych liczbach", "{score}/100 pokazuje, jaka część wyniku opiera się na Twoich danych, a nie na wartościach typowych. To nie jest ocena samego projektu.", "Co możesz uzupełnić", "Po uzupełnieniu wszystkiego: do {n}/100", "Ograniczenia po naszej stronie", "Wynikają z naszych krajowych danych o cenach i kosztach lub z zakresu wstępnej oceny, a nie z Twojego projektu. Aktualizujemy je.", "Wprowadzono wszystko, co ta wstępna ocena może wykorzystać.", "Wysoka wiarygodność wymaga zweryfikowanych dokumentów laboratoryjnych i projektowych, dlatego wstępna ocena kończy się na {max}/100.", "Największy efekt"],
  de: ["Wie belastbar diese Zahlen sind", "{score}/100 zeigt, wie viel des Ergebnisses auf Ihren eigenen Daten statt auf typischen Werten beruht. Es ist keine Bewertung des Projekts.", "Was Sie ergänzen können", "Mit allen Angaben: bis {n}/100", "Grenzen auf unserer Seite", "Sie stammen aus unseren Länderdaten zu Preisen und Kosten oder aus dem Umfang des Screenings, nicht aus Ihrem Projekt. Wir aktualisieren sie.", "Sie haben alles eingegeben, was dieses Screening nutzen kann.", "Hoch erfordert geprüfte Labor- und Projektunterlagen, daher endet ein Screening bei {max}/100.", "Größter Effekt"],
  fr: ["Dans quelle mesure se fier à ces chiffres", "{score}/100 indique quelle part du résultat repose sur vos propres données plutôt que sur des valeurs types. Ce n’est pas une note du projet.", "Ce que vous pouvez ajouter", "Avec tout cela : jusqu’à {n}/100", "Limites de notre côté", "Elles viennent de nos données de prix et de coûts du pays ou du périmètre de la présélection, pas de votre projet. Nous les mettons à jour.", "Vous avez saisi tout ce que cette présélection peut utiliser.", "Le niveau élevé exige des documents de laboratoire et de projet vérifiés ; une présélection s’arrête donc à {max}/100.", "Gain le plus important"],
  it: ["Quanto ci si può fidare di questi numeri", "{score}/100 indica quanta parte del risultato si basa sui vostri dati anziché su valori tipici. Non è un giudizio sul progetto.", "Cosa potete aggiungere", "Con tutti i dati: fino a {n}/100", "Limiti da parte nostra", "Derivano dai nostri dati nazionali su prezzi e costi o dal perimetro dello screening, non dal vostro progetto. Li aggiorniamo.", "Avete inserito tutto ciò che questo screening può usare.", "Il livello alto richiede documenti di laboratorio e di progetto verificati, quindi uno screening si ferma a {max}/100.", "Effetto maggiore"],
  es: ["Hasta qué punto puede fiarse de estas cifras", "{score}/100 indica qué parte del resultado se basa en sus propios datos y no en valores típicos. No es una calificación del proyecto.", "Lo que puede añadir", "Con todo ello: hasta {n}/100", "Límites por nuestra parte", "Proceden de nuestros datos de precios y costes del país o del alcance del análisis preliminar, no de su proyecto. Los actualizamos.", "Ha introducido todo lo que este análisis preliminar puede utilizar.", "El nivel alto requiere documentos de laboratorio y de proyecto verificados, por eso un análisis preliminar se detiene en {max}/100.", "Mayor efecto"],
  pt: ["Quanto você pode confiar nestes números", "{score}/100 mostra quanto do resultado se baseia nos seus próprios dados, e não em valores típicos. Não é uma nota do projeto.", "O que você pode acrescentar", "Com tudo isso: até {n}/100", "Limites do nosso lado", "Vêm dos nossos dados de preços e custos do país ou do escopo da triagem, não do seu projeto. Nós os atualizamos.", "Você informou tudo o que esta triagem pode usar.", "O nível alto exige documentos laboratoriais e de projeto verificados; por isso uma triagem para em {max}/100.", "Maior efeito"],
  nl: ["Hoe betrouwbaar deze cijfers zijn", "{score}/100 geeft aan hoeveel van het resultaat op uw eigen gegevens berust in plaats van op typische waarden. Het is geen beoordeling van het project.", "Wat u kunt aanvullen", "Met alles ingevuld: tot {n}/100", "Beperkingen aan onze kant", "Deze komen uit onze landelijke prijs- en kostengegevens of uit de reikwijdte van de screening, niet uit uw project. Wij werken ze bij.", "U hebt alles ingevuld wat deze screening kan gebruiken.", "Hoog vereist geverifieerde laboratorium- en projectdocumenten; een screening stopt daarom bij {max}/100.", "Grootste effect"],
  cs: ["Nakolik se lze na tato čísla spolehnout", "{score}/100 ukazuje, jaká část výsledku vychází z vašich vlastních údajů místo typických hodnot. Nejde o hodnocení projektu.", "Co můžete doplnit", "Se vším doplněným: až {n}/100", "Omezení na naší straně", "Vyplývají z našich údajů o cenách a nákladech v zemi nebo z rozsahu předběžného posouzení, ne z vašeho projektu. Průběžně je aktualizujeme.", "Zadali jste vše, co toto předběžné posouzení dokáže využít.", "Vysoká úroveň vyžaduje ověřené laboratorní a projektové dokumenty, proto předběžné posouzení končí na {max}/100.", "Největší přínos"],
  sk: ["Nakoľko sa dá na tieto čísla spoľahnúť", "{score}/100 ukazuje, aká časť výsledku vychádza z vašich vlastných údajov namiesto typických hodnôt. Nie je to hodnotenie projektu.", "Čo môžete doplniť", "So všetkým doplneným: až {n}/100", "Obmedzenia na našej strane", "Vyplývajú z našich údajov o cenách a nákladoch v krajine alebo z rozsahu predbežného posúdenia, nie z vášho projektu. Priebežne ich aktualizujeme.", "Zadali ste všetko, čo toto predbežné posúdenie dokáže využiť.", "Vysoká úroveň si vyžaduje overené laboratórne a projektové dokumenty, preto predbežné posúdenie končí na {max}/100.", "Najväčší prínos"],
  hu: ["Mennyire lehet ezekre a számokra támaszkodni", "A {score}/100 azt mutatja, hogy az eredmény mekkora része alapul az Ön saját adatain a jellemző értékek helyett. Ez nem a projekt értékelése.", "Amit Ön pótolhat", "Mindezzel együtt: legfeljebb {n}/100", "Korlátok a mi oldalunkon", "Ezek az országos ár- és költségadatainkból vagy az előzetes vizsgálat kereteiből erednek, nem az Ön projektjéből. Folyamatosan frissítjük őket.", "Minden adatot megadott, amelyet ez az előzetes vizsgálat fel tud használni.", "A magas szinthez ellenőrzött laboratóriumi és projektdokumentumok kellenek, ezért az előzetes vizsgálat {max}/100-nál megáll.", "Legnagyobb hatás"],
  ro: ["Cât vă puteți baza pe aceste cifre", "{score}/100 arată cât din rezultat se bazează pe datele dumneavoastră, nu pe valori tipice. Nu este o notă a proiectului.", "Ce puteți adăuga", "Cu toate acestea: până la {n}/100", "Limite din partea noastră", "Provin din datele noastre de prețuri și costuri pentru țară sau din sfera evaluării preliminare, nu din proiectul dumneavoastră. Le actualizăm.", "Ați introdus tot ce poate folosi această evaluare preliminară.", "Nivelul ridicat necesită documente de laborator și de proiect verificate, de aceea o evaluare preliminară se oprește la {max}/100.", "Cel mai mare efect"],
  bg: ["Доколко можете да разчитате на тези числа", "{score}/100 показва каква част от резултата се основава на вашите собствени данни, а не на типични стойности. Това не е оценка на проекта.", "Какво можете да добавите", "С всичко това: до {n}/100", "Ограничения от наша страна", "Те идват от нашите данни за цени и разходи в страната или от обхвата на предварителната оценка, а не от вашия проект. Обновяваме ги.", "Въведохте всичко, което тази предварителна оценка може да използва.", "Високото ниво изисква проверени лабораторни и проектни документи, затова предварителната оценка спира до {max}/100.", "Най-голям ефект"],
  sr: ["Koliko se možete osloniti na ove brojeve", "{score}/100 pokazuje koliki deo rezultata počiva na vašim podacima, a ne na tipičnim vrednostima. To nije ocena projekta.", "Šta možete da dodate", "Sa svim tim: do {n}/100", "Ograničenja na našoj strani", "Potiču iz naših podataka o cenama i troškovima u zemlji ili iz obima preliminarne procene, a ne iz vašeg projekta. Ažuriramo ih.", "Uneli ste sve što ova preliminarna procena može da koristi.", "Visok nivo zahteva proverene laboratorijske i projektne dokumente, pa se preliminarna procena zaustavlja na {max}/100.", "Najveći efekat"],
  el: ["Πόσο μπορείτε να βασιστείτε σε αυτούς τους αριθμούς", "Το {score}/100 δείχνει πόσο από το αποτέλεσμα βασίζεται στα δικά σας δεδομένα αντί για τυπικές τιμές. Δεν είναι βαθμολογία του έργου.", "Τι μπορείτε να προσθέσετε", "Με όλα αυτά: έως {n}/100", "Περιορισμοί από τη δική μας πλευρά", "Προέρχονται από τα δεδομένα μας για τιμές και κόστη στη χώρα ή από το εύρος της προκαταρκτικής αξιολόγησης, όχι από το έργο σας. Τα ενημερώνουμε.", "Έχετε καταχωρίσει ό,τι μπορεί να χρησιμοποιήσει αυτή η προκαταρκτική αξιολόγηση.", "Το υψηλό επίπεδο απαιτεί επαληθευμένα εργαστηριακά και τεχνικά έγγραφα, γι’ αυτό η προκαταρκτική αξιολόγηση σταματά στο {max}/100.", "Μεγαλύτερο όφελος"],
  tr: ["Bu rakamlara ne kadar güvenebilirsiniz", "{score}/100, sonucun ne kadarının tipik değerler yerine kendi verilerinize dayandığını gösterir. Projenin bir puanı değildir.", "Ekleyebilecekleriniz", "Hepsiyle birlikte: en fazla {n}/100", "Bizim tarafımızdaki sınırlar", "Bunlar projenizden değil, ülkeye ait fiyat ve maliyet verilerimizden veya ön değerlendirmenin kapsamından kaynaklanır. Bunları güncelliyoruz.", "Bu ön değerlendirmenin kullanabileceği her şeyi girdiniz.", "Yüksek seviye doğrulanmış laboratuvar ve proje belgeleri gerektirir; bu nedenle ön değerlendirme {max}/100 düzeyinde durur.", "En büyük etki"],
  lt: ["Kiek galima pasikliauti šiais skaičiais", "{score}/100 rodo, kokia rezultato dalis remiasi jūsų pačių duomenimis, o ne tipinėmis vertėmis. Tai nėra projekto įvertinimas.", "Ką galite papildyti", "Su visais duomenimis: iki {n}/100", "Apribojimai iš mūsų pusės", "Jie kyla iš mūsų šalies kainų ir sąnaudų duomenų arba preliminaraus vertinimo apimties, o ne iš jūsų projekto. Mes juos atnaujiname.", "Įvedėte viską, ką šis preliminarus vertinimas gali panaudoti.", "Aukštam lygiui reikia patikrintų laboratorinių ir projekto dokumentų, todėl preliminarus vertinimas sustoja ties {max}/100.", "Didžiausias poveikis"],
  lv: ["Cik lielā mērā var paļauties uz šiem skaitļiem", "{score}/100 parāda, cik liela rezultāta daļa balstās uz jūsu pašu datiem, nevis tipiskām vērtībām. Tas nav projekta vērtējums.", "Ko jūs varat papildināt", "Ar visu to: līdz {n}/100", "Ierobežojumi no mūsu puses", "Tie izriet no mūsu valsts cenu un izmaksu datiem vai sākotnējā novērtējuma tvēruma, nevis no jūsu projekta. Mēs tos atjauninām.", "Jūs esat ievadījis visu, ko šis sākotnējais novērtējums var izmantot.", "Augstam līmenim nepieciešami pārbaudīti laboratorijas un projekta dokumenti, tāpēc sākotnējais novērtējums apstājas pie {max}/100.", "Lielākā ietekme"],
  et: ["Kui palju võib neile arvudele toetuda", "{score}/100 näitab, kui suur osa tulemusest põhineb teie enda andmetel, mitte tüüpväärtustel. See ei ole projekti hinnang.", "Mida saate lisada", "Kõige sellega: kuni {n}/100", "Piirangud meie poolel", "Need tulenevad meie riigi hinna- ja kuluandmetest või eelhinnangu ulatusest, mitte teie projektist. Me uuendame neid.", "Olete sisestanud kõik, mida see eelhinnang kasutada saab.", "Kõrge tase nõuab kontrollitud labori- ja projektidokumente, seetõttu peatub eelhinnang {max}/100 juures.", "Suurim mõju"],
  da: ["Hvor meget du kan stole på disse tal", "{score}/100 viser, hvor stor en del af resultatet der bygger på dine egne data i stedet for typiske værdier. Det er ikke en vurdering af projektet.", "Hvad du kan tilføje", "Med det hele: op til {n}/100", "Begrænsninger hos os", "De stammer fra vores pris- og omkostningsdata for landet eller fra screeningens omfang, ikke fra dit projekt. Vi opdaterer dem.", "Du har indtastet alt, hvad denne screening kan bruge.", "Høj kræver verificerede laboratorie- og projektdokumenter, så en screening stopper ved {max}/100.", "Største effekt"],
  sv: ["Hur mycket du kan lita på dessa siffror", "{score}/100 visar hur stor del av resultatet som bygger på dina egna uppgifter i stället för typiska värden. Det är inte ett betyg på projektet.", "Vad du kan lägga till", "Med allt detta: upp till {n}/100", "Begränsningar hos oss", "De kommer från våra pris- och kostnadsdata för landet eller från screeningens omfattning, inte från ditt projekt. Vi uppdaterar dem.", "Du har angett allt som denna screening kan använda.", "Hög kräver verifierade laboratorie- och projektdokument, så en screening stannar vid {max}/100.", "Störst effekt"],
  fi: ["Kuinka paljon näihin lukuihin voi luottaa", "{score}/100 kertoo, kuinka suuri osa tuloksesta perustuu omiin tietoihinne tyypillisten arvojen sijaan. Se ei ole hankkeen arvosana.", "Mitä voitte täydentää", "Kaikilla tiedoilla: enintään {n}/100", "Rajoitukset meidän puolellamme", "Ne johtuvat maakohtaisista hinta- ja kustannustiedoistamme tai alustavan arvion laajuudesta, eivät hankkeestanne. Päivitämme niitä.", "Olette syöttäneet kaiken, mitä tämä alustava arvio voi hyödyntää.", "Korkea taso edellyttää varmennettuja laboratorio- ja hankeasiakirjoja, joten alustava arvio pysähtyy arvoon {max}/100.", "Suurin vaikutus"],
  vi: ["Mức độ có thể dựa vào các con số này", "{score}/100 cho biết bao nhiêu phần kết quả dựa trên dữ liệu của chính bạn thay vì giá trị điển hình. Đây không phải là điểm đánh giá dự án.", "Thông tin bạn có thể bổ sung", "Khi bổ sung đủ: tối đa {n}/100", "Giới hạn từ phía chúng tôi", "Các giới hạn này đến từ dữ liệu giá và chi phí của quốc gia hoặc phạm vi sàng lọc, không phải từ dự án của bạn. Chúng tôi cập nhật chúng.", "Bạn đã nhập mọi thông tin mà bước sàng lọc này có thể sử dụng.", "Mức cao cần tài liệu phòng thí nghiệm và hồ sơ dự án đã được kiểm chứng, vì vậy bước sàng lọc dừng ở {max}/100.", "Hiệu quả lớn nhất"],
  th: ["ตัวเลขเหล่านี้เชื่อถือได้แค่ไหน", "{score}/100 แสดงว่าผลลัพธ์อิงข้อมูลของคุณเองมากเพียงใดแทนค่าทั่วไป ไม่ใช่คะแนนของโครงการ", "ข้อมูลที่คุณเพิ่มได้", "เมื่อเพิ่มครบ: สูงสุด {n}/100", "ข้อจำกัดฝั่งเรา", "มาจากข้อมูลราคาและต้นทุนของประเทศหรือขอบเขตของการคัดกรอง ไม่ได้มาจากโครงการของคุณ เราปรับปรุงข้อมูลเหล่านี้อยู่เสมอ", "คุณกรอกข้อมูลครบทุกอย่างที่การคัดกรองนี้ใช้ได้แล้ว", "ระดับสูงต้องมีผลแล็บและเอกสารโครงการที่ตรวจสอบแล้ว การคัดกรองจึงหยุดที่ {max}/100", "ได้ผลมากที่สุด"],
};

export function qualityPanelCopy(locale: Locale) {
  const [title, lead, client, reach, model, modelNote, done, ceiling, biggest] = panel[locale];
  return { title, lead, client, reach, model, modelNote, done, ceiling, biggest };
}

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

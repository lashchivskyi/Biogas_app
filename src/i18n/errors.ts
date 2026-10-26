import type { Locale } from "./config";

// Missing page, missing-page explanation, home action, failure, recovery instruction, retry.
type ErrorCopy = readonly [string, string, string, string, string, string];
export const errorCopy: Record<Locale, ErrorCopy> = {
  en: ["Page not found", "This link may be incomplete or the page may have moved.", "Back to home", "We couldn’t load this page", "Please try again in a moment.", "Try again"],
  uk: ["Сторінку не знайдено", "Можливо, посилання неповне або сторінку переміщено.", "На головну", "Не вдалося завантажити сторінку", "Спробуйте ще раз за мить.", "Спробувати ще раз"],
  pl: ["Nie znaleziono strony", "Link może być niepełny lub strona została przeniesiona.", "Strona główna", "Nie udało się wczytać strony", "Spróbuj ponownie za chwilę.", "Spróbuj ponownie"],
  de: ["Seite nicht gefunden", "Der Link ist möglicherweise unvollständig oder die Seite wurde verschoben.", "Zur Startseite", "Die Seite konnte nicht geladen werden", "Bitte versuchen Sie es gleich noch einmal.", "Erneut versuchen"],
  fr: ["Page introuvable", "Le lien est peut-être incomplet ou la page a été déplacée.", "Retour à l’accueil", "Impossible de charger cette page", "Veuillez réessayer dans un instant.", "Réessayer"],
  it: ["Pagina non trovata", "Il link potrebbe essere incompleto o la pagina potrebbe essere stata spostata.", "Torna alla pagina iniziale", "Impossibile caricare la pagina", "Riprovate tra qualche istante.", "Riprova"],
  es: ["Página no encontrada", "Es posible que el enlace esté incompleto o que la página se haya movido.", "Volver al inicio", "No se ha podido cargar la página", "Vuelve a intentarlo dentro de un momento.", "Volver a intentar"],
  pt: ["Página não encontrada", "O link pode estar incompleto ou a página pode ter mudado de endereço.", "Voltar ao início", "Não foi possível carregar a página", "Tente novamente em instantes.", "Tentar novamente"],
  nl: ["Pagina niet gevonden", "De link is mogelijk onvolledig of de pagina is verplaatst.", "Naar de startpagina", "Deze pagina kon niet worden geladen", "Probeer het over een moment opnieuw.", "Opnieuw proberen"],
  cs: ["Stránka nenalezena", "Odkaz může být neúplný nebo byla stránka přesunuta.", "Na úvodní stránku", "Stránku se nepodařilo načíst", "Zkuste to prosím za chvíli znovu.", "Zkusit znovu"],
  sk: ["Stránka sa nenašla", "Odkaz môže byť neúplný alebo bola stránka presunutá.", "Na úvodnú stránku", "Stránku sa nepodarilo načítať", "Skúste to o chvíľu znova.", "Skúsiť znova"],
  hu: ["Az oldal nem található", "Lehet, hogy a hivatkozás hiányos, vagy az oldalt áthelyezték.", "Vissza a főoldalra", "Az oldalt nem sikerült betölteni", "Kérjük, próbálja újra egy kis idő múlva.", "Újrapróbálkozás"],
  ro: ["Pagina nu a fost găsită", "Este posibil ca linkul să fie incomplet sau pagina să fi fost mutată.", "Înapoi la pagina principală", "Pagina nu a putut fi încărcată", "Încercați din nou peste câteva momente.", "Încercați din nou"],
  bg: ["Страницата не е намерена", "Връзката може да е непълна или страницата да е преместена.", "Към началната страница", "Страницата не може да се зареди", "Опитайте отново след малко.", "Опитайте отново"],
  sr: ["Stranica nije pronađena", "Link je možda nepotpun ili je stranica premeštena.", "Na početnu stranicu", "Stranica nije mogla da se učita", "Pokušajte ponovo za nekoliko trenutaka.", "Pokušaj ponovo"],
  el: ["Η σελίδα δεν βρέθηκε", "Ο σύνδεσμος ίσως είναι ελλιπής ή η σελίδα έχει μετακινηθεί.", "Επιστροφή στην αρχική", "Δεν ήταν δυνατή η φόρτωση της σελίδας", "Δοκιμάστε ξανά σε λίγο.", "Δοκιμάστε ξανά"],
  tr: ["Sayfa bulunamadı", "Bağlantı eksik olabilir veya sayfa taşınmış olabilir.", "Ana sayfaya dön", "Sayfa yüklenemedi", "Lütfen biraz sonra tekrar deneyin.", "Tekrar dene"],
  lt: ["Puslapis nerastas", "Nuoroda gali būti nepilna arba puslapis perkeltas.", "Į pradžią", "Nepavyko įkelti puslapio", "Pabandykite dar kartą po kelių akimirkų.", "Bandyti dar kartą"],
  lv: ["Lapa nav atrasta", "Saite var būt nepilnīga vai lapa ir pārvietota.", "Uz sākumlapu", "Neizdevās ielādēt lapu", "Lūdzu, pēc brīža mēģiniet vēlreiz.", "Mēģināt vēlreiz"],
  et: ["Lehte ei leitud", "Link võib olla poolik või leht on mujale viidud.", "Avalehele", "Lehte ei õnnestunud laadida", "Palun proovige mõne hetke pärast uuesti.", "Proovi uuesti"],
  da: ["Siden blev ikke fundet", "Linket er muligvis ufuldstændigt, eller siden er blevet flyttet.", "Til forsiden", "Siden kunne ikke indlæses", "Prøv igen om et øjeblik.", "Prøv igen"],
  sv: ["Sidan hittades inte", "Länken kan vara ofullständig eller sidan kan ha flyttats.", "Till startsidan", "Det gick inte att läsa in sidan", "Försök igen om en liten stund.", "Försök igen"],
  fi: ["Sivua ei löytynyt", "Linkki voi olla puutteellinen tai sivu on siirretty.", "Etusivulle", "Sivua ei voitu ladata", "Yritä hetken kuluttua uudelleen.", "Yritä uudelleen"],
  vi: ["Không tìm thấy trang", "Liên kết có thể chưa đầy đủ hoặc trang đã được chuyển sang địa chỉ khác.", "Về trang chủ", "Không thể tải trang", "Vui lòng thử lại sau ít phút.", "Thử lại"],
  th: ["ไม่พบหน้าที่ต้องการ", "ลิงก์อาจไม่ครบถ้วนหรือหน้านี้อาจถูกย้ายแล้ว", "กลับหน้าหลัก", "ไม่สามารถโหลดหน้านี้ได้", "โปรดลองอีกครั้งในอีกสักครู่", "ลองอีกครั้ง"],
};

export const numberError: Record<Locale, string> = {
  en: "Enter a valid number.", uk: "Введіть коректне число.", pl: "Wpisz poprawną liczbę.", de: "Geben Sie eine gültige Zahl ein.",
  fr: "Saisissez un nombre valide.", it: "Inserite un numero valido.", es: "Introduce un número válido.", pt: "Digite um número válido.",
  nl: "Voer een geldig getal in.", cs: "Zadejte platné číslo.", sk: "Zadajte platné číslo.", hu: "Adjon meg érvényes számot.",
  ro: "Introduceți un număr valid.", bg: "Въведете валидно число.", sr: "Unesite ispravan broj.", el: "Εισαγάγετε έναν έγκυρο αριθμό.",
  tr: "Geçerli bir sayı girin.", lt: "Įveskite tinkamą skaičių.", lv: "Ievadiet derīgu skaitli.", et: "Sisestage korrektne arv.",
  da: "Indtast et gyldigt tal.", sv: "Ange ett giltigt tal.", fi: "Anna kelvollinen luku.", vi: "Vui lòng nhập một số hợp lệ.", th: "โปรดป้อนตัวเลขที่ถูกต้อง",
};

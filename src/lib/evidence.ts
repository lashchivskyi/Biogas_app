import type { Assessment, MeasureItem } from "@/core";
import type { Locale } from "@/i18n";
import { COUNTRIES } from "@/countries";

/**
 * "What to verify first" turned into actions: the steps to get the evidence, a request pre-filled with the project's
 * own design basis (for a lab, supplier, grid or energy buyer), and the calculator field that takes the answer, so the
 * report can be re-run with a higher evidence level. Texts exist in English and Ukrainian; other locales use English
 * (a request sent abroad is often written in English anyway).
 */
export interface EvidenceRequest {
  steps: string[];
  /** Text the client can copy and send; absent when the check is internal (bills, own records). */
  request?: string;
  /** Where the answer goes in the calculator. */
  enterIn: string;
}

type Lang = "en" | "uk";
const n0 = (v: number) => Math.round(v).toLocaleString("en-US").replace(/,/g, " ");
const sig = (v: number) => n0(Number(v.toPrecision(2)));

export function evidenceRequest(a: Assessment, item: MeasureItem, locale: Locale): EvidenceRequest | undefined {
  const l: Lang = locale === "uk" ? "uk" : "en";
  const T = (en: string, uk: string) => (l === "uk" ? uk : en);
  const r = a.routesBase[a.bestRoute];
  const e = r.energy;
  const country = COUNTRIES[a.input.countryCode]?.nameEn ?? a.input.countryCode;
  const streams = r.feed.lines.map((s) => `- ${s.label}: ${sig(s.tonnesYear)} ${T("t/year", "т/рік")}, DM ≈ ${s.dryMatterPct.toFixed(1)} %`).join("\n");
  const routeLine = a.bestRoute === "chp"
    ? T(`combined heat and power ≈ ${sig(e.chpKwEl)} kWe`, `когенерація ≈ ${sig(e.chpKwEl)} кВт ел.`)
    : a.bestRoute === "biomethane"
      ? T(`membrane upgrading ≈ ${sig(e.biomethaneNm3 / 8760)} Nm³/h biomethane (≈ ${sig(e.rawBiogasDesignNm3PerHour)} Nm³/h raw gas)`, `мембранне очищення ≈ ${sig(e.biomethaneNm3 / 8760)} Нм³/год біометану (≈ ${sig(e.rawBiogasDesignNm3PerHour)} Нм³/год сирого газу)`)
      : T(`biogas boiler ≈ ${sig(e.heatProducedKwh / 8760)} kWth`, `біогазовий котел ≈ ${sig(e.heatProducedKwh / 8760)} кВт тепл.`);
  const basis = T(
    `Site: ${country}.\nFeedstock (screening values, to be confirmed):\n${streams}\nDesign basis from the screening: raw biogas ≈ ${sig(e.rawBiogasDesignNm3PerHour)} Nm³/h at ≈ ${Math.round(e.rawBiogasCh4Share * 100)} % CH₄; digester working volume ≈ ${sig(r.design.workingVolumeM3)} m³; ${routeLine}; new digestate storage ≈ ${sig(r.design.storageNew + r.design.storageOpenNew)} m³.`,
    `Майданчик: ${country}.\nСировина (оцінки скринінгу, потребують підтвердження):\n${streams}\nВихідні дані зі скринінгу: сирий біогаз ≈ ${sig(e.rawBiogasDesignNm3PerHour)} Нм³/год при ≈ ${Math.round(e.rawBiogasCh4Share * 100)} % CH₄; робочий об'єм реактора ≈ ${sig(r.design.workingVolumeM3)} м³; ${routeLine}; нове сховище дигестату ≈ ${sig(r.design.storageNew + r.design.storageOpenNew)} м³.`,
  );

  switch (item.kind) {
    case "yield":
      return {
        steps: [
          T("Take 3–5 subsamples of each stream over 2–4 weeks, mix them, keep them at 4 °C and deliver within 24 h.", "Відберіть 3–5 проб кожного потоку за 2–4 тижні, змішайте, зберігайте при 4 °C і доставте в лабораторію протягом 24 год."),
          T("Order dry matter (DM), volatile solids (VS) and a methane potential test (BMP, VDI 4630) with the cellulose control reported.", "Замовте суху речовину (DM), органічну речовину (VS) і тест метанового потенціалу (BMP, VDI 4630) з результатом контролю на целюлозі."),
          T("A valid test reports cellulose at 340–395 NL CH₄/kg VS; ask for a repeat otherwise.", "Коректний тест показує целюлозу на рівні 340–395 Нл CH₄/кг VS; інакше вимагайте повтор."),
        ],
        request: T(
          `Request for quotation: biogas potential analysis\n${basis}\nPer sample please quote: dry matter (DM, % of fresh mass), volatile solids (VS, % of DM) and biochemical methane potential (BMP, NL CH₄ per kg VS) to VDI 4630, with the cellulose control result and the test duration. Please state price, turnaround time and sampling and shipping instructions.`,
          `Запит на аналіз біогазового потенціалу\n${basis}\nДля кожної проби просимо: суха речовина (DM, % від сирої маси), органічна речовина (VS, % від DM) і метановий потенціал (BMP, Нл CH₄ на кг VS) за VDI 4630 з результатом контролю на целюлозі та тривалістю тесту. Вкажіть, будь ласка, ціну, строк і вимоги до відбору та транспортування проб.`,
        ),
        enterIn: T("Feedstock step: DM, VS and BMP on each stream", "Крок «Сировина»: DM, VS і BMP для кожного потоку"),
      };
    case "quantity":
      return {
        steps: [
          T("Count animals by group and housing period for the last 12 months.", "Порахуйте тварин за групами та періодом утримання в приміщенні за останні 12 місяців."),
          T("Measure slurry pit levels over 30 days (or weigh loads) and take three DM samples.", "Виміряйте рівень у гноєсховищі за 30 днів (або зважте вивезення) і відберіть три проби на суху речовину."),
        ],
        enterIn: T("Feedstock step: quantity and DM of each stream", "Крок «Сировина»: кількість і DM кожного потоку"),
      };
    case "capex":
      return {
        steps: [
          T("Send the same request to at least three suppliers.", "Надішліть однаковий запит щонайменше трьом постачальникам."),
          T("Compare like for like: scope, exclusions, guaranteed gas output, own power use, availability and the O&M price.", "Порівнюйте однакове: обсяг поставки, винятки, гарантований вихід газу, власне споживання, готовність і ціну сервісу."),
        ],
        request: T(
          `Request for quotation: turnkey biogas plant\n${basis}\nPlease quote turnkey: feeding, digester(s), gas system with flare and desulphurisation, the gas-use equipment above, electrical and I&C, civil works, engineering and commissioning. List exclusions (grid connection, permits, land, digestate storage if separate). State the guaranteed gas output, own power and heat use, availability and the price of a full O&M contract.`,
          `Запит комерційної пропозиції: біогазова станція «під ключ»\n${basis}\nПросимо пропозицію «під ключ»: подача сировини, реактор(и), газова система з факелом і сіркоочисткою, зазначене обладнання використання газу, електрика й автоматика, будівельні роботи, проєктування та пусконалагодження. Перелічіть винятки (приєднання до мереж, дозволи, земля, сховище дигестату, якщо окремо). Вкажіть гарантований вихід газу, власне споживання енергії і тепла, готовність і ціну повного сервісного договору.`,
        ),
        enterIn: T("Step 3, “Optional: contracts and financing”: supplier quote and its technology", "Крок 3, «Необов'язково: договори та фінансування»: пропозиція постачальника та її технологія"),
      };
    case "electricity_price":
    case "bill_structure":
      return {
        steps: [
          T("Take the last 12 electricity invoices.", "Візьміть рахунки за електроенергію за останні 12 місяців."),
          T("Split each into the energy part (per kWh) and capacity, network and fixed charges; own generation saves mainly the energy part.", "Розділіть кожен на плату за енергію (за кВт·год) і плату за потужність, мережу та фіксовані платежі; власна генерація заощаджує переважно першу."),
        ],
        enterIn: T("Energy step: electricity price per kWh (energy part, excl. VAT)", "Крок «Енергія»: ціна електроенергії за кВт·год (енергетична частина, без ПДВ)"),
      };
    case "export_price":
      return {
        steps: [T("Ask two or three power buyers or aggregators for an offer.", "Запитайте пропозицію у двох-трьох покупців або агрегаторів електроенергії.")],
        request: T(
          `Request for a power purchase offer\nSite: ${country}. Surplus electricity from a biogas CHP: ≈ ${sig(e.elExportedKwh / 1000)} MWh a year, ≈ ${sig(e.chpKwEl)} kWe, near-baseload operation. Please offer a price per kWh, contract term, indexation and balancing or profile costs.`,
          `Запит на купівлю електроенергії\nМайданчик: ${country}. Надлишок електроенергії біогазової КГУ: ≈ ${sig(e.elExportedKwh / 1000)} МВт·год на рік, ≈ ${sig(e.chpKwEl)} кВт ел., майже базове навантаження. Просимо ціну за кВт·год, строк договору, індексацію та витрати на балансування.`,
        ),
        enterIn: T("Energy step: price you get for electricity you sell", "Крок «Енергія»: ціна продажу електроенергії"),
      };
    case "heat_price":
    case "heat_buyer":
      return {
        steps: [
          T("Confirm the buyer's monthly heat demand and the temperature they need.", "Підтвердьте помісячну потребу покупця в теплі та потрібну температуру."),
          T("Agree a price per kWh linked to their current fuel, and a term of at least the loan period.", "Узгодьте ціну за кВт·год, прив'язану до їхнього поточного палива, на строк не менший за строк кредиту."),
        ],
        request: T(
          `Offer of renewable heat\nSite: ${country}. A biogas plant can supply ≈ ${sig(e.heatNetAvailableKwh / 1000)} MWh of heat a year (hot water, ≈ 80–90 °C) all year round. Please tell us your monthly heat use, the temperature you need, your current fuel and its price, and the price per kWh and term you would accept.`,
          `Пропозиція відновлюваного тепла\nМайданчик: ${country}. Біогазова станція може постачати ≈ ${sig(e.heatNetAvailableKwh / 1000)} МВт·год тепла на рік (гаряча вода ≈ 80–90 °C) цілий рік. Повідомте, будь ласка, ваше помісячне споживання тепла, потрібну температуру, нинішнє паливо та його ціну, а також прийнятні ціну за кВт·год і строк договору.`,
        ),
        enterIn: T("Energy step: price the heat buyer pays per kWh", "Крок «Енергія»: ціна, яку платить покупець тепла за кВт·год"),
      };
    case "offtake": {
      const mwhHhv = e.biomethaneNm3 * 9.97 * 0.97 * 1.11 / 1000;
      const manure = Math.round(r.feed.manureShareVs * 100);
      return {
        steps: [
          T("Ask two or three biomethane traders or gas suppliers for an offer without state support.", "Запитайте пропозицію у двох-трьох трейдерів біометану чи газопостачальників без урахування державної підтримки."),
          T("Ask the gas grid operator for the injection point, pressure and connection cost.", "Запитайте в оператора газової мережі точку подачі, тиск і вартість приєднання."),
        ],
        request: T(
          `Request for a biomethane offtake offer\nSite: ${country}. Expected output ≈ ${sig(e.biomethaneNm3 / 8760)} Nm³/h, ≈ ${sig(mwhHhv)} MWh (HHV) a year; ≈ ${manure} % of organic matter from manure (relevant for certification). Please offer a price per MWh (HHV) without state support, indexation, term, and say whether guarantees of origin or sustainability certificates are included or paid extra.`,
          `Запит на купівлю біометану\nМайданчик: ${country}. Очікуваний обсяг ≈ ${sig(e.biomethaneNm3 / 8760)} Нм³/год, ≈ ${sig(mwhHhv)} МВт·год (за вищою теплотою згоряння) на рік; ≈ ${manure} % органічної речовини з гною (важливо для сертифікації). Просимо ціну за МВт·год (HHV) без державної підтримки, індексацію, строк і уточнення, чи входять гарантії походження або сертифікати сталості в ціну.`,
        ),
        enterIn: T("Energy step: biomethane price offered by a buyer", "Крок «Енергія»: ціна біометану від покупця"),
      };
    }
    case "fertiliser":
      return {
        steps: [
          T("Ask neighbouring farms what they would pay per tonne of digestate, delivered and spread.", "Запитайте сусідні господарства, скільки вони заплатять за тонну дигестату з доставкою та внесенням."),
          T("Check the land available for spreading against the nitrogen limit.", "Перевірте, чи вистачає землі для внесення з урахуванням ліміту азоту."),
        ],
        enterIn: T("Site step: land available for digestate", "Крок «Майданчик»: земля для дигестату"),
      };
    case "market":
      return {
        steps: [T("Check the official source shown for this price in the market-data table and compare it with your own contract.", "Перевірте офіційне джерело цієї ціни в таблиці ринкових даних і порівняйте з вашим договором.")],
        enterIn: T("Energy step: your own price, if you have a contract", "Крок «Енергія»: ваша ціна, якщо є договір"),
      };
    default:
      return undefined;
  }
}

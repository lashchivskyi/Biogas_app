import type { Assessment, MeasureItem } from "@/core";
import type { Locale } from "@/i18n";
import { COUNTRIES } from "@/countries";
import { fmtDec, tr } from "@/core/i18n";
import { coreLang } from "@/i18n/config";
import { countryName } from "@/i18n";
import { GLOSSARY } from "@/i18n/glossary";

/**
 * "What to verify first" turned into actions: the steps to get the evidence, a request pre-filled with the project's
 * own design basis (for a lab, supplier, grid or energy buyer), and the calculator field that takes the answer, so the
 * report can be re-run with a higher evidence level. Texts follow the model language (`coreLang`).
 */
export interface EvidenceRequest {
  steps: string[];
  /** Text the client can copy and send; absent when the check is internal (bills, own records). */
  request?: string;
  /** Where the answer goes in the calculator. */
  enterIn: string;
}

export function evidenceRequest(a: Assessment, item: MeasureItem, locale: Locale): EvidenceRequest | undefined {
  const l = coreLang(locale);
  const T = tr(l);
  const D = fmtDec(l);
  const n0 = (v: number) => D(Math.round(v));
  const sig = (v: number) => n0(Number(v.toPrecision(2)));
  const r = a.routesBase[a.bestRoute];
  const e = r.energy;
  const country = COUNTRIES[a.input.countryCode] ? countryName(a.input.countryCode, l) : a.input.countryCode;
  const streams = r.feed.lines.map((s) => `- ${s.label}: ${sig(s.tonnesYear)} ${T("t/year")}, ${GLOSSARY[l].terms.dm} ≈ ${D(s.dryMatterPct, 1)} %`).join("\n");
  const routeLine = a.bestRoute === "chp"
    ? T("combined heat and power ≈ {chpKwEl} kWe", { chpKwEl: sig(e.chpKwEl) })
    : a.bestRoute === "biomethane"
      ? T("membrane upgrading ≈ {biomethaneNm3} Nm³/h biomethane (≈ {rawBiogasDesignNm3PerHour} Nm³/h raw gas)", { biomethaneNm3: sig(e.biomethaneNm3 / 8760), rawBiogasDesignNm3PerHour: sig(e.rawBiogasDesignNm3PerHour) })
      : T("biogas boiler ≈ {heatProducedKwh} kWth", { heatProducedKwh: sig(e.heatProducedKwh / 8760) });
  const basis = T("Site: {country}.\nFeedstock (screening values, to be confirmed):\n{streams}\nDesign basis from the screening: raw biogas ≈ {rawBiogasDesignNm3PerHour} Nm³/h at ≈ {rawBiogasCh4Share} % CH₄; digester working volume ≈ {workingVolumeM3} m³; {routeLine}; new digestate storage ≈ {storageOpenNew} m³.", { country, streams, rawBiogasDesignNm3PerHour: sig(e.rawBiogasDesignNm3PerHour), rawBiogasCh4Share: Math.round(e.rawBiogasCh4Share * 100), workingVolumeM3: sig(r.design.workingVolumeM3), routeLine, storageOpenNew: sig(r.design.storageNew + r.design.storageOpenNew) });

  switch (item.kind) {
    case "yield":
      return {
        steps: [
          T("Take 3–5 subsamples of each stream over 2–4 weeks, mix them, keep them at 4 °C and deliver within 24 h."),
          T("Order dry matter (DM), volatile solids (VS) and a methane potential test (BMP, VDI 4630) with the cellulose control reported."),
          T("A valid test reports cellulose at 340–395 NL CH₄/kg VS; ask for a repeat otherwise."),
        ],
        request: T("Request for quotation: biogas potential analysis\n{basis}\nPer sample please quote: dry matter (DM, % of fresh mass), volatile solids (VS, % of DM) and biochemical methane potential (BMP, NL CH₄ per kg VS) to VDI 4630, with the cellulose control result and the test duration. Please state price, turnaround time and sampling and shipping instructions.", { basis }),
        enterIn: T("Feedstock step: DM, VS and BMP on each stream"),
      };
    case "quantity":
      return {
        steps: [
          T("Count animals by group and housing period for the last 12 months."),
          T("Measure slurry pit levels over 30 days (or weigh loads) and take three DM samples."),
        ],
        enterIn: T("Feedstock step: quantity and DM of each stream"),
      };
    case "supply":
    case "feed_price": {
      const delivered = r.feed.lines.filter((s) => s.delivered || Math.abs(s.purchaseCostEurYear) > 0)
        .map((s) => `- ${s.label}: ${sig(s.tonnesYear)} ${T("t/year")}, ${GLOSSARY[l].terms.dm} ≈ ${D(s.dryMatterPct, 1)} %`).join("\n");
      return {
        steps: item.kind === "supply"
          ? [T("List every stream you do not produce yourself: supplier, tonnes per month, season and contract term."), T("Get letters of intent or contracts for at least the loan period, and size the plant on the tonnage that is signed, not promised.")]
          : [T("For every purchased stream and every gate fee, note today's price and its range over the last three years."), T("Fix prices or gate fees with indexation for the loan period, and check that the plan still pays with prices 25 % worse.")],
        request: T("Request for a feedstock supply agreement\nSite: {country}. A biogas plant would take:\n{streams}\nPlease confirm the tonnes per month you can deliver, the dry matter, the delivery season, the price or gate fee per tonne with its indexation, and the term you can commit to.", { country, streams: delivered || streams }),
        enterIn: T("Feedstock step: quantity and price of each delivered stream"),
      };
    }
    case "capex":
      return {
        steps: [
          T("Send the same request to at least three suppliers."),
          T("Compare like for like: scope, exclusions, guaranteed gas output, own power use, availability and the O&M price."),
        ],
        request: T("Request for quotation: turnkey biogas plant\n{basis}\nPlease quote turnkey: feeding, digester(s), gas system with flare and desulphurisation, the gas-use equipment above, electrical and I&C, civil works, engineering and commissioning. List exclusions (grid connection, permits, land, digestate storage if separate). State the guaranteed gas output, own power and heat use, availability and the price of a full O&M contract.", { basis }),
        enterIn: T("Step 3, “Optional: contracts and financing”: supplier quote and its technology"),
      };
    case "electricity_price":
    case "bill_structure":
      return {
        steps: [
          T("Take the last 12 electricity invoices."),
          T("Split each into the energy part (per kWh) and capacity, network and fixed charges; own generation saves mainly the energy part."),
        ],
        enterIn: T("Energy step: electricity price per kWh (energy part, excl. VAT)"),
      };
    case "export_price":
      return {
        steps: [T("Ask two or three power buyers or aggregators for an offer.")],
        request: T("Request for a power purchase offer\nSite: {country}. Surplus electricity from a biogas CHP: ≈ {elExportedKwh} MWh a year, ≈ {chpKwEl} kWe, near-baseload operation. Please offer a price per kWh, contract term, indexation and balancing or profile costs.", { country, elExportedKwh: sig(e.elExportedKwh / 1000), chpKwEl: sig(e.chpKwEl) }),
        enterIn: T("Energy step: price you get for electricity you sell"),
      };
    case "heat_price":
    case "heat_buyer":
      return {
        steps: [
          T("Confirm the buyer's monthly heat demand and the temperature they need."),
          T("Agree a price per kWh linked to their current fuel, and a term of at least the loan period."),
        ],
        request: T("Offer of renewable heat\nSite: {country}. A biogas plant can supply ≈ {heatNetAvailableKwh} MWh of heat a year (hot water, ≈ 80–90 °C) all year round. Please tell us your monthly heat use, the temperature you need, your current fuel and its price, and the price per kWh and term you would accept.", { country, heatNetAvailableKwh: sig(e.heatNetAvailableKwh / 1000) }),
        enterIn: T("Energy step: price the heat buyer pays per kWh"),
      };
    case "offtake": {
      const mwhHhv = e.biomethaneNm3 * 9.97 * 0.97 * 1.11 / 1000;
      const manure = Math.round(r.feed.manureShareVs * 100);
      return {
        steps: [
          T("Ask two or three biomethane traders or gas suppliers for an offer without state support."),
          T("Ask the gas grid operator for the injection point, pressure and connection cost."),
        ],
        request: T("Request for a biomethane offtake offer\nSite: {country}. Expected output ≈ {biomethaneNm3} Nm³/h, ≈ {mwhHhv} MWh (HHV) a year; ≈ {manure} % of organic matter from manure (relevant for certification). Please offer a price per MWh (HHV) without state support, indexation, term, and say whether guarantees of origin or sustainability certificates are included or paid extra.", { country, biomethaneNm3: sig(e.biomethaneNm3 / 8760), mwhHhv: sig(mwhHhv), manure }),
        enterIn: T("Energy step: biomethane price offered by a buyer"),
      };
    }
    case "fertiliser":
      return {
        steps: [
          T("Ask neighbouring farms what they would pay per tonne of digestate, delivered and spread."),
          T("Check the land available for spreading against the nitrogen limit."),
        ],
        enterIn: T("Site step: land available for digestate"),
      };
    case "market":
      return {
        steps: [T("Check the official source shown for this price in the market-data table and compare it with your own contract.")],
        enterIn: T("Energy step: your own price, if you have a contract"),
      };
    default:
      return undefined;
  }
}

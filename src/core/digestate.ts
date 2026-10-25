import type { RunContext } from "./context";
import type { DigestateAssessment, FeedstockSummary } from "./types";

/**
 * Digestate is an asset only when there is land to take its nutrients and the farm would otherwise
 * buy mineral fertiliser. The model credits only INCREMENTAL value: own manure was already spread
 * before digestion, so only the better N availability counts; imported waste brings new nutrients.
 */
export function assessDigestate(feed: FeedstockSummary, ctx: RunContext): DigestateAssessment {
  const p = ctx.params;
  const nLimit = p.get("eng.nitrates_limit_kg_n_ha");
  const retention = p.get("eng.digestate_n_retention");
  const gainOwn = p.get("eng.digestate_n_gain_own_manure");
  const nCredit = p.get("eng.digestate_n_credit_imported");
  const pkCredit = p.get("eng.digestate_pk_credit_imported");
  const pN = p.get("econ.fert_n_eur_kg");
  const pP = p.get("econ.fert_p2o5_eur_kg");
  const pK = p.get("econ.fert_k2o_eur_kg");
  const handling = p.get("econ.digestate_handling_eur_t");
  const excessCost = p.get("econ.digestate_excess_eur_t");
  const biogasMass = p.get("eng.biogas_mass_kg_per_m3");
  const storageMonths = p.get("eng.storage_months");

  const tonnes = Math.max(0, feed.tonnesYear - (feed.biogasM3Year * biogasMass) / 1000);
  const nRet = feed.nKgYear * retention;
  const required = nRet / nLimit;
  const land = ctx.input.site.landHa;
  const known = land !== undefined && land >= 0;

  let adequacy: DigestateAssessment["adequacy"] = "UNKNOWN";
  let excessShare = 0.5; // unknown land: assume half of imported nutrients cannot be placed
  if (known) {
    excessShare = required > 0 ? Math.max(0, 1 - (land as number) / required) : 0;
    adequacy = excessShare > 0.02 ? "SHORT" : "OK";
  }

  // Which tonnes are "imported" (processing waste or delivered) vs the farm's own manure.
  let importedTonnes = 0;
  let valueOwn = 0;
  let valueImported = 0;
  for (const l of feed.lines) {
    const imported = l.category !== "manure" || l.delivered;
    if (imported) {
      importedTonnes += l.tonnesYear;
      valueImported += l.nKgYear * nCredit * pN + l.p2o5KgYear * pkCredit * pP + l.k2oKgYear * pkCredit * pK;
    } else {
      valueOwn += l.nKgYear * gainOwn * pN;
    }
  }
  const factor = ctx.scenario.digestateValueFactor;
  const fertiliserValue = (valueOwn + valueImported * (1 - excessShare)) * factor;
  const importedDigestate = feed.tonnesYear > 0 ? tonnes * (importedTonnes / feed.tonnesYear) : 0;
  const handlingCost = importedDigestate * ((1 - excessShare) * handling + excessShare * excessCost);
  const net = fertiliserValue - handlingCost;

  const T = ctx.t;
  const req = Math.round(required);
  const advice: string[] = [];
  if (adequacy === "UNKNOWN") advice.push(T("Enter the land area available for spreading: without it digestate is a potential liability.", "Вкажіть площу полів, на які можна вносити дигестат: без цього вартість дигестату — потенційний борг."));
  if (adequacy === "SHORT") advice.push(T(`Not enough land: ≈ ${req} ha needed at ${nLimit} kg N/ha. Surplus digestate is a cost (agreements with neighbours, separation, pelletising).`, `Земель недостатньо: потрібно ≈ ${req} га за лімітом ${nLimit} кг N/га. Надлишок дигестату — витрата (договори з сусідніми господарствами, сепарація, гранулювання).`));
  advice.push(T(`Covered digestate storage for ${storageMonths} months: required by the spreading season; without it, N and methane are lost.`, `Закрите сховище дигестату на ${storageMonths} міс.: вимога сезону внесення, без нього — втрата N і метан.`));
  advice.push(T("Spread by injection or trailing hose (not splash plate): less odour and ammonia loss.", "Внесення — інжектором або стрічкове (не розкидання): менше запаху та втрат аміаку."));

  const status: DigestateAssessment["status"] = adequacy === "SHORT" || net < 0 ? "LIABILITY" : net > 1000 ? "ASSET" : "NEUTRAL";

  return {
    tonnesYear: tonnes,
    nKgYear: nRet,
    landRequiredHa: required,
    landAvailableHa: known ? (land as number) : null,
    adequacy,
    excessShare,
    fertiliserValueEurYear: fertiliserValue,
    handlingCostEurYear: handlingCost,
    netValueEurYear: net,
    storageMonthsRequired: storageMonths,
    advice,
    status,
  };
}

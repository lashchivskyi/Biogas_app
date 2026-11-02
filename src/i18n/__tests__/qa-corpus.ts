import { getDictionary, LOCALES, type Dict, type Locale } from "..";
import { adminCopy } from "../admin";
import { advisorCopy } from "../advisor";
import { businessCopy, businessGroupLabel } from "../businesses";
import { calculatorHelp } from "../calculator-help";
import { climateCopy } from "../climate";
import { decisionCopy } from "../decision";
import { deliveryCopy, retryPayment } from "../delivery";
import { errorCopy, numberError } from "../errors";
import { financialLabels, sensitivityLabels } from "../financial-labels";
import { formErrorCopy } from "../form-errors";
import { legalCopy } from "../legal";
import { marketLabel, marketQuality } from "../market";
import { locationCopy } from "../location";
import { methodologyCopy, methodologyTermHelp } from "../methodology";
import { offerCopy } from "../offer";
import { preferenceCopy } from "../preferences";
import { processFieldHelp } from "../process-help";
import { processCopy, processFieldLabels, processUsage } from "../processes";
import { minimumForVerdict, qualityGapCopy, qualityPanelCopy } from "../quality";
import { reportLinkHelp } from "../report-link";
import { sampleReferenceCopy } from "../samples";
import { seoCopy } from "../seo-copy";
import { stepHelp } from "../step-help";
import { validationCopy } from "../validation";
import { workspaceCopy } from "../workspace";

/** One translatable string: module, path inside it, and the English source at the same path. */
export interface Entry { module: string; path: string; text: string; en: string | undefined }

type Tree = { [k: string]: unknown };

export function leaves(o: unknown, path = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof o === "string") out.set(path, o);
  else if (Array.isArray(o)) o.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Tree)) leaves(v, path ? `${path}.${k}` : k, out);
  return out;
}

/** Every user-visible i18n module as `module → (locale → value)`; functions get the locale (and a dictionary where needed). */
function modules(d: (l: Locale) => Dict): Record<string, (l: Locale) => unknown> {
  return {
    dict: (l) => d(l),
    admin: adminCopy, advisor: (l) => advisorCopy[l], business: businessCopy, businessGroups: (l) => ["farm", "food", "other"].map((id) => businessGroupLabel(id, l)),
    calculatorHelp, climate: (l) => climateCopy[l], decision: (l) => decisionCopy[l], delivery: (l) => deliveryCopy[l], retryPayment: (l) => retryPayment[l],
    errors: (l) => errorCopy[l], numberError: (l) => numberError[l],
    financialLabels: (l) => financialLabels(l, d(l)), sensitivityLabels: (l) => sensitivityLabels(l, d(l)),
    market: (l) => ({ labels: ["de_small_manure", "task37_manure_200", "de_500_flex", "pl_500_1000", "ua_1mw"].map((id) => marketLabel(l, id)), quality: ["official study", "trade press", "vendor", "single project"].map((v) => marketQuality(l, v)) }),
    formErrors: (l) => formErrorCopy[l], legal: (l) => legalCopy[l], location: locationCopy,
    methodology: (l) => methodologyCopy[l], methodologyTermHelp: (l) => methodologyTermHelp[l], offer: (l) => offerCopy[l],
    preferences: preferenceCopy, processHelp: processFieldHelp, process: processCopy, processLabels: processFieldLabels, processUsage,
    minimumForVerdict: (l) => minimumForVerdict[l], qualityPanel: qualityPanelCopy, qualityGaps: (l) => qualityGapCopy(l, d(l), "EUR"),
    reportLink: (l) => reportLinkHelp[l], seo: (l) => seoCopy[l], sampleReference: sampleReferenceCopy, stepHelp, validation: (l) => validationCopy[l], workspace: (l) => workspaceCopy[l],
  };
}

export interface Corpus {
  /** All strings per locale (English included), every module. */
  byLocale: Record<Locale, Entry[]>;
  /** Merged dictionary per locale. */
  dicts: Record<Locale, Dict>;
}

export async function loadCorpus(): Promise<Corpus> {
  const dicts = Object.fromEntries(await Promise.all(LOCALES.map(async (l) => [l, await getDictionary(l)] as const))) as Record<Locale, Dict>;
  const mods = modules((l) => dicts[l]);
  const flat = (l: Locale) => new Map(Object.entries(mods).map(([m, fn]) => [m, leaves(fn(l))] as const));
  const en = flat("en");
  const byLocale = {} as Record<Locale, Entry[]>;
  for (const l of LOCALES) {
    const own = flat(l);
    byLocale[l] = [...own].flatMap(([module, map]) => [...map].map(([path, text]) => ({ module, path, text, en: en.get(module)?.get(path) })));
  }
  return { byLocale, dicts };
}

/** Read-only release evidence inventory. Writes to stdout, never rewrites country data. */
import { assess } from "../src/core/assess";
import { EXAMPLES } from "../src/core/examples";
import { isoDate, MODEL_VERSION } from "../src/core/modelAudit";
import { COUNTRIES } from "../src/countries";
import statistics from "../src/countries/data/statistics.json";

const index = process.argv.indexOf("--as-of");
const asOfDate = index >= 0 ? process.argv[index + 1] : new Date().toISOString().slice(0, 10);
if (!asOfDate || !isoDate(asOfDate)) throw new Error("Provide --as-of YYYY-MM-DD");
const template = EXAMPLES.find((e) => e.id === "slaughter_5000")!.input;
const countries = Object.values(COUNTRIES).map((c) => {
  const a = assess({ ...template, countryCode: c.code, regionId: c.regions[0].id,
    energy: { ...template.energy, electricityPriceLocalPerKwh: undefined, gasPriceLocalPerM3: undefined },
  }, c, { asOfDate });
  return { country: c.code, regions: c.regions.length, bestRoute: a.bestRoute, confidence: a.confidence.level,
    dataVersion: a.dataAudit!.dataVersion,
    marketReview: a.dataAudit!.checks.filter((p) => p.parameterId.startsWith("econ.") && ["EXPIRED", "UNDATED", "REVIEW_REQUIRED"].includes(p.status)),
    marketLow: a.marketEvidence!.filter((p) => p.confidence === "LOW").map((p) => p.id),
    independentlyValidated: false,
  };
});
console.log(JSON.stringify({ asOfDate, modelVersion: MODEL_VERSION, statisticsDownloadedOn: statistics.fetchedOn,
  refreshErrors: statistics.refreshErrors, countries,
  limitation: "Synthetic regression cases and evidence review are not independent operating-plant validation or current EPC/offtake quotations.",
}, null, 2));

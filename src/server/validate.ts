import { processSchema } from "@/core/processes";
import { modelsForBusiness } from "@/core/businesses";
import { z } from "zod";
import { ANIMALS, BUSINESS_TYPES, FEEDSTOCKS, HANDLING_IDS, type HandlingId } from "@/core";
import { COUNTRIES } from "@/countries";
import { verifyCity } from "./cities";
import { cityRegionId, type CityClimate } from "@/core/location";

const key = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const optNum = (max: number, min = 0) => z.number().min(min).max(max).optional();
/** Upper bound for any amount in local currency per unit: only guards against nonsense, so it must clear the weakest currency (VND ≈ 28 500 per €). */
const LOCAL_UNIT_MAX = 1e8;

export const lineSchema = z
  .object({
    id: z.string().max(60),
    animal: z.enum(key(ANIMALS)).optional(),
    type: z.enum(key(FEEDSTOCKS)).optional(),
    quantity: z.number().gt(0).max(1e9),
    housing: z.enum(["year_round", "seasonal"]).optional(),
    dryMatterPct: z.number().gt(0).max(95).optional(),
    vsPctOfDm: z.number().gt(0).max(100).optional(),
    methaneYieldLPerKgVs: z.number().gt(0).max(1200).optional(),
    monthsActive: z.number().min(1).max(12).optional(),
    startMonth: z.number().min(1).max(12).optional(),
    delivered: z.boolean().optional(),
    distanceKm: optNum(2000),
    purchasePricePerTonneLocal: z.number().min(-LOCAL_UNIT_MAX).max(LOCAL_UNIT_MAX).optional(),
    handling: z.enum(HANDLING_IDS as [HandlingId, ...HandlingId[]]).optional(),
    currentDisposalCostPerTonneLocal: optNum(LOCAL_UNIT_MAX),
    opportunityValuePerTonneLocal: optNum(LOCAL_UNIT_MAX),
  })
  .refine((l) => (l.animal ? !l.type : !!l.type), { message: "exactly one of animal/type" });

export const inputSchema = z.object({
  countryCode: z.enum(key(COUNTRIES)),
  regionId: z.string().max(40),
  city: z.custom<CityClimate>((c) => !!c && typeof c === "object" && verifyCity(c, (c as CityClimate).countryCode), "Invalid or altered city climate; select the city again").optional(),
  lang: z.enum(["en", "uk"]).optional(),
  businessType: z.enum(key(BUSINESS_TYPES)),
  process: processSchema.optional(),
  projectRole: z.enum(["feedstock_owner", "waste_operator", "developer", "offtaker"]).optional(),
  feedstocks: z.array(lineSchema).max(16),
  energy: z.object({
    electricityKwhYear: optNum(1e10),
    electricityPriceLocalPerKwh: optNum(LOCAL_UNIT_MAX),
    gasM3Year: optNum(1e9),
    gasPriceLocalPerM3: optNum(LOCAL_UNIT_MAX),
    heatNeed: z.enum(["none", "seasonal_buildings", "year_round_process", "greenhouse"]),
    heatKwhYear: optNum(1e10),
    hasGridConnection: z.boolean(),
    exportPriceLocalPerKwh: optNum(LOCAL_UNIT_MAX),
    heatPriceLocalPerKwh: optNum(LOCAL_UNIT_MAX),
  }),
  site: z.object({
    landHa: optNum(1e6),
    existingStorageM3: optNum(1e7),
    gasGridKm: optNum(1000),
    neighboursWithin300m: z.boolean().optional(),
    nearProtectedOrWaterArea: z.boolean().optional(),
  }),
  finance: z.object({
    debtShare: optNum(0.9),
    debtRate: optNum(0.6),
    debtTenorYears: z.number().int().min(1).max(30).optional(),
    operatorWageLocalPerHour: optNum(LOCAL_UNIT_MAX),
    capexQuoteLocal: optNum(1e15),
    capexQuoteRoute: z.enum(["chp", "boiler", "biomethane"]).optional(),
  }).refine((f) => (f.capexQuoteLocal === undefined) === (f.capexQuoteRoute === undefined), { message: "A supplier quote needs its technology (CHP, boiler or biomethane), and the technology needs a quote" }).optional(),
  labAnalysisAvailable: z.boolean().optional(),
  assumedSupportEurPerKwh: optNum(1).optional(),
}).superRefine((input, ctx) => {
  if (!modelsForBusiness(input.businessType).includes(input.process?.kind ?? "ad") || (input.process ? input.feedstocks.length > 0 : input.feedstocks.length === 0)) {
    ctx.addIssue({ code: "custom", path: ["process"], message: "Supply one complete input basis appropriate to the selected process" });
  }
  if (input.city ? input.city.countryCode !== input.countryCode || input.regionId !== cityRegionId(input.city) : !COUNTRIES[input.countryCode].regions.some((region) => region.id === input.regionId)) {
    ctx.addIssue({ code: "custom", path: ["regionId"], message: "Region does not belong to the selected country" });
  }
});

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(30).regex(/^[+\d\s()\-.]+$/, "Invalid phone number"),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Consent is required" }),
  website: z.string().max(200).nullish(), // honeypot: real users leave it empty; bots fill it
  input: inputSchema,
});

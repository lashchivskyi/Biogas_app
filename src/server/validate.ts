import { z } from "zod";
import { ANIMALS, BUSINESS_TYPES, FEEDSTOCKS, HANDLING_IDS, type HandlingId } from "@/core";
import { COUNTRIES } from "@/countries";

const key = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const optNum = (max: number, min = 0) => z.number().min(min).max(max).optional();

export const lineSchema = z
  .object({
    id: z.string().max(60),
    animal: z.enum(key(ANIMALS)).optional(),
    type: z.enum(key(FEEDSTOCKS)).optional(),
    quantity: z.number().gt(0).max(1e9),
    housing: z.enum(["year_round", "seasonal"]).optional(),
    dryMatterPct: z.number().gt(0).max(95).optional(),
    monthsActive: z.number().min(1).max(12).optional(),
    startMonth: z.number().min(1).max(12).optional(),
    delivered: z.boolean().optional(),
    distanceKm: optNum(2000),
    purchasePricePerTonneLocal: z.number().min(-1e6).max(1e6).optional(),
    handling: z.enum(HANDLING_IDS as [HandlingId, ...HandlingId[]]).optional(),
    currentDisposalCostPerTonneLocal: optNum(1e6),
    opportunityValuePerTonneLocal: optNum(1e6),
  })
  .refine((l) => (l.animal ? !l.type : !!l.type), { message: "exactly one of animal/type" });

export const inputSchema = z.object({
  countryCode: z.enum(key(COUNTRIES)),
  regionId: z.string().max(40),
  lang: z.enum(["en", "uk"]).optional(),
  businessType: z.enum(key(BUSINESS_TYPES)),
  feedstocks: z.array(lineSchema).min(1).max(16),
  energy: z.object({
    electricityKwhYear: optNum(1e10),
    electricityPriceLocalPerKwh: optNum(1000),
    gasM3Year: optNum(1e9),
    gasPriceLocalPerM3: optNum(1000),
    heatNeed: z.enum(["none", "seasonal_buildings", "year_round_process", "greenhouse"]),
    heatKwhYear: optNum(1e10),
    hasGridConnection: z.boolean(),
  }),
  site: z.object({
    landHa: optNum(1e6),
    existingStorageM3: optNum(1e7),
    gasGridKm: optNum(1000),
    neighboursWithin300m: z.boolean().optional(),
    nearProtectedOrWaterArea: z.boolean().optional(),
  }),
  finance: z.object({ debtShare: optNum(0.9) }).optional(),
  labAnalysisAvailable: z.boolean().optional(),
  assumedSupportEurPerKwh: optNum(1).optional(),
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

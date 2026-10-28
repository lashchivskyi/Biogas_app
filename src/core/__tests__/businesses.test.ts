import { describe, expect, it } from "vitest";
import { BUSINESS_GROUPS, BUSINESS_IDS, SECTOR_IDS, modelsForBusiness, BUSINESS_TYPES, businessHref } from "../businesses";
import { ANIMALS, FEEDSTOCKS } from "../feedstockData";
import { assess } from "../assess";
import { EXAMPLES } from "../examples";
import { COUNTRIES } from "@/countries";
import { BUSINESS_MARKETS, REGIONAL_BUSINESS_EVIDENCE, SECTOR_SOURCES, businessMarket } from "@/countries/business-markets";
import { SEGMENTS } from "@/content/segments";
import { getDictionary, LOCALES } from "@/i18n";
import { businessCopy } from "@/i18n/businesses";
import { initialForm } from "@/lib/form";
import { inputSchema } from "@/server/validate";

describe("canonical business contract", () => {
  it("preserves historical IDs and separates roles, size and feedstock requirements", () => {
    expect(BUSINESS_IDS).toHaveLength(30);
    expect(SECTOR_IDS).toHaveLength(27);
    expect(BUSINESS_GROUPS).toHaveLength(3);
    for (const example of EXAMPLES) expect(BUSINESS_IDS).toContain(example.input.businessType);
    expect(BUSINESS_TYPES.cattle_farm.audience).toBe("farm");
    expect(BUSINESS_TYPES.energy_offtaker.role).toBe("offtaker");
    expect(BUSINESS_TYPES.biogas_developer.role).toBe("developer");
    expect(BUSINESS_TYPES.other_industry.suggested).toEqual([]);
    for (const business of Object.values(BUSINESS_TYPES)) {
      if (SECTOR_IDS.includes(business.id)) expect(BUSINESS_GROUPS.some((g) => g.id === business.audience)).toBe(true);
      for (const line of business.suggested) {
        expect(Boolean(line.animal) !== Boolean(line.type)).toBe(true);
        expect(line.quantity).toBeGreaterThan(0);
        if (line.animal) expect(ANIMALS[line.animal]).toBeDefined();
        if (line.type) expect(FEEDSTOCKS[line.type]).toBeDefined();
      }
      // A prefilled field is not measured client data; quantities must remain blank.
      expect(initialForm(business.id, "US", "wisconsin").lines.every((line) => line.quantity === "")).toBe(true);
    }
  });

  it("does not sell or calculate AD reports for gas capture, buyers or unsupported effluent models", () => {
    const example = EXAMPLES[0].input;
    for (const id of BUSINESS_IDS.filter((key) => !modelsForBusiness(key).includes("ad"))) {
      const input = { ...example, businessType: id };
      const validation = inputSchema.safeParse(input);
      expect(validation.success).toBe(false);
      if (!validation.success) expect(validation.error.issues.some((issue) => issue.path[0] === "process")).toBe(true);
      expect(() => assess(input, COUNTRIES[input.countryCode])).toThrow("appropriate process");
    }
    expect(inputSchema.safeParse({ ...example, businessType: "food_manufacturer" }).success).toBe(true);
    for (const sample of EXAMPLES) expect(inputSchema.safeParse(sample.input).success, sample.id).toBe(true);
  });

  it("retains every published guide and supplies a real target for every business", () => {
    expect(SEGMENTS.some((s) => s.slug === "small-farms")).toBe(true);
    for (const id of BUSINESS_IDS) {
      const business = BUSINESS_TYPES[id];
      if (business.guideSlug) expect(SEGMENTS.some((s) => s.slug === business.guideSlug && s.businessType === id), id).toBe(true);
      else expect(businessHref(id, "/uk")).toBe(SECTOR_IDS.includes(id) ? `/uk/biogas#business-${id}` : `/uk/calculator?b=${id}`);
    }
  });

  it.each(LOCALES)("provides all business names, hints and evidence labels in %s", async (locale) => {
    const d = await getDictionary(locale);
    expect(Object.keys(d.labels.business).sort()).toEqual([...BUSINESS_IDS].sort());
    for (const id of BUSINESS_IDS) {
      expect(d.labels.business[id].label.trim()).toBeTruthy();
      expect(d.labels.business[id].hint.trim()).toBeTruthy();
      expect(d.labels.business[id].label).not.toMatch(/\?{2,}|�/);
    }
    for (const value of Object.values(businessCopy(locale))) expect(value.trim()).toBeTruthy();
    if (locale === "sr") {
      expect(JSON.stringify(businessCopy(locale))).not.toMatch(/[А-Яа-я]/);
      expect(JSON.stringify(d.labels.business)).not.toMatch(/[А-Яа-я]/);
    }
  });
});

describe("country and regional sector evidence", () => {
  it("explicitly covers every market and falls back honestly for every configured region", () => {
    expect(Object.keys(BUSINESS_MARKETS).sort()).toEqual(Object.keys(COUNTRIES).sort());
    for (const country of Object.values(COUNTRIES)) for (const region of country.regions) for (const business of BUSINESS_IDS) {
      const evidence = businessMarket(business, country.code, region.id);
      expect(["observed", "resource", "unverified"]).toContain(evidence.signal);
      expect(evidence.sources.length).toBeGreaterThan(0);
      if (evidence.regional) expect(REGIONAL_BUSINESS_EVIDENCE[`${country.code}:${region.id}`].businesses).toContain(business);
    }
  });

  it("never turns climate proximity, a wrong-country region or a generic industry into local demand", () => {
    expect(businessMarket("biogas_developer", "UA", "vinnytsia").regional).toBe(true);
    expect(businessMarket("palm_oil_mill", "UA", "vinnytsia")).toMatchObject({ regional: false, signal: "unverified", uncommon: true });
    expect(businessMarket("biogas_developer", "PL", "vinnytsia").regional).toBe(false);
    expect(businessMarket("biogas_developer", "IN", "punjab").regional).toBe(true);
    expect(businessMarket("poultry_farm", "IN", "punjab").signal).toBe("unverified");
    expect(businessMarket("biogas_developer", "UA", "city:12345").regional).toBe(false);
    expect(businessMarket("pig_farm", "VN", "red-river").regional).toBe(true);
    expect(businessMarket("cattle_farm", "KZ", "north").signal).toBe("resource");
  });

  it("uses existing region IDs, valid sectors and dated or explicitly undated primary sources", () => {
    for (const [key, row] of Object.entries(REGIONAL_BUSINESS_EVIDENCE)) {
      const [country, region] = key.split(":");
      expect(COUNTRIES[country].regions.some((r) => r.id === region), key).toBe(true);
      expect(row.sources.length).toBeGreaterThan(0);
      for (const id of row.businesses) expect(BUSINESS_IDS).toContain(id);
      for (const source of row.sources) expect(SECTOR_SOURCES[source]).toBeDefined();
    }
    for (const row of Object.values(BUSINESS_MARKETS)) {
      expect(new Set([...row.observed, ...row.resource]).size).toBe(row.observed.length + row.resource.length);
      for (const id of [...row.observed, ...row.resource]) expect(BUSINESS_IDS).toContain(id);
    }
    for (const source of Object.values(SECTOR_SOURCES)) {
      expect(new URL(source.url).protocol).toBe("https:");
      expect(source.period).toMatch(/^(?:\d{4}(?:-\d{2}(?:-\d{2})?)?(?:–\d{4})?|—)$/);
    }
    // A recent review never rewrites the observation period of a historical reference.
    expect(businessMarket("palm_oil_mill", "TH", "south").sources[0].period).toBe("2005–2018");
    expect(SECTOR_SOURCES.us.period).toBe("2024");
    expect(SECTOR_SOURCES.eurostat.period).toBe("2023");
  });
});

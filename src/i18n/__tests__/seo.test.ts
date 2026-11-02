import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { HREFLANG, LOCALES } from "../config";
import { alternates } from "../seo";

describe("hreflang", () => {
  it("uses language codes so one page serves every country that speaks it", () => {
    expect(new Set(Object.values(HREFLANG)).size).toBe(LOCALES.length);
    for (const code of Object.values(HREFLANG)) expect(code).toMatch(/^[a-z]{2}(-Latn)?$/);
  });

  it("lists the same reciprocal set with x-default in the page head and in the sitemap", () => {
    const entries = sitemap();
    for (const l of LOCALES) {
      const head = alternates(l, "/pricing")!.languages as Record<string, string>;
      const entry = entries.find((e) => e.url.endsWith(`/${l}/pricing`))!;
      const map = entry.alternates!.languages as Record<string, string>;
      expect(Object.keys(map).sort()).toEqual(Object.keys(head).sort());
      expect(map["x-default"]).toMatch(/\/en\/pricing$/);
      expect(map[HREFLANG[l]]).toBe(entry.url);
    }
    const guide = entries.find((e) => e.url.endsWith("/uk/biogas"))!;
    expect(Object.keys(guide.alternates!.languages!).sort()).toEqual([...Object.values(HREFLANG), "x-default"].sort());
    expect(entries.length).toBeLessThan(50_000);
  });
});

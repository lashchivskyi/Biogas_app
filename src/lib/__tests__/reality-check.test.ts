import { describe, expect, it } from "vitest";
import { BMP3_TYPES } from "../../../scripts/accuracy-references";
import { EXAMPLES } from "@/core/examples";
import { FNR_TYPES, realityCheck } from "../reality-check";

const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!.input;

describe("reality check quoted in the report", () => {
  it("lists exactly the feedstocks the FNR plants were fed", () => {
    expect([...FNR_TYPES].sort()).toEqual([...new Set(Object.values(BMP3_TYPES).filter(Boolean))].sort());
  });

  it("quotes the reference set that matches how the project is entered", () => {
    const herd = { ...ex("dk_cluster"), feedstocks: [{ id: "a", animal: "dairy_cow" as const, quantity: 500 }] };
    expect(realityCheck(herd).copy).toBe("field");
    expect(realityCheck({ ...herd, feedstocks: [{ id: "a", type: "maize_silage", quantity: 9000 }, { id: "b", type: "dairy_slurry", quantity: 9000 }] }).copy).toBe("fieldDe");
    // Food waste, wastewater and existing gas have no plant-level data: never a borrowed farm range.
    expect(realityCheck(ex("dk_cluster")).copy).toBe("fieldNone");
    expect(realityCheck(ex("ca_brewery_cod")).copy).toBe("fieldNone");
    expect(realityCheck(ex("de_existing_biogas")).copy).toBe("fieldNone");
    const lf = EXAMPLES.find((e) => e.input.process?.kind === "landfill")!.input;
    const r = realityCheck(lf);
    expect(r.copy).toBe("fieldLandfill");
    if (r.copy !== "fieldNone") expect(r.lo).toBeLessThan(r.hi);
  });
});

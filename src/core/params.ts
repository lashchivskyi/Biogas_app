import type { Confidence, DataKind, EvidenceOrigin, ParameterEvidence, ParameterRange, Provenance } from "./types";

/**
 * Parameter bag: single source of truth for every number the model uses.
 * Records which ids were read so a result can list the assumptions behind it.
 */
export class Params {
  private readonly map: Record<string, Provenance>;
  private readonly used = new Set<string>();

  constructor(map: Record<string, Provenance>) {
    this.map = map;
  }

  get(id: string): number {
    const p = this.map[id];
    if (!p) throw new Error(`Unknown parameter: ${id}`);
    this.used.add(id);
    return p.value;
  }

  has(id: string): boolean {
    return id in this.map;
  }

  prov(id: string): Provenance {
    const p = this.map[id];
    if (!p) throw new Error(`Unknown parameter: ${id}`);
    return p;
  }

  usedIds(): string[] {
    return [...this.used].sort();
  }

  all(): Provenance[] {
    return Object.values(this.map);
  }

  /** New bag sharing the table but with an independent usage log. */
  fork(): Params {
    return new Params(this.map);
  }

  /** New bag with some numeric values replaced (used for what-if runs). */
  with(overrides: Record<string, number>): Params {
    const next: Record<string, Provenance> = { ...this.map };
    for (const [id, value] of Object.entries(overrides)) {
      const p = next[id];
      if (!p) throw new Error(`Unknown parameter: ${id}`);
      next[id] = { ...p, value };
    }
    return new Params(next);
  }
}

export function prov(
  id: string,
  label: string,
  value: number,
  unit: string,
  kind: DataKind,
  source: string,
  confidence: Confidence,
  opts: { country?: string; date?: string; note?: string; evidence?: ParameterEvidence; range?: ParameterRange; origin?: EvidenceOrigin } = {},
): Provenance {
  return {
    id,
    label,
    value,
    unit,
    kind,
    source,
    confidence,
    country: opts.country ?? "GLOBAL",
    date: opts.date ?? "2026-10-23",
    note: opts.note,
    evidence: opts.evidence,
    range: opts.range,
    origin: opts.origin ?? (kind === "CALCULATION" ? "CALCULATED_VALUE" : kind === "ASSUMPTION" || kind === "ESTIMATE" ? "ENGINEERING_ASSUMPTION" : opts.country && opts.country !== "GLOBAL" ? "MARKET_DATA" : undefined),
  };
}

export function toMap(list: Provenance[]): Record<string, Provenance> {
  const out: Record<string, Provenance> = {};
  for (const p of list) {
    if (out[p.id]) throw new Error(`Duplicate parameter id: ${p.id}`);
    out[p.id] = p;
  }
  return out;
}

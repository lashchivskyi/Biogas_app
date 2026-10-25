import { randomBytes } from "node:crypto";
import type { ProjectInput, VerdictId, Confidence } from "@/core";
import { dataFile, exclusive, readJsonArray, writeJsonArray } from "./jsonFile";

/**
 * Lead storage. MVP: one JSON file (data/leads.json) behind a repository interface.
 * Swap `fileRepository` for a Postgres implementation without touching callers (see docs/architecture.md).
 */
export type LeadStatus = "new" | "contacted" | "qualified" | "study_sold" | "lost";

export interface Lead {
  id: string;
  createdAt: string;
  status: LeadStatus;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  message?: string;
  input: ProjectInput;
  verdict: VerdictId;
  confidence: Confidence;
  route: string;
  summary: { tonnesYear: number; kwEl: number; capexEur: number; paybackYears: number | null; npvEur: number };
  notes: string;
}

export interface LeadRepository {
  list(): Promise<Lead[]>;
  get(id: string): Promise<Lead | null>;
  add(l: Omit<Lead, "id" | "createdAt" | "status" | "notes">): Promise<Lead>;
  update(id: string, patch: Partial<Pick<Lead, "status" | "notes">>): Promise<Lead | null>;
}

const FILE = dataFile("LEADS_FILE", "leads.json");

export const fileRepository: LeadRepository = {
  async list() {
    const all = await readJsonArray<Lead>(FILE);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(id) {
    return (await readJsonArray<Lead>(FILE)).find((l) => l.id === id) ?? null;
  },
  add(l) {
    return exclusive(FILE, async () => {
      const all = await readJsonArray<Lead>(FILE);
      const lead: Lead = { ...l, id: randomBytes(9).toString("base64url"), createdAt: new Date().toISOString(), status: "new", notes: "" };
      all.push(lead);
      await writeJsonArray(FILE, all);
      return lead;
    });
  },
  update(id, patch) {
    return exclusive(FILE, async () => {
      const all = await readJsonArray<Lead>(FILE);
      const i = all.findIndex((l) => l.id === id);
      if (i < 0) return null;
      all[i] = { ...all[i], ...patch };
      await writeJsonArray(FILE, all);
      return all[i];
    });
  },
};

export const leads: LeadRepository = fileRepository;

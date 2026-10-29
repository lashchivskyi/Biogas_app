import { randomBytes } from "node:crypto";
import type { ProjectInput, VerdictId, Confidence } from "@/core";
import { database, type Database } from "./db";
import { dataFile, exclusive, readJsonArray, writeJsonArray } from "./jsonFile";

/**
 * Lead storage behind a repository interface: Postgres when DATABASE_URL is set, otherwise one JSON
 * file (data/leads.json) for local development.
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

type Row = { record: Lead };

export function postgresLeads(db: Database): LeadRepository {
  return {
    async list() {
      return (await db.query<Row>("SELECT record FROM leads ORDER BY created_at DESC")).rows.map((r) => r.record);
    },
    async get(id) {
      return (await db.query<Row>("SELECT record FROM leads WHERE id = $1", [id])).rows[0]?.record ?? null;
    },
    async add(l) {
      const lead: Lead = { ...l, id: randomBytes(9).toString("base64url"), createdAt: new Date().toISOString(), status: "new", notes: "" };
      await db.query("INSERT INTO leads (id, created_at, record) VALUES ($1, $2, $3::jsonb)", [lead.id, lead.createdAt, JSON.stringify(lead)]);
      return lead;
    },
    update(id, patch) {
      return db.transaction(async (tx) => {
        const cur = (await tx.query<Row>("SELECT record FROM leads WHERE id = $1 FOR UPDATE", [id])).rows[0]?.record;
        if (!cur) return null;
        const next = { ...cur, ...patch };
        await tx.query("UPDATE leads SET record = $2::jsonb WHERE id = $1", [id, JSON.stringify(next)]);
        return next;
      });
    },
  };
}

async function repo(): Promise<LeadRepository> {
  const db = database();
  return db ? postgresLeads(await db) : fileRepository;
}

export const leads: LeadRepository = {
  list: async () => (await repo()).list(),
  get: async (id) => (await repo()).get(id),
  add: async (l) => (await repo()).add(l),
  update: async (id, patch) => (await repo()).update(id, patch),
};

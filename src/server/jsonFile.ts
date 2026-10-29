import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Tiny JSON-file persistence for the MVP (single instance). Writes are atomic (tmp + rename) and
 * serialised per file, so concurrent requests cannot lose updates. Replace with Postgres behind
 * the same repository interfaces for multi-instance production.
 */
const chains = new Map<string, Promise<unknown>>();

export function dataFile(envVar: string, name: string): string {
  return process.env[envVar] ?? path.join(process.cwd(), "data", name);
}

export async function readJsonArray<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

export async function writeJsonArray<T>(file: string, rows: T[]): Promise<void> {
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(rows, null, 2), "utf8");
  await fs.rename(/*turbopackIgnore: true*/ tmp, file);
}

export function exclusive<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(file) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  chains.set(file, run.catch(() => undefined));
  return run;
}

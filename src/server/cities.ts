import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { COUNTRIES } from "@/countries";
import { validCity, type CityClimate } from "@/core/location";

export type CityResult = { id: number; name: string; admin1: string; countryCode: string; latitude: number; longitude: number };
export class CityServiceError extends Error {
  constructor(readonly code: "unavailable" | "not_found" | "wrong_country", readonly status = 503) { super(code); }
}

function secret(): string {
  const configured = process.env.LOCATION_SIGNING_SECRET || process.env.CHECKOUT_QUOTE_SECRET || process.env.STRIPE_SECRET_KEY;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new CityServiceError("unavailable");
  const scope = globalThis as typeof globalThis & { __mxLocationSecret?: string };
  return scope.__mxLocationSecret ??= randomBytes(32).toString("hex");
}
function payload(c: Omit<CityClimate, "signature">): string {
  const fields: unknown[] = [c.id, c.countryCode, c.name, c.admin1, c.latitude, c.longitude, c.gridLatitude, c.gridLongitude,
    c.elevationM, c.monthlyTempC, c.startDate, c.endDate, c.fetchedOn];
  // Keep the original payload for previously saved/purchased snapshots.
  if (c.dataset !== undefined) fields.push(c.dataset);
  return JSON.stringify(fields);
}
export function signCity(c: Omit<CityClimate, "signature">): CityClimate {
  return { ...c, signature: createHmac("sha256", secret()).update(payload(c)).digest("hex") };
}
export function verifyCity(c: unknown, country: string): c is CityClimate {
  if (!validCity(c, country)) return false;
  try {
    const expected = Buffer.from(signCity(c).signature, "hex");
    return timingSafeEqual(expected, Buffer.from(c.signature, "hex"));
  } catch { return false; }
}

type Names = { name: string; names: Record<string, string> };
type Place = Omit<CityResult, "admin1"> & Names & { admin: string; elevation: number; population: number; search: string[] };
type Manifest = {
  schema: number; dataset: "era5-planette-0.25"; startDate: string; endDate: string; fetchedOn: string;
  sha256: Record<string, string>; citiesByCountry: Record<string, number>;
  grid: { latStart: number; latStep: number; latCount: number; lonStart: number; lonStep: number; lonCount: number; months: number; bytes: number };
};
type Database = { cities: Place[]; admins: Record<string, Names> };
const directory = join(process.cwd(), "src/server/data");
let manifestPromise: Promise<Manifest> | undefined;
let databasePromise: Promise<Database> | undefined;
let gridPromise: Promise<Buffer> | undefined;
// Lazy per-process caches. Failed reads can be retried; no network dependency at runtime.
function manifest(): Promise<Manifest> {
  return manifestPromise ??= readFile(join(directory, "locations.json"), "utf8").then((raw) => {
    const m = JSON.parse(raw) as Manifest;
    if (m.schema !== 1 || m.dataset !== "era5-planette-0.25" || m.grid.months !== 12 || m.grid.bytes !== m.grid.latCount * m.grid.lonCount * 24) throw new Error("Invalid location manifest");
    return m;
  }).catch(() => { manifestPromise = undefined; throw new CityServiceError("unavailable"); });
}
async function asset(name: string): Promise<Buffer> {
  const [m, compressed] = await Promise.all([manifest(), readFile(join(directory, name))]);
  if (createHash("sha256").update(compressed).digest("hex") !== m.sha256[name]) throw new Error("Location asset checksum mismatch");
  return gunzipSync(compressed);
}
function database(): Promise<Database> {
  return databasePromise ??= asset("cities.json.gz").then(async (raw) => {
    const data = JSON.parse(raw.toString("utf8")) as Database;
    if (data.cities.length !== Object.values((await manifest()).citiesByCountry).reduce((sum, n) => sum + n, 0)) throw new Error("Invalid city count");
    return data;
  }).catch(() => { databasePromise = undefined; throw new CityServiceError("unavailable"); });
}
function grid(): Promise<Buffer> {
  return gridPromise ??= asset("era5-temperature.bin.gz").then(async (raw) => {
    if (raw.byteLength !== (await manifest()).grid.bytes) throw new Error("Invalid climate grid size");
    return raw;
  }).catch(() => { gridPromise = undefined; throw new CityServiceError("unavailable"); });
}
function normalize(value: string): string {
  return value.toLowerCase().replace(/[łøđßı]/g, (c) => ({ ł: "l", ø: "o", đ: "d", ß: "ss", ı: "i" })[c]!)
    .normalize("NFKD").replace(/\p{M}/gu, "");
}
function localized(place: Names, lang: string): string {
  return (lang === "sr" ? place.names["sr-Latn"] : lang === "pt" ? place.names["pt-BR"] : undefined) ?? place.names[lang] ?? place.name;
}
function result(p: Place, admins: Database["admins"], lang: string): CityResult {
  const name = localized(p, lang);
  const admin1 = admins[p.admin] ? localized(admins[p.admin], lang) : "";
  return { id: p.id, name, admin1: admin1 === name ? "" : admin1, countryCode: p.countryCode, latitude: p.latitude, longitude: p.longitude };
}
function checkCountry(country: string) {
  if (!Object.hasOwn(COUNTRIES, country)) throw new CityServiceError("wrong_country", 400);
}
export async function searchCities(query: string, country: string, lang: string): Promise<CityResult[]> {
  checkCountry(country);
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const { cities, admins } = await database();
  return cities.filter((p) => p.countryCode === country).map((p) => {
    const preferred = normalize(localized(p, lang));
    const rank = preferred === q ? 0 : p.search.includes(q) ? 1 : preferred.startsWith(q) ? 2
      : p.search.some((n) => n.startsWith(q) || n.includes(` ${q}`)) ? 3 : 4;
    return { p, rank };
  }).filter(({ rank }) => rank < 4).sort((a, b) => a.rank - b.rank || b.p.population - a.p.population || a.p.id - b.p.id)
    .slice(0, 10).map(({ p }) => result(p, admins, lang));
}
export async function cityClimate(id: number, country: string, lang: string): Promise<CityClimate> {
  checkCountry(country);
  secret();
  const [{ cities, admins }, m, temperatures] = await Promise.all([database(), manifest(), grid()]);
  const p = cities.find((c) => c.id === id);
  if (!p) throw new CityServiceError("not_found", 404);
  if (p.countryCode !== country) throw new CityServiceError("wrong_country", 400);
  const g = m.grid;
  const latIndex = Math.max(0, Math.min(g.latCount - 1, Math.round((p.latitude - g.latStart) / g.latStep)));
  const rawLon = Math.round((p.longitude - g.lonStart) / g.lonStep);
  const lonIndex = ((rawLon % g.lonCount) + g.lonCount) % g.lonCount;
  const offset = (latIndex * g.lonCount + lonIndex) * 24;
  const city = signCity({ ...result(p, admins, lang), gridLatitude: g.latStart + latIndex * g.latStep,
    gridLongitude: g.lonStart + lonIndex * g.lonStep, elevationM: p.elevation,
    monthlyTempC: Array.from({ length: 12 }, (_, i) => temperatures.readInt16LE(offset + i * 2) / 10),
    startDate: m.startDate, endDate: m.endDate, fetchedOn: m.fetchedOn, dataset: m.dataset });
  if (!validCity(city, country)) throw new CityServiceError("unavailable");
  return city;
}

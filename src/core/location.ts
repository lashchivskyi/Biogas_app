import type { CountryAdapter, Region } from "./country";

/** Immutable, server-signed climate observation; retained with the project and purchased report. */
export interface CityClimate {
  id: number;
  countryCode: string;
  name: string;
  admin1: string;
  latitude: number;
  longitude: number;
  gridLatitude: number;
  gridLongitude: number;
  elevationM: number;
  monthlyTempC: number[];
  startDate: string;
  endDate: string;
  fetchedOn: string;
  /** Absent on legacy Open-Meteo snapshots, whose signatures and attribution remain valid. */
  dataset?: "era5-planette-0.25";
  signature: string;
}

export const cityRegionId = (city: Pick<CityClimate, "id">) => `city:${city.id}`;
export const CITY_SOURCE = "Copernicus/ECMWF ERA5 via Open-Meteo; monthly means calculated from daily mean 2 m temperature";
export const citySource = (city: Pick<CityClimate, "dataset">) => city.dataset === "era5-planette-0.25"
  ? "Copernicus/ECMWF ERA5 via NSF NCAR / Planette; day-weighted monthly mean 2 m temperature; nearest 0.25 degree grid cell; no elevation downscaling"
  : CITY_SOURCE;

/** Structural validation also runs in the browser; the server separately verifies the signature. */
export function validCity(city: unknown, countryCode: string): city is CityClimate {
  if (!city || typeof city !== "object") return false;
  const c = city as CityClimate;
  return (c.dataset === undefined || c.dataset === "era5-planette-0.25") && Number.isSafeInteger(c.id) && c.id > 0 && c.countryCode === countryCode &&
    typeof c.name === "string" && c.name.length > 0 && c.name.length <= 160 &&
    typeof c.admin1 === "string" && c.admin1.length <= 160 &&
    [c.latitude, c.gridLatitude].every((n) => Number.isFinite(n) && Math.abs(n) <= 90) &&
    [c.longitude, c.gridLongitude].every((n) => Number.isFinite(n) && Math.abs(n) <= 180) &&
    Number.isFinite(c.elevationM) && Array.isArray(c.monthlyTempC) && c.monthlyTempC.length === 12 &&
    c.monthlyTempC.every((t) => Number.isFinite(t) && t >= -70 && t <= 55) &&
    [c.startDate, c.endDate, c.fetchedOn].every((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d))) &&
    typeof c.signature === "string" && /^[a-f0-9]{64}$/.test(c.signature);
}

export function projectRegion(input: { countryCode: string; regionId: string; city?: CityClimate }, country: CountryAdapter): Region {
  if (input.city) {
    const city = input.city;
    if (!validCity(city, country.code) || input.regionId !== cityRegionId(city)) throw new Error("Invalid project city or country");
    return { id: input.regionId, name: [city.name, city.admin1].filter(Boolean).join(", "), monthlyTempC: city.monthlyTempC,
      altitudeM: city.elevationM, tempSource: `${citySource(city)}; ${city.startDate}–${city.endDate}; fetched ${city.fetchedOn}` };
  }
  const region = country.regions.find((r) => r.id === input.regionId);
  if (!region) throw new Error(`Region ${input.regionId} does not belong to ${country.code}`);
  return region;
}

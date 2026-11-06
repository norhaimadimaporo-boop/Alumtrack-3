/**
 * Browser-side access to the static location files in `public/geo/` (built by
 * `npm run db:geo`). Country files are fetched on demand and cached.
 */

export type GeoCountry = { code: string; name: string };

export type GeoCity = { name: string; lat: number; lng: number };

export type GeoState = { code: string; name: string; lat: number; lng: number; cities: GeoCity[] };

export type GeoCountryData = {
  code: string;
  name: string;
  states: GeoState[];
  cities: GeoCity[];
};

type RawCity = [string, number, number];
type RawCountry = {
  code: string;
  name: string;
  states: Array<{ code: string; name: string; lat: number; lng: number; cities: RawCity[] }>;
  cities: RawCity[];
};

const toCity = ([name, lat, lng]: RawCity): GeoCity => ({ name, lat, lng });

let countriesCache: Promise<GeoCountry[]> | null = null;
const countryCache = new Map<string, Promise<GeoCountryData>>();

export function loadGeoCountries(): Promise<GeoCountry[]> {
  countriesCache ??= fetch("/geo/countries.json")
    .then((response) => {
      if (!response.ok) throw new Error("Countries could not be loaded.");
      return response.json() as Promise<GeoCountry[]>;
    })
    .catch((error) => {
      countriesCache = null;
      throw error;
    });
  return countriesCache;
}

export function loadGeoCountry(code: string): Promise<GeoCountryData> {
  const key = code.toUpperCase();
  let cached = countryCache.get(key);
  if (!cached) {
    cached = fetch(`/geo/${key}.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Locations could not be loaded.");
        return response.json() as Promise<RawCountry>;
      })
      .then((raw) => ({
        code: raw.code,
        name: raw.name,
        cities: raw.cities.map(toCity),
        states: raw.states.map((state) => ({
          code: state.code,
          name: state.name,
          lat: state.lat,
          lng: state.lng,
          cities: state.cities.map(toCity),
        })),
      }))
      .catch((error) => {
        countryCache.delete(key);
        throw error;
      });
    countryCache.set(key, cached);
  }
  return cached;
}

/** Case- and accent-insensitive comparison used by the search boxes. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findCountryByName(countries: GeoCountry[], name: string): GeoCountry | undefined {
  const target = normalizeForSearch(name);
  return target ? countries.find((country) => normalizeForSearch(country.name) === target) : undefined;
}

export function findStateByName(data: GeoCountryData, name: string): GeoState | undefined {
  const target = normalizeForSearch(name);
  return target ? data.states.find((state) => normalizeForSearch(state.name) === target) : undefined;
}

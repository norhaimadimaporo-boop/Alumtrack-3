/**
 * Builds the static location data used by the address dropdowns.
 *
 * Reads the open countries/states/cities dataset from
 * `@countrystatecity/countries` (ODbL, see public/geo/ATTRIBUTION.txt) and writes
 * one compact file per country into `public/geo/`:
 *
 *   public/geo/countries.json  → [{ code, name }]
 *   public/geo/<ISO2>.json     → { states: [{ code, name, lat, lng, cities }], cities }
 *
 * Cities are stored as [name, lat, lng] tuples to keep the files small. The
 * browser downloads a country file only when that country is selected.
 *
 * Usage: npm run db:geo
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(root, "node_modules/@countrystatecity/countries/dist/data");
const outDir = resolve(root, "public/geo");

if (!existsSync(dataDir)) {
  throw new Error("Dataset not found. Run `npm install` first.");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function coord(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100000) / 100000 : null;
}

/** "City of Marawi" → "Marawi City", the form Filipino addresses use. */
function displayCityName(name) {
  const trimmed = String(name).trim();
  const match = /^City of (.+)$/i.exec(trimmed);
  return match ? `${match[1]} City` : trimmed;
}

function cityTuple(city) {
  const lat = coord(city.latitude);
  const lng = coord(city.longitude);
  if (lat === null || lng === null || !city.name) return null;
  return [displayCityName(city.name), lat, lng];
}

/** Keeps the first entry for each (case-insensitive) city name. */
function uniqueCities(list) {
  const seen = new Set();
  const out = [];
  for (const city of list) {
    if (!city) continue;
    const key = city[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(city);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

mkdirSync(outDir, { recursive: true });

const countries = readJson(join(dataDir, "countries.json"));
const countryIndex = [];
let totalBytes = 0;
let totalCities = 0;

for (const folder of readdirSync(dataDir)) {
  const countryDir = join(dataDir, folder);
  if (!statSync(countryDir).isDirectory()) continue;

  const dash = folder.lastIndexOf("-");
  const iso2 = folder.slice(dash + 1);
  const meta = countries.find((entry) => entry.iso2 === iso2);
  if (!meta) continue;

  const statesPath = join(countryDir, "states.json");
  const states = existsSync(statesPath) ? readJson(statesPath) : [];

  const stateCityLists = new Map();
  for (const entry of readdirSync(countryDir)) {
    const subDir = join(countryDir, entry);
    if (!statSync(subDir).isDirectory()) continue;
    const citiesPath = join(subDir, "cities.json");
    if (!existsSync(citiesPath)) continue;
    const stateCode = entry.slice(entry.lastIndexOf("-") + 1);
    stateCityLists.set(stateCode, readJson(citiesPath).map(cityTuple));
  }

  const countryCities = [];
  const rootCitiesPath = join(countryDir, "cities.json");
  if (existsSync(rootCitiesPath)) {
    countryCities.push(...readJson(rootCitiesPath).map(cityTuple));
  }

  const stateEntries = states
    .map((state) => {
      const lat = coord(state.latitude);
      const lng = coord(state.longitude);
      const code = String(state.iso2 ?? "");
      const name = String(state.name ?? "").trim();
      if (!name || lat === null || lng === null) return null;

      const cities = uniqueCities(stateCityLists.get(code) ?? []);
      // Federal / autonomous cities (e.g. Moscow, Saint Petersburg) list their
      // districts; add the city itself so it can be picked by name.
      if (/city/i.test(String(state.type ?? "")) && !cities.some((c) => c[0] === name)) {
        cities.unshift([name, lat, lng]);
      }
      totalCities += cities.length;
      return { code, name, lat, lng, cities };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    code: iso2,
    name: meta.name,
    states: stateEntries,
    cities: uniqueCities(countryCities),
  };
  totalCities += payload.cities.length;

  const json = JSON.stringify(payload);
  writeFileSync(join(outDir, `${iso2}.json`), json);
  totalBytes += Buffer.byteLength(json);
  countryIndex.push({ code: iso2, name: meta.name });
}

countryIndex.sort((a, b) => a.name.localeCompare(b.name));
const indexJson = JSON.stringify(countryIndex);
writeFileSync(join(outDir, "countries.json"), indexJson);
totalBytes += Buffer.byteLength(indexJson);

writeFileSync(
  join(outDir, "ATTRIBUTION.txt"),
  [
    "Location data (countries, states/provinces, cities) is derived from the",
    "@countrystatecity/countries dataset, licensed under the Open Database License (ODbL) 1.0.",
    "Regenerate with: npm run db:geo",
    "",
  ].join("\n"),
);

console.log(
  `Wrote ${countryIndex.length} countries, ${totalCities} cities, ${(totalBytes / 1024 / 1024).toFixed(2)} MB to public/geo/`,
);

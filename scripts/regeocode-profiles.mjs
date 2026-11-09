/**
 * Batch re-geocoding with STRICT present-address-only logic:
 * geolocation comes ONLY from the PRESENT address fields
 * (Country + Province/State + City/Municipality + Subdivision ONLY for the
 * Philippines). Educational Region (BARMM etc.), Home Address, and workplace
 * are never used. Overseas present countries (Russia, USA, Saudi Arabia, ...)
 * never fall back to the Philippine centroid — unknown cities resolve to
 * that country's own centroid. Writes latitude/longitude + city/country
 * only; `current_region` (educational region) is left untouched.
 *
 * Usage: npm run db:regeocode
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

import { normalizeLegacyPresent, resolvePresentAddress } from "../src/lib/geo.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  console.warn("No .env file found. Falling back to DB_* environment variables.");
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "alumtrack",
  ssl: process.env.DB_SSL === "true" || process.env.DB_SSL === "1"
    ? { rejectUnauthorized: false }
    : undefined,
});

/** Coordinates stored by older imports when nothing matched. */
const PH_CENTROID = { lat: 12.8797, lng: 121.774 };

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function lastName(first, middle, last) {
  return [first, middle, last].filter(Boolean).join(" ").trim();
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Legacy CSV layout stores street=city and city=country for overseas rows. */
function normalizePresent(profile) {
  return normalizeLegacyPresent({
    country: clean(profile.address_country) || clean(profile.current_country),
    city: clean(profile.address_city) || clean(profile.current_city),
    province: clean(profile.address_province),
    subdivision: clean(profile.address_subdivision),
    street: clean(profile.address_street),
  });
}

function isPhilippineCoords(lat, lng) {
  return lat >= 4 && lat <= 22 && lng >= 116 && lng <= 127.5;
}
function isPhFallbackCoords(lat, lng) {
  return Math.abs(lat - PH_CENTROID.lat) < 0.5 && Math.abs(lng - PH_CENTROID.lng) < 0.5;
}

const [profiles] = await connection.query(
  `SELECT p.id, p.user_id, p.first_name, p.middle_name, p.last_name,
          p.current_city, p.current_region, p.current_country,
          p.latitude, p.longitude,
          cur.street AS address_street,
          cur.subdivision AS address_subdivision,
          cur.city AS address_city,
          cur.province AS address_province,
          cur.country AS address_country,
          cur.zip_code AS address_zip
     FROM alumni_profiles p
LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
 ORDER BY p.id`,
);

let updated = 0;
let unchanged = 0;
let unmatched = 0;

for (const profile of profiles) {
  const storedLat = toNumber(profile.latitude);
  const storedLng = toNumber(profile.longitude);
  const storedCountry = clean(profile.current_country);
  const storedCity = clean(profile.current_city);
  const present = normalizePresent(profile);

  const location = resolvePresentAddress(present);

  if (!location) {
    unmatched += 1;
    console.log(
      `- skip  ${lastName(profile.first_name, profile.middle_name, profile.last_name)} (no present-address match: country="${present.country}" city="${present.city}")`,
    );
    continue;
  }

  // The resolved country/city always reflect the present address.
  const countryChanged = storedCountry.toLowerCase() !== location.country.toLowerCase();
  const cityChanged = storedCity.toLowerCase() !== location.city.toLowerCase();
  // Keep trusted stored (dropdown) coordinates when the gazetteer only has a
  // country centroid (unmatched): they are more precise, unless they are
  // clearly a Philippine fallback for an overseas present address.
  const storedIsPhFallback =
    storedLat !== null &&
    storedLng !== null &&
    (isPhFallbackCoords(storedLat, storedLng) || isPhilippineCoords(storedLat, storedLng)) &&
    present.country.trim().toLowerCase() !== "philippines";
  const useStoredCoords =
    !location.matched &&
    storedLat !== null &&
    storedLng !== null &&
    !storedIsPhFallback;
  const targetLat = useStoredCoords ? storedLat : location.lat;
  const targetLng = useStoredCoords ? storedLng : location.lng;
  const coordinatesChanged =
    storedLat === null ||
    storedLng === null ||
    Math.abs(storedLat - targetLat) > 0.05 ||
    Math.abs(storedLng - targetLng) > 0.05;

  if (!countryChanged && !cityChanged && !coordinatesChanged) {
    unchanged += 1;
    continue;
  }

  await connection.execute(
    `UPDATE alumni_profiles
        SET current_city = ?,
            current_country = ?,
            latitude = ?,
            longitude = ?
      WHERE id = ?`,
    [location.city, location.country, targetLat, targetLng, profile.id],
  );

  updated += 1;

  const previous =
    storedLat === null || storedLng === null
      ? "no coordinates"
      : `${storedLat.toFixed(4)}, ${storedLng.toFixed(4)}`;

  console.log(
    `- update ${lastName(profile.first_name, profile.middle_name, profile.last_name)}: ` +
      `${previous} → ${targetLat.toFixed(4)}, ${targetLng.toFixed(4)} ` +
      `(${location.city}, ${location.country})`,
  );
}

const [remaining] = await connection.query(
  `SELECT first_name, middle_name, last_name, latitude, longitude
     FROM alumni_profiles
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
);

const fallbackRows = remaining.filter((profile) => {
  const lat = toNumber(profile.latitude);
  const lng = toNumber(profile.longitude);
  return (
    lat !== null &&
    lng !== null &&
    Math.abs(lat - PH_CENTROID.lat) < 0.01 &&
    Math.abs(lng - PH_CENTROID.lng) < 0.01
  );
});

if (fallbackRows.length > 0) {
  console.log(`\n${fallbackRows.length} profile(s) still sit on the Philippine centroid:`);
  for (const profile of fallbackRows) {
    console.log(`  · ${lastName(profile.first_name, profile.middle_name, profile.last_name)}`);
  }
}

console.log(
  `\nRe-geocoded ${updated} profile(s); ${unchanged} already correct; ${unmatched} unmatched.`,
);

await connection.end();

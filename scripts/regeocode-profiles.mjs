/**
 * Re-runs the offline gazetteer against every alumni profile so overseas
 * addresses that used to fall back to the Philippine centroid (for example
 * "Shanghai") are corrected to their real city coordinates.
 *
 * Only rows whose stored country or coordinates disagree with the resolved
 * location are touched, so running it twice is safe.
 *
 * Usage: npm run db:regeocode
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

import { resolveLocation } from "../src/lib/geo.ts";

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

const [profiles] = await connection.query(
  `SELECT p.id, p.user_id, p.first_name, p.middle_name, p.last_name,
          p.current_city, p.current_country, p.current_region,
          p.latitude, p.longitude,
          cur.street AS address_street,
          cur.city AS address_city, cur.province AS address_province,
          cur.zip_code AS address_zip
     FROM alumni_profiles p
LEFT JOIN alumni_addresses cur ON cur.user_id = p.user_id AND cur.kind = 'current'
 ORDER BY p.id`,
);

/** Drops blank placeholders ("none", "n/a") so they never pollute the lookup. */
function cleanParts(...values) {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value && !/^(none|n\/a|na|-)$/i.test(value));
}

function joinParts(values) {
  return values.length > 0 ? values.join(", ") : null;
}

let updated = 0;
let unchanged = 0;
let unmatched = 0;

for (const profile of profiles) {
  const storedLat = toNumber(profile.latitude);
  const storedLng = toNumber(profile.longitude);
  const storedCountry = profile.current_country?.trim() || "";
  const currentCity = profile.current_city?.trim() || "";
  const currentRegion = profile.current_region?.trim() || "";

  // The current address row stores the city in `street` and the country in
  // `city` for overseas alumni ("Madinah" + "Kingdom of Saudi Arabia"), so the
  // address is a stronger signal than a `current_city` that may still point at
  // the home town.
  const addressText = joinParts(
    cleanParts(
      profile.address_street,
      profile.address_city,
      profile.address_province,
      profile.address_zip,
    ),
  );
  const profileText = joinParts(
    cleanParts(currentCity, currentRegion, storedCountry, profile.address_zip),
  );

  const addressLocation = addressText ? resolveLocation(addressText, null) : null;
  const profileLocation = profileText ? resolveLocation(profileText, null) : null;

  // Prefer the address when it disagrees with the profile (for example Fatima
  // Zahra Lucman's profile still said Marawi while her address says Madinah).
  const addressDiffers =
    addressLocation?.matched &&
    (addressLocation.country.toLowerCase() !== storedCountry.toLowerCase() ||
      addressLocation.city.toLowerCase() !== currentCity.toLowerCase());

  const location = addressDiffers
    ? addressLocation
    : profileLocation?.matched
      ? profileLocation
      : addressLocation?.matched
        ? addressLocation
        : null;

  if (!location) {
    unmatched += 1;
    console.log(
      `- skip  ${lastName(profile.first_name, profile.middle_name, profile.last_name)} (no gazetteer match)`,
    );
    continue;
  }

  const countryChanged = storedCountry.toLowerCase() !== location.country.toLowerCase();
  const cityChanged = currentCity.toLowerCase() !== location.city.toLowerCase();
  const regionChanged =
    Boolean(location.region) && currentRegion.toLowerCase() !== location.region.toLowerCase();
  const coordinatesChanged =
    storedLat === null ||
    storedLng === null ||
    Math.abs(storedLat - location.lat) > 0.05 ||
    Math.abs(storedLng - location.lng) > 0.05;

  if (!countryChanged && !cityChanged && !regionChanged && !coordinatesChanged) {
    unchanged += 1;
    continue;
  }

  await connection.execute(
    `UPDATE alumni_profiles
        SET current_city = ?,
            current_country = ?,
            current_region = ?,
            latitude = ?,
            longitude = ?
      WHERE id = ?`,
    [location.city, location.country, location.region, location.lat, location.lng, profile.id],
  );

  updated += 1;

  const previous =
    storedLat === null || storedLng === null
      ? "no coordinates"
      : `${storedLat.toFixed(4)}, ${storedLng.toFixed(4)}`;

  console.log(
    `- update ${lastName(profile.first_name, profile.middle_name, profile.last_name)}: ` +
      `${previous} → ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} ` +
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

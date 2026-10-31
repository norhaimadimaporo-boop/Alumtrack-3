/**
 * Creates the AlumTrack database, applies database/schema.sql, and inserts two
 * demo accounts. Safe to run more than once: existing accounts are left alone.
 *
 * Usage:
 *   1. Copy .env.example to .env and set DB_* credentials.
 *   2. npm run db:setup
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import mysql from "mysql2/promise";

const scrypt = promisify(scryptCallback);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  console.warn("No .env file found. Falling back to DB_* environment variables.");
}

const dbName = process.env.DB_NAME ?? "alumtrack";
if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
  throw new Error(`DB_NAME "${dbName}" may only contain letters, numbers, and underscores.`);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  multipleStatements: true,
});

try {
  console.log(`Creating database "${dbName}" if it does not exist…`);
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query(`USE \`${dbName}\``);

  console.log("Applying database/schema.sql…");
  const schema = await readFile(resolve(root, "database/schema.sql"), "utf8");
  await connection.query(schema);

  const accounts = [
    {
      email: process.env.SEED_ALUMNI_EMAIL ?? "alumni@alumtrack.test",
      password: process.env.SEED_ALUMNI_PASSWORD ?? "Alumni2026!",
      role: "alumni",
      fullName: "Demo Alumni",
    },
    {
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@alumtrack.test",
      password: process.env.SEED_ADMIN_PASSWORD ?? "Admin2026!",
      role: "admin",
      fullName: "Demo OARCC Admin",
    },
  ];

  const accountIds = new Map();

  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password);
    const [result] = await connection.execute(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email)`,
      [account.email.toLowerCase(), passwordHash, account.role, account.fullName],
    );

    if (result.affectedRows === 1) {
      console.log(`Created ${account.role} account: ${account.email}`);
    } else {
      console.log(`Account already exists, left unchanged: ${account.email}`);
    }

    const [rows] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [
      account.email.toLowerCase(),
    ]);
    if (rows[0]) accountIds.set(account.role, rows[0].id);
  }

  const alumniId = accountIds.get("alumni");
  if (alumniId) {
    const [existing] = await connection.execute(
      "SELECT id FROM alumni_profiles WHERE user_id = ? LIMIT 1",
      [alumniId],
    );

    if (existing.length === 0) {
      console.log("Creating a demo alumni profile…");
      await connection.execute(
        `INSERT INTO alumni_profiles
          (user_id, last_name, first_name, middle_name, gender, birth_date, age, ethnicity,
           birth_place, religion, mobile_number, contact_email, akan_email, facebook, course,
           college, batch_year, employment_status, current_position, current_company,
           current_region, verification_status, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          alumniId,
          "Abdulcader",
          "Naimah",
          "Tomawis",
          "Female",
          "2002-03-14",
          24,
          "Maranao",
          "Marawi City, Lanao del Sur",
          "Islam",
          "+63 917 555 0142",
          "naimah.abdulcader@example.com",
          "naimah.abdulcader@msumain.edu.ph",
          "fb.com/naimah.abdulcader",
          "BS Information Technology",
          "College of Information and Computing Sciences",
          2024,
          "employed",
          "Software Engineer",
          "Accenture Philippines",
          "NCR — Metro Manila",
          "verified",
        ],
      );

      await connection.execute(
        `INSERT INTO alumni_addresses
          (user_id, kind, building, house_no, block, street, subdivision, city, province, zip_code)
         VALUES
          (?, 'current', '', 'Lot 12', 'Blk 4', '', 'Sunrise Subd.', 'Taguig City', 'Metro Manila', '1630'),
          (?, 'home', '', '', '', 'Brgy. Marinaut East', '', 'Marawi City', 'Lanao del Sur', '9700')`,
        [alumniId, alumniId],
      );

      await connection.execute(
        `INSERT INTO alumni_education
          (user_id, level, school_id_no, degree, major, college, school, school_address, graduated_on)
         VALUES
          (?, 'Graduate Degree', '2024-MSCS-0187', 'Master of Science in Computer Science',
           'Software Engineering', 'College of Information and Computing Sciences',
           'MSU — Main Campus', 'Marawi City, Lanao del Sur', '2026-06-20'),
          (?, 'Baccalaureate Degree', '2020-30124', 'Bachelor of Science in Information Technology',
           'Information Technology', 'College of Information and Computing Sciences',
           'MSU — Main Campus', 'Marawi City, Lanao del Sur', '2024-07-12')`,
        [alumniId, alumniId],
      );

      await connection.execute(
        `INSERT INTO alumni_employment
          (user_id, is_current, position, company, company_address, length_of_employment,
           years_in_office, work_location, sector)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alumniId,
          "Software Engineer",
          "Accenture Philippines",
          "Taguig City, NCR",
          "1 year, 5 months",
          "1 year",
          "Local",
          "Non-Government / Private Institution",
        ],
      );

      await connection.execute(
        `INSERT INTO alumni_organizations
          (user_id, name, address, position, contact_no, email, member_since)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          alumniId,
          "MSU Information Technology Society",
          "MSU Main Campus, Marawi City",
          "Vice President",
          "+63 917 555 0188",
          "msu.itsociety@example.com",
          "2021-09-05",
        ],
      );
    } else {
      console.log("Demo alumni profile already exists, left unchanged.");
    }
  }

  console.log("Seeding demo posts…");
  await connection.execute(
    `INSERT INTO posts (type, title, content, status, posted_at)
     VALUES
      ('Announcement', 'Alumni data validation drive extended until September',
       'All registered alumni are requested to validate their employment and contact details until 30 September 2026.',
       'Published', '2026-08-05'),
      ('News / Event', 'MSU Grand Alumni Homecoming 2026',
       'The Grand Alumni Homecoming will be held at the MSU Main Campus Gymnasium with batch reunions and an awards night.',
       'Published', '2026-08-01'),
      ('Job Offering', 'Junior Software Developer — Accenture Philippines',
       'Join a delivery team building enterprise web applications for international clients.',
       'Published', '2026-07-28'),
      ('Announcement', 'OARCC office hours during the semestral break',
       'The OARCC will be open Monday to Friday, 8:00 AM to 3:00 PM, during the break.',
       'Draft', '2026-07-20')
     ON DUPLICATE KEY UPDATE title = VALUES(title)`,
  );

  console.log("\nDatabase setup complete.");
} finally {
  await connection.end();
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return ["scrypt", 16384, 8, 1, salt.toString("base64"), hash.toString("base64")].join("$");
}

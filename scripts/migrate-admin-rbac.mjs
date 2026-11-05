/**
 * Adds the three-tier admin RBAC column (users.admin_role) and seeds the
 * administrator accounts used by the OARCC console.
 *
 * Safe to run more than once:
 *   • Adds the column and index only when they are missing.
 *   • Demotes any admin without a tier to "standard".
 *   • Resets admin@alumtrack.test to Head Admin with the shared password.
 *   • Upserts headadmin@ / standardadmin@ / vieweradmin@ test accounts.
 *
 * Usage: npm run db:admin-rbac
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
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

const ADMIN_PASSWORD = "AlumTrack2026!";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  multipleStatements: true,
});

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query(`USE \`${dbName}\``);

  const [columns] = await connection.execute(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'admin_role'`,
    [dbName],
  );

  if (columns.length === 0) {
    console.log("Adding users.admin_role column…");
    await connection.query(
      "ALTER TABLE users ADD COLUMN admin_role ENUM('head', 'standard', 'viewer') NULL AFTER role",
    );
  } else {
    console.log("users.admin_role already exists.");
  }

  const [indexes] = await connection.execute(
    `SELECT INDEX_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_admin_role'`,
    [dbName],
  );
  if (indexes.length === 0) {
    console.log("Adding users.idx_users_admin_role index…");
    await connection.query("ALTER TABLE users ADD KEY idx_users_admin_role (admin_role)");
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const [defaulted] = await connection.execute(
    "UPDATE users SET admin_role = 'standard' WHERE role = 'admin' AND admin_role IS NULL",
  );
  console.log(`Defaulted ${defaulted.affectedRows} existing admin(s) to the standard tier.`);

  // The original admin account becomes the Head Admin and gets the new password.
  const [head] = await connection.execute(
    `UPDATE users
        SET password_hash = ?,
            role = 'admin',
            admin_role = 'head',
            is_active = 1,
            full_name = COALESCE(full_name, 'Head Administrator')
      WHERE email = ?`,
    [passwordHash, "admin@alumtrack.test"],
  );

  if (head.affectedRows === 0) {
    await connection.execute(
      `INSERT INTO users (email, password_hash, role, admin_role, full_name)
       VALUES (?, ?, 'admin', 'head', 'Head Administrator')`,
      ["admin@alumtrack.test", passwordHash],
    );
    console.log("Created admin@alumtrack.test as Head Admin.");
  } else {
    console.log("Updated admin@alumtrack.test as Head Admin.");
  }

  const testAccounts = [
    { email: "headadmin@alumtrack.test", adminRole: "head", fullName: "Head Admin (Test)" },
    {
      email: "standardadmin@alumtrack.test",
      adminRole: "standard",
      fullName: "Standard Admin (Test)",
    },
    {
      email: "vieweradmin@alumtrack.test",
      adminRole: "viewer",
      fullName: "Viewer Admin (Test)",
    },
  ];

  for (const account of testAccounts) {
    await connection.execute(
      `INSERT INTO users (email, password_hash, role, admin_role, full_name)
       VALUES (?, ?, 'admin', ?, ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         role = 'admin',
         admin_role = VALUES(admin_role),
         full_name = VALUES(full_name),
         is_active = 1`,
      [account.email, passwordHash, account.adminRole, account.fullName],
    );
    console.log(`Upserted ${account.adminRole} admin: ${account.email}`);
  }

  const [rows] = await connection.query(
    `SELECT email, admin_role, is_active
       FROM users
      WHERE role = 'admin'
      ORDER BY FIELD(admin_role, 'head', 'standard', 'viewer'), email`,
  );
  console.log("\nAdmin accounts now available:");
  for (const row of rows) {
    console.log(`  ${row.email} — ${row.admin_role ?? "standard"} — active=${row.is_active}`);
  }
  console.log(`\nAll admin passwords are now "${ADMIN_PASSWORD}".`);
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

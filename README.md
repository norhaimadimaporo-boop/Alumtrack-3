# AlumTrack

**AlumTrack: Alumni Tracing System and Online Platform for Mindanao State University – Main Campus**

AlumTrack is a web platform for alumni discovery, alumni profile management, university news and events, and OARCC administration.

## Application modules

- **Public:** Home, alumni search, alumni map, news and events, and OARCC information.
- **Alumni:** Dashboard, education, employment, jobs, profile, and settings.
- **OARCC administration:** Alumni verification, accounts, posts, reports, and usage.

## Technology

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite
- Tailwind CSS
- Nitro for server deployment

## Run locally

Requirements: Node.js 20 or newer, npm, and MySQL 8 or newer.

```bash
npm install
cp .env.example .env   # then fill in your MySQL credentials
npm run db:setup       # creates the database, tables, and demo accounts
npm run dev
```

`npm run db:setup` creates two demo accounts (change the passwords in `.env` before
using real data):

| Role   | Email                   | Password      |
| ------ | ----------------------- | ------------- |
| Alumni | `alumni@alumtrack.test` | `Alumni2026!` |
| Admin  | `admin@alumtrack.test`  | `Admin2026!`  |

The login screen verifies credentials against the `users` table through a TanStack
Start server function. Passwords are hashed with scrypt, and successful logins create
an HTTP-only session cookie backed by the `sessions` table. Logout removes both the
database session and the cookie. See `.env.example` and `database/schema.sql`.

The registration page creates a real alumni account in one transaction: the `users`
row, the `alumni_profiles` row, current and home addresses, education, employment, and
organization records, plus an entry in `activity_log`. New profiles start as
`pending` until an administrator verifies them.

The admin dashboard (`/admin`) and alumni directory (`/admin/alumni`) read live counts,
recent registrations, and profile records from MySQL. They require an administrator
session; without one the pages show a sign-in prompt instead of data. Verifying and
deleting alumni records update the database and write to `activity_log`. The profile
page (`/profile`) shows the signed-in alumnus's saved record.

Direct add/edit of alumni records from the admin console is not connected to the
database yet; new alumni are created through the public registration form. Other admin
subpages (posts, reports, accounts, usage) and some alumni pages still use demo data.

Create a production build with:

```bash
npm run build
```

If the build runs out of memory on Windows, raise the Node heap first:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run build
```

## Deployment

The project is configured for Vercel. The production build emits Vercel's Build
Output API (`.vercel/output`) through Nitro when the `VERCEL=1` environment is
present, so no extra build flags are needed.

### 1. Create the free MySQL database (Aiven)

1. Sign up at <https://aiven.io> (no credit card) and open the console.
2. **Create service → MySQL → Free plan**, region **Singapore** (closest to PH).
3. Wait for the service to reach **Running**, then copy the connection details
   from the **Overview** tab: host, port, user (`avnadmin`), password.
4. Download **CA certificate** (`ca.pem`) from the same page.
5. Open **Databases** and create a database named `alumtrack` (or keep
   `defaultdb`).

Aiven requires TLS, so the app needs `DB_SSL=true` plus the CA certificate. The
scripts accept `DB_SSL_CA_PATH=ca.pem` locally and upload the equivalent
`DB_SSL_CA_BASE64` to Vercel automatically.

### 2. Create and seed the database

```powershell
Copy-Item .env.production.example .env.production
# edit .env.production with the Aiven values, then:
$env:ENV_FILE=".env.production"; npm run db:setup
```

`db:setup` creates the database if needed, applies `database/schema.sql`, and
seeds the demo accounts. It only touches the database configured in
`.env.production` for that one command; the local `.env` stays unchanged.

### 3. Upload the environment variables to Vercel

```powershell
npx vercel link --yes --project alumtrack
npm run deploy:env            # uploads DB_* to the Production environment
npm run deploy:env -- --dry-run   # preview without uploading
```

Values are streamed over stdin, so passwords and the CA certificate never show
up in the shell history. Every variable is stored as a sensitive secret.

### 4. Deploy

```powershell
npx vercel deploy --prod --yes
```

Vercel's serverless functions must be able to reach the MySQL server over the
public internet. `127.0.0.1` only works locally. Keep `DB_CONNECTION_LIMIT` low
(2-5) because every serverless instance opens its own pool. A GitHub Actions
workflow checks the production build on pushes and pull requests.

## Important limitations

Authentication, registration, the admin dashboard, the alumni directory, and the
signed-in profile page are persisted in MySQL. The remaining modules (posts, reports,
admin accounts, usage, and several alumni pages) still use demo/local data. Direct
add/edit of alumni records in the admin console is not connected yet, so create new
alumni through the registration form. Do not enter real sensitive alumni information
until authorization checks and privacy controls are configured for every module.

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

The project is configured for Vercel. Import this repository into Vercel, use the
default build settings, and add the `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME`, and (if needed) `DB_SSL` environment variables in the Vercel project
settings. Vercel's serverless functions must be able to reach your MySQL server over
the public internet, or through a provider such as PlanetScale, Aiven, or a VPN/tunnel.
A GitHub Actions workflow checks the production build on pushes and pull requests.

## Important limitations

Authentication, registration, the admin dashboard, the alumni directory, and the
signed-in profile page are persisted in MySQL. The remaining modules (posts, reports,
admin accounts, usage, and several alumni pages) still use demo/local data. Direct
add/edit of alumni records in the admin console is not connected yet, so create new
alumni through the registration form. Do not enter real sensitive alumni information
until authorization checks and privacy controls are configured for every module.

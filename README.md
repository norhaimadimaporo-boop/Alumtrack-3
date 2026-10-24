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

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Deployment

The project is configured for Vercel. Import this repository into Vercel and use the default build settings. A GitHub Actions workflow checks the production build on pushes and pull requests.

## Important limitations

The current application includes demo/local data and is not yet connected to a production database. Browser-side demo authentication is not suitable for real accounts. Do not enter real sensitive alumni information until secure server-side authentication, authorization, persistence, and privacy controls are configured.

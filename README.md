# Easy Ride workspace

Easy Ride is a two-project workspace. The Next.js app remains the active API boundary for the existing UI while a separate Express/MongoDB API is being introduced for staged integration.

## Architecture

- `frontend/` is the Next.js 16 App Router application. It contains the UI, same-origin `/api/*` Route Handlers, MongoDB models, and server-side authentication. Route Handlers use `MONGODB_URI` and `AUTH_SECRET`; keep both private in `frontend/.env.local`.
- `backend/` is a TypeScript Express API on port 5000 with MongoDB-backed auth, users, vehicle, saved vehicle, and booking foundations under `/api/v1`.
- The current frontend still calls the existing Next.js `/api/*` handlers. Backend auth uses a new user schema and JWT contract, so traffic must not be switched until accounts and API clients are migrated deliberately.
- Firebase and Google Maps browser configuration uses `NEXT_PUBLIC_*` values. Never put database credentials, auth secrets, or Firebase service account credentials in a `NEXT_PUBLIC_*` variable.

## Run locally (PowerShell)

In the first terminal:

```powershell
cd frontend
Copy-Item .env.local.example .env.local # first run only; then set real private values
npm install
npm run dev
```

The Next.js app runs at `http://localhost:3000`. Set `MONGODB_URI` and an `AUTH_SECRET` of at least 32 characters in `frontend/.env.local` for its existing database-backed API routes. Firebase, Maps, and admin-script values are optional unless you use those features.

In a second terminal, configure the dedicated API and start it:

```powershell
cd backend
Copy-Item .env.example .env # first run only; set MongoDB URI and both JWT secrets
npm run dev
```

The dedicated API listens on `http://localhost:5000`; it waits for MongoDB before binding. Liveness and readiness are at `/health/live` and `/health/ready`.

Root-level convenience commands are `npm run dev:frontend`, `npm run dev:backend`, `npm run build:frontend`, `npm run lint:frontend`, and `npm run typecheck:frontend`.

## Safe change boundary

Keep secrets in server-only env files; `.env*` files are ignored by Git, with only env examples intended for commit. Do not point the frontend at the new API until the endpoint contracts, authentication/session flow, and legacy collection migration have been implemented and verified.

## Database indexes

Mongoose schemas define indexes for public vehicle ordering, a user's updated listings, and buyer/seller booking history. Index declarations do not prove that Atlas has built them. Review the proposed indexes against the live collection with `explain("executionStats")`, check index size/build impact and duplicates, then create them through a controlled deployment or migration window. Do not enable automatic index builds against production by default.

Vehicle search currently supports case-insensitive substring matching across make, model, and description. The regular-expression `$or` branch is not accelerated by the ordinary vehicle indexes listed above; a scalable full-text search strategy requires a separate product decision (for example, Atlas Search) and compatibility review. No latency or concurrency benchmark has been collected in this workspace because no representative dataset or configured production MongoDB/API endpoint is available.

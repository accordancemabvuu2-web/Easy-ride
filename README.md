# Easy Ride workspace

Easy Ride is a two-project workspace. The split is organizational; the Next.js server remains the production API boundary for the existing app.

## Architecture

- `frontend/` is the Next.js 16 App Router application. It contains the UI, same-origin `/api/*` Route Handlers, MongoDB models, and server-side authentication. Route Handlers use `MONGODB_URI` and `AUTH_SECRET`; keep both private in `frontend/.env.local`.
- `backend/` is a standalone Node HTTP service on port 4000. It currently exposes only `GET /health`. It does not own marketplace or auth routes and does not connect to MongoDB.
- Browser calls to `/api/*` stay same-origin with Next.js. The backend's `FRONTEND_ORIGIN` setting applies only if a future browser client calls that service directly.
- Firebase and Google Maps browser configuration uses `NEXT_PUBLIC_*` values. Never put database credentials, auth secrets, or Firebase service account credentials in a `NEXT_PUBLIC_*` variable.

## Run locally (PowerShell)

In the first terminal:

```powershell
cd frontend
Copy-Item .env.local.example .env.local # first run only; then set real private values
npm install
npm run dev
```

The Next.js app runs at `http://localhost:3000`. Set `MONGODB_URI` and an `AUTH_SECRET` of at least 32 characters in `frontend/.env.local` for database-backed API routes. Firebase, Maps, and admin-script values are optional unless you use those features.

In a second terminal, if you need the separate health service:

```powershell
cd backend
npm run dev
```

The health endpoint is `http://localhost:4000/health`. `PORT` and `FRONTEND_ORIGIN` can override its defaults.

Root-level convenience commands are `npm run dev:frontend`, `npm run dev:backend`, `npm run build:frontend`, `npm run lint:frontend`, and `npm run typecheck:frontend`.

## Safe change boundary

Keep existing `/api/*` handlers in Next.js unless performing a planned API migration that also updates clients, auth/session handling, deployment, CORS, and environment configuration. Do not duplicate routes in the standalone backend. Keep secrets in server-only env files; `.env*` files are ignored by Git, with only env examples intended for commit.

## Database indexes

Mongoose schemas define indexes for public vehicle ordering, a user's updated listings, and buyer/seller booking history. Index declarations do not prove that Atlas has built them. Review the proposed indexes against the live collection with `explain("executionStats")`, check index size/build impact and duplicates, then create them through a controlled deployment or migration window. Do not enable automatic index builds against production by default.

Vehicle search currently supports case-insensitive substring matching across make, model, and description. The regular-expression `$or` branch is not accelerated by the ordinary vehicle indexes listed above; a scalable full-text search strategy requires a separate product decision (for example, Atlas Search) and compatibility review. No latency or concurrency benchmark has been collected in this workspace because no representative dataset or configured production MongoDB/API endpoint is available.

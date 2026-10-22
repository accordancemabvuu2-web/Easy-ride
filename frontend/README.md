# Easy Ride frontend

Next.js 16 App Router application. Existing UI, components, and current server APIs are in this project. Its secure Route Handlers at `/api/*` continue to run on the Next.js server and use the private `MONGODB_URI` and `AUTH_SECRET` from `frontend/.env.local`.

```powershell
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`. `NEXT_PUBLIC_API_URL` is not needed for the existing same-origin `/api/*` calls.

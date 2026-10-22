# Easy Ride workspace

Easy Ride is organized as two folders:

- `frontend/`: the existing Next.js 16 application, including its UI and current `/api/*` Route Handlers.
- `backend/`: a separate Node.js/Express service boundary on port 4000, currently providing `GET /health`. Existing marketplace/authentication APIs remain in Next.js to avoid duplicated routes and a breaking client migration.

## Run locally (Windows PowerShell)

Install and start the Next.js application:

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

The Next.js app runs at `http://localhost:3000`. In another terminal, start the dependency-free health service:

```powershell
cd backend
npm run dev
```

Frontend: `http://localhost:3000`  
Current Next API routes: `http://localhost:3000/api/*`  
Separate backend health check: `http://localhost:4000/health`

Configure `MONGODB_URI` and `AUTH_SECRET` in `frontend/.env.local` for existing Next server routes. `backend/.env` is private to the separate service and uses its own `MONGODB_URI` when database routes are added. Do not commit either environment file. The current backend is a service boundary and does not duplicate the Next API implementation.

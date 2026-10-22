# Easy Ride backend service

This is the separate Node service boundary at `http://localhost:4000`. It uses Node's built-in HTTP server and currently exposes `GET /health` only. Existing marketplace, authentication, and MongoDB endpoints remain in the Next.js Route Handlers under `frontend/app/api`; this avoids creating duplicate APIs or breaking existing browser clients during the folder split.

If future endpoints move into this service, add its database dependencies and configure secrets in `backend/.env`. Never put server credentials in a `NEXT_PUBLIC_` variable.

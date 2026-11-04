# Easy Ride frontend API integration

## Configuration

The frontend is independently deployed from the backend and communicates over
HTTP. Set `NEXT_PUBLIC_API_BASE_URL` to the backend origin plus the versioned
prefix:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

Use the local, staging, and production values in each deployment environment;
do not commit environment files or credentials. The frontend validates this
value at request time and reports a configuration error when it is missing or
does not include `/api/v1`.

## Client behavior

`lib/apiClient.ts` is the single HTTP entry point used by frontend services and
contexts. It provides:

- JSON request and response handling with `Accept` and `Content-Type` headers.
- `credentials: "include"` for HTTP-only cookie authentication.
- A 15-second request timeout and explicit network, timeout, configuration, and
  non-JSON response errors.
- Optional in-memory bearer access-token support for the current backend
  contract. Tokens are not written to `localStorage` or other persistent browser
  storage.
- One automatic refresh attempt after a `401`, using the backend refresh-cookie
  contract. Refresh requests are serialized to avoid duplicate rotations.

The client does not connect to MongoDB and does not contain backend business
logic.

## Contract conventions

The agreed API prefix is `/api/v1`. Successful responses are expected to use:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error responses are expected to use standard HTTP status codes and:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A safe, user-facing explanation",
    "details": {}
  }
}
```

The backend OpenAPI specification remains the source of truth. This document
records frontend integration assumptions; it is not a replacement API
specification.

## Authentication, cookies, and CORS

The current frontend auth context calls the authentication routes listed in
`PROJECT_STATUS.md`. The intended long-term session mechanism is an
HTTP-only, secure refresh cookie with access to the API through
`credentials: "include"`. The backend must configure CORS with the exact
frontend origins, `Access-Control-Allow-Credentials: true`, and cookie
attributes appropriate to the deployed frontend/API sites (`Secure`,
`HttpOnly`, and an appropriate `SameSite` policy).

No private backend secrets belong in `NEXT_PUBLIC_*` variables.

## Health check

The development-only `BackendHealthStatus` component checks the backend
`/health/ready` endpoint once on mount and at most once per minute. It displays
configuration or availability diagnostics without blocking routes or data
rendering. The health endpoint is outside the `/api/v1` resource prefix and is
derived from the configured API origin.

## Confirmed and pending endpoints

Confirmed by the existing frontend integration record:

- Authentication routes under `/api/v1/auth`, including `me`, `login`,
  `logout`, `refresh`, registration, verification, password reset, and seller
  activation.
- `/health/ready` for backend readiness.
- Dealer and admin routes listed in `PROJECT_STATUS.md`.

Awaiting backend OpenAPI confirmation before new frontend feature work:

- Vehicle marketplace search, filters, pagination, and listing mutations.
- Rental-specific resources and availability contracts.
- Final error details and pagination metadata for non-auth resources.
- Production CORS origins, cookie domain, and `SameSite` policy.

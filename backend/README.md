# Easy Ride Marketplace API

Node.js 22, TypeScript, Express 5, Mongoose and Zod REST API. Versioned API prefix: `/api/v1`. Development port defaults to `4567`. OpenAPI UI is at `http://localhost:4567/api-docs`; JSON at `http://localhost:4567/api-docs.json`.

## Run locally

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edit .env locally: set MONGODB_URI and two independent random JWT secrets (32+ characters).
npm install
npm run dev
```

`npm run typecheck`, `npm run build`, `npm test`, `npm run openapi:validate`, and `npm run db:indexes` are available. `npm start` starts the compiled server. Index initialization creates indexes and does not drop collections. Configure `PUBLIC_API_BASE_URL` in deployed environments to the public API origin (for example `https://api.example.com`); the spec appends `/api/v1`. Set `SWAGGER_ENABLED=false` to disable both documentation routes.

Login in Swagger at `/api/v1/auth/login`, copy the short-lived access token, then use **Authorize**. The refresh credential is an HttpOnly cookie and is never shown as an example. Public operations need no token. Authenticated operations use the same JWT middleware as ordinary clients; admin operations additionally check the active role in MongoDB.

## Implemented endpoint groups

- Health/discovery: `GET /`, `/health/live`, `/health/ready`.
- Authentication: register, login, refresh, logout, logout-all, current account.
- Users: own profile read/update and soft delete; public approved review listing.
- Vehicles: paginated/filterable search; listing create/edit/soft-delete/review submission; featured/trending, compare, similar, recent views, rental date availability, catalog facets and data-backed price range estimates; saved vehicles.
- Saved searches: create/list/update/delete validated criteria. Delivery of alerts is not scheduled yet.
- Dealers: application, own profile/inventory management, verified public profile and reviews; admin verification controls granting the dealer role.
- Bookings: rental request/list/read/cancel, extension, seller check-in/check-out, participant dispute. Conflicting pending/confirmed periods are checked inside transactions using a shared per-vehicle write to serialize competing requests. Pending booking requests expire after 15 minutes.
- Offers: create/list and role/owner constrained status transitions.
- Conversations: participant-only text messages, paginated read, incoming read receipts and in-app new-message notification.
- Notifications: own paginated list/unread filter and read marking.
- Reviews: completed-booking participant reviews, moderation queue, approved public reviews and seller response.
- Reports and verification requests: validated submission and admin queues/review. Identity and ownership decisions here are manual; no document upload or external validation is connected.
- Payments: owned history/read; checkout deliberately returns `503 PAYMENT_PROVIDER_UNAVAILABLE` until an adapter is configured. It does not create fake transactions or accept client-supplied paid states.
- Finance: illustrative amortization estimate only, not a financing offer.
- Support: ticket creation, owner/admin message access, paginated messages and admin status management.
- Administration: dashboard counts, user suspension/reactivation, listing/dealer/review moderation, report/verification/support queues, append-only audit read.

See Swagger for exact routes, parameters, schemas, response formats and authorization. There is no frontend migration in this change: the Next.js app still uses its existing same-origin handlers and separate schema/auth contract.

## Integrations and operating limits

Payment provider checkout/webhooks/refunds/invoices/subscriptions, email/SMS/push delivery, saved-search alert jobs, OAuth/OTP, secure object storage/uploads, identity/VIN/history services, real-time WebSockets, device registration/preferences, rental receipts and automatic availability scheduling require provider/worker configuration and are not represented as working features. Message attachments are not accepted. Dealer verification documents are not uploaded. No payment state is set from user input.

Booking creation, extensions, and support ticket creation use MongoDB transactions. Atlas supports these on its replica-set deployment; a standalone local `mongod` does not. Booking request concurrency is serialized on the vehicle document, while payment/confirmation workflow is still unavailable. Pending bookings are excluded after expiry from the write conflict check; the informational availability endpoint may still report an expired pending row as conflicting, so treat it as advisory.

MongoDB collections are separate for users, tokens, dealer profiles, vehicles/images, saved vehicles/searches/recent views, offers, bookings, payments, conversations/messages, notifications, reviews, reports, audit logs, verification requests and support tickets/messages. The index command imports all models and creates schema indexes. Review index changes before production rollout; index creation can consume database resources.

Set Atlas Network Access to the deployment egress IP range and use a least-privilege database user scoped to `easy_ride`. Keep `.env` outside version control; never put backend secrets in `NEXT_PUBLIC_*` values. Rotate any credentials previously exposed in tracked files.

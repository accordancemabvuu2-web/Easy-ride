# Easy Ride — Project Status & Roadmap

**Last Updated**: November 2026  
**Marketplace Target**: Zimbabwe (Harare, Bulawayo, Mutare, Gweru, Masvingo) · Multicurrency (USD, ZiG, ZAR) · Internationally Scalable  
**Stack**: Next.js App Router (Cloudflare Workers) · Node.js & Express 5 (Render) · MongoDB Atlas · TypeScript · Tailwind CSS

## Frontend Foundation (Milestone 1)

**Status**: Foundation complete; backend contract confirmation remains required
for future marketplace work.

- [x] Existing App Router, route, component, service, type, hook, and utility
  areas audited without removing working routes.
- [x] Centralized `lib/apiClient.ts` with `/api/v1` validation, JSON handling,
  timeouts, explicit errors, cookie credentials, and in-memory token support.
- [x] Safe local and deployment environment examples with
  `NEXT_PUBLIC_API_BASE_URL`.
- [x] Reusable loading and empty states retained; reusable error state added.
- [x] Development-only backend readiness indicator added using `/health/ready`.
- [x] Frontend API assumptions documented in [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md).
- [ ] Backend OpenAPI confirmation for vehicle, rental, pagination, and CORS
  contracts.

The frontend remains usable when the backend is unavailable: API-driven
operations surface explicit errors, while the development health indicator is
diagnostic only.

---

## 1. Executive Status Overview

| Area | Status | Notes |
| :--- | :---: | :--- |
| **Backend API Engine** | Operational | Express 5.3, Helmet, CORS, Rate-limiting, Pino logging on port `4567`. |
| **Database Connection** | Operational | MongoDB Atlas connection pooling with `/health/ready` check. |
| **Authentication System** | Operational (Milestone 1 Completed) | Complete production authentication with MongoDB Atlas persistence, JWT/cookie rotation, multi-capability user identity, email verification, password reset, and dealership membership architecture. |
| **Vehicle Marketplace** | Up Next (Milestone 2) | Connecting `listingService.ts` and UI to MongoDB Atlas `/api/v1/vehicles`, retiring seed data. |
| **Dealership & Seller Management** | Planned (Milestone 3) | Onboarding applications, multi-member permissions, inventory management. |
| **Enquiries & Communication** | Planned (Milestone 4) | Offers, messaging conversations, WhatsApp deep-link integration. |
| **Production Deployment & Storage** | Planned (Milestone 5) | Cloudflare R2 / S3 image storage, Render backend hosting. |

---

## 2. Milestone Tracking

### Milestone 1: Production Authentication & Unified Identity (✅ Completed)
- [x] Codebase & Architecture Audit completed and approved
- [x] Schema enhancements: `User` multi-capability (buy/sell), `DealerMember`, `VerificationToken`
- [x] Backend auth endpoints: `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`, `/activate-seller`
- [x] Dealer membership management: `/dealers/me/members` (invite, role assignment, removal)
- [x] Super admin provisioning: `/admin/users/provision-admin`
- [x] Unified frontend API client (`lib/apiClient.ts`) with cookie credentials and auto-refresh
- [x] Frontend `AuthContext` migration to Express REST API
- [x] Frontend login, register, email verification, and password reset pages connected
- [x] Server-side role enforcement in `AdminGuard`
- [x] Automated auth & permission tests passing (25/25 tests)
- [x] Full frontend and backend builds passing with zero compilation errors

### Milestone 2: Real Database-Backed Vehicle Marketplace (Up Next)
- [ ] Seed MongoDB Atlas with real Zimbabwean vehicle records (Harare, Bulawayo, Mutare, Gweru)
- [ ] Connect `listingService.ts` to `/api/v1/vehicles` (search, pagination, filters, featured)
- [ ] Connect `create-listing` to `POST /api/v1/vehicles`
- [ ] Dynamic catalog facets (`makes`, `models`, `locations`)
- [ ] Deprecate `Data/vehicles.ts` and `localStorage` listing storage

### Milestone 3: Dealership & Individual Seller Dashboards
- [ ] Complete dealer onboarding application connected to `/api/v1/dealers`
- [ ] Dealer membership management (Owner, Manager, Sales)
- [ ] Admin verification queue for approving/rejecting dealers
- [ ] Seller individual activation and personal inventory management

### Milestone 4: Enquiries, Offers & Communication
- [ ] Direct buyer-to-seller offers (`/api/v1/offers`)
- [ ] In-app message conversations (`/api/v1/conversations`)
- [ ] In-app notifications
- [ ] WhatsApp contact integration for Zimbabwe market context

### Milestone 5: Production Deployment & Cloud Storage
- [ ] Cloudflare R2 / S3 integration for vehicle photos
- [ ] Backend deployment configuration on Render
- [ ] Frontend production build & Cloudflare Workers deployment
- [ ] End-to-end security audit and live user acceptance testing

---

## 3. Active API Contracts & Endpoints

| Endpoint | Method | Auth | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/auth/register` | POST | Public | User registration with initial role & capability (Buyer/Seller) |
| `/api/v1/auth/login` | POST | Public | Email/password login issuing access token & HttpOnly refresh cookie |
| `/api/v1/auth/refresh` | POST | Public (Cookie) | Rotates refresh token and issues new access token |
| `/api/v1/auth/logout` | POST | Public (Cookie) | Revokes current session |
| `/api/v1/auth/logout-all` | POST | Bearer | Revokes all sessions for user across all devices |
| `/api/v1/auth/me` | GET | Bearer | Returns current authenticated user, capabilities, and dealership memberships |
| `/api/v1/auth/verify-email` | POST | Public | Validates verification token and activates email status |
| `/api/v1/auth/resend-verification` | POST | Public | Resends email verification token without leaking account existence |
| `/api/v1/auth/forgot-password` | POST | Public | Issues password reset token without leaking account existence |
| `/api/v1/auth/reset-password` | POST | Public | Validates reset token and sets new password with session revocation |
| `/api/v1/auth/activate-seller` | POST | Bearer | Grants individual seller capability to existing buyer |
| `/api/v1/dealers` | POST | Bearer | Apply for dealership verification with business details and representative |
| `/api/v1/dealers/me` | GET | Bearer | Get owned or affiliated dealership |
| `/api/v1/dealers/me/members` | GET | Bearer | List dealership team members and their roles |
| `/api/v1/dealers/me/members` | POST | Bearer | Add employee with role (`manager`, `inventory_manager`, `sales`) |
| `/api/v1/dealers/me/members/:id` | DELETE | Bearer | Remove employee from dealership |
| `/api/v1/admin/users/provision-admin` | POST | Super Admin | Provision an administrator with specific clearance role |
| `/api/v1/admin/dashboard` | GET | Admin | Platform metrics and counts |
| `/api/v1/admin/vehicles/:id/review` | PATCH | Admin | Approve or reject listing |
| `/api/v1/admin/dealers/:id/review` | PATCH | Admin | Approve or reject dealership |

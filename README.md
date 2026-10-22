# HMS Frontend (v2)

Next.js App Router frontend for the Ghana Hospital Management System.

This repository is the **Phase 0.9 frontend shell** for the backend in
`AI-Hospital-Management-System-V2`. It implements the identity journeys
(login, MFA, invitations, password reset, forced first-login password
change, facility selection), the authenticated facility shell, the
platform console landing, and the shared-workstation idle lock.

The backend is authoritative for authentication, permissions, facility
isolation and audit. Nothing in this UI is a security boundary.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript
- TanStack Query v5
- React Hook Form + Zod v4
- shadcn/ui (`base-nova`, radix primitives) + Tailwind CSS v4
- Axios

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Default backend: `http://localhost:8080` (start the Spring Boot backend
first). The app runs at `http://localhost:3000`.

### Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:8080` |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MS` | Workstation lock delay (blueprint default 10 min) | `600000` |

No secrets belong in this repository. Only `NEXT_PUBLIC_*` values are
exposed to the browser.

### Scripts

```bash
pnpm dev      # development server
pnpm build    # production build (also type-checks)
pnpm start    # serve the production build
pnpm lint     # eslint
pnpm exec tsc --noEmit
```

## Authentication and session model

- **Access token**: memory only (`src/lib/auth-store.ts`). Never
  `localStorage`, never a cookie readable by JS.
- **Refresh token**: `HttpOnly` cookie set by the backend, path
  `/api/v1/auth`, `SameSite=Lax`, `Secure` in production. JavaScript
  never sees it.
- **Session id**: persisted in `localStorage` under `hms.session-id`.
  It is a random identifier, not a credential: refresh additionally
  requires the HttpOnly cookie. Persisting it is what lets a reload
  resume the session.
- **Reload**: `bootstrapSession()` posts the session id to
  `/api/v1/auth/refresh`, receives a new access token, then loads
  `GET /api/v1/identity/me`.
- **401 handling**: single-flight refresh in `src/lib/http.ts`.
  Concurrent failures share one refresh; failure clears the session and
  redirects to `/login?returnUrl=…`.
- **Forced password change**: the backend returns `403` with
  `code: PASSWORD_CHANGE_REQUIRED`; the client routes to
  `/reset-password?forced=1`. After the change the access token is
  rotated through `/refresh` (a JWT cannot be mutated) before routing
  onward.
- **Facility**: carried in the access token (`fid`); there is no
  `X-Facility-Id` header. Switching facility rotates the token, clears
  all query caches and reloads.
- **Platform accounts**: never enter the facility workspace. The
  client gate redirects them to `/platform`; the backend independently
  rejects platform principals on facility/clinical endpoints.

### Why there is no Next middleware guard

The refresh cookie is scoped to the **backend origin** and path
`/api/v1/auth`. Next middleware runs on the frontend origin and cannot
see it, so a cookie-presence check there would be misleading (and a
path-scoped cookie is not sent on `/dashboard` even same-origin).
Session routing is therefore done client-side by `SessionGate`; the
backend enforces every request regardless.

## Routes

| Route | Tier | Notes |
| --- | --- | --- |
| `/` | public | redirects to `/login` |
| `/login` | public | username/password |
| `/mfa` | public | TOTP/recovery challenge |
| `/accept-invite` | public | first password from invite token |
| `/forgot-password` | public | request reset link |
| `/reset-password` | public | forced (`?forced=1`) and voluntary change |
| `/reset-password/link` | public | consumes emailed reset token |
| `/select-facility` | authenticated | multi-facility picker |
| `/dashboard` | facility | facility shell landing |
| `/account/security` | facility | MFA enrolment, password change |
| `/platform` | platform | platform console landing (Phase 0.10 stub) |

## Project structure

```text
src/
├── app/
│   ├── (auth)/                 # logged-out journeys
│   ├── (facility)/             # staff tier (session-gated)
│   │   └── (with-nav)/         # sidebar/nav shell
│   ├── (platform)/             # platform tier (session-gated)
│   ├── error.tsx               # route error boundary
│   └── global-error.tsx        # root layout failure boundary
├── components/
│   ├── layout/                 # sidebar, navbar, shell
│   ├── shared/                 # idle lock, permission gate, page header
│   └── ui/                     # shadcn primitives
├── config/nav-config.ts        # permission-gated navigation
├── features/identity/          # api, hooks, schemas, session gate
└── lib/                        # auth store, http, env, query client
```

## Known gaps (honest list)

- Facility **names** are not in the session payload yet; the UI shows
  short facility ids. The backend exposes `GET /api/v1/facilities/current`
  behind `FACILITY_READ`, which not every staff member holds.
- The MFA challenge token is memory-only by design; reloading `/mfa`
  returns the user to login for a fresh challenge.
- `/platform` is a landing page only. Facility administration is
  Phase 0.10.
- No frontend test suite yet (Vitest/Playwright are planned in the
  blueprint); verification so far is `tsc`, `eslint`, `next build` and
  manual route checks.
- Unlocking an idle workstation re-runs login, which creates a new
  backend session; the previous session is left to expire. A dedicated
  re-authentication endpoint would be cleaner.

## Verification performed

- `pnpm exec tsc --noEmit` — clean.
- `pnpm lint` — clean (warnings suppressed only for deliberate hard
  reloads that clear in-memory state).
- `pnpm build` — succeeds; routes: `/`, `/login`, `/mfa`,
  `/accept-invite`, `/forgot-password`, `/reset-password`,
  `/reset-password/link`, `/select-facility`, `/dashboard`,
  `/account/security`, `/platform`.
- Manual: unauthenticated `/dashboard` redirects to
  `/login?returnUrl=%2Fdashboard`; an invalid persisted session id is
  cleared after a failed refresh and the user is sent to login.

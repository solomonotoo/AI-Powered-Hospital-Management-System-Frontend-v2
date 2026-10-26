# Frontend Implementation Status

Last verified: **2026-10-26**, branch `feature/staff-link-completion`,
application commits `c9c76df` and `083d41b`, against backend `192e935`
(`main`).

Verification in this pass: `pnpm test` (3 files, 12 tests),
`pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` all passed. The
first-administrator staff-link flow was exercised manually in the previous
pass. The reload-recovery path is covered by component/unit tests; it was not
forced in a browser. The test suite is still limited in scope. See section 6
for the exact evidence and section 7 for limitations.

This file records what the frontend repository actually contains and what has
been proven. It is **not** a requirements document and does not override the
HMS blueprint or the backend contract. When this file and the blueprint
disagree, the blueprint wins and this file is wrong.

Confidence markers used below:

- **CONFIRMED** - read in the repository or produced by a command run here.
- **INFERRED** - a reasonable conclusion from the code, not directly proven.
- **VERIFY** - must be checked with a human or authority before relying on it.

Status vocabulary:

- **BUILT** - implementation is present and typecheck, lint and production
  build pass. Manual evidence is noted where it exists.
- **PARTIAL** - implementation exists but a documented requirement or screen
  is missing.
- **NOT STARTED** - no implementation in this repository.
- **DEFERRED** - belongs to a later blueprint phase.

`BUILT` does not mean "blueprint-complete". Known gaps are listed in section 7
instead of being hidden behind a green status.

---

## 1. How to read this file

- Sections 2-4 say *what exists*.
- Section 5 describes the security and session model.
- Section 6 says *what is proven*.
- Section 7 lists gaps and limitations.
- Sections 8-9 give the next step and the reproducible re-verification path.

The frontend is one half of the HMS. The backend repository
`AI-Hospital-Management-System-V2` owns the blueprint, domain rules, database,
permissions and audit. This repository only consumes those contracts.

---

## 2. Scope and stack

**CONFIRMED** from `package.json` and `src/`:

- Next.js `16.3.6` with the App Router.
- React `19.2.8` and TypeScript.
- TanStack Query `5.x` for server state.
- React Hook Form `7.x` and Zod `4.x` for forms and validation.
- shadcn/ui, Tailwind CSS, Radix UI and lucide icons.
- Axios for HTTP, with a single shared client and an in-memory access token.
- Vitest `5.x`, Testing Library and jsdom for the initial automated test
  harness.
- `pnpm@10.34.5` declared as the package manager; `pnpm-lock.yaml` is checked
  in.

The app currently covers the **late Phase 0 frontend shell and administration
foundation**:

- identity journeys (login, MFA, invitations, password reset, forced password
  change, facility selection);
- the authenticated facility shell (dashboard, security, idle lock);
- facility profile, organization units, setup/go-live, number sequences and
  print profile;
- the platform console (facility registry, registration, readiness, first
  administrator invitation and administrator summary);
- the first-administrator staff record and account-link slice.

Patient, visit, clinical, billing, laboratory and pharmacy screens are **NOT
STARTED**; they belong to later blueprint phases. The critical journey
`register -> visit -> triage -> consult -> pay -> dispense` therefore cannot be
executed in this frontend yet.

---

## 3. Route inventory

**CONFIRMED** from the `src/app` route tree. There are 19 application pages
plus the framework `_not-found` route.

| Route | Tier | Access gate | Purpose |
| --- | --- | --- | --- |
| `/` | public | none | Redirects to `/login`. |
| `/login` | public | none | Username/password sign-in. |
| `/mfa` | public | none | TOTP or recovery-code challenge. The challenge token is memory-only. |
| `/accept-invite` | public | invite token | Sets the first password from an invitation. |
| `/forgot-password` | public | none | Requests a reset link. |
| `/reset-password` | public | token or forced session | Voluntary reset and forced first-login password change (`?forced=1`). |
| `/reset-password/link` | public | emailed token | Consumes the reset token and sets a new password. |
| `/select-facility` | authenticated | session | Multi-facility picker; reissues the token for the selected facility. |
| `/dashboard` | facility | `SessionGate(FACILITY)` | Facility shell landing page. |
| `/account/security` | facility | `SessionGate(FACILITY)` | MFA enrolment/confirmation and password change. |
| `/admin/setup` | facility | `FACILITY_UPDATE` | Readiness checklist, go-live, first-admin staff link and setup links. |
| `/admin/facility` | facility | `FACILITY_UPDATE` | Facility profile editor. |
| `/admin/units` | facility | `FACILITY_UNIT_MANAGE` | Organizational unit tree and unit lifecycle actions. |
| `/admin/setup/sequences` | facility | `CONFIG_READ`; edit needs `CONFIG_SEQUENCE_MANAGE` | Number-sequence configuration. |
| `/admin/setup/print-profile` | facility | `CONFIG_READ`; edit needs `CONFIG_UPDATE` | Facility print identity. |
| `/platform` | platform | `SessionGate(PLATFORM)` | Platform-console landing page; no clinical data. |
| `/platform/facilities` | platform | `FACILITY_LIST_ALL` | Platform-wide facility registry. |
| `/platform/facilities/new` | platform | `FACILITY_REGISTER` | Facility registration wizard. |
| `/platform/facilities/[id]` | platform | `FACILITY_READ`; tabs use `FACILITY_UPDATE` and `IDENTITY_USER_INVITE` | Facility overview, readiness, administrator summary, first-admin invitation and status history. |

The route groups are:

- `(auth)` - logged-out journeys.
- `(facility)` - staff tier, wrapped by `SessionGate` and the facility shell.
- `(platform)` - platform tier, wrapped by `SessionGate` and the platform shell.

There is deliberately **no Next.js middleware guard**. The refresh cookie is
scoped to the backend origin and `/api/v1/auth`, so middleware on the frontend
origin cannot see it. `SessionGate` is a client-side UX guard; every backend
request is authorized again.

---

## 4. Capability status

| Capability | Status | Evidence and limits |
| --- | --- | --- |
| Login, MFA challenge, recovery codes | **BUILT** | Routes, API client and error mapping are present. MFA challenge state is not persisted across a reload. |
| Invitation acceptance and password reset | **BUILT** | Invite and reset routes call the backend token flows. |
| Forced first-login password change | **BUILT** | A `403 PASSWORD_CHANGE_REQUIRED` redirects to `/reset-password?forced=1`. |
| Facility selection | **BUILT** | `/select-facility` chooses a facility and the backend reissues the token with the facility claim. |
| Session bootstrap and tier routing | **BUILT** | `GET /identity/me` drives `SessionGate`; platform and staff tiers are separated by response shape. |
| Shared-workstation idle lock | **BUILT** | Mounted in both authenticated shells; default timeout is 10 minutes, configurable with `NEXT_PUBLIC_IDLE_TIMEOUT_MS`. Unlock re-authenticates via login and routes MFA accounts to `/mfa`. |
| Account security / MFA enrolment | **BUILT** | Enrolment secret and recovery sheet are shown once; confirmation uses a live code. |
| Facility setup and go-live | **BUILT** | Server-evaluated readiness checklist and `FACILITY_GO_LIVE` action. The platform console can review readiness but cannot take a facility live. |
| Facility profile | **BUILT** | Current-facility read/update with validation and server error mapping. |
| Organization units | **BUILT** | Unit tree, create/edit, deactivate and template application. |
| Number sequences | **BUILT** | Read-only view for `CONFIG_READ`; editing requires `CONFIG_SEQUENCE_MANAGE`. `STAFF_NUMBER` is checked before staff onboarding. |
| Print profile | **BUILT** | Read-only view for `CONFIG_READ`; editing requires `CONFIG_UPDATE`. |
| First-admin staff record and account link | **BUILT** | Implemented in `src/features/staff`; manually verified against the live backend. See section 4.1. |
| Platform facility registry | **BUILT** | List, client-side filter, empty/error/loading states, registration wizard and facility detail tabs. |
| Platform first-admin invitation | **BUILT** | `POST /api/v1/identity/facilities/{id}/first-admin`; the invited account receives a one-time bootstrap `FACILITY_ADMIN` grant and the link is shown once. |
| Platform administrator summary | **BUILT** | Read-only `FACILITY_ADMIN` grant summary from `/identity/facilities/{id}/admin-users`; no user-directory query and no clinical data. |
| Full staff directory | **NOT STARTED** | The current staff feature is only the first-administrator completion card. |
| User/role administration | **NOT STARTED** | No frontend screens for general user management, role templates or privileged assignment approval. |
| Patient, visit, clinical, billing, lab, pharmacy | **NOT STARTED** | Later blueprint phases. |
| Automated frontend tests | **PARTIAL** | Vitest, Testing Library and jsdom are configured. 12 unit/component tests cover pending-link storage, staff onboarding validation and the pending-link card. No Playwright/E2E suite yet. |

### 4.1 First-administrator staff link

**CONFIRMED** in
`src/features/staff/components/first-admin-staff-link.tsx`:

- The card appears on `/admin/setup` only for a `STAFF` session whose
  `/identity/me` response has no `staffId`.
- It requires `STAFF_REGISTER` and `STAFF_UPDATE`. When those permissions are
  absent it explains that the role update must be picked up by signing in
  again.
- It reads `STAFF_NUMBER` from the configuration API. If the sequence is
  missing, misconfigured or unreadable, the create action is blocked and the
  user is linked to `/admin/setup/sequences`.
- It creates one `ADMINISTRATOR` staff record with
  `POST /api/v1/staff`, stores the returned `staffId` in component state, then
  links it with `POST /api/v1/staff/{id}/link-user`.
- The returned `staffId` is also persisted in `localStorage`, keyed by account
  and facility, so a reload can recover a created-but-not-yet-linked record.
  The pending key is cleared once `/identity/me` reports a `staffId`.
- On recovery the card shows **Link staff record** instead of the create form,
  so the user cannot accidentally create a second staff record.
- The backend owns the one-time link rule and the staff-number sequence.
- A failed link offers **Retry link** rather than resubmitting the create form.
- A retry that receives `409 Conflict` reads the staff record back and treats
  the operation as successful only when `staff.userId` equals the current
  session user. This handles a lost response after the server committed the
  link.
- After a successful link, the card polls `/identity/me` briefly because the
  account-side `staffId` is latched by an asynchronous backend event. If the
  poll times out it says the link is recorded and offers a session refresh.
- The form keeps `sex: undefined` in its default values so an untouched form
  does not report itself as dirty.

---

## 5. Session and security posture

**CONFIRMED** from `src/lib/auth-store.ts`, `src/lib/http.ts` and
`src/features/identity/`:

- The access token is memory-only. It is never written to `localStorage` or
  `sessionStorage`.
- The refresh token is an HttpOnly cookie held by the backend origin. The
  frontend sends it with `withCredentials`.
- For authentication, only a non-secret session id is persisted, so a reload
  can resume the session by exchanging the refresh cookie. If storage is
  unavailable, the session simply does not survive a reload.
- The Axios client implements single-flight refresh on `401`, avoids refresh
  for credential-check endpoints, retries the original request once, and
  returns the user to login with a return URL when refresh fails.
- `403 PASSWORD_CHANGE_REQUIRED` is handled separately and forces the reset
  screen.
- `GET /api/v1/identity/me` supplies the user, account type, current facility,
  assigned facilities, effective permissions and `staffId`.
- Permission checks in the UI use `useCan`, `useHasAny` or explicit
  `session.permissions.includes(...)` checks. They are convenience only; the
  backend re-checks every request.
- `SessionGate` routes a missing session to login, a forced password change to
  reset, and a platform account away from the facility tier (and vice versa).
- The facility id travels in the access token as `fid`; the frontend does not
  send an `X-Facility-Id` header.
- Platform screens contain registry and administrative data only. The platform
  account model does not receive clinical or billing routes.
- `.env.example` is the only environment file tracked. `.env.local` and other
  `.env*` files are ignored by git.
- The pending staff-link key stores only the staff aggregate id, scoped by
  account and facility; it never stores names, clinical data or credentials.
  It is removed when the session reports `staffId`.
- API errors are rendered from RFC 7807 problem bodies; the shared helper maps
  `fieldErrors[]` onto form fields.

**VERIFY before production:** this repository has no automated authorization,
facility-isolation or session tests. The UI checks above do not replace the
backend's permission and facility-scope enforcement. Browser storage,
cookie attributes, CSP and deployment headers must be reviewed in the target
deployment environment rather than inferred from local development.

---

## 6. Verification evidence

### 6.1 Commands run in this pass

| Command | Result |
| --- | --- |
| `pnpm test` | Passed: 3 files, 12 tests. |
| `pnpm exec tsc --noEmit` | Passed. |
| `pnpm lint` | Passed. |
| `pnpm build` | Passed. Next.js produced the route table for the 19 application pages plus `_not-found`. |

The repository declares `pnpm@10.34.5`; the commands were run with that
package manager on Node `24.15.0`. See section 9 for the full re-verification
command list.

### 6.2 Manual staff-link verification

Performed in the prior pass against backend `192e935` and a clean development
facility, before the pending-link recovery change:

- A first administrator signed in without a linked staff record.
- With `STAFF_NUMBER` absent, `/admin/setup` showed the configuration warning
  and disabled the create action.
- After configuring `STAFF_NUMBER`, the form submitted successfully:
  `POST /api/v1/staff` returned `200`, then
  `POST /api/v1/staff/{id}/link-user` returned `200`.
- `/identity/me` initially still had `staffId = null`; the card's poll picked
  up the link without requiring a manual reload.
- Reloading the page showed the linked staff details (name, staff number,
  category and employment status).
- The untouched form no longer showed "You have unsaved changes." after the
  missing `sex` default was added.
- A second `POST /api/v1/staff/{id}/link-user` for the same user returned
  `409 Conflict`; the staff row count stayed at `1`. The frontend
  reconciliation path is implemented, but the UI retry was not forced
  end-to-end in that pass.
- No browser console warnings or errors were observed during the flow.

This is manual evidence, not an automated regression test.

The recovery change in `083d41b` is covered by a component test that renders
the card with a pre-populated pending id and asserts that the create form is
not offered and that **Link staff record** is shown. The storage helper is
unit-tested for account/facility scoping and clearing. The browser reload
path itself was not forced end-to-end.

### 6.3 Not proven

- No Playwright/E2E suite exists, and the browser reload path is not automated.
- No automated test proves authorization failures, expired grants, revoked
  sessions, facility isolation, idle-lock behavior or MFA recovery.
- No automated test proves the `409` reconciliation path.
- No end-to-end test proves the future clinical journey, because those screens
  do not exist yet.

---

## 7. Known gaps and limitations

1. **Test coverage is still limited.** Vitest/Testing Library exists, but only
   12 unit/component tests run. There is no Playwright/E2E coverage for
   authentication, facility isolation, idle lock or the clinical journey.
2. **Pending-link recovery is local, not server-idempotent.** The created
   `staffId` is persisted in `localStorage`, keyed by account and facility, and
   cleared once `/identity/me` reports a `staffId`. This survives a reload or
   browser restart on the same browser, but clearing site storage or using a
   different browser loses the recovery. A backend idempotency key would be
   stronger. There is also no UI action to discard a stale pending id.
3. **The `409` reconciliation is not exercised by an automated test.** It was
   confirmed on the backend and implemented in the client; the browser retry
   path was not forced end-to-end.
4. **The first-admin slice is narrower than a staff directory.** There is no
   general staff list, search, edit, deactivate or clinical-category
   management screen yet.
5. **No user/role administration screens.** General user management, role
   templates and privileged-assignment approval remain future work.
6. **The README route table is older than the app.** It lists 11 routes and
   calls `/platform` a Phase 0.10 stub. The current tree has 19 application
   pages, including the facility setup and platform facility screens. This
   status file is the current inventory; the README route table should be
   refreshed separately.
7. **Facility names are not in the session payload.** The `Session` type
   carries ids, permissions and account type, not facility display names, so
   parts of the shell show a short facility id. **CONFIRMED** in
   `src/lib/auth-store.ts` and the navbar code.
8. **MFA challenge state is memory-only.** Reloading `/mfa` loses the
   challenge token and returns the user to the start of the login flow. This is
   intentional for the short-lived token, but it is a usability gap.
9. **Idle unlock starts a fresh login session.** The lock screen re-runs login
   (and sends MFA accounts to `/mfa`) rather than resuming the existing token.
   It does not call logout before re-login, so the old session is left to its
   normal expiry.
10. **No generated OpenAPI types are checked in.** The `generate:api` script
    targets a backend `api-docs` endpoint, but `src/lib/api/generated` is
    absent; feature types are handwritten. Drift must be caught by review.
11. **No offline or low-bandwidth packaging work.** Queue polling, offline
    resilience and on-premise packaging are later-phase concerns.
12. **No patient or clinical privacy surfaces exist yet.** Consequently the
    frontend has not yet implemented a `PatientBanner`, `ReasonDialog`,
    PHI-access UI or break-glass indication. Those are **NOT STARTED**.

---

## 8. Next step

Before widening the frontend, complete the remaining Phase 0 administration
surface and add automated protection around what already exists:

1. Expand the Vitest/Testing Library suite beyond the initial 12 tests:
   session bootstrap, permission-gated navigation, forced password change,
   idle lock, the full first-admin staff-link state machine and the `409`
   reconciliation path.
2. Harden the first-admin onboarding further with a backend-supported
   idempotency key, or add a safe way to discard a stale pending id after
   confirming the record no longer exists. Local storage recovery alone cannot
   protect a different browser or cleared site data.
3. Build the remaining approved Phase 0 administration screens (staff
   directory and user/role administration) only after checking them against
   the blueprint and backend contracts.
4. Then proceed to the Phase 1 OPD journey in the order defined by the
   blueprint. Do not pull Phase 2+ screens forward without an explicit
   decision.
5. Refresh the README route table and link it to this status file.

---

## 9. Re-verification

Prerequisites:

- Backend running at `http://localhost:8080` (or set `NEXT_PUBLIC_API_URL`).
- A migrated development database with the permission catalogue, role
  templates and reference data seeded.
- `.env.local` based on `.env.example`. It is ignored by git; never commit
  credentials.

Commands:

```bash
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm dev
```

Use `pnpm test:watch` while iterating. The test runner is configured with the
threads pool because the default fork pool timed out while starting workers on
this Windows setup.

Manual smoke path:

1. Sign in as a facility administrator and select a facility.
2. Open `/admin/setup` and confirm the readiness checklist and staff-link card
   render.
3. Confirm a missing `STAFF_NUMBER` blocks staff creation and links to
   `/admin/setup/sequences`.
4. Configure the sequence, create and link the first staff record, then reload
   `/identity/me` and `/admin/setup` and confirm the linked record appears.
5. If a link fails, reload `/admin/setup` and confirm the card shows the
   pending staff record and **Link staff record** instead of the create form.
   Retry the link and confirm the session eventually reports the staff link.
6. Sign in as a platform account and confirm `/platform` and
   `/platform/facilities` contain no patient or clinical data.
7. Repeat with a facility that the user is not assigned to and confirm the
   backend denies or returns no data. This is a backend test, not a UI test.

`pnpm test` covers the pending-link storage and pending-card rendering, but it
does not replace the browser checks above. A green typecheck, lint and build
does **not** prove the manual flows.

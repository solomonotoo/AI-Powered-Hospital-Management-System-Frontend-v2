# Frontend Implementation Status

Last verified: **2026-10-27**, branch `feature/admin-foundation-screens`
(on top of `31784ae`), against backend `192e935` (`main`).

Verification in this pass: `pnpm test` (10 files, 62 tests),
`pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` (29 application pages
plus the framework `_not-found` route), and `pnpm test:e2e` (4 Playwright
browser tests) all passed. The OpenAPI contract was regenerated with
`pnpm generate:api` into `src/api/generated/openapi-types.ts`; it currently
contains 73 Phase 0 paths. The browser suite drives the real Next.js UI
against a deterministic in-test API stub; it does not use seeded credentials
or the local database. The first-administrator staff-link flow was exercised
manually in an earlier pass. The new administration screens have not yet been
manually exercised against a live backend. See section 6 for the exact
evidence and section 7 for limitations.

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
- Vitest `5.x`, Testing Library and jsdom for unit/component tests.
- Playwright `1.64.x` for browser tests. The configured project uses the
  installed Google Chrome channel instead of downloading a bundled browser.
- `pnpm@10.34.5` declared as the package manager; `pnpm-lock.yaml` is checked
  in.
- `openapi-typescript` generated contract types in
  `src/api/generated/openapi-types.ts`, regenerated with `pnpm generate:api`
  against the backend OpenAPI document.

The app currently covers the **late Phase 0 frontend shell and administration
foundation**:

- identity journeys (login, MFA, invitations, password reset, forced password
  change, facility selection);
- the authenticated facility shell (dashboard, security, idle lock);
- facility profile, organization units, setup/go-live, number sequences and
  print profile;
- staff directory, registration, detail, profile/status/licence/posting
  actions and the dashboard licence-expiry watch;
- user directory, invitation, account actions and per-user audit activity;
- facility role list, custom-role creation/editing/cloning/deletion and
  permission-grid management, plus role assignment;
- facility-scoped audit search;
- the platform console (facility registry, registration, readiness, first
  administrator invitation and administrator summary);
- the first-administrator staff record and account-link slice.

Patient, visit, clinical, billing, laboratory and pharmacy screens are **NOT
STARTED**; they belong to later blueprint phases. The critical journey
`register -> visit -> triage -> consult -> pay -> dispense` therefore cannot be
executed in this frontend yet.

---

## 3. Route inventory

**CONFIRMED** from the `src/app` route tree. There are 29 application pages
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
| `/admin/staff` | facility | `STAFF_READ`; register button needs `STAFF_REGISTER` | Paged staff directory with search and licence/status summaries. |
| `/admin/staff/new` | facility | `STAFF_REGISTER` | Multi-step staff registration; the optional first posting needs `STAFF_ASSIGN`. |
| `/admin/staff/[id]` | facility | `STAFF_READ`; actions need `STAFF_UPDATE`, `STAFF_STATUS_MANAGE`, `STAFF_LICENCE_MANAGE` or `STAFF_ASSIGN` | Staff profile, account link, postings, licences and employment status. |
| `/admin/users` | facility | `IDENTITY_USER_READ`; invite button needs `IDENTITY_USER_INVITE` | Paged user-account directory. |
| `/admin/users/invite` | facility | `IDENTITY_USER_INVITE` | Create an invitation and reveal its one-time token. |
| `/admin/users/[id]` | facility | `IDENTITY_USER_READ`; actions use separate identity permissions | Account facts, audited actions, MFA/password reset and role assignment. |
| `/admin/roles` | facility | `IDENTITY_ROLE_READ`; create button needs `IDENTITY_ROLE_MANAGE` | Facility role list and template/custom-role distinction. |
| `/admin/roles/new` | facility | `IDENTITY_ROLE_MANAGE` | Create a custom role from the permission catalogue. |
| `/admin/roles/[code]` | facility | `IDENTITY_ROLE_READ`; edit/clone/delete need `IDENTITY_ROLE_MANAGE` | Role permission grid and custom-role lifecycle. |
| `/admin/audit` | facility | `AUDIT_READ` | Facility-scoped audit search with pagination. |
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
| Staff directory and record management | **BUILT** | Paged facility-scoped list/search, registration wizard, detail, profile edit, employment-status changes with reason, licence append and unit postings. The dashboard shows the server-computed expiring-licence watch. Qualification entry and richer directory filters are not implemented. |
| User account administration | **BUILT** | Paged account directory, email invitation with one-time token, account detail, disable/enable/unlock, password-reset token, MFA reset and per-user audit activity. Pending-assignment approval, existing assignment/session lists and platform-account administration are blocked on missing backend endpoints. |
| Role administration and assignment | **BUILT** | Facility role list, custom-role create/edit/clone/delete, catalogue-driven permission grid and role assignment scoped to the current facility. Privileged grants remain subject to backend maker-checker. |
| Audit search | **BUILT** | Facility-scoped search by stream, outcome, action, actor and date range, with pagination and an event-detail view. The admin UI omits patient filters so patient identifiers do not enter query strings. Export and anomaly dashboards are not implemented. |
| Patient, visit, clinical, billing, lab, pharmacy | **NOT STARTED** | Later blueprint phases. |
| Automated frontend tests | **PARTIAL** | Vitest, Testing Library and jsdom cover 62 unit/component cases: session bootstrap, session-gate routing, navigation permissions, idle timeout/lock, pending-link storage, staff onboarding validation (including blank optional licence rows), role/assignment date mapping, date-only formatting and the staff-link retry/`409`/safe-discard state machine. Playwright runs 4 browser tests against a deterministic API stub: login plus reload/resume, idle lock/unlock, failed-link/reload/`409` reconciliation, and safe stale-pending discard. The browser suite proves UI transitions, not backend authorization or facility isolation. |

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
- A stale pending id can be discarded only after `GET /staff/{id}` confirms
  the record is gone. The current backend reports that as `400 BAD_REQUEST` /
  `Unknown staff: <id>`; a future `404` is also accepted. The card refuses to
  discard a record that still exists, and reconciles instead when the record is
  already linked to the current user.
- If a link attempt itself returns the unknown-staff response, the stale
  pending id is cleared and the create form returns. The read-back and discard
  paths use `GET /staff/{id}`, which the backend authorizes with `STAFF_READ`.
- After a successful link, the card polls `/identity/me` briefly because the
  account-side `staffId` is latched by an asynchronous backend event. If the
  poll times out it says the link is recorded and offers a session refresh.
- The form keeps `sex: undefined` in its default values so an untouched form
  does not report itself as dirty.

### 4.2 Staff directory and record management

**CONFIRMED** in `src/features/staff` and the `/admin/staff` routes:

- `GET /api/v1/staff` supplies the facility-scoped, paged directory. The
  screen debounces its `q` search and supports server pagination; the current
  backend exposes no category or employment-status filters.
- `/admin/staff/new` posts the whole registration form once, then optionally
  posts the first unit assignment as a second call. If onboarding succeeds and
  the posting fails, the created staff id is kept so the retry cannot create a
  duplicate. Blank optional licence rows are removed before validation and
  mapping.
- `/admin/staff/[id]` shows identity/contact facts, qualifications (read-only),
  licences, postings and the linked account. Profile edits, employment-status
  changes (with mandatory reason), licence renewal appends and postings are
  separate actions gated by their own permissions.
- Posting pickers use only active units. Historical postings still resolve
  inactive unit names when the caller has `FACILITY_READ`.
- The dashboard licence watch calls `/api/v1/staff/licences/expiring` and is
  shown only with `STAFF_LICENCE_MANAGE`.
- The UI does not collect qualifications during registration or add them later.
  Employee-number generation and the sequence readiness rule remain backend
  responsibilities.

### 4.3 User and role administration

**CONFIRMED** in `src/features/identity` and the `/admin/users` and
`/admin/roles` routes:

- `GET /api/v1/identity/users` supplies the paged account directory. Invitation
  is email-only and reveals the returned one-time `invitationToken`; the
  account starts in `INVITED` state.
- Account detail exposes disable/enable/unlock, password-reset token and MFA
  reset through their own backend permissions. Actions are audited by the
  backend and refresh the user query cache.
- Role assignment posts a facility/optional-unit scope and maps a date-only
  `validTo` to `23:59:59.999Z` because the backend's validity check is
  inclusive.
- The role list requests the `FACILITY` tier. System templates are read-only;
  custom roles can be created, renamed, re-permissioned, cloned and deleted
  subject to `IDENTITY_ROLE_MANAGE`. The permission grid is built from the
  catalogue and marks sensitive/privileged permissions.
- There is no pending-approval screen because no endpoint lists pending
  assignments. The user-detail screen also cannot list existing assignments or
  sessions because those listing endpoints do not exist. Assignment outcomes
  remain traceable through audit.

### 4.4 Audit search

**CONFIRMED** in `src/features/audit` and `/admin/audit`:

- `GET /api/v1/audit/events` is searched with stream, outcome, action, actor id
  and from/to date filters plus pagination. The backend forces the caller's
  facility into the query.
- Date-only end filters are sent as `23:59:59.999Z`, matching the backend's
  inclusive `to` comparison.
- The table avoids rendering raw `changeSet` as structured data; it is shown as
  an opaque, backend-masked value in the detail panel.
- The UI deliberately offers no patient identifier filter, so patient
  identifiers do not enter the audit URL. The per-user activity tab calls
  `GET /api/v1/audit/users/{id}/activity` and is shown only with `AUDIT_READ`.
- Audit export, retention configuration and anomaly detection are not
  implemented in this frontend.

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

**VERIFY before production:** this repository has no automated backend
authorization or facility-isolation tests. The Playwright suite covers the
client-side session bootstrap and idle-lock paths against a stub, but the UI
checks above do not replace the backend's permission and facility-scope
enforcement. Browser storage, cookie attributes, CSP and deployment headers
must be reviewed in the target deployment environment rather than inferred
from local development.

---

## 6. Verification evidence

### 6.1 Commands run in this pass

| Command | Result |
| --- | --- |
| `pnpm generate:api` | Regenerated `src/api/generated/openapi-types.ts` from the live backend OpenAPI document (73 Phase 0 paths). |
| `pnpm test` | Passed: 10 files, 62 tests. |
| `pnpm test:e2e` | Passed: 4 Playwright tests in Chromium (installed Chrome channel). |
| `pnpm exec tsc --noEmit` | Passed. |
| `pnpm lint` | Passed. |
| `pnpm build` | Passed. Next.js produced the route table for 29 application pages plus `_not-found`. |

The repository declares `pnpm@10.34.5`; the commands were run with that
package manager on Node `24.15.0`. See section 9 for the full re-verification
command list.

### 6.2 Playwright browser evidence

The Playwright suite runs against a production build on port `3100` with
`NEXT_PUBLIC_API_URL` pointed at the same origin and
`NEXT_PUBLIC_IDLE_TIMEOUT_MS=8000`. Every `/api/v1/**` request is fulfilled by
`tests/e2e/support/api-stub.ts`; no backend process, database, or seeded account
is required. The stub is stateful and deliberately returns a failed first
staff-link response followed by a `409` on retry, with the staff row reading
back as the same user.

The four tests cover:

- username/password sign-in through the real login form, followed by a full
  reload that loses the in-memory access token and resumes through
  `POST /auth/refresh` plus `GET /identity/me`;
- the idle lock appearing after the configured timeout, followed by password
  unlock and session refetch;
- first-admin staff creation, a failed link, a page reload that restores the
  pending staff id, a retry that receives `409 Conflict`, same-user
  reconciliation through the staff read, and the linked card rendering;
- a stale pending id whose staff read returns the backend's unknown-staff
  error; the discard dialog clears the local id only after that read, and the
  create form returns.

The suite does not prove backend authentication, authorization, refresh-cookie
rotation, facility isolation, audit behavior, or real database constraints.
Those remain backend-suite responsibilities.

### 6.3 Manual staff-link verification

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

The recovery change in `083d41b` is covered by component tests that render the
card with a pre-populated pending id, assert that the create form is not
offered, and exercise the link/retry state. The storage helper is unit-tested
for account/facility scoping and clearing. One test treats a `409` as success
when the staff record belongs to the current user; another rejects the same
`409` when it belongs to a different user. The browser reload and retry paths
are now covered by the Playwright suite in section 6.2; those tests use the
API stub rather than the live backend.

### 6.4 Not proven

- The Playwright suite uses an in-test API stub. It does not prove backend
  authentication, authorization, refresh-cookie rotation, audit behavior,
  database constraints, or facility isolation against a real backend.
- No full-stack browser test exists against the local backend with seeded
  identities. The session-bootstrap unit test and Playwright test cover
  client-side success/failure handling only.
- The new staff, user, role and audit screens are covered by typecheck, lint,
  production build and focused schema tests. They have not been exercised
  manually against a live backend, and they have no Playwright coverage. Their
  backend permission, facility-scope and audit behavior is therefore
  **VERIFY** rather than proven by this frontend suite.
- No end-to-end test proves the future clinical journey, because those screens
  do not exist yet.

---

## 7. Known gaps and limitations

1. **Test coverage is still limited.** 62 unit/component tests and 4 Playwright
   browser tests run. The browser suite uses an API stub, so it does not prove
   real backend authentication, facility isolation or the clinical journey. The
   new staff, user, role and audit screens have no Playwright coverage.
2. **Pending-link recovery is local, not server-idempotent.** The created
   `staffId` is persisted in `localStorage`, keyed by account and facility, and
   cleared once `/identity/me` reports a `staffId`. This survives a reload or
   browser restart on the same browser, but clearing site storage or using a
   different browser loses the recovery. A backend idempotency key would be
   stronger. A safe discard action now clears a stale id only after the backend
   confirms the record is unknown, but it cannot recover across browsers or
   cleared site storage.
3. **The `409` reconciliation is browser-tested against a stub.** Same-user
   and different-user `409` responses are covered by component tests, and the
   full failed-link, reload and browser retry sequence is covered by
   Playwright. Safe discard is covered by component and browser tests, but the
   real backend's missing-staff, conflict and database behavior is not
   exercised by the frontend suite.
4. **Staff administration is not blueprint-complete.** The screens cover
   registration, profile edits, status changes, licences, postings and the
   expiring-licence watch, but the current backend exposes no qualification
   entry, category-change or richer server-side directory filters. The
   registration wizard therefore collects no qualifications, and directory
   search is limited to the backend's `q` parameter.
5. **The backend user directory and account actions are not facility-scoped.**
   **CONFIRMED** in `UserDirectoryHandler` and `UserAdminController`:
   `GET /identity/users`, `GET /identity/users/{id}` and the disable, enable,
   unlock, password-reset and MFA-reset actions do not take a facility scope.
   A facility administrator with the relevant permission can therefore list
   accounts outside their facility and act on a known account id. The frontend
   cannot correct this safely because `UserView` carries no facility id; this
   must be fixed in the backend before production. The UI gates the screens and
   actions by permission but does not claim facility isolation.
6. **Several approved administration surfaces are blocked by missing
   endpoints.** There is no pending-assignment listing, so the approvals screen
   is not built. The user-detail screen cannot list existing assignments or
   sessions, and the UI does not offer approve/reject/revoke forms because it
   has no way to discover the assignment ids those endpoints require. Platform
   account administration is deferred by the backend.
7. **The README route table is older than the app.** It lists 11 routes and
   calls `/platform` a Phase 0.10 stub. The current tree has 29 application
   pages, including the staff, user, role and audit administration screens.
   This status file is the current inventory; the README route table should be
   refreshed separately.
8. **Facility names are not in the session payload.** The `Session` type
   carries ids, permissions and account type, not facility display names, so
   parts of the shell show a short facility id. **CONFIRMED** in
   `src/lib/auth-store.ts` and the navbar code.
9. **MFA challenge state is memory-only.** Reloading `/mfa` loses the
   challenge token and returns the user to the start of the login flow. This is
   intentional for the short-lived token, but it is a usability gap.
10. **Idle unlock starts a fresh login session.** The lock screen re-runs login
    (and sends MFA accounts to `/mfa`) rather than resuming the existing token.
    It does not call logout before re-login, so the old session is left to its
    normal expiry.
11. **Generated OpenAPI types are checked in, but the backend does not yet
    expose Phase 1 contracts.** `pnpm generate:api` regenerates
    `src/api/generated/openapi-types.ts` from
    `http://localhost:8080/api-docs`. The checked-in document currently
    contains 73 Phase 0 paths and no patient, visit, clinical or billing
    endpoints. Phase 1 frontend work must import these generated types rather
    than hand-writing contract clones, and the file must be regenerated after
    the backend exposes each Phase 1 endpoint. The current generated file is
    not a Phase 1 contract.
12. **No offline or low-bandwidth packaging work.** Queue polling, offline
    resilience and on-premise packaging are later-phase concerns.
13. **No patient or clinical privacy surfaces exist yet.** Consequently the
    frontend has not yet implemented a `PatientBanner`, `ReasonDialog`,
    PHI-access UI or break-glass indication. Those are **NOT STARTED**. The
    audit screen also does not expose patient-access history or break-glass
    review, which belong to later confirmed scope.
14. **Audit administration is read-only.** Search, pagination and event detail
    exist, but export, retention configuration, anomaly detection and compliance
    dashboards are not implemented.

---

## 8. Next step

Before widening the frontend into Phase 1, verify the new administration
surface against a live backend and close the backend gaps that block the
remaining Phase 0 screens:

1. Exercise the staff directory, registration, detail actions, user actions,
   role editor/assignment and audit search against backend `192e935` with at
   least two facilities. Record the result here. This is the missing manual or
   full-stack evidence for the new screens.
2. Fix the backend user directory and account-action facility scope before
   relying on the user-administration screen in production. The frontend cannot
   compensate for a global account list.
3. Add the backend listing endpoints needed for pending-assignment approval and
   for a user's existing assignments and sessions. Only then build those
   remaining administration screens.
4. A safe stale-pending discard flow is implemented and covered by component
   and browser tests. Optional remaining hardening: add a backend-supported
   idempotency key if recovery across browsers or cleared site data is
   required.
5. Keep extending Vitest and Playwright where a browser adds value; backend
   authorization and facility-isolation proof still belongs to the backend
   test suite.
6. Then proceed to the Phase 1 OPD journey in the order defined by the
   blueprint. Do not pull Phase 2+ screens forward without an explicit
   decision. Phase 1 screen contracts must import
   `src/api/generated/openapi-types.ts`; regenerate it after the backend
   exposes each endpoint.
7. Refresh the README route table and link it to this status file.

---

## 9. Re-verification

Prerequisites:

- Backend running at `http://localhost:8080` (or set `NEXT_PUBLIC_API_URL`).
- A migrated development database with the permission catalogue, role
  templates and reference data seeded.
- `.env.local` based on `.env.example`. It is ignored by git; never commit
  credentials.
- Google Chrome installed for the Playwright project's `channel: "chrome"`.
  The Playwright browser CDN is not required. `pnpm test:e2e` starts its own
  production build on port `3100` with the API stub; it does not need the
  backend or the development database.

Commands:

```bash
pnpm install
pnpm generate:api   # requires the backend on http://localhost:8080
pnpm test
pnpm test:e2e
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm dev
```

Use `pnpm test:watch` while iterating. The test runner is configured with the
threads pool because the default fork pool timed out while starting workers on
this Windows setup. Use `pnpm test:e2e:ui` to inspect browser traces locally.

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
6. Set the pending key to an unknown UUID, reload `/admin/setup`, and confirm
   **Discard pending record** clears the local id only after the backend
   reports the staff record is gone. With an existing record, confirm it
   refuses to discard.
7. Open `/admin/staff`, register a non-clinical staff member without a licence
   and confirm the blank optional licence row does not block submission. Open
   the record and exercise a profile edit, status change with a reason, licence
   append and posting.
8. Invite a user from `/admin/users/invite`, reveal the one-time token, open the
   account, issue a password-reset token and assign a facility role. Confirm
   `/admin/roles` shows templates and custom roles, and that a template is
   read-only.
9. Open `/admin/audit`, filter by stream and date range, open an event detail
   and confirm `changeSet` is shown as opaque text. Confirm `/admin/users/[id]`
   activity uses the same audit data.
10. Sign in as a platform account and confirm `/platform` and
    `/platform/facilities` contain no patient or clinical data.
11. Repeat with a facility that the user is not assigned to and confirm the
    backend denies or returns no data. Pay particular attention to the known
    global user-directory gap in section 7.5. This is a backend test, not a UI
    test.

`pnpm test` covers session bootstrap, session-gate routing, navigation
permissions, idle timeout/lock, pending-link storage, staff onboarding
validation, role/assignment date mapping, date-only formatting and the
staff-link retry/`409` states. `pnpm test:e2e` drives the existing login,
idle-lock and staff-link flows in Chrome against the API stub. Neither replaces
the backend checks or the live manual smoke path above, and a green typecheck,
lint and build does **not** prove the manual flows.

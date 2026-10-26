import type { Page, Route } from "@playwright/test";

// Deterministic API stub for browser tests.
//
// The tests drive the real Next.js login form, session bootstrap, idle
// lock and first-admin staff-link UI. The backend is stubbed here so the
// suite does not depend on seeded credentials or the developer's local
// database. Backend authorization and facility-isolation proof live in
// the backend test suite, as documented in IMPLEMENTATION_STATUS.md.

export const TEST_USER = {
  username: "admin@example.test",
  password: "correct-password",
} as const;

export const TEST_USER_ID = "user-1";
export const TEST_FACILITY_ID = "facility-1";
export const TEST_STAFF_ID = "11111111-1111-4111-8111-111111111111";
export const PENDING_STAFF_KEY = `hms.pending-staff-link:${TEST_USER_ID}:${TEST_FACILITY_ID}`;

const PERMISSIONS = [
  "FACILITY_UPDATE",
  "FACILITY_UNIT_MANAGE",
  "FACILITY_GO_LIVE",
  "CONFIG_READ",
  "STAFF_REGISTER",
  "STAFF_UPDATE",
];

const FACILITY = {
  id: TEST_FACILITY_ID,
  code: "FAC-001",
  name: "E2E District Hospital",
  type: "DISTRICT_HOSPITAL",
  region: "Greater Accra",
  district: "Accra Metropolitan",
  status: "LIVE",
  timezone: "Africa/Accra",
  licenceNumber: null,
  addressLine1: "1 Test Road",
  addressLine2: null,
  addressCity: "Accra",
  addressCountry: "Ghana",
  contactPhone: null,
  contactEmail: null,
  licenceBody: null,
  nhiaAccreditationCode: null,
  ownership: "GOVERNMENT",
};

const READINESS = [
  {
    item: "Facility profile",
    passed: true,
    detail: "The facility profile is complete.",
  },
  {
    item: "Number sequences",
    passed: true,
    detail: "All required number sequences are configured.",
  },
  {
    item: "First administrator",
    passed: true,
    detail: "An administrator staff record is present.",
  },
];

const SEQUENCES = [
  {
    type: "STAFF_NUMBER",
    configured: true,
    prefix: "STF-",
    startValue: 1,
    nextValue: 2,
    padding: 4,
    resetPolicy: "NEVER",
    currentPeriod: null,
  },
];

const STAFF_DETAIL = {
  id: TEST_STAFF_ID,
  staffNumber: "STF-0001",
  firstName: "Ama",
  lastName: "Mensah",
  maidenName: null,
  preferredName: null,
  displayName: "Ama Mensah",
  sex: "FEMALE",
  dateOfBirth: "1990-01-01",
  phone: "0241234567",
  email: TEST_USER.username,
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
  category: "ADMINISTRATOR",
  specialty: null,
  employmentStatus: "ACTIVE",
  userId: TEST_USER_ID,
  primaryUnitId: null,
  licenceExpiring: false,
  licences: [],
  assignments: [],
  qualifications: [],
};

export interface ApiStubState {
  loginCalls: number;
  refreshCalls: number;
  identityCalls: number;
  createStaffCalls: number;
  linkStaffCalls: number;
  getStaffCalls: number;
  linked: boolean;
}

export interface ApiStub {
  state: ApiStubState;
}

function problem(status: number, code: string, message: string) {
  return {
    type: "about:blank",
    title: status === 409 ? "Conflict" : "Request failed",
    status,
    code,
    message,
    traceId: "e2e-trace",
  };
}

function currentPermissions(): string[] {
  return [...PERMISSIONS];
}

/**
 * Install a page-level stub for every backend call the tested screens
 * make. The handler is deliberately stateful: the first staff-link call
 * simulates a lost/failed response, and a later 409 reads the staff row
 * back to prove same-account reconciliation.
 */
export async function installApiStub(page: Page): Promise<ApiStub> {
  const state: ApiStubState = {
    loginCalls: 0,
    refreshCalls: 0,
    identityCalls: 0,
    createStaffCalls: 0,
    linkStaffCalls: 0,
    getStaffCalls: 0,
    linked: false,
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;
    const origin = request.headers()["origin"] ?? "http://localhost:3100";
    const corsHeaders: Record<string, string> = {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      vary: "Origin",
    };

    const respond = async (status: number, body?: unknown) => {
      await route.fulfill({
        status,
        contentType: "application/json",
        headers: corsHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    };

    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders,
          "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "access-control-allow-headers":
            request.headers()["access-control-request-headers"] ??
            "authorization,content-type",
        },
      });
      return;
    }

    if (method === "POST" && path === "/api/v1/auth/login") {
      state.loginCalls += 1;
      await respond(200, {
        accessToken: `access-login-${state.loginCalls}`,
        sessionId: "session-e2e",
        userId: TEST_USER_ID,
        username: TEST_USER.username,
        accountType: "STAFF",
        facilityId: TEST_FACILITY_ID,
        facilities: [TEST_FACILITY_ID],
        permissions: currentPermissions(),
        mustChangePassword: false,
        mfaRequired: false,
      });
      return;
    }

    if (method === "POST" && path === "/api/v1/auth/refresh") {
      state.refreshCalls += 1;
      await respond(200, {
        accessToken: `access-refresh-${state.refreshCalls}`,
        facilityId: TEST_FACILITY_ID,
        permissions: currentPermissions(),
      });
      return;
    }

    if (method === "GET" && path === "/api/v1/identity/me") {
      state.identityCalls += 1;
      await respond(200, {
        userId: TEST_USER_ID,
        username: TEST_USER.username,
        accountType: "STAFF",
        staffId: state.linked ? TEST_STAFF_ID : null,
        mustChangePassword: false,
        facilityId: TEST_FACILITY_ID,
        facilities: [TEST_FACILITY_ID],
        permissions: currentPermissions(),
      });
      return;
    }

    if (method === "GET" && path === "/api/v1/facilities/current") {
      await respond(200, FACILITY);
      return;
    }

    if (method === "GET" && path === "/api/v1/facilities/current/readiness") {
      await respond(200, READINESS);
      return;
    }

    if (method === "GET" && path === "/api/v1/configuration/sequences") {
      await respond(200, SEQUENCES);
      return;
    }

    if (method === "POST" && path === "/api/v1/staff") {
      state.createStaffCalls += 1;
      await respond(200, { staffId: TEST_STAFF_ID });
      return;
    }

    if (
      method === "POST" &&
      /^\/api\/v1\/staff\/[^/]+\/link-user$/.test(path)
    ) {
      state.linkStaffCalls += 1;
      if (state.linkStaffCalls === 1) {
        // Simulate a committed link whose response was lost: the next
        // browser reload must recover from the pending staff id.
        await respond(
          500,
          problem(500, "LINK_FAILED", "Simulated link failure"),
        );
      } else {
        await respond(
          409,
          problem(
            409,
            "STAFF_ALREADY_LINKED",
            "This staff record is already linked to an account",
          ),
        );
      }
      return;
    }

    if (method === "GET" && /^\/api\/v1\/staff\/[^/]+$/.test(path)) {
      state.getStaffCalls += 1;
      // Reading the row back after the 409 is how the UI proves the link
      // belongs to this same account. The identity endpoint then reflects
      // the link so the card can switch to its linked state.
      state.linked = true;
      await respond(200, STAFF_DETAIL);
      return;
    }

    if (method === "POST" && path === "/api/v1/auth/logout") {
      await respond(200, {});
      return;
    }

    // Safe fallback for incidental calls from the shell or setup page.
    await respond(200, {});
  });

  return { state };
}

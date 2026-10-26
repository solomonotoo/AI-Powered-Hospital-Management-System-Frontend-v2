import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingStaffLink,
  readPendingStaffLink,
  savePendingStaffLink,
} from "./pending-staff-link";

const USER = "user-1";
const OTHER_USER = "user-2";
const FACILITY = "facility-1";
const OTHER_FACILITY = "facility-2";

beforeEach(() => {
  window.localStorage.clear();
});

describe("pending staff link storage", () => {
  it("returns null when no create is pending", () => {
    expect(readPendingStaffLink(USER, FACILITY)).toBeNull();
  });

  it("recovers the created staff id for the same account and facility", () => {
    savePendingStaffLink(USER, FACILITY, "staff-1");

    expect(readPendingStaffLink(USER, FACILITY)).toBe("staff-1");
  });

  it("does not leak a pending id to another account or facility", () => {
    savePendingStaffLink(USER, FACILITY, "staff-1");

    expect(readPendingStaffLink(OTHER_USER, FACILITY)).toBeNull();
    expect(readPendingStaffLink(USER, OTHER_FACILITY)).toBeNull();
  });

  it("clears only the matching pending id", () => {
    savePendingStaffLink(USER, FACILITY, "staff-1");
    savePendingStaffLink(OTHER_USER, FACILITY, "staff-2");

    clearPendingStaffLink(USER, FACILITY);

    expect(readPendingStaffLink(USER, FACILITY)).toBeNull();
    expect(readPendingStaffLink(OTHER_USER, FACILITY)).toBe("staff-2");
  });

  it("ignores empty ids", () => {
    savePendingStaffLink(USER, FACILITY, "");

    expect(readPendingStaffLink(USER, FACILITY)).toBeNull();
    expect(readPendingStaffLink("", FACILITY)).toBeNull();
  });
});

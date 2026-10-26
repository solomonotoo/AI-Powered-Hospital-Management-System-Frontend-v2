import { describe, expect, it } from "vitest";
import {
  facilityNav,
  isNavItemAllowed,
  type NavItem,
} from "./nav-config";

function item(title: string): NavItem {
  const found = facilityNav
    .flatMap((section) => section.items)
    .find((candidate) => candidate.title === title);

  if (!found) throw new Error(`Missing navigation item: ${title}`);
  return found;
}

describe("isNavItemAllowed", () => {
  it("always allows items without a permission list", () => {
    expect(isNavItemAllowed(item("Dashboard"), null)).toBe(true);
    expect(isNavItemAllowed(item("Dashboard"), [])).toBe(true);
  });

  it("fails closed for permission-gated items when there is no session", () => {
    expect(isNavItemAllowed(item("Setup & go-live"), null)).toBe(false);
    expect(isNavItemAllowed(item("Setup & go-live"), [])).toBe(false);
  });

  it("allows a gated item when the session holds its permission", () => {
    expect(
      isNavItemAllowed(item("Setup & go-live"), ["FACILITY_UPDATE"]),
    ).toBe(true);
    expect(
      isNavItemAllowed(item("Number sequences"), ["CONFIG_READ"]),
    ).toBe(true);
  });

  it("does not allow a gated item for an unrelated permission", () => {
    expect(
      isNavItemAllowed(item("Setup & go-live"), ["CONFIG_READ"]),
    ).toBe(false);
    expect(
      isNavItemAllowed(item("Number sequences"), ["FACILITY_UPDATE"]),
    ).toBe(false);
  });

  it("treats a permission list as ANY-OF", () => {
    const anyOf: NavItem = {
      ...item("Dashboard"),
      permissions: ["FIRST_PERMISSION", "SECOND_PERMISSION"],
    };

    expect(isNavItemAllowed(anyOf, ["SECOND_PERMISSION"])).toBe(true);
  });

  it("gates the administration entries on their read permissions", () => {
    expect(item("Staff").permissions).toEqual(["STAFF_READ"]);
    expect(item("Users").permissions).toEqual(["IDENTITY_USER_READ"]);
    expect(item("Roles").permissions).toEqual(["IDENTITY_ROLE_READ"]);
    expect(item("Audit").permissions).toEqual(["AUDIT_READ"]);

    expect(
      isNavItemAllowed(item("Staff"), ["IDENTITY_USER_READ"]),
    ).toBe(false);
  });
});

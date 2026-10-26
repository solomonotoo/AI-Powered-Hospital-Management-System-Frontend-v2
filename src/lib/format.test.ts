import { describe, expect, it } from "vitest";
import { formatIsoDate } from "./format";

describe("formatIsoDate", () => {
  it("formats a date-only value without a timezone shift", () => {
    expect(formatIsoDate("2026-01-01")).toBe("01 Jan 2026");
    expect(formatIsoDate("2026-12-31")).toBe("31 Dec 2026");
  });

  it("returns the input when the value is not a valid date", () => {
    expect(formatIsoDate("not-a-date")).toBe("not-a-date");
  });
});

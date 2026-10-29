import { describe, expect, it } from "vitest";
import { formatDateRange, parseDateRange } from "./date-range-column";

describe("daterange column mapping", () => {
  it("round-trips a stay through Postgres' [lower,upper) text form", () => {
    const stay = { checkIn: "2026-11-02", checkOut: "2026-11-05" };
    expect(formatDateRange(stay)).toBe("[2026-11-02,2026-11-05)");
    expect(parseDateRange("[2026-11-02,2026-11-05)")).toEqual(stay);
  });

  it("refuses any other bound shape instead of guessing", () => {
    expect(() => parseDateRange("[2026-11-02,2026-11-05]")).toThrow();
    expect(() => parseDateRange("empty")).toThrow();
  });
});

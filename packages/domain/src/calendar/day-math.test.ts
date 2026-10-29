import { describe, expect, it } from "vitest";
import { addDays, daysBetween, todayInTimeZone } from "./day-math";

describe("addDays / daysBetween", () => {
  it("crosses month, year and daylight-saving boundaries in whole days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    // Paris changes clocks on 2026-10-25: still exactly one day.
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
    expect(daysBetween("2026-11-05", "2026-11-02")).toBe(-3);
  });

  it("rejects text that is not a calendar date", () => {
    expect(() => addDays("2026-02-30", 1)).toThrow(RangeError);
  });
});

describe("todayInTimeZone", () => {
  it("uses the calendar date of the given time zone, not of the machine", () => {
    const lateEveningUtc = new Date("2026-10-29T23:30:00Z");
    expect(todayInTimeZone(lateEveningUtc, "Europe/Paris")).toBe("2026-10-30");
    expect(todayInTimeZone(lateEveningUtc, "America/New_York")).toBe("2026-10-29");
  });
});

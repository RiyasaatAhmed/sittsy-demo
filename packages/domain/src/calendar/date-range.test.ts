import { describe, expect, it } from "vitest";
import {
  addMonths,
  formatRange,
  fromIsoDate,
  isInside,
  monthWeeks,
  nextRange,
  NO_DATES,
  toIsoDate,
} from "./date-range";

describe("ISO dates", () => {
  it("round-trips a local date", () => {
    expect(toIsoDate(new Date(2026, 9, 29))).toBe("2026-10-29");
    expect(fromIsoDate("2026-10-29")?.getDate()).toBe(29);
  });

  it.each(["2026-02-30", "2026-13-01", "29/10/2026", "2026-10-29T00:00", ""])("rejects %j", (text) => {
    expect(fromIsoDate(text)).toBeNull();
  });
});

describe("monthWeeks", () => {
  it("starts weeks on Monday and pads with blanks", () => {
    // 1 October 2026 is a Thursday.
    const weeks = monthWeeks(2026, 9);
    expect(weeks[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});

describe("addMonths", () => {
  it("crosses year boundaries", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe("nextRange", () => {
  it("first click sets the start, second the end", () => {
    const start = nextRange(NO_DATES, "2026-10-29");
    expect(start).toEqual({ from: "2026-10-29", to: null });
    expect(nextRange(start, "2026-10-31")).toEqual({ from: "2026-10-29", to: "2026-10-31" });
  });

  it("starts over when clicking before the start or after a complete range", () => {
    expect(nextRange({ from: "2026-10-29", to: null }, "2026-10-20")).toEqual({ from: "2026-10-20", to: null });
    expect(nextRange({ from: "2026-10-29", to: "2026-10-31" }, "2026-11-05")).toEqual({ from: "2026-11-05", to: null });
  });

  it("allows a single day", () => {
    expect(nextRange({ from: "2026-10-29", to: null }, "2026-10-29")).toEqual({ from: "2026-10-29", to: "2026-10-29" });
  });
});

describe("isInside", () => {
  it("is true only strictly between the ends", () => {
    const range = { from: "2026-10-29", to: "2026-11-02" };
    expect(isInside(range, "2026-10-31")).toBe(true);
    expect(isInside(range, "2026-10-29")).toBe(false);
    expect(isInside({ from: "2026-10-29", to: null }, "2026-10-30")).toBe(false);
  });
});

describe("formatRange", () => {
  it("formats like the search bar shows it", () => {
    expect(formatRange({ from: "2026-10-29", to: "2026-10-30" })).toBe("October 29–30");
    expect(formatRange({ from: "2026-10-30", to: "2026-11-02" })).toBe("October 30 – November 2");
    expect(formatRange({ from: "2026-10-29", to: null })).toBe("From October 29");
    expect(formatRange({ from: "2026-10-29", to: "2026-10-29" })).toBe("October 29");
    expect(formatRange(NO_DATES)).toBeNull();
  });
});

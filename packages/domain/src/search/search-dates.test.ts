import { describe, expect, it } from "vitest";
import { parseSearchDates, searchStay } from "./search-dates";

const TODAY = "2026-10-29";

describe("parseSearchDates", () => {
  it("reads a range as [from, to)", () => {
    expect(parseSearchDates("2026-11-02", "2026-11-05", TODAY)).toEqual({
      ok: true,
      value: { checkIn: "2026-11-02", checkOut: "2026-11-05" },
    });
  });

  it("reads a single day as that one day", () => {
    expect(parseSearchDates("2026-11-02", "2026-11-02", TODAY)).toEqual({
      ok: true,
      value: { checkIn: "2026-11-02", checkOut: "2026-11-03" },
    });
  });

  it("rejects reversed, missing and past dates", () => {
    expect(parseSearchDates("2026-11-05", "2026-11-02", TODAY)).toEqual({
      ok: false,
      errors: ["to must be after from (at least one night)"],
    });
    expect(parseSearchDates("2026-11-05", null, TODAY)).toEqual({ ok: false, errors: ["to must be a date (YYYY-MM-DD)"] });
    expect(parseSearchDates("2026-10-01", "2026-10-02", TODAY)).toEqual({ ok: false, errors: ["from cannot be in the past"] });
  });
});

describe("searchStay", () => {
  it("is the stay for a complete, valid range", () => {
    expect(searchStay({ from: "2026-11-02", to: "2026-11-05" }, TODAY)).toEqual({ checkIn: "2026-11-02", checkOut: "2026-11-05" });
  });

  it("is null while the range is incomplete or cannot be searched", () => {
    expect(searchStay({ from: null, to: null }, TODAY)).toBeNull();
    expect(searchStay({ from: "2026-11-02", to: null }, TODAY)).toBeNull();
    expect(searchStay({ from: "2026-10-01", to: "2026-10-03" }, TODAY)).toBeNull();
  });
});

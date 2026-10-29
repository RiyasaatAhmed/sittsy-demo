import { describe, expect, it } from "vitest";
import { MAX_STAY_NIGHTS } from "./rules";
import { nightsIn, parseStay } from "./stay";

const TODAY = "2026-10-29";

describe("parseStay", () => {
  it("accepts a stay and counts nights with an exclusive check-out", () => {
    expect(parseStay("2026-11-02", "2026-11-05", TODAY)).toEqual({
      ok: true,
      value: { checkIn: "2026-11-02", checkOut: "2026-11-05" },
    });
    expect(nightsIn({ checkIn: "2026-11-02", checkOut: "2026-11-05" })).toBe(3);
  });

  it.each([
    ["missing dates", null, null, "from must be a date"],
    ["not a date", "2026-02-30", "2026-03-02", "from must be a date"],
    ["reversed", "2026-11-05", "2026-11-02", "to must be after from"],
    ["zero nights", "2026-11-05", "2026-11-05", "to must be after from"],
    ["too long", "2026-11-01", "2026-12-15", `at most ${MAX_STAY_NIGHTS} nights`],
    ["in the past", "2026-10-28", "2026-10-30", "cannot be in the past"],
    ["too far ahead", "2028-01-01", "2028-01-03", "at most 365 days ahead"],
  ])("rejects %s", (_label, checkIn, checkOut, message) => {
    const result = parseStay(checkIn, checkOut, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((error) => error.includes(message))).toBe(true);
  });

  it("allows check-in today", () => {
    expect(parseStay(TODAY, "2026-10-30", TODAY).ok).toBe(true);
  });
});

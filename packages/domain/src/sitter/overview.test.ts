import { describe, expect, it } from "vitest";
import { sitterOverview, type OverviewInput } from "./overview";

function input(overrides: Partial<OverviewInput> = {}): OverviewInput {
  return {
    id: 3,
    name: "Camille W.",
    ratingAverage: 4.8,
    ratingCount: 23,
    medianResponseMinutes: 15,
    bookingsLast30d: 4,
    identityVerified: true,
    ageDays: 400,
    ...overrides,
  };
}

describe("sitterOverview", () => {
  it("is deterministic for the same sitter", () => {
    expect(sitterOverview(input())).toBe(sitterOverview(input()));
  });

  it("starts with the first name and mentions rating, bookings and reply time", () => {
    const text = sitterOverview(input());
    expect(text.startsWith("Camille ")).toBe(true);
    expect(text).toContain("Rated 4.8 out of 5 across 23 reviews");
    expect(text).toContain("4 bookings in the last month");
    expect(text).toContain("about 15 minutes");
  });

  it("varies between sitters", () => {
    expect(sitterOverview(input({ id: 1 }))).not.toBe(sitterOverview(input({ id: 2 })));
  });

  it("describes a new verified sitter as ready for a first booking", () => {
    const text = sitterOverview(
      input({ ratingAverage: null, ratingCount: 0, bookingsLast30d: 0, ageDays: 3 }),
    );
    expect(text).toContain("completed identity verification");
    expect(text).not.toContain("Rated");
  });

  it("never claims verification for an unverified new sitter", () => {
    const text = sitterOverview(
      input({ ratingAverage: null, ratingCount: 0, ageDays: 3, identityVerified: false }),
    );
    expect(text).not.toContain("verification");
  });

  it("uses singular wording for one review and one booking", () => {
    const text = sitterOverview(input({ ratingCount: 1, ratingAverage: 5, bookingsLast30d: 1 }));
    expect(text).toContain("across 1 review, with 1 booking in");
  });
});

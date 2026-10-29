import { describe, expect, it } from "vitest";
import { eligibleSitters } from "./eligibility";
import type { Sitter } from "../sitter";

const search = { lat: 0, lng: 0, service: "dog_walking" as const };
function sitter(id: number, km: number): Sitter {
  return {
    id, name: "Fake sitter", lat: 0, lng: km / 6371 * 180 / Math.PI,
    prices: { dog_walking: 15, boarding: 40 }, ratingCount: 10, ratingSum: 50,
    medianResponseMinutes: 5, bookingsLast30d: 10, identityVerified: true,
    createdAt: new Date("2025-01-01"),
  };
}

describe("geographic eligibility", () => {
  it("includes the radius boundary and excludes candidates just beyond it", () => {
    expect(eligibleSitters([sitter(1, 4.999), sitter(2, 5), sitter(3, 5.001)], search)
      .map((s) => s.id)).toEqual([1, 2]);
  });
  it("uses the service radius and requires an offer for that service", () => {
    const candidates = [sitter(1, 10), { ...sitter(2, 1), prices: { dog_walking: 15 } }];
    expect(eligibleSitters(candidates, { ...search, service: "boarding" }).map((s) => s.id)).toEqual([1]);
  });
  it("does not mutate the candidate collection", () => {
    const candidates = [sitter(1, 6), sitter(2, 1)];
    eligibleSitters(candidates, search);
    expect(candidates.map((s) => s.id)).toEqual([1, 2]);
  });
});

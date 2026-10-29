import { describe, expect, it } from "vitest";
import { distanceKm } from "@sitter/domain/location";
import { isColdStartEligible } from "@sitter/domain/ranking";
import { PARIS_CENTER, SEED_RADIUS_KM, generateSitters } from "./seed-data";

const NOW = new Date("2026-06-01T12:00:00Z");

describe("generateSitters (fake seed data)", () => {
  const sitters = generateSitters(NOW);

  it("creates ~200 sitters", () => {
    expect(sitters).toHaveLength(200);
  });

  it("is deterministic", () => {
    expect(generateSitters(NOW)).toEqual(sitters);
  });

  it("places every sitter around Paris", () => {
    for (const s of sitters) {
      expect(distanceKm(PARIS_CENTER.lat, PARIS_CENTER.lng, s.lat, s.lng)).toBeLessThanOrEqual(
        SEED_RADIUS_KM + 0.01,
      );
    }
  });

  it("gives every sitter at least one service with a positive price", () => {
    for (const s of sitters) {
      const prices = Object.values(s.prices);
      expect(prices.length).toBeGreaterThan(0);
      for (const price of prices) expect(price).toBeGreaterThan(0);
    }
  });

  it("keeps ratings valid (average between 1 and 5 stars)", () => {
    for (const s of sitters) {
      expect(s.ratingSum).toBeLessThanOrEqual(5 * s.ratingCount);
      expect(s.ratingSum).toBeGreaterThanOrEqual(s.ratingCount);
    }
  });

  it("includes cold-start sitters near the centre and unverified new sitters", () => {
    const eligibleNearCenter = sitters.filter(
      (s) =>
        isColdStartEligible({ ...s, id: 0 }, NOW) &&
        distanceKm(PARIS_CENTER.lat, PARIS_CENTER.lng, s.lat, s.lng) < 2,
    );
    expect(eligibleNearCenter.length).toBeGreaterThanOrEqual(5);

    const unverifiedNew = sitters.filter(
      (s) => !s.identityVerified && NOW.getTime() - s.createdAt.getTime() < 30 * 86_400_000,
    );
    expect(unverifiedNew.length).toBeGreaterThan(0);
  });
});

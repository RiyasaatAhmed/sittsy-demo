import { describe, expect, it } from "vitest";
import { distanceKm } from "./geo";

describe("distanceKm", () => {
  it("is zero for the same point", () => {
    expect(distanceKm(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
  });

  it("matches a known distance (Paris to London is about 344 km)", () => {
    expect(distanceKm(48.8566, 2.3522, 51.5074, -0.1278)).toBeCloseTo(344, -1);
  });

  it("is symmetric", () => {
    const there = distanceKm(48.85, 2.35, 48.9, 2.3);
    const back = distanceKm(48.9, 2.3, 48.85, 2.35);
    expect(there).toBeCloseTo(back, 10);
  });
});

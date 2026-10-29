import { describe, expect, it } from "vitest";
import { activityValue, distanceValue, responsivenessValue } from "./signals";

describe("individual signals", () => {
  it("responsiveness: faster is higher, 30 min is 0.5", () => {
    expect(responsivenessValue(0)).toBe(1);
    expect(responsivenessValue(30)).toBeCloseTo(0.5, 10);
    expect(responsivenessValue(10)).toBeGreaterThan(responsivenessValue(120));
  });

  it("activity: more bookings is higher, with diminishing returns, capped at 1", () => {
    expect(activityValue(0)).toBe(0);
    const firstTen = activityValue(10) - activityValue(0);
    const nextTen = activityValue(20) - activityValue(10);
    expect(firstTen).toBeGreaterThan(nextTen);
    expect(nextTen).toBeGreaterThan(0);
    expect(activityValue(30)).toBeCloseTo(1, 10);
    expect(activityValue(500)).toBe(1);
  });

  it("distance: closer is higher and halves every 2 km", () => {
    expect(distanceValue(0)).toBe(1);
    expect(distanceValue(2)).toBeCloseTo(0.5, 10);
    expect(distanceValue(4)).toBeCloseTo(0.25, 10);
  });
});

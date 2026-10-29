import { describe, expect, it } from "vitest";
import { percentile, suggestPrice } from "./pricing";
import type { Service, Sitter } from "../sitter";

const CENTER = { lat: 48.8566, lng: 2.3522 };
const KM_PER_DEGREE_LAT = 111.2;

let nextId = 1;
function sitterAt(km: number, prices: Partial<Record<Service, number>>): Sitter {
  return {
    id: nextId++,
    name: "Fake Sitter",
    lat: CENTER.lat + km / KM_PER_DEGREE_LAT,
    lng: CENTER.lng,
    prices,
    ratingSum: 0,
    ratingCount: 0,
    medianResponseMinutes: 30,
    bookingsLast30d: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    identityVerified: true,
  };
}

// Fixed dataset: five dog walkers inside 5 km (prices deliberately unsorted),
// plus sitters that must be ignored.
const DATASET: Sitter[] = [
  sitterAt(0.5, { dog_walking: 30 }),
  sitterAt(1.0, { dog_walking: 10, boarding: 40 }),
  sitterAt(2.0, { dog_walking: 50 }),
  sitterAt(3.0, { dog_walking: 20 }),
  sitterAt(4.9, { dog_walking: 40 }),
  sitterAt(6.0, { dog_walking: 500 }), // outside 5 km: ignored
  sitterAt(1.0, { boarding: 35 }), // does not offer dog walking: ignored
  sitterAt(12, { boarding: 99 }), // outside 5 km: ignored
];

describe("AC7: suggestPrice on a fixed dataset", () => {
  it("returns median, p25 and p75 of sitters within 5 km offering the service", () => {
    expect(suggestPrice("dog_walking", CENTER.lat, CENTER.lng, DATASET)).toEqual({
      service: "dog_walking",
      radiusKm: 5,
      sampleSize: 5,
      p25: 20,
      median: 30,
      p75: 40,
    });
  });

  it("interpolates for an even number of prices", () => {
    // Boarding within 5 km: 40 and 35 → sorted [35, 40].
    expect(suggestPrice("boarding", CENTER.lat, CENTER.lng, DATASET)).toEqual({
      service: "boarding",
      radiusKm: 5,
      sampleSize: 2,
      p25: 36.25,
      median: 37.5,
      p75: 38.75,
    });
  });

  it("returns null when no sitter nearby offers the service", () => {
    expect(suggestPrice("house_sitting", CENTER.lat, CENTER.lng, DATASET)).toBeNull();
  });

  it("returns null when sitters offer the service but are all too far away", () => {
    const farAway = [sitterAt(8, { drop_in: 12 }), sitterAt(20, { drop_in: 14 })];
    expect(suggestPrice("drop_in", CENTER.lat, CENTER.lng, farAway)).toBeNull();
  });

  it("works with a single nearby sitter", () => {
    const result = suggestPrice("drop_in", CENTER.lat, CENTER.lng, [sitterAt(1, { drop_in: 18 })]);
    expect(result).toMatchObject({ sampleSize: 1, p25: 18, median: 18, p75: 18 });
  });
});

describe("percentile", () => {
  it("matches PERCENTILE.INC on [10, 20, 30, 40]", () => {
    const values = [10, 20, 30, 40];
    expect(percentile(values, 0)).toBe(10);
    expect(percentile(values, 0.25)).toBe(17.5);
    expect(percentile(values, 0.5)).toBe(25);
    expect(percentile(values, 0.75)).toBe(32.5);
    expect(percentile(values, 1)).toBe(40);
  });

  it("throws on an empty list", () => {
    expect(() => percentile([], 0.5)).toThrow();
  });
});

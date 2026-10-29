import { describe, expect, it } from "vitest";
import { coldStartValue } from "./cold-start";
import { rankSitters } from "./rank-sitters";
import { scoreSitter } from "./score-sitter";
import { bayesianRating } from "./signals";
import type { RankingContext } from "./types";
import { DEFAULT_WEIGHTS, PART_NAMES, type Weights } from "./weights";
import type { Sitter } from "../sitter";
import { MS_PER_DAY } from "../calendar";
import { itemAt } from "../testing";

// Fixed search point (central Paris) and fixed clock, so tests never depend on today's date.
const SEARCH = { lat: 48.8566, lng: 2.3522 };
const NOW = new Date("2026-06-01T12:00:00Z");
const KM_PER_DEGREE_LAT = 111.2;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * MS_PER_DAY);
}

/** Point `km` kilometres due north of the search point. */
function kmNorth(km: number): { lat: number; lng: number } {
  return { lat: SEARCH.lat + km / KM_PER_DEGREE_LAT, lng: SEARCH.lng };
}

/** A solid, established sitter. Tests override only what they care about. */
function makeSitter(overrides: Partial<Sitter> = {}): Sitter {
  return {
    id: 1,
    name: "Fake Sitter",
    ...kmNorth(1),
    prices: { dog_walking: 15 },
    ratingSum: 4.8 * 20,
    ratingCount: 20,
    medianResponseMinutes: 30,
    bookingsLast30d: 5,
    createdAt: daysAgo(400),
    identityVerified: true,
    ...overrides,
  };
}

function context(overrides: Partial<RankingContext> = {}): RankingContext {
  return {
    ...SEARCH,
    now: NOW,
    weights: DEFAULT_WEIGHTS,
    coldStartBoost: true,
    ...overrides,
  };
}

/** A brand-new verified sitter: joined 2 days ago, no reviews, no bookings. */
function brandNewSitter(overrides: Partial<Sitter> = {}): Sitter {
  return makeSitter({
    id: 999,
    name: "Brand New Fake Sitter",
    ...kmNorth(0.5),
    ratingSum: 0,
    ratingCount: 0,
    medianResponseMinutes: 60,
    bookingsLast30d: 0,
    createdAt: daysAgo(2),
    identityVerified: true,
    ...overrides,
  });
}

/** 40 established sitters spread 1–3 km from the search point with varied stats. */
function establishedNeighbourhood(): Sitter[] {
  return Array.from({ length: 40 }, (_, i) => {
    const avgRating = 4.6 + (i % 5) * 0.08; // 4.60 … 4.92
    const ratingCount = 15 + (i % 7) * 10; // 15 … 75
    return makeSitter({
      id: i + 1,
      name: `Fake Sitter ${i + 1}`,
      ...kmNorth(1 + (i % 11) * 0.2), // 1.0 … 3.0 km
      ratingSum: avgRating * ratingCount,
      ratingCount,
      medianResponseMinutes: 10 + (i % 6) * 8, // 10 … 50 min
      bookingsLast30d: 4 + (i % 9), // 4 … 12
      createdAt: daysAgo(200 + i * 10),
    });
  });
}

function rankOf(id: number, sitters: Sitter[], ctx: RankingContext): number {
  return rankSitters(sitters, ctx).findIndex((r) => r.sitter.id === id) + 1;
}

describe("AC2: Bayesian quality — few perfect reviews do not beat many great ones", () => {
  it("ranks 1 review at 5.0 below 60 reviews at 4.9 when all else is equal", () => {
    const oneReview = makeSitter({ id: 1, ratingSum: 5, ratingCount: 1 });
    const sixtyReviews = makeSitter({ id: 2, ratingSum: 4.9 * 60, ratingCount: 60 });

    const ranked = rankSitters([oneReview, sixtyReviews], context());

    expect(ranked.map((r) => r.sitter.id)).toEqual([2, 1]);
    const [first, second] = [itemAt(ranked, 0), itemAt(ranked, 1)];
    expect(first.score).toBeGreaterThan(second.score);
    // The only part that differs is quality.
    expect(first.breakdown.quality.value).toBeGreaterThan(second.breakdown.quality.value);
  });

  it("would have been the other way round with a plain average", () => {
    expect(5 / 1).toBeGreaterThan((4.9 * 60) / 60);
    expect(bayesianRating(5, 1)).toBeLessThan(bayesianRating(4.9 * 60, 60));
  });

  it("gives a sitter with no reviews exactly the prior mean", () => {
    expect(bayesianRating(0, 0)).toBe(4.5);
  });
});

describe("AC3: cold-start boost gives a new verified sitter a first chance", () => {
  const neighbourhood = establishedNeighbourhood();
  const newcomer = brandNewSitter();
  const sitters = [...neighbourhood, newcomer];

  it("puts the new sitter in the top 20 for a nearby search when the boost is on", () => {
    const rank = rankOf(newcomer.id, sitters, context({ coldStartBoost: true }));
    expect(rank).toBeGreaterThan(0);
    expect(rank).toBeLessThanOrEqual(20);
  });

  it("drops the new sitter out of the top 20 when the boost is off", () => {
    const rankOn = rankOf(newcomer.id, sitters, context({ coldStartBoost: true }));
    const rankOff = rankOf(newcomer.id, sitters, context({ coldStartBoost: false }));
    expect(rankOff).toBeGreaterThan(20);
    expect(rankOff).toBeGreaterThan(rankOn);
  });

  it("fades out over 30 days", () => {
    const day0 = coldStartValue(brandNewSitter({ createdAt: daysAgo(0) }), NOW);
    const day15 = coldStartValue(brandNewSitter({ createdAt: daysAgo(15) }), NOW);
    const day29 = coldStartValue(brandNewSitter({ createdAt: daysAgo(29) }), NOW);
    const day31 = coldStartValue(brandNewSitter({ createdAt: daysAgo(31) }), NOW);

    expect(day0).toBe(1);
    expect(day15).toBeCloseTo(0.5, 10);
    expect(day29).toBeGreaterThan(0);
    expect(day29).toBeLessThan(day15);
    expect(day31).toBe(0);
  });

  it("does not boost a new sitter who already has bookings", () => {
    const booked = brandNewSitter({ bookingsLast30d: 1 });
    expect(coldStartValue(booked, NOW)).toBe(0);
  });
});

describe("AC4: unverified sitters never get the cold-start boost", () => {
  it.each([0, 1, 10, 29])("unverified sitter created %i days ago gets 0 boost", (days) => {
    const unverified = brandNewSitter({ identityVerified: false, createdAt: daysAgo(days) });
    const result = scoreSitter(unverified, context({ coldStartBoost: true }));

    expect(coldStartValue(unverified, NOW)).toBe(0);
    expect(result.breakdown.coldStart.value).toBe(0);
    expect(result.breakdown.coldStart.contribution).toBe(0);
  });

  it("scores an unverified newcomer the same with the boost on or off", () => {
    const unverified = brandNewSitter({ identityVerified: false });
    const on = scoreSitter(unverified, context({ coldStartBoost: true })).score;
    const off = scoreSitter(unverified, context({ coldStartBoost: false })).score;
    expect(on).toBe(off);
  });

  it("does not let an unverified newcomer into the top 20 just by being new", () => {
    const unverified = brandNewSitter({ identityVerified: false });
    const rank = rankOf(
      unverified.id,
      [...establishedNeighbourhood(), unverified],
      context({ coldStartBoost: true }),
    );
    expect(rank).toBeGreaterThan(20);
  });
});

describe("AC5: weighted breakdown parts sum to the total score", () => {
  const weightSets: Weights[] = [
    DEFAULT_WEIGHTS,
    { quality: 1, responsiveness: 0, activity: 0, distance: 0, coldStart: 0 },
    { quality: 0.1, responsiveness: 0.9, activity: 0.4, distance: 0.7, coldStart: 0.3 },
    { quality: 0, responsiveness: 0, activity: 0, distance: 0, coldStart: 0 },
  ];
  const sitters = [...establishedNeighbourhood(), brandNewSitter()];

  it.each(weightSets)("holds for every sitter with weights %o", (weights) => {
    for (const result of rankSitters(sitters, context({ weights }))) {
      const sum = PART_NAMES.reduce(
        (acc, name) => acc + result.breakdown[name].value * result.breakdown[name].weight,
        0,
      );
      expect(sum).toBeCloseTo(result.score, 12);

      for (const name of PART_NAMES) {
        const p = result.breakdown[name];
        expect(p.weight).toBe(weights[name]);
        expect(p.contribution).toBeCloseTo(p.value * p.weight, 12);
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.value).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("ordering", () => {
  it("changing a weight can change the order", () => {
    const close = makeSitter({ id: 1, ...kmNorth(0.2), ratingSum: 4.5 * 10, ratingCount: 10 });
    const great = makeSitter({ id: 2, ...kmNorth(4), ratingSum: 5 * 100, ratingCount: 100 });

    const distanceHeavy = { ...DEFAULT_WEIGHTS, distance: 1, quality: 0.1 };
    const qualityHeavy = { ...DEFAULT_WEIGHTS, distance: 0.05, quality: 1 };

    const topWith = (weights: Weights) =>
      itemAt(rankSitters([close, great], context({ weights })), 0).sitter.id;
    expect(topWith(distanceHeavy)).toBe(1);
    expect(topWith(qualityHeavy)).toBe(2);
  });

  it("breaks ties by distance, then id", () => {
    const a = makeSitter({ id: 5 });
    const b = makeSitter({ id: 3 });
    const zero = { quality: 0, responsiveness: 0, activity: 0, distance: 0, coldStart: 0 };
    const ranked = rankSitters([a, b], context({ weights: zero }));
    expect(ranked.map((r) => r.sitter.id)).toEqual([3, 5]);
  });
});

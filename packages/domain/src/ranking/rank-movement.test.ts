import { describe, expect, it } from "vitest";
import type { SittersResponse } from "../contract";
import { DEFAULT_WEIGHTS } from "./weights";
import { previousRanks, rankMovement } from "./rank-movement";

/** A response whose results are just the given ids, in order. */
function response(ids: number[], search: Partial<SittersResponse> = {}): SittersResponse {
  return {
    service: "dog_walking",
    lat: 48.8566,
    lng: 2.3522,
    weights: DEFAULT_WEIGHTS,
    coldStartBoost: true,
    stay: null,
    totalCandidates: ids.length,
    unavailableCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    // Only `id` and `rank` are read; the rest of a result does not matter here.
    results: ids.map((id, index) => ({ id, rank: index + 1 }) as SittersResponse["results"][number]),
    ...search,
  };
}

describe("previousRanks", () => {
  it("maps each sitter id to their 1-based rank in the previous list", () => {
    const ranks = previousRanks(response([7, 3, 9]), response([3, 7, 9]));
    expect([...ranks]).toEqual([
      [7, 1],
      [3, 2],
      [9, 3],
    ]);
  });

  it("is empty when there is no previous list", () => {
    expect(previousRanks(undefined, response([1, 2])).size).toBe(0);
  });

  it("is empty when the previous list was for another service, location, dates or page", () => {
    const current = response([1, 2]);
    expect(previousRanks(response([2, 1], { service: "boarding" }), current).size).toBe(0);
    expect(previousRanks(response([2, 1], { lat: 48.9 }), current).size).toBe(0);
    expect(previousRanks(response([2, 1], { lng: 2.4 }), current).size).toBe(0);
    expect(previousRanks(response([2, 1], { page: 2 }), current).size).toBe(0);
    const stay = { checkIn: "2026-11-02", checkOut: "2026-11-05" };
    expect(previousRanks(response([2, 1], { stay }), current).size).toBe(0);
    expect(previousRanks(response([2, 1], { stay }), response([1, 2], { stay })).size).toBe(2);
  });

  it("uses each sitter's overall rank, so page 2 starts at rank 21", () => {
    const page2 = (ids: number[]): SittersResponse => {
      const base = response(ids, { page: 2 });
      return { ...base, results: base.results.map((r, index) => ({ ...r, rank: 21 + index })) };
    };
    expect([...previousRanks(page2([5, 6]), page2([6, 5]))]).toEqual([
      [5, 21],
      [6, 22],
    ]);
  });

  it("still compares when only the weights or the boost changed", () => {
    const before = response([2, 1], { weights: { ...DEFAULT_WEIGHTS, distance: 1 } });
    const after = response([1, 2], { coldStartBoost: false });
    expect(previousRanks(before, after).size).toBe(2);
  });
});

describe("rankMovement", () => {
  const ranks = new Map([
    [10, 1],
    [20, 2],
    [30, 3],
  ]);

  it("is positive when a sitter moved up and negative when they moved down", () => {
    expect(rankMovement(ranks, 30, 1)).toBe(2);
    expect(rankMovement(ranks, 10, 3)).toBe(-2);
    expect(rankMovement(ranks, 20, 2)).toBe(0);
  });

  it("is null for a sitter who was not in the previous list", () => {
    expect(rankMovement(ranks, 99, 1)).toBeNull();
  });

  it("is 0 when there is nothing to compare with", () => {
    expect(rankMovement(new Map(), 10, 1)).toBe(0);
  });
});

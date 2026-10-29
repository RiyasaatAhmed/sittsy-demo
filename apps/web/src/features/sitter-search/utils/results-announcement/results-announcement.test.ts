import { describe, expect, it } from "vitest";
import type { SitterResult, SittersResponse } from "@sitter/domain/contract";
import { DEFAULT_WEIGHTS } from "@sitter/domain/ranking";
import { resultsAnnouncement } from "./results-announcement";

function ranking(ranks: number[], totalPages = 3): SittersResponse {
  return {
    service: "dog_walking",
    lat: 48.8566,
    lng: 2.3522,
    weights: DEFAULT_WEIGHTS,
    coldStartBoost: true,
    stay: null,
    totalCandidates: 45,
    unavailableCount: 0,
    page: 2,
    pageSize: 20,
    totalPages,
    // Only `rank` is read here.
    results: ranks.map((rank) => ({ rank }) as SitterResult),
  };
}

describe("resultsAnnouncement", () => {
  it("announces the page and the ranks shown", () => {
    expect(
      resultsAnnouncement({ ranking: ranking([21, 22, 40]), isPending: false, failureCount: 0, page: 2 }),
    ).toBe("Page 2 of 3, sitters 21 to 40.");
  });

  it("announces an empty result", () => {
    expect(
      resultsAnnouncement({ ranking: ranking([]), isPending: false, failureCount: 0, page: 1 }),
    ).toBe("No sitters found.");
  });

  it("announces loading, and that it is still trying while retries run", () => {
    expect(resultsAnnouncement({ ranking: undefined, isPending: true, failureCount: 0, page: 1 })).toBe(
      "Loading sitters…",
    );
    expect(resultsAnnouncement({ ranking: undefined, isPending: true, failureCount: 1, page: 1 })).toBe(
      "Still trying to reach the server…",
    );
  });

  it("says nothing for an error, which has its own alert", () => {
    expect(resultsAnnouncement({ ranking: undefined, isPending: false, failureCount: 3, page: 1 })).toBe("");
  });
});

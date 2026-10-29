import type { SittersResponse } from "@sitter/domain/contract";
import { paginate } from "@sitter/domain/pagination";
import { rankSitters } from "@sitter/domain/ranking";
import { eligibleSitters, type SitterSearch } from "@sitter/domain/search";
import type { Sitter } from "@sitter/domain/sitter";
import { toSitterResult } from "./sitter-dto";

/**
 * The /api/sitters use case: keep the sitters who serve the area and are free
 * on the dates, rank them all, cut out the requested page and map it to the
 * public shape. Ranking everyone first keeps ranks the same whichever page
 * you are on (sitter #21 is the first on page 2). Availability is a filter,
 * not a score: an unavailable sitter is left out however high they would rank.
 */
export function rankedPage(
  candidates: Sitter[],
  search: SitterSearch,
  now: Date,
  unavailable: ReadonlySet<number> = new Set(),
): SittersResponse {
  const eligible = eligibleSitters(candidates, search);
  const available = eligible.filter((sitter) => !unavailable.has(sitter.id));
  const ranked = rankSitters(available, {
    lat: search.lat,
    lng: search.lng,
    now,
    weights: search.weights,
    coldStartBoost: search.coldStartBoost,
  });
  const page = paginate(ranked, search.page, search.limit);
  const firstRank = (page.page - 1) * page.pageSize + 1;

  return {
    service: search.service,
    lat: search.lat,
    lng: search.lng,
    weights: search.weights,
    coldStartBoost: search.coldStartBoost,
    stay: search.stay,
    totalCandidates: available.length,
    unavailableCount: eligible.length - available.length,
    page: page.page,
    pageSize: page.pageSize,
    totalPages: page.totalPages,
    results: page.items.map((ranked, index) =>
      toSitterResult(ranked, search.service, now, firstRank + index),
    ),
  };
}

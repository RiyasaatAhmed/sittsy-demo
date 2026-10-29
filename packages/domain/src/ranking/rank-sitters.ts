import type { Sitter } from "../sitter";
import { scoreSitter } from "./score-sitter";
import type { RankedSitter, RankingContext } from "./types";

/**
 * Score every sitter and sort best first.
 * Ties are broken by distance, then by id, so the order is always stable.
 */
export function rankSitters(sitters: Sitter[], ctx: RankingContext): RankedSitter[] {
  return sitters
    .map((sitter) => scoreSitter(sitter, ctx))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.distanceKm - b.distanceKm ||
        a.sitter.id - b.sitter.id,
    );
}

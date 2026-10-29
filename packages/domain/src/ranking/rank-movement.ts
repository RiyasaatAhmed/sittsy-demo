import type { SittersResponse } from "../contract";

/**
 * Rank of each sitter id in the previous response, used to show ▲/▼ after a
 * weight or boost change.
 *
 * Returns an empty map when there is no previous response, or it was for a
 * different search (service, location or dates) or another page: comparing
 * those would show meaningless movement.
 */
export function previousRanks(
  previous: SittersResponse | undefined,
  current: SittersResponse,
): Map<number, number> {
  const sameSearch =
    previous !== undefined &&
    previous.service === current.service &&
    previous.lat === current.lat &&
    previous.lng === current.lng &&
    previous.stay?.checkIn === current.stay?.checkIn &&
    previous.stay?.checkOut === current.stay?.checkOut &&
    previous.page === current.page;
  if (!sameSearch) return new Map();
  return new Map(previous.results.map((sitter) => [sitter.id, sitter.rank]));
}

/**
 * How many places a sitter moved: positive = up, negative = down, 0 = same or
 * nothing to compare with, null = was not in the previous list.
 */
export function rankMovement(ranks: Map<number, number>, id: number, rank: number): number | null {
  if (ranks.size === 0) return 0;
  const before = ranks.get(id);
  return before === undefined ? null : before - rank;
}

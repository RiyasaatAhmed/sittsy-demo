import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { fetchSitters } from "../sitters-api/sitters-api";
import type { SitterSearch } from "@sitter/domain/search";

/** Prefix shared by every sitter query, e.g. to invalidate them all at once. */
const SITTERS_KEY = ["sitters"] as const;

/**
 * Every query the UI makes, defined once: the key and the function that fetches
 * it live together, so the key always contains everything the request depends on.
 * Components call `useQuery(sitterQueries.ranking(search))`.
 */
export const sitterQueries = {
  all: SITTERS_KEY,

  ranking: (search: SitterSearch) =>
    queryOptions({
      queryKey: [...SITTERS_KEY, "ranking", search] as const,
      // `signal` lets TanStack Query abort the request when its result is no longer needed.
      queryFn: ({ signal }) => fetchSitters(search, signal),
      // Keep showing the current list while the re-ranked one loads, so the list
      // re-orders in place instead of flashing empty on every slider move.
      placeholderData: keepPreviousData,
    }),
};

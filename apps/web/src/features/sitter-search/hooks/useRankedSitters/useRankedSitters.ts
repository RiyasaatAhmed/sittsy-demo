import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue/useDebouncedValue";
import { usePreviousValue } from "@/hooks/usePreviousValue/usePreviousValue";
import { bookingToday } from "@sitter/domain/booking";
import { DEFAULT_LIMIT, searchStay, type SearchState, type SitterSearch } from "@sitter/domain/search";
import { sitterQueries } from "../../api/queries/queries";
import { retryNow } from "@/lib/retry-now/retry-now";

/** Wait this long after the last slider move before asking the API again. */
const WEIGHTS_DEBOUNCE_MS = 150;

/**
 * The ranked sitters for the search in the URL, one page at a time.
 * TanStack Query fetches, caches, de-duplicates and cancels requests whenever
 * the key (service, location, dates, weights, boost, page) changes.
 */
export function useRankedSitters(criteria: SearchState, setPage: (page: number) => void) {
  const queryClient = useQueryClient();
  const weights = useDebouncedValue(criteria.weights, WEIGHTS_DEBOUNCE_MS);
  const search: Omit<SitterSearch, "page"> = {
    lat: criteria.location.lat,
    lng: criteria.location.lng,
    service: criteria.service,
    limit: DEFAULT_LIMIT,
    weights,
    coldStartBoost: criteria.coldStartBoost,
    // Only complete dates that can be searched; the server checks them again.
    stay: searchStay(criteria.dates, bookingToday(new Date())),
  };
  const { page } = criteria;

  const options = sitterQueries.ranking({ ...search, page });
  const query = useQuery(options);
  // The ranking shown before this one, to show ▲/▼ movement.
  const previous = usePreviousValue(query.data);

  // Load a page before it is clicked (on hover or focus of its button), so it
  // usually shows instantly. Does nothing if that page is cached and fresh.
  const prefetchPage = (target: number) => {
    void queryClient.prefetchQuery(sitterQueries.ranking({ ...search, page: target }));
  };

  // "Try again": a fresh request now, even while paused waiting for the network.
  // Remembers which query was retried, so the UI can show loading rows (not the
  // previous page) until that retry finishes.
  const queryIdentity = JSON.stringify(options.queryKey);
  const [retriedQuery, setRetriedQuery] = useState<string | null>(null);
  const retry = () => {
    setRetriedQuery(queryIdentity);
    void retryNow(queryClient, options.queryKey);
  };
  const isRetrying = retriedQuery === queryIdentity && query.isFetching;

  // Dates were picked but could not be searched, so the list ignores them.
  const datesIgnored = criteria.dates.to !== null && search.stay === null;

  return { query, previous, page, setPage, prefetchPage, retry, isRetrying, stay: search.stay, datesIgnored };
}

export type RankedSitters = ReturnType<typeof useRankedSitters>;

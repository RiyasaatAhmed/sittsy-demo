import { queryOptions } from "@tanstack/react-query";
import { fetchAddresses } from "../places-api/places-api";

export const placeQueries = {
  addresses: (query: string) =>
    queryOptions({
      queryKey: ["places", "addresses", query.trim().toLowerCase()] as const,
      queryFn: ({ signal }) => fetchAddresses(query, signal),
      // An address does not move: keep answers for the whole visit.
      staleTime: Infinity,
      // A free public service: one try per query, never a burst of retries.
      retry: false,
    }),
};

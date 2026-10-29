import { queryOptions } from "@tanstack/react-query";
import type { BookingTarget } from "@sitter/domain/booking";
import { fetchMyBookings, fetchQuote } from "../bookings-api/bookings-api";

/** Prefix shared by every booking query. */
const BOOKINGS_KEY = ["bookings"] as const;

/** Every booking query the UI makes: key and fetcher defined together. */
export const bookingQueries = {
  all: BOOKINGS_KEY,

  quote: (target: BookingTarget) =>
    queryOptions({
      queryKey: [...BOOKINGS_KEY, "quote", target] as const,
      queryFn: ({ signal }) => fetchQuote(target, signal),
      // A price and availability must be current when the owner looks: always refetch on open.
      staleTime: 0,
    }),

  /** The browser's own booking requests (the server knows them by the demo-owner cookie). */
  mine: () =>
    queryOptions({
      queryKey: [...BOOKINGS_KEY, "mine"] as const,
      queryFn: ({ signal }) => fetchMyBookings(signal),
    }),
};

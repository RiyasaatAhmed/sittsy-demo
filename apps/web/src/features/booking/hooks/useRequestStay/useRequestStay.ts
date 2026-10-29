import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type { BookingRequest, BookingTarget } from "@sitter/domain/booking";
import type { QuoteResponse } from "@sitter/domain/contract";
import { ApiError } from "@/lib/api-error/api-error";
import { newIdempotencyKey } from "@/lib/idempotency-key/idempotency-key";
import { shouldRetry } from "@/lib/retry-policy/retry-policy";
import { requestStay } from "../../api/bookings-api/bookings-api";
import { bookingQueries } from "../../api/queries/queries";
import { bookingConflict } from "../../utils/booking-conflict/booking-conflict";

type Variables = { request: BookingRequest; idempotencyKey: string };

/**
 * Sends a booking request for `target`.
 *
 * Duplicate-safe: each submission has an Idempotency-Key, reused by the
 * automatic retries and by "Try again" after a network failure (the first
 * attempt may have reached the server), and replaced only once the server has
 * decided. So the server records one booking however often it is sent.
 *
 * Afterwards: a new request appears in "Your booking requests"; a price change
 * replaces the cached quote with the server's new one; and a change in who is
 * free (booked, or dates taken) calls `onAvailabilityChange`.
 */
export function useRequestStay(target: BookingTarget, onAvailabilityChange?: () => void) {
  const queryClient = useQueryClient();
  const submission = useRef<Variables | null>(null);
  const quoteKey = bookingQueries.quote(target).queryKey;

  const mutation = useMutation({
    mutationFn: ({ request, idempotencyKey }: Variables) => requestStay(request, idempotencyKey),
    // Safe to retry: the same key makes a repeat a no-op on the server.
    retry: shouldRetry,
    onSettled: (_data, error) => {
      // The server decided (a success or a 4xx): the next submission is a new
      // one. After a network error or a 5xx (e.g. the proxy lost the answer),
      // the request may have been recorded, so "Try again" keeps the key.
      if (!error || (error instanceof ApiError && error.status < 500)) submission.current = null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingQueries.mine().queryKey });
      onAvailabilityChange?.();
    },
    onError: (error) => {
      const conflict = bookingConflict(error);
      if (conflict?.code === "price_changed") {
        queryClient.setQueryData<QuoteResponse>(quoteKey, (old) => old && { ...old, quote: conflict.quote });
      } else if (conflict?.code === "unavailable") {
        void queryClient.invalidateQueries({ queryKey: quoteKey });
        onAvailabilityChange?.();
      }
    },
  });

  /** Sends the request at the total the owner is looking at. */
  const send = (expectedTotalCents: number) => {
    // A refreshed quote must not change the payload of an uncertain submission.
    submission.current ??= { request: { ...target, expectedTotalCents }, idempotencyKey: newIdempotencyKey() };
    mutation.mutate(submission.current);
  };

  return { ...mutation, send };
}

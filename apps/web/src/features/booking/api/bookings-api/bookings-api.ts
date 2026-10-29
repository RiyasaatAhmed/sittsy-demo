import type { BookingRequest, BookingTarget, SitterDecision } from "@sitter/domain/booking";
import type { BookingResponse, BookingsResponse, QuoteResponse } from "@sitter/domain/contract";
import { getJson, postJson } from "@/lib/http-client/http-client";
import { ensureDemoSession } from "@/lib/demo-session/demo-session";

// One function per booking endpoint the UI calls.

export function fetchQuote({ sitterId, service, stay }: BookingTarget, signal?: AbortSignal): Promise<QuoteResponse> {
  const params = new URLSearchParams({ service, from: stay.checkIn, to: stay.checkOut });
  return getJson(`/api/sitters/${sitterId}/quote?${params}`, signal);
}

export function fetchMyBookings(signal?: AbortSignal): Promise<BookingsResponse> {
  return getJson("/api/bookings", signal);
}

/** Sends a booking request. A retry must reuse `idempotencyKey`, so the server records it once. */
export async function requestStay(request: BookingRequest, idempotencyKey: string): Promise<BookingResponse> {
  await ensureDemoSession();
  const { sitterId, service, stay, expectedTotalCents } = request;
  return postJson(
    "/api/bookings",
    { sitterId, service, from: stay.checkIn, to: stay.checkOut, expectedTotalCents },
    { "Idempotency-Key": idempotencyKey },
  );
}

export function cancelBooking(bookingId: number): Promise<BookingResponse> {
  return postJson(`/api/bookings/${bookingId}/cancel`);
}

/** Demo only: plays the sitter's answer to the owner's own request. */
export function answerAsSitter(bookingId: number, decision: SitterDecision): Promise<BookingResponse> {
  return postJson(`/api/bookings/${bookingId}/sitter-response`, {
    decision: decision === "confirmed" ? "confirm" : "decline",
  });
}

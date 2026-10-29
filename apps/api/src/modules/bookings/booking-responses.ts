// The error answers of the booking endpoints. Each 409 has a `code` the UI
// acts on and a message the owner can act on (see BookingConflictResponse).

import type { Response } from "express";
import type { BookingTarget, Quote } from "@sitter/domain/booking";
import type { Booking, BookingConflictResponse, ErrorResponse } from "@sitter/domain/contract";

export const BOOKING_NOT_FOUND = "Booking not found";

/** 404 for a missing booking and for someone else's alike, so ids reveal nothing. */
export function sendBookingNotFound(res: Response<ErrorResponse>): void {
  res.status(404).json({ error: BOOKING_NOT_FOUND });
}

/** 404: no such sitter, or they do not offer the service. */
export function sendNotOffered(res: Response<ErrorResponse>, { sitterId, service }: BookingTarget): void {
  res.status(404).json({ error: `No sitter ${sitterId} offering ${service}` });
}

/** 422: the Idempotency-Key was already used for a different request. */
export function sendKeyReused(res: Response<ErrorResponse>): void {
  res.status(422).json({ error: "This Idempotency-Key was already used for a different booking request." });
}

export const UNAVAILABLE_MESSAGE =
  "This sitter is no longer available for these dates. Choose other dates or another sitter.";
export const PRICE_CHANGED_MESSAGE = "The price changed since your quote. Check the new total and send the request again.";

export function sendUnavailable(res: Response<BookingConflictResponse>): void {
  res.status(409).json({ error: UNAVAILABLE_MESSAGE, code: "unavailable" });
}

export function sendPriceChanged(res: Response<BookingConflictResponse>, quote: Quote): void {
  res.status(409).json({ error: PRICE_CHANGED_MESSAGE, code: "price_changed", quote });
}

export function sendInvalidTransition(res: Response<BookingConflictResponse>, booking: Booking): void {
  res.status(409).json({
    error: `This booking is ${booking.status}, so it cannot be changed that way.`,
    code: "invalid_transition",
    booking,
  });
}

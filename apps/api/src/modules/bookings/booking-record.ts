import type { BookingRequest } from "@sitter/domain/booking";
import type { bookings } from "../../db/schema";

/** A stored booking with its sitter's name, as the repository returns it. */
export type BookingRecord = typeof bookings.$inferSelect & { sitterName: string };

/**
 * Whether a stored booking is the one `request` asks for. An Idempotency-Key
 * names one request: sending it again with different details is a client
 * bug, refused instead of answered with the wrong booking.
 */
export function isSameRequest(booking: BookingRecord, request: BookingRequest): boolean {
  return (
    booking.sitterId === request.sitterId &&
    booking.service === request.service &&
    booking.period.checkIn === request.stay.checkIn &&
    booking.period.checkOut === request.stay.checkOut &&
    booking.totalCents === request.expectedTotalCents
  );
}

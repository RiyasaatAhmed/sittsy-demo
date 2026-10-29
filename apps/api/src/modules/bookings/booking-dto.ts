import { nightsIn, statusAt } from "@sitter/domain/booking";
import type { Booking } from "@sitter/domain/contract";
import type { BookingRecord } from "./booking-record";

/**
 * Maps a stored booking to the public JSON shape. The status is the one at
 * `now` (an unanswered request past its expiry reads "expired"); the owner id
 * and the idempotency key never leave the server.
 */
export function toBooking(record: BookingRecord, now: Date): Booking {
  const status = statusAt(record.status, record.expiresAt, now);
  return {
    id: record.id,
    sitter: { id: record.sitterId, name: record.sitterName },
    service: record.service,
    checkIn: record.period.checkIn,
    checkOut: record.period.checkOut,
    nights: nightsIn(record.period),
    status,
    quote: record.quote,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    expiresAt: status === "requested" ? record.expiresAt.toISOString() : null,
  };
}

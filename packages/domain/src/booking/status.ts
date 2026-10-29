// A booking request's life: requested → confirmed | declined | cancelled | expired,
// and confirmed → cancelled. Requested and confirmed bookings hold the sitter's
// dates; every other status has released them.

import { REQUEST_TTL_HOURS } from "./rules";

export const BOOKING_STATUSES = ["requested", "confirmed", "declined", "cancelled", "expired"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that hold the sitter's capacity for the stay. */
export const CAPACITY_STATUSES = ["requested", "confirmed"] as const satisfies readonly BookingStatus[];

export function holdsCapacity(status: BookingStatus): boolean {
  return (CAPACITY_STATUSES as readonly BookingStatus[]).includes(status);
}

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["confirmed", "declined", "cancelled", "expired"],
  confirmed: ["cancelled"],
  declined: [],
  cancelled: [],
  expired: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** When an unanswered request stops holding the dates. */
export function requestExpiresAt(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + REQUEST_TTL_HOURS * 60 * 60 * 1000);
}

/**
 * The status as of `now`: a request still unanswered at its expiry time is
 * expired, even before the stored row is swept (the sweep runs with the next
 * write for that sitter or booking).
 */
export function statusAt(status: BookingStatus, expiresAt: Date, now: Date): BookingStatus {
  return status === "requested" && now >= expiresAt ? "expired" : status;
}

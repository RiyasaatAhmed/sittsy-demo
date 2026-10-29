// Booking rules for the demo. These are demo policies, not Sittsy's
// production rules.

import { todayInTimeZone, type IsoDate } from "../calendar";
import type { Service } from "../sitter";

/** Only boarding can be requested in this first milestone. */
export const BOOKABLE_SERVICES = ["boarding"] as const satisfies readonly Service[];
export type BookableService = (typeof BOOKABLE_SERVICES)[number];

/** Dates are calendar dates in this time zone (all demo sitters are in Paris). */
export const BOOKING_TIME_ZONE = "Europe/Paris";
/** Longest stay that can be requested, in nights. */
export const MAX_STAY_NIGHTS = 30;
/** How far ahead a stay may start, in days. */
export const MAX_DAYS_AHEAD = 365;
/** A request the sitter has not answered stops holding the dates after this long. */
export const REQUEST_TTL_HOURS = 24;

export function isBookableService(service: Service): service is BookableService {
  return (BOOKABLE_SERVICES as readonly Service[]).includes(service);
}

/** Today's date where the stays happen: the reference for "not in the past". */
export function bookingToday(now: Date): IsoDate {
  return todayInTimeZone(now, BOOKING_TIME_ZONE);
}

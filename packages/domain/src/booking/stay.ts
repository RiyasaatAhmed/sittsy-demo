// A stay is check-in to check-out, end EXCLUSIVE: [checkIn, checkOut).
// Boarding from Nov 2 to Nov 5 is 3 nights, and the sitter is free again on
// Nov 5, so a stay ending on a date and one starting on it do not overlap.

import { addDays, daysBetween, fromIsoDate, type IsoDate } from "../calendar";
import type { ParseResult } from "../shared";
import { MAX_DAYS_AHEAD, MAX_STAY_NIGHTS } from "./rules";

export type Stay = { checkIn: IsoDate; checkOut: IsoDate };

export function nightsIn(stay: Stay): number {
  return daysBetween(stay.checkIn, stay.checkOut);
}

/**
 * Validates check-in / check-out as sent by a client. `today` is the current
 * date in the booking time zone. Lists every problem at once.
 */
export function parseStay(checkIn: string | null, checkOut: string | null, today: IsoDate): ParseResult<Stay> {
  const errors: string[] = [];
  if (!checkIn || !fromIsoDate(checkIn)) errors.push("from must be a date (YYYY-MM-DD)");
  if (!checkOut || !fromIsoDate(checkOut)) errors.push("to must be a date (YYYY-MM-DD)");
  if (errors.length > 0 || !checkIn || !checkOut) return { ok: false, errors };

  const stay = { checkIn, checkOut };
  const nights = nightsIn(stay);
  if (nights < 1) errors.push("to must be after from (at least one night)");
  if (nights > MAX_STAY_NIGHTS) errors.push(`a stay can be at most ${MAX_STAY_NIGHTS} nights`);
  if (checkIn < today) errors.push("from cannot be in the past");
  if (checkIn > addDays(today, MAX_DAYS_AHEAD)) errors.push(`from can be at most ${MAX_DAYS_AHEAD} days ahead`);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: stay };
}

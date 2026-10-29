// The dates of a search, as the stay they stand for. Same rules as a booking
// (see booking/stay.ts: [from, to), at most 30 nights, not in the past), with
// one addition for searching: a single day (from = to, e.g. one day of day
// care) means that day, [from, from + 1).

import { parseStay, type Stay } from "../booking";
import { addDays, fromIsoDate, type DateRange, type IsoDate } from "../calendar";
import type { ParseResult } from "../shared";

/** Validates `from` / `to` sent to the API. Lists every problem at once. */
export function parseSearchDates(from: string | null, to: string | null, today: IsoDate): ParseResult<Stay> {
  const oneDay = from !== null && from === to && fromIsoDate(from) !== null;
  return parseStay(from, oneDay ? addDays(from, 1) : to, today);
}

/**
 * The stay to search for, from the dates picked in the UI: null while the
 * range is incomplete, or when it could not be searched (e.g. an old link
 * whose dates are now in the past), so the search runs without dates.
 */
export function searchStay(range: DateRange, today: IsoDate): Stay | null {
  if (range.from === null || range.to === null) return null;
  const parsed = parseSearchDates(range.from, range.to, today);
  return parsed.ok ? parsed.value : null;
}

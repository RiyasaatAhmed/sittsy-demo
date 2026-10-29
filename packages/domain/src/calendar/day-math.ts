// Whole-day arithmetic on ISO dates ("2026-10-29"). Done in UTC, so a
// daylight-saving change can never make a "day" 23 or 25 hours long.

import { fromIsoDate, type IsoDate } from "./date-range";
import { MS_PER_DAY } from "./dates";

function utcDay(date: IsoDate): number {
  if (!fromIsoDate(date)) throw new RangeError(`Not a calendar date: ${date}`);
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** The date `days` days after `date` (negative goes back). */
export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date((utcDay(date) + days) * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return utcDay(to) - utcDay(from);
}

/** Today's date in `timeZone` at the instant `now`, e.g. for "no check-in in the past". */
export function todayInTimeZone(now: Date, timeZone: string): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

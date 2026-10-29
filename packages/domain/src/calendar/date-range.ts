// Calendar maths for the "When" picker. Dates are plain ISO strings
// ("2026-10-29") in local time, so they survive URLs and compare as text.

export type IsoDate = string;

/** A stay: both ends optional while the user is still picking. */
export type DateRange = { from: IsoDate | null; to: IsoDate | null };

export const NO_DATES: DateRange = { from: null, to: null };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-10-29" for a local Date. */
export function toIsoDate(date: Date): IsoDate {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Local Date for "2026-10-29", or null if it is not a real calendar date. */
export function fromIsoDate(text: string): Date | null {
  const match = ISO_DATE.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  // Rejects 2026-02-30, which Date would roll over to March.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/**
 * The days of one month as weeks starting on Monday. Days outside the month
 * are null, so every week has 7 cells. `month` is 0-based (0 = January).
 */
export function monthWeeks(year: number, month: number): (IsoDate | null)[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0 = Sunday. Shift so Monday is column 0.
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (IsoDate | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => toIsoDate(new Date(year, month, index + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** The month `offset` months after (year, month). */
export function addMonths(year: number, month: number, offset: number): { year: number; month: number } {
  const date = new Date(year, month + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * The range after clicking `day`: the first click sets the start, the second
 * the end. Clicking before the start (or after a complete range) starts over.
 */
export function nextRange(range: DateRange, day: IsoDate): DateRange {
  if (range.from === null || range.to !== null || day < range.from) {
    return { from: day, to: null };
  }
  return { from: range.from, to: day };
}

/** Whether `day` lies strictly between the start and end of the range. */
export function isInside(range: DateRange, day: IsoDate): boolean {
  return range.from !== null && range.to !== null && day > range.from && day < range.to;
}

const monthDay = (date: Date) => date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

/**
 * Short label for the search bar: "October 29–30", "October 30 – November 2",
 * "From October 29", or null when no date is chosen.
 */
export function formatRange(range: DateRange): string | null {
  const from = range.from ? fromIsoDate(range.from) : null;
  const to = range.to ? fromIsoDate(range.to) : null;
  if (!from) return null;
  if (!to) return `From ${monthDay(from)}`;
  if (from.getTime() === to.getTime()) return monthDay(from);
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${monthDay(from)}–${to.getDate()}`;
  }
  return `${monthDay(from)} – ${monthDay(to)}`;
}

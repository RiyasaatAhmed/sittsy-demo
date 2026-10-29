"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/icons";
import { cx } from "@/utils/cx/cx";
import { addMonths, fromIsoDate, NO_DATES, nextRange, type DateRange, type IsoDate } from "@sitter/domain/calendar";
import { bookingToday } from "@sitter/domain/booking";
import { MonthCalendar } from "../MonthCalendar/MonthCalendar";
import styles from "./DateRangePicker.module.css";

type Props = {
  value: DateRange;
  /** Called with a complete range (start and end), or with no dates when cleared. */
  onChange: (range: DateRange) => void;
};

/**
 * Two months side by side; click a start day, then an end day. Past days are
 * disabled. The panel only opens in the browser, so reading "today" here
 * cannot cause a server/client mismatch.
 */
export function DateRangePicker({ value, onChange }: Props) {
  const [today] = useState<IsoDate>(() => bookingToday(new Date()));
  const [draft, setDraft] = useState<DateRange>(value);
  const [view, setView] = useState(() => {
    const start = (value.from && fromIsoDate(value.from)) || fromIsoDate(today) || new Date();
    return { year: start.getFullYear(), month: start.getMonth() };
  });
  const second = addMonths(view.year, view.month, 1);
  const isCurrentMonth = `${view.year}-${String(view.month + 1).padStart(2, "0")}` <= today.slice(0, 7);

  function pick(day: IsoDate) {
    const next = nextRange(draft, day);
    setDraft(next);
    if (next.to !== null) onChange(next);
  }

  const move = (offset: number) => setView(addMonths(view.year, view.month, offset));

  return (
    <div className={styles.picker}>
      <div className={styles.months}>
        <button
          type="button"
          className={cx(styles.nav, styles.previous)}
          aria-label="Previous month"
          disabled={isCurrentMonth}
          onClick={() => move(-1)}
        >
          <ChevronLeftIcon />
        </button>
        <MonthCalendar year={view.year} month={view.month} range={draft} today={today} onPick={pick} />
        <MonthCalendar year={second.year} month={second.month} range={draft} today={today} onPick={pick} />
        <button
          type="button"
          className={cx(styles.nav, styles.next)}
          aria-label="Next month"
          onClick={() => move(1)}
        >
          <ChevronRightIcon />
        </button>
      </div>
      <div className={styles.footer}>
        <span>Sitters who are away or already booked on these dates are hidden. For boarding, the last date is check-out.</span>
        {(value.from || draft.from) && (
          <button type="button" className={styles.clear} onClick={() => onChange(NO_DATES)}>
            Clear dates
          </button>
        )}
      </div>
    </div>
  );
}

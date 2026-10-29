import { cx } from "@/utils/cx/cx";
import { fromIsoDate, isInside, monthWeeks, type DateRange, type IsoDate } from "@sitter/domain/calendar";
import styles from "./MonthCalendar.module.css";

const WEEKDAYS = [
  ["Mo", "Monday"],
  ["Tu", "Tuesday"],
  ["We", "Wednesday"],
  ["Th", "Thursday"],
  ["Fr", "Friday"],
  ["Sa", "Saturday"],
  ["Su", "Sunday"],
] as const;

type Props = {
  year: number;
  /** 0-based (0 = January). */
  month: number;
  range: DateRange;
  /** Days before this cannot be picked. */
  today: IsoDate;
  onPick: (day: IsoDate) => void;
};

/** One month as a Monday-first table of day buttons, showing the chosen range. */
export function MonthCalendar({ year, month, range, today, onPick }: Props) {
  const title = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isRange = range.from !== null && range.to !== null && range.from !== range.to;

  return (
    <table className={styles.month}>
      <caption className={styles.caption}>{title}</caption>
      <thead>
        <tr>
          {WEEKDAYS.map(([short, full]) => (
            <th key={full} scope="col" abbr={full} className={styles.weekday}>
              {short}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthWeeks(year, month).map((week, weekIndex) => (
          <tr key={weekIndex}>
            {week.map((day, dayIndex) => {
              if (day === null) return <td key={dayIndex} className={styles.cell} />;
              const isStart = day === range.from;
              const isEnd = day === range.to;
              return (
                <td
                  key={day}
                  className={cx(
                    styles.cell,
                    isInside(range, day) && styles.inside,
                    isRange && isStart && styles.rangeStart,
                    isRange && isEnd && styles.rangeEnd,
                  )}
                >
                  <button
                    type="button"
                    className={cx(styles.day, (isStart || isEnd) && styles.endpoint)}
                    disabled={day < today}
                    aria-pressed={isStart || isEnd}
                    aria-label={fromIsoDate(day)?.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                    onClick={() => onPick(day)}
                  >
                    {Number(day.slice(8))}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

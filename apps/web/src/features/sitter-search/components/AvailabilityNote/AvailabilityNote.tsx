import { formatRange } from "@sitter/domain/calendar";
import type { SittersResponse } from "@sitter/domain/contract";
import styles from "./AvailabilityNote.module.css";

type Props = {
  ranking: SittersResponse;
  /** Complete dates were picked but could not be searched (e.g. an old link, now in the past). */
  datesIgnored: boolean;
};

/** One line above the list saying how the dates shaped it. Nothing without dates. */
export function AvailabilityNote({ ranking, datesIgnored }: Props) {
  if (datesIgnored) {
    return (
      <p className={styles.note} role="note">
        These dates can no longer be searched, so availability is not checked. Pick new dates.
      </p>
    );
  }
  if (!ranking.stay) return null;
  const dates = formatRange({ from: ranking.stay.checkIn, to: ranking.stay.checkOut });
  const hidden = ranking.unavailableCount;
  return (
    <p className={styles.note} role="note">
      Free {dates}
      {hidden > 0 && ` · ${hidden} ${hidden === 1 ? "sitter" : "sitters"} hidden: away or already booked`}
    </p>
  );
}

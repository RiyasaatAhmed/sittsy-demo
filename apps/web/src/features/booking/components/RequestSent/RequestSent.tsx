import { Button } from "@/components/Button/Button";
import { CheckIcon } from "@/components/icons/icons";
import type { Booking } from "@sitter/domain/contract";
import { formatCents, formatExpiry } from "../../utils/booking-labels/booking-labels";
import { BookingStatusBadge } from "../BookingStatusBadge/BookingStatusBadge";
import styles from "./RequestSent.module.css";

type Props = { booking: Booking; onDone: () => void };

/** The end of the request flow: what was recorded and what happens next. */
export function RequestSent({ booking, onDone }: Props) {
  return (
    <div className={styles.sent} role="status">
      <p className={styles.title}>
        <CheckIcon tone="accent" /> Request sent
      </p>
      <p className={styles.line}>
        <BookingStatusBadge status={booking.status} /> {formatCents(booking.quote.totalCents)} recorded
      </p>
      {booking.expiresAt && (
        <p className={styles.line}>The sitter has until {formatExpiry(booking.expiresAt)} (Paris time) to answer.</p>
      )}
      <p className={styles.line}>It stays under “Your booking requests”, also after a reload.</p>
      <Button onClick={onDone}>Done</Button>
    </div>
  );
}

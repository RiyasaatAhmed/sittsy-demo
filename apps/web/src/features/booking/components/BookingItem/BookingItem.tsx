import { Button } from "@/components/Button/Button";
import { describeError } from "@/lib/error-message/error-message";
import { canTransition } from "@sitter/domain/booking";
import type { Booking } from "@sitter/domain/contract";
import { useChangeBooking } from "../../hooks/useChangeBooking/useChangeBooking";
import { bookingConflict } from "../../utils/booking-conflict/booking-conflict";
import { describeStay, formatCents, formatExpiry } from "../../utils/booking-labels/booking-labels";
import { BookingStatusBadge } from "../BookingStatusBadge/BookingStatusBadge";
import styles from "./BookingItem.module.css";

type Props = { booking: Booking; onAvailabilityChange?: () => void };

/** One booking request: what, when, its status, and what can still be done with it. */
export function BookingItem({ booking, onAvailabilityChange }: Props) {
  const change = useChangeBooking(booking.id, onAvailabilityChange);
  const conflict = bookingConflict(change.error);
  // The domain's status rules decide which actions exist.
  const canCancel = canTransition(booking.status, "cancelled");
  const awaitsSitter = canTransition(booking.status, "confirmed");
  const stay = { checkIn: booking.checkIn, checkOut: booking.checkOut };

  return (
    <li className={styles.item}>
      <div className={styles.top}>
        <span className={styles.name}>{booking.sitter.name}</span>
        <BookingStatusBadge status={booking.status} />
      </div>
      <p className={styles.detail}>
        Boarding · {describeStay(stay, booking.nights)} · {formatCents(booking.quote.totalCents)}
      </p>
      {booking.expiresAt && (
        <p className={styles.detail}>The sitter has until {formatExpiry(booking.expiresAt)} (Paris time) to answer.</p>
      )}
      {change.error && (
        <p className={styles.error} role="alert">
          {conflict ? conflict.error : describeError(change.error)}
        </p>
      )}
      {(canCancel || awaitsSitter) && (
        <div className={styles.actions}>
          {canCancel && (
            <Button variant="quiet" disabled={change.isPending} onClick={() => change.mutate("cancel")}>
              {booking.status === "confirmed" ? "Cancel booking" : "Cancel request"}
            </Button>
          )}
          {awaitsSitter && (
            <span className={styles.demo}>
              Demo, answer as the sitter:
              <Button variant="quiet" disabled={change.isPending} onClick={() => change.mutate("confirmed")}>
                Confirm
              </Button>
              <Button variant="quiet" disabled={change.isPending} onClick={() => change.mutate("declined")}>
                Decline
              </Button>
            </span>
          )}
        </div>
      )}
    </li>
  );
}

"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorBanner } from "@/components/ErrorBanner/ErrorBanner";
import { describeError } from "@/lib/error-message/error-message";
import { bookingQueries } from "../../api/queries/queries";
import { BookingItem } from "../BookingItem/BookingItem";
import styles from "./MyBookings.module.css";

type Props = {
  /** Called when a booking changed who is free, so search results can refresh. */
  onAvailabilityChange?: () => void;
};

/**
 * This browser's booking requests, read from the server, so their status
 * survives a reload. Shows nothing until there is at least one.
 */
export function MyBookings({ onAvailabilityChange }: Props) {
  const titleId = useId();
  const { data, error, refetch, isFetching } = useQuery(bookingQueries.mine());

  if (!data) {
    return error ? (
      <ErrorBanner
        title="Couldn't load your booking requests"
        message={describeError(error)}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    ) : null;
  }
  if (data.bookings.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        Your booking requests
      </h2>
      <ul className={styles.list}>
        {data.bookings.map((booking) => (
          <BookingItem key={booking.id} booking={booking} onAvailabilityChange={onAvailabilityChange} />
        ))}
      </ul>
    </section>
  );
}

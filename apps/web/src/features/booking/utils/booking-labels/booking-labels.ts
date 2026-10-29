import { BOOKING_TIME_ZONE, type BookingStatus, type Stay } from "@sitter/domain/booking";
import { formatRange } from "@sitter/domain/calendar";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Waiting for the sitter",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired: no answer in time",
};

/** "€126", or "€126.50" when there are cents. */
export function formatCents(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros) ? `€${euros}` : `€${euros.toFixed(2)}`;
}

/** "November 2–5 · 3 nights". */
export function describeStay(stay: Stay, nights: number): string {
  const dates = formatRange({ from: stay.checkIn, to: stay.checkOut }) ?? "";
  return `${dates} · ${nights} ${nights === 1 ? "night" : "nights"}`;
}

/** When an unanswered request expires, in Paris time like every booking date: "Oct 30, 11:00". */
export function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: BOOKING_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

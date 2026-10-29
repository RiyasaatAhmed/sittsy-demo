import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SitterDecision } from "@sitter/domain/booking";
import type { BookingsResponse } from "@sitter/domain/contract";
import { answerAsSitter, cancelBooking } from "../../api/bookings-api/bookings-api";
import { bookingQueries } from "../../api/queries/queries";
import { bookingConflict } from "../../utils/booking-conflict/booking-conflict";

/** What can happen to a booking from the list: the owner cancels, or (demo) the sitter answers. */
export type BookingChange = "cancel" | SitterDecision;

/**
 * Changes one booking's status. The list shows the server's answer at once,
 * also when the change was refused because the status had already moved on
 * (a 409 carries the booking's current state). No automatic retries (the
 * mutation default): a change is never applied twice, but a retry of one that
 * did reach the server would be refused with a confusing message.
 */
export function useChangeBooking(bookingId: number, onAvailabilityChange?: () => void) {
  const queryClient = useQueryClient();
  const mineKey = bookingQueries.mine().queryKey;

  const showInList = (booking: BookingsResponse["bookings"][number]) =>
    queryClient.setQueryData<BookingsResponse>(mineKey, (old) =>
      old && { bookings: old.bookings.map((each) => (each.id === booking.id ? booking : each)) },
    );

  return useMutation({
    mutationFn: (change: BookingChange) =>
      change === "cancel" ? cancelBooking(bookingId) : answerAsSitter(bookingId, change),
    onSuccess: ({ booking }) => {
      showInList(booking);
      // Cancelled or declined: the dates are free again.
      if (booking.status !== "confirmed") onAvailabilityChange?.();
    },
    onError: (error) => {
      const conflict = bookingConflict(error);
      if (conflict?.code === "invalid_transition") showInList(conflict.booking);
    },
  });
}

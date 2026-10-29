"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { isBookableService } from "@sitter/domain/booking";
import { BookingDialog, type StayChoice } from "@/features/booking/components/BookingDialog/BookingDialog";
import { MyBookings } from "@/features/booking/components/MyBookings/MyBookings";
import { RequestStayButton } from "@/features/booking/components/RequestStayButton/RequestStayButton";
import { sitterQueries } from "@/features/sitter-search/api/queries/queries";
import { Playground } from "@/features/sitter-search/components/Playground/Playground";

/**
 * The search page: composes the search and booking features, which never
 * import each other. Booking plugs into the search's slots (a card action and
 * the results header), and a booking that changes who is free refreshes the
 * search results.
 */
export function SearchPage() {
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<StayChoice | null>(null);
  const refreshAvailability = () => void queryClient.invalidateQueries({ queryKey: sitterQueries.all });

  return (
    <>
      <Playground
        resultsHeader={<MyBookings onAvailabilityChange={refreshAvailability} />}
        renderSitterAction={(sitter, { service, stay }) =>
          isBookableService(service) && (
            <RequestStayButton
              stay={stay}
              onRequest={(chosen) => setChoice({ sitterId: sitter.id, sitterName: sitter.name, service, stay: chosen })}
            />
          )
        }
      />
      {choice && (
        <BookingDialog
          // A fresh dialog (and Idempotency-Key) for each choice.
          key={`${choice.sitterId}:${choice.stay.checkIn}:${choice.stay.checkOut}`}
          choice={choice}
          onClose={() => setChoice(null)}
          onAvailabilityChange={refreshAvailability}
        />
      )}
    </>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button/Button";
import { ErrorBanner } from "@/components/ErrorBanner/ErrorBanner";
import { ErrorState } from "@/components/ErrorState/ErrorState";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { describeError } from "@/lib/error-message/error-message";
import { isRetryableError } from "@/lib/retry-policy/retry-policy";
import type { BookingTarget } from "@sitter/domain/booking";
import { bookingQueries } from "../../api/queries/queries";
import { useRequestStay } from "../../hooks/useRequestStay/useRequestStay";
import { bookingConflict } from "../../utils/booking-conflict/booking-conflict";
import { formatCents } from "../../utils/booking-labels/booking-labels";
import { QuoteDetails } from "../QuoteDetails/QuoteDetails";
import { RequestSent } from "../RequestSent/RequestSent";
import styles from "./RequestFlow.module.css";

type Props = {
  target: BookingTarget;
  sitterName: string;
  onDone: () => void;
  onAvailabilityChange?: () => void;
};

/**
 * The steps of one booking request, in order of what can happen:
 * - sent: what was recorded;
 * - the dates were taken (by someone faster, or the sitter is away): say so;
 * - the quote is loading or failed: placeholder, or error with Try again;
 * - otherwise the server's quote and "Send request", with a banner when the
 *   price changed (the quote shown is then the new one) or the send failed.
 */
export function RequestFlow({ target, sitterName, onDone, onAvailabilityChange }: Props) {
  const quote = useQuery(bookingQueries.quote(target));
  const request = useRequestStay(target, onAvailabilityChange);
  const conflict = bookingConflict(request.error);

  if (request.data) return <RequestSent booking={request.data.booking} onDone={onDone} />;

  if (conflict?.code === "unavailable" || quote.data?.available === false) {
    return (
      <div className={styles.unavailable} role="alert">
        <p className={styles.title}>Not available for these dates</p>
        <p>
          {conflict?.code === "unavailable"
            ? conflict.error
            : `${sitterName} is away or already booked on some of these nights. Choose other dates or another sitter.`}
        </p>
        <Button variant="secondary" onClick={onDone}>
          Choose again
        </Button>
      </div>
    );
  }

  if (!quote.data) {
    return quote.error ? (
      <ErrorState
        title="Couldn't get a price"
        message={describeError(quote.error)}
        onRetry={isRetryableError(quote.error) ? () => void quote.refetch() : undefined}
        retrying={quote.isFetching}
      />
    ) : (
      <div className={styles.loading} aria-busy="true" aria-label="Loading the price">
        <Skeleton width="100%" height={20} />
        <Skeleton width="100%" height={28} />
      </div>
    );
  }

  const { totalCents } = quote.data.quote;
  return (
    <div className={styles.flow}>
      {conflict?.code === "price_changed" && (
        <ErrorBanner title="The price changed" message="The total below is the current price. Send again to accept it." />
      )}
      {request.error && !conflict && (
        <ErrorBanner
          title="Couldn't send the request"
          message={describeError(request.error)}
          onRetry={isRetryableError(request.error) ? () => request.send(totalCents) : undefined}
          retrying={request.isPending}
        />
      )}
      <QuoteDetails quote={quote.data.quote} />
      <p className={styles.note}>Priced by the server from the sitter&apos;s current nightly rate. No fees.</p>
      <Button onClick={() => request.send(totalCents)} disabled={request.isPending}>
        {request.isPending ? "Sending…" : `Send request · ${formatCents(totalCents)}`}
      </Button>
    </div>
  );
}

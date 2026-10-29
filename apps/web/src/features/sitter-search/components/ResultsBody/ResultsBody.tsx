import { ErrorBanner } from "@/components/ErrorBanner/ErrorBanner";
import { ErrorState } from "@/components/ErrorState/ErrorState";
import { describeError } from "@/lib/error-message/error-message";
import { isRetryableError } from "@/lib/retry-policy/retry-policy";
import type { RankedSitters } from "../../hooks/useRankedSitters/useRankedSitters";
import { useWaitingForNetwork } from "../../hooks/useWaitingForNetwork/useWaitingForNetwork";
import { AvailabilityNote } from "../AvailabilityNote/AvailabilityNote";
import { EmptyResults } from "../EmptyResults/EmptyResults";
import { Pagination } from "../Pagination/Pagination";
import { SitterList, type RenderSitterAction } from "../SitterList/SitterList";
import { SitterListSkeleton } from "../SitterListSkeleton/SitterListSkeleton";

type Props = {
  ranked: RankedSitters;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onPageChange: (page: number) => void;
  renderSitterAction?: RenderSitterAction;
};

/**
 * Picks what the results area shows:
 * - the requested page could not load (offline, or an error, and no retry
 *   running): an error state in place of the list, with Try again;
 * - the requested page is loaded, or is on its way after a page change or
 *   re-rank: the list (the previous one dimmed while the next loads, so the
 *   page does not jump). A failed refresh of a loaded page only adds a banner,
 *   so a list already on screen is never hidden;
 * - otherwise (first load, or a Try again in progress): skeleton rows.
 */
export function ResultsBody({ ranked, selectedId, onHover, onPageChange, renderSitterAction }: Props) {
  const { query, previous, page, prefetchPage, retry, isRetrying, datesIgnored } = ranked;
  const ranking = query.data;
  const offline = useWaitingForNetwork(query);
  // On an error, "Try again" only when asking again could work (not for invalid input).
  const retryIfUseful = query.error && isRetryableError(query.error) ? retry : undefined;
  const pageLoaded = ranking !== undefined && !query.isPlaceholderData;

  if (!pageLoaded && offline && !isRetrying) {
    return (
      <ErrorState
        title="You're offline"
        message={
          page > 1
            ? `Page ${page} will load when you're back online, or try again now.`
            : "Sitters will load when you're back online, or try again now."
        }
        onRetry={retry}
      />
    );
  }

  if (!pageLoaded && query.error && !query.isFetching) {
    return (
      <ErrorState title="Couldn't load sitters" message={describeError(query.error)} onRetry={retryIfUseful} />
    );
  }

  const showList = ranking !== undefined && (pageLoaded || (!isRetrying && !query.isError));
  if (!showList) {
    return <SitterListSkeleton slow={query.failureCount > 0} />;
  }

  return (
    <>
      {pageLoaded && offline && (
        <ErrorBanner
          title="You're offline"
          message="Showing the last results. They will update when you're back online."
          onRetry={retry}
          retrying={query.isFetching}
        />
      )}
      {pageLoaded && !offline && query.error && (
        <ErrorBanner
          title="Couldn't update the results"
          message={describeError(query.error)}
          onRetry={retryIfUseful}
          retrying={query.isFetching}
        />
      )}
      <AvailabilityNote ranking={ranking} datesIgnored={datesIgnored} />
      {ranking.results.length === 0 ? (
        <EmptyResults
          service={ranking.service}
          unavailableCount={ranking.unavailableCount}
          page={page}
          onBackToFirstPage={() => onPageChange(1)}
        />
      ) : (
        <SitterList
          ranking={ranking}
          previous={previous}
          busy={query.isFetching || !pageLoaded}
          selectedId={selectedId}
          onHover={onHover}
          renderAction={renderSitterAction}
        />
      )}
      <Pagination
        page={page}
        totalPages={ranking.totalPages}
        onChange={onPageChange}
        onPrefetch={prefetchPage}
      />
    </>
  );
}

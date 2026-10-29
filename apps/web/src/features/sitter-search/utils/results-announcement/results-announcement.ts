import type { SittersResponse } from "@sitter/domain/contract";

type ResultsState = {
  ranking: SittersResponse | undefined;
  isPending: boolean;
  /** Failed attempts so far; above 0 while automatic retries run. */
  failureCount: number;
  page: number;
};

/**
 * What the polite live region says about the results, so screen reader users
 * hear loading progress and page changes. Errors are not included: they are
 * announced by their own alert.
 */
export function resultsAnnouncement({ ranking, isPending, failureCount, page }: ResultsState): string {
  if (ranking) {
    const first = ranking.results[0]?.rank;
    const last = ranking.results.at(-1)?.rank;
    if (first === undefined || last === undefined) return "No sitters found.";
    return `Page ${page} of ${ranking.totalPages}, sitters ${first} to ${last}.`;
  }
  if (isPending) {
    return failureCount > 0 ? "Still trying to reach the server…" : "Loading sitters…";
  }
  return "";
}

import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * What a "Try again" button does: run the query again right now.
 * `refetch()` alone is not enough while a query is paused waiting for the
 * network: it only resumes once the browser reports online. Cancelling the
 * paused attempt first makes it start a fresh request, which succeeds if the
 * server is reachable after all.
 */
export async function retryNow(queryClient: QueryClient, queryKey: QueryKey): Promise<void> {
  await queryClient.cancelQueries({ queryKey, exact: true });
  await queryClient.refetchQueries({ queryKey, exact: true });
}

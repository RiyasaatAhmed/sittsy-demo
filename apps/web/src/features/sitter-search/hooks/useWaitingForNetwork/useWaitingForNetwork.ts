import type { UseQueryResult } from "@tanstack/react-query";
import { useOnlineStatus } from "@/hooks/useOnlineStatus/useOnlineStatus";

/**
 * True when a query is paused because the browser is offline: its request (or
 * its retries) will only run once the connection is back. This is neither
 * loading nor an error, so the UI shows it as its own "You're offline" state.
 * (Retries also pause in a background tab; that case is not "offline".)
 */
export function useWaitingForNetwork(query: Pick<UseQueryResult, "fetchStatus">): boolean {
  const online = useOnlineStatus();
  return !online && query.fetchStatus === "paused";
}

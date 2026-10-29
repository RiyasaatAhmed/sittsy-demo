import { environmentManager, QueryClient } from "@tanstack/react-query";
import { shouldRetry } from "../retry-policy/retry-policy";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The ranking for a given search and set of weights does not change
        // while you look at it, so a minute-old answer is still good. Moving a
        // slider back to an earlier value shows the cached list instantly.
        staleTime: 60 * 1000,
        retry: shouldRetry,
        // Always make one real attempt, then wait for the connection before
        // retrying. The default ('online') would not even try while the browser
        // reports offline, so a reachable server (e.g. localhost) went unused
        // and the UI waited silently with no error and nothing to retry.
        networkMode: "offlineFirst",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * One client per request on the server (so users never share a cache), and a
 * single long-lived client in the browser. This is the pattern from the
 * TanStack Query "Advanced Server Rendering" guide for the Next.js App Router
 * (`environmentManager.isServer()` replaces the now-deprecated `isServer` constant).
 */
export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

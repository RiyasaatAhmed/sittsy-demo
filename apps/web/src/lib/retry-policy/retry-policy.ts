import { ApiError } from "../api-error/api-error";

/** How many times a failed request is retried automatically after the first attempt. */
export const MAX_RETRIES = 2;

/**
 * Whether asking again could give a different answer. A 4xx means the request
 * itself is wrong (e.g. latitude out of range), so it would fail the same way;
 * network errors and 5xx (e.g. the database is still starting) can recover.
 * Used by the automatic retries and to decide whether to show a "Try again" button.
 */
export function isRetryableError(error: Error): boolean {
  return !(error instanceof ApiError && error.status >= 400 && error.status < 500);
}

/** TanStack Query `retry` option: retryable errors, at most MAX_RETRIES times. */
export function shouldRetry(failureCount: number, error: Error): boolean {
  return isRetryableError(error) && failureCount < MAX_RETRIES;
}

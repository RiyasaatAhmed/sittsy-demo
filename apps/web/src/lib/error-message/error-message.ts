import { ApiError } from "../api-error/api-error";

/** Message to show the user for a failed request. */
export function describeError(error: Error): string {
  return error instanceof ApiError ? error.message : "Could not reach the API.";
}

import type { BookingConflictResponse } from "@sitter/domain/contract";
import { ApiError } from "@/lib/api-error/api-error";

/** The booking conflict behind a failed request (a 409 with a `code`), or null for any other error. */
export function bookingConflict(error: Error | null): BookingConflictResponse | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as Partial<BookingConflictResponse> | undefined;
  return body?.code ? (body as BookingConflictResponse) : null;
}

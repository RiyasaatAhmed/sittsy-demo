import type { ErrorResponse } from "@sitter/domain/contract";

/**
 * A non-2xx answer from our API. Keeps the status so callers can decide
 * whether to retry, and the parsed body for endpoints whose errors carry more
 * than a message (e.g. a booking conflict's `code` and new quote).
 */
export class ApiError extends Error {
  status: number;
  body: ErrorResponse | undefined;

  constructor(message: string, status: number, body?: ErrorResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

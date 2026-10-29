/**
 * The database could not be reached or a query failed. The error handler turns
 * it into a 503: the request itself was fine, the service is not.
 */
export class DatabaseUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Database unavailable", options);
    this.name = "DatabaseUnavailableError";
  }
}

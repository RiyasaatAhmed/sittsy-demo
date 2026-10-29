// Recognising the Postgres errors the API turns into results instead of a 503.
// Drizzle wraps the driver's error in DrizzleQueryError, so the Postgres
// fields (SQLSTATE `code`, `constraint`) are found on the `cause` chain.

/** SQLSTATE codes (Postgres docs, Appendix A). */
export const UNIQUE_VIOLATION = "23505";
export const EXCLUSION_VIOLATION = "23P01";

type PgErrorFields = { code?: unknown; constraint?: unknown };

/** Whether `error` (or an error it wraps) is `code` raised by `constraint`. */
export function isConstraintViolation(error: unknown, code: string, constraint: string): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    const fields = current as PgErrorFields;
    if (fields.code === code && fields.constraint === constraint) return true;
  }
  return false;
}

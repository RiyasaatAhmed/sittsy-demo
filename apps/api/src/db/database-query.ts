import { DatabaseUnavailableError } from "../shared/http/errors";

/**
 * Runs repository code; any failure it does not handle itself becomes a
 * DatabaseUnavailableError (a 503 for the client). Expected database errors,
 * such as a constraint violation the caller turns into a result, must be
 * caught inside `run`.
 */
export async function databaseQuery<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new DatabaseUnavailableError({ cause: error });
  }
}

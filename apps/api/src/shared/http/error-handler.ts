import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ErrorResponse } from "@sitter/domain/contract";
import { DATABASE_UNAVAILABLE_MESSAGE } from "./error-responses";
import { DatabaseUnavailableError } from "./errors";

/** Unknown routes: a JSON 404 instead of Express's HTML page. */
export const notFound: RequestHandler = (_req, res) => {
  const body: ErrorResponse = { error: "Not found" };
  res.status(404).json(body);
};

/**
 * The 4xx status of an error safe to show the client: express.json()'s
 * errors (invalid JSON, body too large) are http-errors with `expose: true`.
 */
function clientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { status, expose } = error as { status?: unknown; expose?: unknown };
  return expose === true && typeof status === "number" && status >= 400 && status < 500 ? status : undefined;
}

/**
 * The one place errors become responses (registered last, 4 arguments).
 * Express 5 routes rejected promises from async handlers here too. Known
 * errors get their status; anything else is a 500 with a generic message: the
 * details go to the log (with the request id), never to the client.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const clientStatus = clientErrorStatus(error);
  if (clientStatus !== undefined) {
    const parseFailed = (error as { type?: unknown }).type === "entity.parse.failed";
    const body: ErrorResponse = { error: parseFailed ? "The request body is not valid JSON" : (error as Error).message };
    res.status(clientStatus).json(body);
    return;
  }
  if (error instanceof DatabaseUnavailableError) {
    req.log.error({ err: error }, "database unavailable");
    const body: ErrorResponse = { error: DATABASE_UNAVAILABLE_MESSAGE };
    res.status(503).json(body);
    return;
  }
  req.log.error({ err: error }, "unhandled error");
  const body: ErrorResponse = { error: "Internal server error" };
  res.status(500).json(body);
};

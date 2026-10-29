import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

/** A request id we can safely log and echo: short, letters, digits, dashes and underscores only. */
const SAFE_ID = /^[\w-]{1,100}$/;

/**
 * Reuses the caller's `x-request-id` (e.g. set by nginx) when it is safe, so
 * one id follows a request across services; otherwise makes a new one. The id
 * is sent back in the response header and attached to every log line.
 */
export function requestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader("x-request-id", id);
  return id;
}

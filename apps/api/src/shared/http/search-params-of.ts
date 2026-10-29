import type { Request } from "express";

/**
 * The raw query string as URLSearchParams, for the domain's validators.
 * (Express's own `req.query` parser is not used: the validators expect plain
 * strings, exactly as the browser sent them.)
 */
export function searchParamsOf(req: Request): URLSearchParams {
  return new URL(req.originalUrl, "http://localhost").searchParams;
}

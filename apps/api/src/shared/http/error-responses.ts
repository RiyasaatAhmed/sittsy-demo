import type { Response } from "express";
import type { ErrorResponse } from "@sitter/domain/contract";

// Every error the API returns has the same JSON shape (`ErrorResponse`).

export const DATABASE_UNAVAILABLE_MESSAGE =
  "Database unavailable. Run `docker compose up -d` and `npm run db:seed`, then retry.";

/** 400: the query string is invalid. Lists every problem at once. */
export function sendInvalidQuery(res: Response<ErrorResponse>, details: string[]): void {
  res.status(400).json({ error: "Invalid query parameters", details });
}

/** 400: the body or headers are invalid. Lists every problem at once. */
export function sendInvalidRequest(res: Response<ErrorResponse>, details: string[]): void {
  res.status(400).json({ error: "Invalid request", details });
}

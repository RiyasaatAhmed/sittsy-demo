import type { Request } from "express";
import type { ParseResult } from "@sitter/domain/shared";

export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

/** Letters, digits, `-` and `_`, 8–255 characters: a UUID fits. */
const KEY = /^[\w-]{8,255}$/;

/**
 * The client's Idempotency-Key: one new value per submission, sent again
 * unchanged on a retry, so a repeated request returns the first result
 * instead of acting twice (the scheme Stripe's API uses).
 */
export function readIdempotencyKey(req: Request): ParseResult<string> {
  const key = req.get(IDEMPOTENCY_KEY_HEADER);
  if (key === undefined || key === "") {
    return { ok: false, errors: [`the ${IDEMPOTENCY_KEY_HEADER} header is required (a new UUID per booking request)`] };
  }
  if (!KEY.test(key)) {
    return { ok: false, errors: [`the ${IDEMPOTENCY_KEY_HEADER} header must be 8–255 letters, digits, - or _`] };
  }
  return { ok: true, value: key };
}

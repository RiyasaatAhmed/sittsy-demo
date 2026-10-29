/**
 * A new Idempotency-Key: 128 random bits as 32 hex characters. Built on
 * crypto.getRandomValues, which (unlike crypto.randomUUID) also works on
 * plain-http origins other than localhost.
 */
export function newIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

import { describe, expect, it } from "vitest";
import { newIdempotencyKey } from "./idempotency-key";

describe("newIdempotencyKey", () => {
  it("makes a different 32-character hex key each time, accepted by the API (8–255 of [A-Za-z0-9_-])", () => {
    const keys = new Set(Array.from({ length: 100 }, newIdempotencyKey));
    expect(keys.size).toBe(100);
    for (const key of keys) expect(key).toMatch(/^[0-9a-f]{32}$/);
  });
});

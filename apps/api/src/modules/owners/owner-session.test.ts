import { describe, expect, it } from "vitest";
import { hashToken } from "./owner-session";

describe("hashToken", () => {
  it("stores a SHA-256 of the token, never the token itself", () => {
    const token = "a".repeat(43);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toBe(hashToken(token));
  });
});

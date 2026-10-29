import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { EXCLUSION_VIOLATION, UNIQUE_VIOLATION, isConstraintViolation } from "./pg-error";

const pgError = (code: string, constraint: string) => Object.assign(new Error("pg"), { code, constraint });

describe("isConstraintViolation", () => {
  it("finds the Postgres error inside Drizzle's wrapper", () => {
    const wrapped = new DrizzleQueryError("insert …", [], pgError(EXCLUSION_VIOLATION, "bookings_no_overlap"));
    expect(isConstraintViolation(wrapped, EXCLUSION_VIOLATION, "bookings_no_overlap")).toBe(true);
  });

  it("needs both the code and the constraint to match", () => {
    const error = pgError(UNIQUE_VIOLATION, "demo_owners_token_hash_unique");
    expect(isConstraintViolation(error, UNIQUE_VIOLATION, "bookings_owner_idempotency_key")).toBe(false);
    expect(isConstraintViolation(error, EXCLUSION_VIOLATION, "demo_owners_token_hash_unique")).toBe(false);
  });

  it.each([undefined, null, "text", { code: EXCLUSION_VIOLATION, constraint: "x" }])("ignores %j (not an Error)", (value) => {
    expect(isConstraintViolation(value, EXCLUSION_VIOLATION, "x")).toBe(false);
  });
});

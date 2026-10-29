import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-error/api-error";
import { bookingConflict } from "./booking-conflict";

describe("bookingConflict", () => {
  it("reads the conflict from a 409", () => {
    const body = { error: "Taken", code: "unavailable" as const };
    expect(bookingConflict(new ApiError("Taken", 409, body))).toEqual(body);
  });

  it("is null for anything else", () => {
    expect(bookingConflict(null)).toBeNull();
    expect(bookingConflict(new Error("offline"))).toBeNull();
    expect(bookingConflict(new ApiError("Invalid", 400, { error: "Invalid" }))).toBeNull();
    expect(bookingConflict(new ApiError("Conflict", 409, { error: "Conflict" }))).toBeNull();
  });
});

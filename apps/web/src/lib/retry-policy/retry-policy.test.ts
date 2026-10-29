import { describe, expect, it } from "vitest";
import { ApiError } from "../api-error/api-error";
import { isRetryableError, MAX_RETRIES, shouldRetry } from "./retry-policy";

describe("isRetryableError", () => {
  it("is false for a 4xx and true for a 5xx or a network failure", () => {
    expect(isRetryableError(new ApiError("Invalid query parameters", 400))).toBe(false);
    expect(isRetryableError(new ApiError("Not found", 404))).toBe(false);
    expect(isRetryableError(new ApiError("Database unavailable", 503))).toBe(true);
    expect(isRetryableError(new TypeError("Failed to fetch"))).toBe(true);
  });
});

describe("shouldRetry", () => {
  it("never retries a 4xx: the same bad request would fail again", () => {
    expect(shouldRetry(0, new ApiError("Invalid query parameters", 400))).toBe(false);
    expect(shouldRetry(0, new ApiError("Not found", 404))).toBe(false);
  });

  it("retries server errors and network failures up to MAX_RETRIES times", () => {
    const serverError = new ApiError("Database unavailable", 503);
    const networkError = new TypeError("Failed to fetch");
    for (const error of [serverError, networkError]) {
      expect(shouldRetry(0, error)).toBe(true);
      expect(shouldRetry(MAX_RETRIES - 1, error)).toBe(true);
      expect(shouldRetry(MAX_RETRIES, error)).toBe(false);
    }
  });
});

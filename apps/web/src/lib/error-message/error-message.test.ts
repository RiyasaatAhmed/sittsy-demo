import { describe, expect, it } from "vitest";
import { ApiError } from "../api-error/api-error";
import { describeError } from "./error-message";

describe("describeError", () => {
  it("shows the API's own message, or a generic one when the API was not reached", () => {
    expect(describeError(new ApiError("lat must be a number", 400))).toBe("lat must be a number");
    expect(describeError(new TypeError("Failed to fetch"))).toBe("Could not reach the API.");
  });
});

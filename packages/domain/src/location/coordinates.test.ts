import { describe, expect, it } from "vitest";
import { parseCoordinateInputs, roundCoordinates } from "./coordinates";

describe("roundCoordinates", () => {
  it("keeps 5 decimals", () => {
    expect(roundCoordinates({ lat: 48.856612345, lng: 2.352219999 })).toEqual({
      lat: 48.85661,
      lng: 2.35222,
    });
  });
});

describe("parseCoordinateInputs", () => {
  it("reads two numbers", () => {
    expect(parseCoordinateInputs("48.85", " -2.3 ")).toEqual({
      ok: true,
      value: { lat: 48.85, lng: -2.3 },
    });
  });

  it.each([
    ["", "2.35"],
    ["48.85", "  "],
    ["north", "2.35"],
    ["48.85", "Infinity"],
    ["0x10", "2"],
    ["1e1", "2"],
  ])("rejects lat %j, lng %j", (lat, lng) => {
    expect(parseCoordinateInputs(lat, lng)).toEqual({
      ok: false,
      errors: ["Latitude and longitude must be numbers."],
    });
  });

  it("leaves range checks to the API", () => {
    expect(parseCoordinateInputs("95", "2.35").ok).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "../ranking";
import { parseLocation, parseSitterSearch, toSitterSearchParams } from "./search-params";

const params = (query: string) => new URLSearchParams(query);
const TODAY = "2026-10-29";

describe("parseSitterSearch", () => {
  it("parses a valid query with defaults", () => {
    expect(parseSitterSearch(params("lat=48.85&lng=2.35&service=dog_walking"), TODAY)).toEqual({
      ok: true,
      value: {
        lat: 48.85,
        lng: 2.35,
        service: "dog_walking",
        limit: 20,
        page: 1,
        weights: DEFAULT_WEIGHTS,
        coldStartBoost: true,
        stay: null,
      },
    });
  });

  it("reads limit, page, weights and the boost toggle", () => {
    const result = parseSitterSearch(
      params("lat=48.85&lng=2.35&service=boarding&limit=5&page=3&w_quality=1&w_cold_start=0&boost=false"),
      TODAY,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        lat: 48.85,
        lng: 2.35,
        service: "boarding",
        limit: 5,
        page: 3,
        weights: { ...DEFAULT_WEIGHTS, quality: 1, coldStart: 0 },
        coldStartBoost: false,
        stay: null,
      },
    });
  });

  it("reads optional dates as a stay, a single day being that day", () => {
    const range = parseSitterSearch(params("lat=48.85&lng=2.35&service=boarding&from=2026-11-02&to=2026-11-05"), TODAY);
    expect(range.ok && range.value.stay).toEqual({ checkIn: "2026-11-02", checkOut: "2026-11-05" });
    const oneDay = parseSitterSearch(params("lat=48.85&lng=2.35&service=day_care&from=2026-11-02&to=2026-11-02"), TODAY);
    expect(oneDay.ok && oneDay.value.stay).toEqual({ checkIn: "2026-11-02", checkOut: "2026-11-03" });
  });

  it.each([
    ["missing lat", "lng=2.35&service=dog_walking", "lat is required"],
    ["empty lat", "lat=&lng=2.35&service=dog_walking", "lat is required"],
    ["non-numeric lat", "lat=abc&lng=2.35&service=dog_walking", "lat must be a number"],
    ["lat out of range", "lat=91&lng=2.35&service=dog_walking", "lat must be a number"],
    ["missing lng", "lat=48.85&service=dog_walking", "lng is required"],
    ["lng out of range", "lat=48.85&lng=-181&service=dog_walking", "lng must be a number"],
    ["lng with junk", "lat=48.85&lng=2.35km&service=dog_walking", "lng must be a number"],
    ["missing service", "lat=48.85&lng=2.35", "service is required"],
    ["unknown service", "lat=48.85&lng=2.35&service=cat_grooming", "service must be one of"],
    ["limit zero", "lat=48.85&lng=2.35&service=drop_in&limit=0", "limit must be"],
    ["limit fraction", "lat=48.85&lng=2.35&service=drop_in&limit=2.5", "limit must be a whole number"],
    ["page zero", "lat=48.85&lng=2.35&service=drop_in&page=0", "page must be"],
    ["negative page", "lat=48.85&lng=2.35&service=drop_in&page=-2", "page must be"],
    ["page fraction", "lat=48.85&lng=2.35&service=drop_in&page=1.5", "page must be a whole number"],
    ["page as text", "lat=48.85&lng=2.35&service=drop_in&page=two", "page must be"],
    ["absurd page", "lat=48.85&lng=2.35&service=drop_in&page=10001", "page must be"],
    ["negative weight", "lat=48.85&lng=2.35&service=drop_in&w_quality=-1", "w_quality must be"],
    ["bad boost", "lat=48.85&lng=2.35&service=drop_in&boost=maybe", "boost must be"],
    ["reversed dates", "lat=48.85&lng=2.35&service=boarding&from=2026-11-05&to=2026-11-02", "to must be after from"],
    ["only one date", "lat=48.85&lng=2.35&service=boarding&from=2026-11-05", "to must be a date"],
    ["an invalid date", "lat=48.85&lng=2.35&service=boarding&from=2026-02-30&to=2026-03-02", "from must be a date"],
    ["past dates", "lat=48.85&lng=2.35&service=boarding&from=2026-10-01&to=2026-10-03", "from cannot be in the past"],
    ["too long a stay", "lat=48.85&lng=2.35&service=boarding&from=2026-11-01&to=2026-12-15", "a stay can be at most 30 nights"],
  ])("rejects %s", (_label, query, message) => {
    const result = parseSitterSearch(params(query), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.startsWith(message))).toBe(true);
    }
  });

  it("reports every problem at once", () => {
    const result = parseSitterSearch(params(""), TODAY);
    expect(result).toEqual({
      ok: false,
      errors: ["lat is required", "lng is required", "service is required"],
    });
  });
});

describe("parseLocation", () => {
  it("accepts negative coordinates", () => {
    expect(parseLocation(params("lat=-33.9&lng=-70.6&service=day_care"))).toEqual({
      ok: true,
      value: { lat: -33.9, lng: -70.6, service: "day_care" },
    });
  });
});

describe("toSitterSearchParams", () => {
  it("round-trips through parseSitterSearch", () => {
    const search = {
      lat: 48.87,
      lng: 2.33,
      service: "house_sitting" as const,
      limit: 7,
      page: 4,
      weights: { quality: 0.5, responsiveness: 0.25, activity: 0, distance: 1, coldStart: 0.75 },
      coldStartBoost: false,
      stay: { checkIn: "2026-11-02", checkOut: "2026-11-05" },
    };
    expect(parseSitterSearch(toSitterSearchParams(search), TODAY)).toEqual({ ok: true, value: search });
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "../ranking";
import { DEFAULT_SEARCH, parseSearchUrl, toSearchUrl, type SearchState } from "./search-url";

const parse = (query: string) => parseSearchUrl(new URLSearchParams(query));

describe("parseSearchUrl", () => {
  it("reads the reference site's parameters", () => {
    expect(
      parse("service=day_care&lat=46.227638&lng=2.213749&location=France&from=2026-10-29&to=2026-10-30"),
    ).toEqual({
      ...DEFAULT_SEARCH,
      service: "day_care",
      location: { lat: 46.227638, lng: 2.213749, label: "France" },
      dates: { from: "2026-10-29", to: "2026-10-30" },
    });
  });

  it("uses the defaults for an empty URL", () => {
    expect(parse("")).toEqual(DEFAULT_SEARCH);
  });

  it("reads page, weights and boost", () => {
    const state = parse("page=3&w_distance=1&w_quality=0.5&boost=false");
    expect(state.page).toBe(3);
    expect(state.weights).toEqual({ ...DEFAULT_WEIGHTS, distance: 1, quality: 0.5 });
    expect(state.coldStartBoost).toBe(false);
  });

  it("falls back to defaults for invalid values instead of failing", () => {
    const state = parse("service=cat_grooming&lat=north&lng=2&from=2026-02-30&page=0&w_distance=7");
    expect(state.service).toBe(DEFAULT_SEARCH.service);
    expect(state.location).toEqual(DEFAULT_SEARCH.location);
    expect(state.dates).toEqual({ from: null, to: null });
    expect(state.page).toBe(1);
    expect(state.weights.distance).toBe(DEFAULT_WEIGHTS.distance);
  });

  it("keeps an out-of-range latitude so the API can explain the error", () => {
    expect(parse("lat=95&lng=2.35").location.lat).toBe(95);
  });

  it("labels coordinates without a place name with the coordinates", () => {
    expect(parse("lat=48.86&lng=2.35").location.label).toBe("48.86, 2.35");
  });

  it("drops an end date before the start date", () => {
    expect(parse("from=2026-10-30&to=2026-10-29").dates).toEqual({ from: "2026-10-30", to: null });
  });
});

describe("toSearchUrl", () => {
  it("always writes service and place, and leaves defaults out", () => {
    expect(toSearchUrl(DEFAULT_SEARCH).toString()).toBe(
      "service=dog_walking&lat=48.8566&lng=2.3522&location=Paris",
    );
  });

  it("round-trips through parseSearchUrl", () => {
    const state: SearchState = {
      service: "house_sitting",
      location: { lat: 48.8867, lng: 2.3431, label: "Montmartre" },
      dates: { from: "2026-11-02", to: "2026-11-05" },
      page: 2,
      weights: { ...DEFAULT_WEIGHTS, distance: 1, coldStart: 0 },
      coldStartBoost: false,
    };
    expect(parseSearchUrl(toSearchUrl(state))).toEqual(state);
  });
});

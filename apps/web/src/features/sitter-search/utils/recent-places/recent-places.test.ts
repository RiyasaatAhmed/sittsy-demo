// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_RECENT_PLACES, readRecentPlaces, rememberPlace } from "./recent-places";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

const place = (label: string) => ({ label, lat: 48.85, lng: 2.35 });

describe("recent places", () => {
  it("keeps the latest first, without duplicates, up to the limit", () => {
    for (const label of ["Paris", "Montmartre", "Paris", "Bastille", "Bercy"]) rememberPlace(place(label));
    expect(readRecentPlaces().map((p) => p.label)).toEqual(["Bercy", "Bastille", "Paris"]);
    expect(readRecentPlaces()).toHaveLength(MAX_RECENT_PLACES);
  });

  it("ignores corrupted storage", () => {
    window.localStorage.setItem("sitter-ranking:recent-places", "{not json");
    expect(readRecentPlaces()).toEqual([]);
    window.localStorage.setItem("sitter-ranking:recent-places", JSON.stringify([{ label: 3 }, place("Paris")]));
    expect(readRecentPlaces()).toEqual([place("Paris")]);
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readRecentPlaces()).toEqual([]);
    expect(() => rememberPlace(place("Paris"))).not.toThrow();
  });
});

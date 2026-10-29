import { describe, expect, it } from "vitest";
import { coordinatePlace, PLACES, searchPlaces } from "./places";

const names = (query: string) => searchPlaces(query).map((place) => place.name);

describe("searchPlaces", () => {
  it("finds places by the start of their name, ignoring case and accents", () => {
    expect(names("montm")).toEqual(["Montmartre"]);
    expect(names("saint germain des pres")[0]).toBe("Saint-Germain-des-Prés");
    expect(names("SAINT-GERMAIN")[0]).toBe("Saint-Germain-des-Prés");
  });

  it("puts names that start with the query before names with a matching word", () => {
    const result = names("saint");
    expect(result.indexOf("Saint-Denis")).toBeLessThan(result.indexOf("Canal Saint-Martin"));
  });

  it("finds arrondissements", () => {
    expect(names("paris 11")[0]).toBe("Paris 11e");
    expect(names("paris").length).toBe(6);
  });

  it("matches areas when no name does", () => {
    expect(names("hauts de seine")).toContain("Boulogne-Billancourt");
  });

  it("returns nothing for an empty or unknown query", () => {
    expect(names("  ")).toEqual([]);
    expect(names("london")).toEqual([]);
  });

  it("has unique names and coordinates around Paris", () => {
    expect(new Set(PLACES.map((p) => p.name)).size).toBe(PLACES.length);
    for (const place of PLACES) {
      expect(place.lat).toBeGreaterThan(48.7);
      expect(place.lat).toBeLessThan(49);
      expect(place.lng).toBeGreaterThan(2.1);
      expect(place.lng).toBeLessThan(2.6);
    }
  });
});

describe("coordinatePlace", () => {
  it("reads typed coordinates", () => {
    expect(coordinatePlace("48.86, 2.35")).toEqual({ name: "48.86, 2.35", area: "Coordinates", lat: 48.86, lng: 2.35 });
    expect(coordinatePlace(" 48.86 2.35 ")?.lat).toBe(48.86);
  });

  it.each(["Paris", "48.86", "48.86, east", "1, 2, 3"])("ignores %j", (query) => {
    expect(coordinatePlace(query)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { addressSearchUrl, parseAddressResults } from "./address-search";

const feature = (properties: Record<string, string>, coordinates: unknown = [2.3599124, 48.8556009]) => ({
  type: "Feature",
  properties,
  geometry: { type: "Point", coordinates },
});

describe("addressSearchUrl", () => {
  it("asks Photon for the trimmed query, in English, near Paris without hiding famous places", () => {
    const url = new URL(addressSearchUrl("  12 rue de rivoli "));
    expect(url.origin + url.pathname).toBe("https://photon.komoot.io/api/");
    expect(url.searchParams.get("q")).toBe("12 rue de rivoli");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("lang")).toBe("en");
    expect(url.searchParams.get("lat")).toBe("48.8566");
    expect(url.searchParams.get("lon")).toBe("2.3522");
    expect(url.searchParams.get("location_bias_scale")).toBe("0.6");
  });
});

describe("parseAddressResults", () => {
  it("reads a street address with its town and country, rounding coordinates", () => {
    const body = {
      features: [
        feature({ housenumber: "12", street: "Rue de Rivoli", postcode: "75004", city: "Paris", country: "France" }),
      ],
    };
    expect(parseAddressResults(body)).toEqual([
      { name: "12 Rue de Rivoli", area: "75004 Paris, France", lat: 48.8556, lng: 2.35991 },
    ]);
  });

  it("uses the place's own name, the state when there is no town, and says when it is a country", () => {
    const body = {
      features: [
        feature({ name: "Tower of London", street: "Tower Hill", city: "London", country: "United Kingdom" }),
        feature({ name: "Yosemite Valley", state: "California", country: "United States" }),
        feature({ name: "Japan", country: "Japan" }),
        feature({ name: "India", country: "India", type: "country" }),
      ],
    };
    expect(parseAddressResults(body).map(({ name, area }) => [name, area])).toEqual([
      ["Tower of London", "London, United Kingdom"],
      ["Yosemite Valley", "California, United States"],
      ["Japan", ""],
      ["India", "Country"],
    ]);
  });

  it("skips duplicates and features without a name or coordinates", () => {
    const paris = feature({ name: "Paris", country: "France" });
    const body = {
      features: [
        paris,
        paris,
        feature({}),
        feature({ name: "Nowhere" }, ["east", 48]),
        { properties: { name: "No geometry" } },
        null,
      ],
    };
    expect(parseAddressResults(body).map((place) => place.name)).toEqual(["Paris"]);
  });

  it("gives no places for an unexpected answer", () => {
    expect(parseAddressResults(null)).toEqual([]);
    expect(parseAddressResults("oops")).toEqual([]);
    expect(parseAddressResults({ features: "none" })).toEqual([]);
  });
});

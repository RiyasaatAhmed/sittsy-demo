// Address search for the "Where" field, beyond the built-in Paris list.
// Uses Photon (https://photon.komoot.io), a free geocoder over OpenStreetMap
// data: no API key, CORS enabled, and built for search-as-you-type. These
// helpers only build the request URL and read the answer, so they stay pure.

import { roundCoordinates } from "./coordinates";
import type { Place } from "./places";

export const ADDRESS_SEARCH_ORIGIN = "https://photon.komoot.io";

/** Shorter queries match too much of the world to be useful. */
export const MIN_ADDRESS_QUERY_LENGTH = 3;

/** Paris, where the fake sitters live: nearby matches come first, but any address is found. */
const BIAS = { lat: 48.8566, lng: 2.3522 };

/**
 * How much a place's importance counts against its distance from BIAS
 * (Photon's default is 0.2). At 0.2 "india" finds "Indiana Café" in Paris
 * before the country; 0.6 ranks well-known places (India, Tokyo) first and
 * still prefers Paris for ordinary street names ("rue de la paix").
 */
const BIAS_SCALE = 0.6;

/** The Photon URL for `query`, e.g. "https://photon.komoot.io/api/?q=12+rue+de+rivoli&…". */
export function addressSearchUrl(query: string, limit = 5): string {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    lang: "en",
    lat: String(BIAS.lat),
    lon: String(BIAS.lng),
    location_bias_scale: String(BIAS_SCALE),
  });
  return `${ADDRESS_SEARCH_ORIGIN}/api/?${params}`;
}

/** The parts of a Photon feature we read; every property is optional. */
type PhotonProperties = {
  name?: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  /** Photon's kind of place: "house", "street", "city", "country", … */
  type?: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: unknown };
  properties?: PhotonProperties;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

/** First line: the place's own name, else "12 Rue de Rivoli", else the street or town. */
function placeName(props: PhotonProperties): string | undefined {
  const street = text(props.street);
  const number = text(props.housenumber);
  if (number && street) return `${number} ${street}`;
  return text(props.name) ?? street ?? text(props.city) ?? text(props.state) ?? text(props.country);
}

/** Second line, e.g. "75004 Paris, France"; leaves out whatever is already the name. A country says "Country". */
function placeArea(props: PhotonProperties, name: string): string {
  if (props.type === "country") return "Country";
  const town = text(props.city) ?? text(props.district) ?? text(props.county);
  const locality = [text(props.postcode), town].filter(Boolean).join(" ");
  const parts = [locality, town ? undefined : text(props.state), text(props.country)];
  return parts.filter((part): part is string => !!part && part !== name).join(", ");
}

function toPlace(feature: PhotonFeature): Place | null {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;
  // GeoJSON order is [longitude, latitude].
  const [lng, lat] = coordinates as unknown[];
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const props = feature.properties ?? {};
  const name = placeName(props);
  if (!name) return null;
  return { name, area: placeArea(props, name), ...roundCoordinates({ lat, lng }) };
}

/**
 * Reads a Photon answer (GeoJSON) into places, skipping features without a
 * name or coordinates and duplicates (same name and area). Anything that is
 * not the expected shape gives no places rather than an error.
 */
export function parseAddressResults(body: unknown): Place[] {
  if (typeof body !== "object" || body === null) return [];
  const features = (body as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const feature of features as PhotonFeature[]) {
    const place = typeof feature === "object" && feature !== null ? toPlace(feature) : null;
    const key = place && `${place.name}|${place.area}`;
    if (!place || !key || seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }
  return places;
}

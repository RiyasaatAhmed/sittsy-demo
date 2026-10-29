// The search page's URL: the single source of truth for what is being
// searched, so a search can be shared, bookmarked and walked with Back/Forward.
//
//   /?service=day_care&lat=48.8566&lng=2.3522&location=Paris&from=2026-10-29&to=2026-10-30
//
// Parsing never fails: a missing or invalid value falls back to its default.
// The one exception is an out-of-range lat/lng, which is kept so the API can
// explain the allowed range (a 400) instead of silently searching elsewhere.

import { NO_DATES, fromIsoDate, type DateRange } from "../calendar";
import { parseDecimal } from "../shared";
import { DEFAULT_WEIGHTS, PART_NAMES, type Weights } from "../ranking";
import { WEIGHT_PARAMS } from "./search-params";
import { isService, type Service } from "../sitter";

export type SearchLocation = { lat: number; lng: number; label: string };

export type SearchState = {
  service: Service;
  location: SearchLocation;
  dates: DateRange;
  page: number;
  weights: Weights;
  coldStartBoost: boolean;
};

/** Central Paris, where the fake sitters live. */
export const DEFAULT_LOCATION: SearchLocation = { lat: 48.8566, lng: 2.3522, label: "Paris" };

export const DEFAULT_SEARCH: SearchState = {
  service: "dog_walking",
  location: DEFAULT_LOCATION,
  dates: NO_DATES,
  page: 1,
  weights: DEFAULT_WEIGHTS,
  coldStartBoost: true,
};

function readLocation(params: URLSearchParams): SearchLocation {
  const lat = parseDecimal(params.get("lat"));
  const lng = parseDecimal(params.get("lng"));
  if (lat === undefined || lng === undefined) return DEFAULT_LOCATION;
  const label = params.get("location")?.trim() || `${lat}, ${lng}`;
  return { lat, lng, label };
}

function readDates(params: URLSearchParams): DateRange {
  const from = params.get("from");
  const to = params.get("to");
  if (!from || !fromIsoDate(from)) return NO_DATES;
  if (!to || !fromIsoDate(to) || to < from) return { from, to: null };
  return { from, to };
}

function readPage(params: URLSearchParams): number {
  const page = parseDecimal(params.get("page"));
  return page !== undefined && Number.isInteger(page) && page >= 1 ? page : 1;
}

function readWeights(params: URLSearchParams): Weights {
  const weights = { ...DEFAULT_WEIGHTS };
  for (const part of PART_NAMES) {
    const value = parseDecimal(params.get(WEIGHT_PARAMS[part]));
    if (value !== undefined && value >= 0 && value <= 1) weights[part] = value;
  }
  return weights;
}

/** The search described by a URL query string. */
export function parseSearchUrl(params: URLSearchParams): SearchState {
  const service = params.get("service") ?? "";
  const boost = params.get("boost");
  return {
    service: isService(service) ? service : DEFAULT_SEARCH.service,
    location: readLocation(params),
    dates: readDates(params),
    page: readPage(params),
    weights: readWeights(params),
    coldStartBoost: boost !== "false" && boost !== "0",
  };
}

/**
 * The query string for a search, in a stable order. Service and place are
 * always written (like the reference site); dates, page, weights and the
 * boost only when they differ from the default, to keep links short.
 */
export function toSearchUrl(state: SearchState): URLSearchParams {
  const params = new URLSearchParams({
    service: state.service,
    lat: String(state.location.lat),
    lng: String(state.location.lng),
    location: state.location.label,
  });
  if (state.dates.from) params.set("from", state.dates.from);
  if (state.dates.to) params.set("to", state.dates.to);
  if (state.page > 1) params.set("page", String(state.page));
  for (const part of PART_NAMES) {
    if (state.weights[part] !== DEFAULT_WEIGHTS[part]) {
      params.set(WEIGHT_PARAMS[part], String(state.weights[part]));
    }
  }
  if (!state.coldStartBoost) params.set("boost", "false");
  return params;
}

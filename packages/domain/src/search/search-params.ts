// Validation of API query strings. Pure functions returning either the parsed
// value or a list of human-readable errors (the API turns errors into a 400).

import type { Stay } from "../booking";
import type { IsoDate } from "../calendar";
import { DEFAULT_WEIGHTS, PART_NAMES, type Weights } from "../ranking";
import { parseDecimal, type ParseResult } from "../shared";
import { SERVICES, isService, type Service } from "../sitter";
import { parseSearchDates } from "./search-dates";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
/** Upper bound for `page`, only to reject absurd input; real searches have a handful of pages. */
export const MAX_PAGE = 10_000;

/** Query parameter name for each weight, e.g. `w_cold_start`. */
export const WEIGHT_PARAMS: Record<keyof Weights, string> = {
  quality: "w_quality",
  responsiveness: "w_responsiveness",
  activity: "w_activity",
  distance: "w_distance",
  coldStart: "w_cold_start",
};

export type Location = { lat: number; lng: number; service: Service };

export type SitterSearch = Location & {
  /** Page size: how many sitters per page. */
  limit: number;
  /** 1-based page of the ranking to return. */
  page: number;
  weights: Weights;
  coldStartBoost: boolean;
  /** Only sitters free for this stay; null searches without dates. */
  stay: Stay | null;
};

function readNumber(
  params: URLSearchParams,
  name: string,
  min: number,
  max: number,
  errors: string[],
): number | undefined {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return undefined;
  const value = parseDecimal(raw);
  if (value === undefined || value < min || value > max) {
    errors.push(`${name} must be a number between ${min} and ${max}`);
    return undefined;
  }
  return value;
}

function readRequiredNumber(
  params: URLSearchParams,
  name: string,
  min: number,
  max: number,
  errors: string[],
): number {
  const before = errors.length;
  const value = readNumber(params, name, min, max, errors);
  if (value === undefined && errors.length === before) {
    errors.push(`${name} is required`);
  }
  return value ?? NaN;
}

export function parseLocation(params: URLSearchParams): ParseResult<Location> {
  const errors: string[] = [];
  const lat = readRequiredNumber(params, "lat", -90, 90, errors);
  const lng = readRequiredNumber(params, "lng", -180, 180, errors);

  const service = params.get("service");
  if (service === null || service === "") {
    errors.push("service is required");
  } else if (!isService(service)) {
    errors.push(`service must be one of: ${SERVICES.join(", ")}`);
  }

  if (errors.length > 0 || service === null || !isService(service)) {
    return { ok: false, errors };
  }
  return { ok: true, value: { lat, lng, service } };
}

/** Optional `from` and `to` (both or neither). `today` is the date in the booking time zone. */
function readStay(params: URLSearchParams, today: IsoDate, errors: string[]): Stay | null {
  const from = params.get("from") || null;
  const to = params.get("to") || null;
  if (from === null && to === null) return null;
  const parsed = parseSearchDates(from, to, today);
  if (parsed.ok) return parsed.value;
  errors.push(...parsed.errors);
  return null;
}

/** Validates a ranking request. `today` (booking time zone) is the reference for the dates. */
export function parseSitterSearch(params: URLSearchParams, today: IsoDate): ParseResult<SitterSearch> {
  const location = parseLocation(params);
  const errors = location.ok ? [] : [...location.errors];

  const limit = readNumber(params, "limit", 1, MAX_LIMIT, errors) ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit)) errors.push(`limit must be a whole number`);

  const page = readNumber(params, "page", 1, MAX_PAGE, errors) ?? 1;
  if (!Number.isInteger(page)) errors.push(`page must be a whole number`);

  const weights = { ...DEFAULT_WEIGHTS };
  for (const part of PART_NAMES) {
    const value = readNumber(params, WEIGHT_PARAMS[part], 0, 1, errors);
    if (value !== undefined) weights[part] = value;
  }

  let coldStartBoost = true;
  const boost = params.get("boost");
  if (boost === "false" || boost === "0") coldStartBoost = false;
  else if (boost !== null && boost !== "true" && boost !== "1") {
    errors.push("boost must be true or false");
  }

  const stay = readStay(params, today, errors);

  if (!location.ok || errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { ...location.value, limit, page, weights, coldStartBoost, stay } };
}

/** The inverse of parseSitterSearch: builds the query string the UI sends. */
export function toSitterSearchParams(search: SitterSearch): URLSearchParams {
  const params = new URLSearchParams({
    lat: String(search.lat),
    lng: String(search.lng),
    service: search.service,
    limit: String(search.limit),
    page: String(search.page),
    boost: String(search.coldStartBoost),
  });
  for (const part of PART_NAMES) {
    params.set(WEIGHT_PARAMS[part], String(search.weights[part]));
  }
  if (search.stay) {
    params.set("from", search.stay.checkIn);
    params.set("to", search.stay.checkOut);
  }
  return params;
}

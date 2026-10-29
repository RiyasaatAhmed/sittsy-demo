import { parseDecimal, type ParseResult } from "../shared";

export type Coordinates = { lat: number; lng: number };

/** Rounds to 5 decimals (about 1 m), so a map click gives readable coordinates. */
export function roundCoordinates({ lat, lng }: Coordinates): Coordinates {
  return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
}

/**
 * Reads the latitude / longitude typed in the search form. Only checks that
 * they are numbers: out-of-range values are left to the API, whose 400
 * message explains the allowed range.
 */
export function parseCoordinateInputs(latText: string, lngText: string): ParseResult<Coordinates> {
  // Same strict reading as links and the API: "0x10" or "1e3" are not coordinates.
  const lat = parseDecimal(latText);
  const lng = parseDecimal(lngText);
  if (lat === undefined || lng === undefined) {
    return { ok: false, errors: ["Latitude and longitude must be numbers."] };
  }
  return { ok: true, value: { lat, lng } };
}

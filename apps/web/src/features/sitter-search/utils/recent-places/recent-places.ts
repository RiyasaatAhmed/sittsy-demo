// The last few places searched, kept in this browser only (a convenience, like
// the reference site's "Recent" list). Storage can be unavailable (private
// mode, blocked site data), so every access is guarded and failure is harmless.

import type { SearchLocation } from "@sitter/domain/search";

const STORAGE_KEY = "sitter-ranking:recent-places";
export const MAX_RECENT_PLACES = 3;

function isSearchLocation(value: unknown): value is SearchLocation {
  if (typeof value !== "object" || value === null) return false;
  const place = value as Record<string, unknown>;
  return typeof place.label === "string" && typeof place.lat === "number" && typeof place.lng === "number";
}

export function readRecentPlaces(): SearchLocation[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSearchLocation).slice(0, MAX_RECENT_PLACES) : [];
  } catch {
    return [];
  }
}

/** Puts `place` first, without duplicates (same label), keeping MAX_RECENT_PLACES. */
export function rememberPlace(place: SearchLocation): void {
  const others = readRecentPlaces().filter((recent) => recent.label !== place.label);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([place, ...others].slice(0, MAX_RECENT_PLACES)));
  } catch {
    // Storage full or blocked: recent places are only a convenience.
  }
}

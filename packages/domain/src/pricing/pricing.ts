// Price suggestion for a new sitter: "sitters near you charge €X–€Y".
// Pure function: the caller passes in the sitters, so it is easy to test.

import { distanceKm } from "../location";
import type { Service, Sitter } from "../sitter";

export const PRICE_RADIUS_KM = 5;

export type PriceSuggestion = {
  service: Service;
  radiusKm: number;
  /** How many nearby sitters offering this service the numbers are based on. */
  sampleSize: number;
  p25: number;
  median: number;
  p75: number;
};

/**
 * Percentile of an ascending-sorted list, with linear interpolation between
 * the two nearest values (same method as Excel PERCENTILE.INC and NumPy's default).
 * `p` is between 0 and 1.
 */
export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) {
    throw new Error("percentile of an empty list is undefined");
  }
  const position = (sortedValues.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  const lowerValue = sortedValues[lower];
  const upperValue = sortedValues[upper];
  if (lowerValue === undefined || upperValue === undefined) {
    throw new RangeError(`percentile p must be between 0 and 1, got ${p}`);
  }
  return lowerValue + (upperValue - lowerValue) * fraction;
}

/**
 * Median and interquartile range (p25–p75) of prices charged for `service` by
 * sitters within `radiusKm` of (lat, lng). Returns null when nobody nearby offers it.
 */
export function suggestPrice(
  service: Service,
  lat: number,
  lng: number,
  sitters: Sitter[],
  radiusKm: number = PRICE_RADIUS_KM,
): PriceSuggestion | null {
  const prices: number[] = [];
  for (const sitter of sitters) {
    const price = sitter.prices[service];
    if (price === undefined) continue;
    if (distanceKm(lat, lng, sitter.lat, sitter.lng) > radiusKm) continue;
    prices.push(price);
  }

  if (prices.length === 0) return null;

  prices.sort((a, b) => a - b);
  return {
    service,
    radiusKm,
    sampleSize: prices.length,
    p25: percentile(prices, 0.25),
    median: percentile(prices, 0.5),
    p75: percentile(prices, 0.75),
  };
}

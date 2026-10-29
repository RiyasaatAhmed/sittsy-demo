// The four "how good is this sitter for this search" signals, each mapped to 0–1.
// The cold-start signal lives in cold-start.ts.

import { clamp01 } from "../shared";
import { RANKING_CONSTANTS } from "./constants";

/**
 * Bayesian average rating. With few reviews it stays close to the prior mean;
 * with many reviews it approaches the sitter's own average.
 * A sitter with no reviews gets exactly the prior mean.
 */
export function bayesianRating(ratingSum: number, ratingCount: number): number {
  const { PRIOR_MEAN, PRIOR_WEIGHT } = RANKING_CONSTANTS;
  return (PRIOR_MEAN * PRIOR_WEIGHT + ratingSum) / (PRIOR_WEIGHT + ratingCount);
}

export function qualityValue(ratingSum: number, ratingCount: number): number {
  const { QUALITY_FLOOR } = RANKING_CONSTANTS;
  const rating = bayesianRating(ratingSum, ratingCount);
  return clamp01((rating - QUALITY_FLOOR) / (5 - QUALITY_FLOOR));
}

/** 1 for an instant answer, 0.5 at RESPONSE_HALF_SCORE_MINUTES, tends to 0 for slow answers. */
export function responsivenessValue(medianResponseMinutes: number): number {
  const minutes = Math.max(0, medianResponseMinutes);
  return 1 / (1 + minutes / RANKING_CONSTANTS.RESPONSE_HALF_SCORE_MINUTES);
}

/** Log scale: the first few bookings matter much more than the 25th. Capped at 1. */
export function activityValue(bookingsLast30d: number): number {
  const bookings = Math.max(0, bookingsLast30d);
  return clamp01(
    Math.log1p(bookings) / Math.log1p(RANKING_CONSTANTS.ACTIVITY_SATURATION_BOOKINGS),
  );
}

/** 1 at 0 km, halves every DISTANCE_HALF_LIFE_KM. */
export function distanceValue(km: number): number {
  return Math.pow(0.5, Math.max(0, km) / RANKING_CONSTANTS.DISTANCE_HALF_LIFE_KM);
}

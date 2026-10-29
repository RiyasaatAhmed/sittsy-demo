/** Tuning constants for the ranking, exported so the UI and README can show them. */
export const RANKING_CONSTANTS = {
  /** Bayesian prior: every sitter starts as if they had PRIOR_WEIGHT reviews of PRIOR_MEAN. */
  PRIOR_MEAN: 4.5,
  PRIOR_WEIGHT: 5,
  /** Ratings are mapped to 0–1 between this floor and 5 stars (marketplace ratings cluster high). */
  QUALITY_FLOOR: 3,
  /** A sitter who answers in this many minutes gets 0.5 for responsiveness. */
  RESPONSE_HALF_SCORE_MINUTES: 30,
  /** Bookings at which activity reaches 1.0 (log scale below that). */
  ACTIVITY_SATURATION_BOOKINGS: 30,
  /** Every this many km, the distance part halves. */
  DISTANCE_HALF_LIFE_KM: 2,
  /** The cold-start boost fades linearly from 1 on day 0 to 0 on this day. */
  COLD_START_DAYS: 30,
} as const;

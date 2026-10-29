// The cold-start boost: a fading bonus that gives new, verified sitters a fair
// first chance at a booking.

import { clamp01 } from "../shared";
import { ageInDays } from "../calendar";
import type { Sitter } from "../sitter";
import { RANKING_CONSTANTS } from "./constants";

/**
 * Who qualifies for the cold-start boost: identity-verified sitters, younger
 * than COLD_START_DAYS, with no bookings yet. Unverified sitters never qualify.
 */
export function isColdStartEligible(sitter: Sitter, now: Date): boolean {
  const age = ageInDays(sitter.createdAt, now);
  return (
    sitter.identityVerified &&
    sitter.bookingsLast30d === 0 &&
    age >= 0 &&
    age < RANKING_CONSTANTS.COLD_START_DAYS
  );
}

/** Boost value: 1 on day 0, fading linearly to 0 on day COLD_START_DAYS. */
export function coldStartValue(sitter: Sitter, now: Date): number {
  if (!isColdStartEligible(sitter, now)) return 0;
  const age = ageInDays(sitter.createdAt, now);
  return clamp01(1 - age / RANKING_CONSTANTS.COLD_START_DAYS);
}

/** Why a sitter did or did not get the boost, for the score breakdown. */
export function coldStartDetail(sitter: Sitter, now: Date, boostEnabled: boolean): string {
  if (!boostEnabled) return "boost switched off";
  if (!sitter.identityVerified) return "not identity-verified: no boost";
  if (!isColdStartEligible(sitter, now)) return "not a new sitter: no boost";
  const age = Math.floor(ageInDays(sitter.createdAt, now));
  return `new verified sitter, day ${age} of ${RANKING_CONSTANTS.COLD_START_DAYS}`;
}

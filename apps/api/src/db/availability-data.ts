// Generates INVENTED "away" periods for the fake sitters, deterministically
// (same sitters + same date → same periods), relative to `today` so they stay
// in the future after a re-seed.

import { addDays, type IsoDate } from "@sitter/domain/calendar";
import { distanceKm } from "@sitter/domain/location";
import { bayesianRating } from "@sitter/domain/ranking";
import type { Sitter } from "@sitter/domain/sitter";
import type { Stay } from "@sitter/domain/booking";
import { PARIS_CENTER, createRandom } from "./seed-data";

export type UnavailabilityRow = { sitterId: number; period: Stay; reason: string };

/** Share of boarding sitters with one away period in the coming weeks. */
const AWAY_SHARE = 0.25;
/** The demo case: a strong sitter near the centre is away for a week, starting this many days from today. */
export const DEMO_AWAY_STARTS_IN_DAYS = 7;
export const DEMO_AWAY_NIGHTS = 7;
const DEMO_RADIUS_KM = 3;
const DEMO_MIN_REVIEWS = 10;

type SitterFacts = Pick<Sitter, "id" | "lat" | "lng" | "prices" | "ratingSum" | "ratingCount">;

/**
 * The best-rated established boarding sitter near the centre: the one whose
 * absence the walkthrough shows ("a high score does not make you available").
 */
export function demoUnavailableSitter(sitters: SitterFacts[]): SitterFacts | undefined {
  return sitters
    .filter((s) => s.prices.boarding !== undefined && s.ratingCount >= DEMO_MIN_REVIEWS)
    .filter((s) => distanceKm(PARIS_CENTER.lat, PARIS_CENTER.lng, s.lat, s.lng) <= DEMO_RADIUS_KM)
    .sort((a, b) => bayesianRating(b.ratingSum, b.ratingCount) - bayesianRating(a.ratingSum, a.ratingCount) || a.id - b.id)[0];
}

export function generateUnavailability(sitters: SitterFacts[], today: IsoDate, seed = 7): UnavailabilityRow[] {
  const random = createRandom(seed);
  const intBetween = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const demo = demoUnavailableSitter(sitters);
  const rows: UnavailabilityRow[] = [];

  for (const sitter of [...sitters].sort((a, b) => a.id - b.id)) {
    if (sitter.id === demo?.id) {
      const checkIn = addDays(today, DEMO_AWAY_STARTS_IN_DAYS);
      rows.push({ sitterId: sitter.id, period: { checkIn, checkOut: addDays(checkIn, DEMO_AWAY_NIGHTS) }, reason: "away (demo case)" });
      continue;
    }
    // Draw for every sitter, so one sitter's fixture never shifts another's.
    const away = random() < AWAY_SHARE;
    const startIn = intBetween(2, 45);
    const nights = intBetween(3, 10);
    if (away && sitter.prices.boarding !== undefined) {
      const checkIn = addDays(today, startIn);
      rows.push({ sitterId: sitter.id, period: { checkIn, checkOut: addDays(checkIn, nights) }, reason: "away" });
    }
  }
  return rows;
}

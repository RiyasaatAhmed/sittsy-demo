// Generates ~200 INVENTED sitters around Paris. Nothing here is real: names are
// random combinations of common first names and a letter, positions are random
// points in a disc around the city centre, and every number is made up.
//
// The generator is deterministic (seeded PRNG), so every seed produces the same
// sitters. Only `createdAt` is relative to `now`, so "new" sitters stay new.

import { SERVICES, type Service, type Sitter } from "@sitter/domain/sitter";

export const PARIS_CENTER = { lat: 48.8566, lng: 2.3522 };
export const SEED_RADIUS_KM = 8;
export const SITTER_COUNT = 200;

/** Fraction of sitters that joined in the last ~6 weeks. */
const NEW_SITTER_SHARE = 0.15;
/** The first few new sitters are placed near the centre so the boost is easy to see in the demo. */
const DEMO_NEWCOMERS_NEAR_CENTER = 6;

const KM_PER_DEGREE_LAT = 111.2;
const DAY_MS = 24 * 60 * 60 * 1000;

const FIRST_NAMES = [
  "Camille", "Léa", "Hugo", "Manon", "Lucas", "Chloé", "Nathan", "Inès",
  "Louis", "Jade", "Arthur", "Zoé", "Jules", "Alice", "Gabriel", "Lina",
  "Raphaël", "Emma", "Adam", "Sarah", "Paul", "Louise", "Théo", "Anna",
];

/** Typical price range in euros per service (per night, day, visit or walk). */
const PRICE_RANGE: Record<Service, [number, number]> = {
  boarding: [30, 55],
  day_care: [20, 35],
  drop_in: [12, 20],
  dog_walking: [12, 22],
  house_sitting: [40, 70],
};

/** Chance that a sitter offers each service. */
const OFFER_PROBABILITY: Record<Service, number> = {
  boarding: 0.45,
  day_care: 0.35,
  drop_in: 0.5,
  dog_walking: 0.6,
  house_sitting: 0.3,
};

/** Small, readable seeded PRNG (mulberry32). Returns numbers in [0, 1). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SeedSitter = Omit<Sitter, "id">;

export function generateSitters(now: Date, count = SITTER_COUNT, seed = 42): SeedSitter[] {
  const random = createRandom(seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];

  const newSitterCount = Math.round(count * NEW_SITTER_SHARE);
  const sitters: SeedSitter[] = [];

  for (let i = 0; i < count; i++) {
    const isNew = i < newSitterCount;
    const isDemoNewcomer = i < DEMO_NEWCOMERS_NEAR_CENTER;

    // Uniform random point in a disc (sqrt keeps density even across the area).
    const maxKm = isDemoNewcomer ? 1.5 : SEED_RADIUS_KM;
    const km = maxKm * Math.sqrt(random());
    const angle = between(0, 2 * Math.PI);
    const lat = PARIS_CENTER.lat + (km * Math.cos(angle)) / KM_PER_DEGREE_LAT;
    const lng =
      PARIS_CENTER.lng +
      (km * Math.sin(angle)) /
        (KM_PER_DEGREE_LAT * Math.cos((PARIS_CENTER.lat * Math.PI) / 180));

    // Sitters near the centre charge up to 15% more.
    const centralPremium = 1 + 0.15 * (1 - km / SEED_RADIUS_KM);
    const prices: Partial<Record<Service, number>> = {};
    for (const service of SERVICES) {
      if (random() < OFFER_PROBABILITY[service]) {
        const [min, max] = PRICE_RANGE[service];
        prices[service] = Math.round(between(min, max) * centralPremium);
      }
    }
    if (Object.keys(prices).length === 0) {
      prices.dog_walking = Math.round(between(...PRICE_RANGE.dog_walking) * centralPremium);
    }

    let ageDays: number;
    let ratingCount: number;
    let bookingsLast30d: number;
    let identityVerified: boolean;
    if (isDemoNewcomer) {
      ageDays = between(1, 10);
      ratingCount = 0;
      bookingsLast30d = 0;
      identityVerified = true;
    } else if (isNew) {
      ageDays = between(0, 45);
      ratingCount = random() < 0.7 ? 0 : intBetween(1, 2);
      bookingsLast30d = ratingCount > 0 ? intBetween(1, 2) : 0;
      identityVerified = random() < 0.7;
    } else {
      ageDays = between(60, 1500);
      // Skewed: most sitters have a modest number of reviews, a few have many.
      ratingCount = Math.floor(120 * random() ** 2);
      bookingsLast30d = Math.floor(25 * random() ** 1.5);
      identityVerified = random() < 0.85;
    }

    // Average rating skewed towards the top, as on most marketplaces.
    const averageRating = 5 - 1.2 * random() ** 2;
    const ratingSum = Math.min(5 * ratingCount, Math.round(averageRating * ratingCount));

    sitters.push({
      name: `${pick(FIRST_NAMES)} ${String.fromCharCode(65 + intBetween(0, 25))}.`,
      lat,
      lng,
      prices,
      ratingSum,
      ratingCount,
      // Log-uniform between 5 minutes and 6 hours.
      medianResponseMinutes: Math.round(5 * Math.pow(72, random())),
      bookingsLast30d,
      createdAt: new Date(now.getTime() - ageDays * DAY_MS),
      identityVerified,
    });
  }

  return sitters;
}

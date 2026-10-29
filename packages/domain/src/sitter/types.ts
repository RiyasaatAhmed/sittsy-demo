// Shared domain types. Kept free of database and framework imports so the
// pure functions in src/lib/ can be used from the API, the UI and the tests.

export const SERVICES = [
  "boarding",
  "day_care",
  "drop_in",
  "dog_walking",
  "house_sitting",
] as const;

export type Service = (typeof SERVICES)[number];

export function isService(value: string): value is Service {
  return (SERVICES as readonly string[]).includes(value);
}

/** A sitter as the ranking and pricing functions see it. */
export type Sitter = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  /** Price in whole euros for each service this sitter offers. */
  prices: Partial<Record<Service, number>>;
  ratingSum: number;
  ratingCount: number;
  medianResponseMinutes: number;
  bookingsLast30d: number;
  createdAt: Date;
  identityVerified: boolean;
};

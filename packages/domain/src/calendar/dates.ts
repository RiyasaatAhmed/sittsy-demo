export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days (with fractions) between `createdAt` and `now`. */
export function ageInDays(createdAt: Date, now: Date): number {
  return (now.getTime() - createdAt.getTime()) / MS_PER_DAY;
}

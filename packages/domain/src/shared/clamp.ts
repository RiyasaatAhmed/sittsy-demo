/** Limits `x` to the range 0–1. */
export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

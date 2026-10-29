// The five parts of a sitter's score and how much each one counts by default.

export type Weights = {
  quality: number;
  responsiveness: number;
  activity: number;
  distance: number;
  coldStart: number;
};

export type PartName = keyof Weights;

/** Every part, in the order the UI shows them. */
export const PART_NAMES: PartName[] = [
  "quality",
  "responsiveness",
  "activity",
  "distance",
  "coldStart",
];

export const DEFAULT_WEIGHTS: Weights = {
  quality: 0.35,
  responsiveness: 0.15,
  activity: 0.2,
  distance: 0.3,
  coldStart: 0.25,
};

/** Sum of all weights: the highest score any sitter could get. */
export function totalWeight(weights: Weights): number {
  return PART_NAMES.reduce((sum, part) => sum + weights[part], 0);
}

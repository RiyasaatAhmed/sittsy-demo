import type { Sitter } from "../sitter";
import type { PartName, Weights } from "./weights";

export type BreakdownPart = {
  /** Normalised part, 0–1. */
  value: number;
  weight: number;
  /** value × weight. All contributions add up to the score. */
  contribution: number;
  /** Human-readable reason, e.g. "4.87★ Bayesian from 60 reviews". */
  detail: string;
};

export type Breakdown = Record<PartName, BreakdownPart>;

/** Everything about one search that the score depends on, besides the sitter. */
export type RankingContext = {
  lat: number;
  lng: number;
  now: Date;
  weights: Weights;
  /** When false, the cold-start part is 0 for everyone. */
  coldStartBoost: boolean;
};

export type RankedSitter = {
  sitter: Sitter;
  score: number;
  distanceKm: number;
  breakdown: Breakdown;
};

// Scores one sitter for one search:
//
//   score = Σ weight[part] × value[part]      (every value is between 0 and 1)
//
// Pure: no database, no clock, no randomness. "Now" is passed in the context.

import { distanceKm } from "../location";
import type { Sitter } from "../sitter";
import { coldStartDetail, coldStartValue } from "./cold-start";
import {
  activityValue,
  bayesianRating,
  distanceValue,
  qualityValue,
  responsivenessValue,
} from "./signals";
import type { Breakdown, BreakdownPart, RankedSitter, RankingContext } from "./types";
import { PART_NAMES } from "./weights";

function part(value: number, weight: number, detail: string): BreakdownPart {
  return { value, weight, contribution: value * weight, detail };
}

/** Score one sitter for one search, with a full breakdown of how the score was built. */
export function scoreSitter(sitter: Sitter, ctx: RankingContext): RankedSitter {
  const km = distanceKm(ctx.lat, ctx.lng, sitter.lat, sitter.lng);
  const w = ctx.weights;
  const rating = bayesianRating(sitter.ratingSum, sitter.ratingCount);

  const breakdown: Breakdown = {
    quality: part(
      qualityValue(sitter.ratingSum, sitter.ratingCount),
      w.quality,
      `${rating.toFixed(2)}★ Bayesian from ${sitter.ratingCount} reviews`,
    ),
    responsiveness: part(
      responsivenessValue(sitter.medianResponseMinutes),
      w.responsiveness,
      `replies in ~${sitter.medianResponseMinutes} min`,
    ),
    activity: part(
      activityValue(sitter.bookingsLast30d),
      w.activity,
      `${sitter.bookingsLast30d} bookings in the last 30 days`,
    ),
    distance: part(distanceValue(km), w.distance, `${km.toFixed(1)} km away`),
    coldStart: part(
      ctx.coldStartBoost ? coldStartValue(sitter, ctx.now) : 0,
      w.coldStart,
      coldStartDetail(sitter, ctx.now, ctx.coldStartBoost),
    ),
  };

  const score = PART_NAMES.reduce((sum, name) => sum + breakdown[name].contribution, 0);

  return { sitter, score, distanceKm: km, breakdown };
}

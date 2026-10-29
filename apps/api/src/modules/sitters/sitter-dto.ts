import type { SitterResult } from "@sitter/domain/contract";
import { ageInDays } from "@sitter/domain/calendar";
import type { RankedSitter } from "@sitter/domain/ranking";
import type { Service } from "@sitter/domain/sitter";

/**
 * Maps a ranked sitter to the public JSON shape (a DTO). Only fields the UI
 * needs leave the server, and the price is the one for the searched service.
 */
export function toSitterResult(
  ranked: RankedSitter,
  service: Service,
  now: Date,
  rank: number,
): SitterResult {
  const { sitter } = ranked;
  return {
    rank,
    id: sitter.id,
    name: sitter.name,
    lat: sitter.lat,
    lng: sitter.lng,
    priceEur: sitter.prices[service] ?? null,
    ratingAverage: sitter.ratingCount > 0 ? sitter.ratingSum / sitter.ratingCount : null,
    ratingCount: sitter.ratingCount,
    medianResponseMinutes: sitter.medianResponseMinutes,
    bookingsLast30d: sitter.bookingsLast30d,
    identityVerified: sitter.identityVerified,
    createdAt: sitter.createdAt.toISOString(),
    ageDays: ageInDays(sitter.createdAt, now),
    distanceKm: ranked.distanceKm,
    score: ranked.score,
    breakdown: ranked.breakdown,
  };
}

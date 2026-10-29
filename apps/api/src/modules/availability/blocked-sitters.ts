// Which sitters cannot take a stay: the one availability rule, shared by
// quotes, booking requests and (date-aware) search.

import { and, eq, gt, inArray, sql, type Column, type SQL } from "drizzle-orm";
import type { Stay } from "@sitter/domain/booking";
import type { Executor } from "../../db/client";
import { formatDateRange } from "../../db/date-range-column";
import { bookings, sitterUnavailability } from "../../db/schema";

/** The range column shares at least one night with `stay` (`&&` on half-open ranges). */
export function overlapsStay(column: Column, stay: Stay): SQL {
  return sql`${column} && ${formatDateRange(stay)}::daterange`;
}

/**
 * Bookings that hold the sitter's capacity at `now`: confirmed, or requested
 * and not yet expired. The SQL form of `holdsCapacity(statusAt(…))`, so a
 * request past its expiry stops counting before the sweep marks it expired.
 */
export function holdsCapacityAt(now: Date): SQL {
  return sql`(${eq(bookings.status, "confirmed")} OR (${eq(bookings.status, "requested")} AND ${gt(bookings.expiresAt, now)}))`;
}

/**
 * The sitters among `sitterIds` that cannot take `stay`: away on one of its
 * nights, or holding a booking that shares one.
 */
export async function blockedSitterIds(
  executor: Executor,
  stay: Stay,
  now: Date,
  sitterIds: readonly number[],
): Promise<Set<number>> {
  if (sitterIds.length === 0) return new Set();
  const away = executor
    .select({ sitterId: sitterUnavailability.sitterId })
    .from(sitterUnavailability)
    .where(and(inArray(sitterUnavailability.sitterId, [...sitterIds]), overlapsStay(sitterUnavailability.period, stay)));
  const booked = executor
    .select({ sitterId: bookings.sitterId })
    .from(bookings)
    .where(and(inArray(bookings.sitterId, [...sitterIds]), overlapsStay(bookings.period, stay), holdsCapacityAt(now)));
  const rows = await away.union(booked);
  return new Set(rows.map((row) => row.sitterId));
}

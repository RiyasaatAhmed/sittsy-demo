// Writing the FAKE seed data to the database.

import { count, eq, sql } from "drizzle-orm";
import { BOOKING_TIME_ZONE } from "@sitter/domain/booking";
import { todayInTimeZone } from "@sitter/domain/calendar";
import { SERVICES, type Service } from "@sitter/domain/sitter";
import { generateUnavailability } from "./availability-data";
import type { Db } from "./client";
import { sitterServices, sitterUnavailability, sitters } from "./schema";
import { generateSitters } from "./seed-data";

export type SeedResult = { sitters: number; serviceOffers: number; awayPeriods: number };

type DbOrTransaction = Pick<Db, "select" | "insert">;

/** Inserts generated away periods for `existing` sitters; returns how many. */
async function insertUnavailability(
  db: DbOrTransaction,
  existing: Parameters<typeof generateUnavailability>[0],
  now: Date,
): Promise<number> {
  const rows = generateUnavailability(existing, todayInTimeZone(now, BOOKING_TIME_ZONE));
  if (rows.length > 0) await db.insert(sitterUnavailability).values(rows);
  return rows.length;
}

/** Every sitter with all its prices (for fixtures that depend on the sitters). */
async function loadSitterFacts(db: DbOrTransaction) {
  const rows = await db
    .select({ sitter: sitters, service: sitterServices.service, priceEur: sitterServices.priceEur })
    .from(sitters)
    .leftJoin(sitterServices, eq(sitterServices.sitterId, sitters.id));
  const byId = new Map<number, (typeof rows)[number]["sitter"] & { prices: Partial<Record<Service, number>> }>();
  for (const { sitter, service, priceEur } of rows) {
    const entry = byId.get(sitter.id) ?? { ...sitter, prices: {} };
    if (service && priceEur !== null) entry.prices[service] = priceEur;
    byId.set(sitter.id, entry);
  }
  return [...byId.values()];
}

/** Replaces every sitter (and their away periods) with freshly generated fake ones, in one transaction. Bookings and demo owners are cleared too. */
export async function replaceAllSitters(db: Db, now: Date): Promise<SeedResult> {
  const generated = generateSitters(now);

  return db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE bookings, demo_owners, sitter_unavailability, sitter_services, sitters RESTART IDENTITY CASCADE`);

    const inserted = await tx
      .insert(sitters)
      .values(
        generated.map((s) => ({
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          ratingSum: s.ratingSum,
          ratingCount: s.ratingCount,
          medianResponseMinutes: s.medianResponseMinutes,
          bookingsLast30d: s.bookingsLast30d,
          createdAt: s.createdAt,
          identityVerified: s.identityVerified,
        })),
      )
      .returning({ id: sitters.id });

    const serviceRows = inserted.flatMap(({ id }, index) => {
      // Postgres returns inserted rows in the order they were sent.
      const sitter = generated[index];
      if (sitter === undefined) throw new Error(`No generated sitter for inserted row ${index}`);
      return SERVICES.flatMap((service) => {
        const priceEur = sitter.prices[service];
        return priceEur === undefined ? [] : [{ sitterId: id, service, priceEur }];
      });
    });
    await tx.insert(sitterServices).values(serviceRows);

    const withIds = inserted.map(({ id }, index) => ({ ...(generated[index] as (typeof generated)[number]), id }));
    const awayPeriods = await insertUnavailability(tx, withIds, now);

    return { sitters: inserted.length, serviceOffers: serviceRows.length, awayPeriods };
  });
}

/**
 * For a database seeded before away periods existed: adds them for the current
 * sitters if there are none yet. Returns how many were added (0 if any existed).
 */
export async function seedMissingUnavailability(db: Db, now: Date): Promise<number> {
  const [row] = await db.select({ total: count() }).from(sitterUnavailability);
  if ((row?.total ?? 0) > 0) return 0;
  return insertUnavailability(db, await loadSitterFacts(db), now);
}

/** How many sitters the database holds. */
export async function countSitters(db: Db): Promise<number> {
  const [row] = await db.select({ total: count() }).from(sitters);
  return row?.total ?? 0;
}

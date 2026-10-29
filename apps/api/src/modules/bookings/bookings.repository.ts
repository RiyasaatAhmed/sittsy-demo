// Data access for bookings: the only code that writes the bookings table.
// Every write runs in one transaction that locks what it changes, sweeps the
// expired requests it could collide with, then rechecks availability, so a
// decision is never based on what the owner saw at search time.

import { and, desc, eq, lte, type SQL } from "drizzle-orm";
import {
  canTransition,
  quoteStay,
  requestExpiresAt,
  type BookingRequest,
  type BookingStatus,
  type BookingTarget,
  type Quote,
} from "@sitter/domain/booking";
import type { Service } from "@sitter/domain/sitter";
import type { Db, Executor, Tx } from "../../db/client";
import { databaseQuery } from "../../db/database-query";
import { EXCLUSION_VIOLATION, UNIQUE_VIOLATION, isConstraintViolation } from "../../db/pg-error";
import { bookings, sitterServices, sitters } from "../../db/schema";
import { blockedSitterIds } from "../availability/blocked-sitters";
import { isSameRequest, type BookingRecord } from "./booking-record";

/** Constraint names from the migrations (0002_bookings, 0003_bookings_capacity). */
const NO_OVERLAP = "bookings_no_overlap";
const ONE_BOOKING_PER_KEY = "bookings_owner_idempotency_key";

/** How many of an owner's bookings a list returns (newest first). */
const LIST_LIMIT = 50;

export type StayQuote = { sitterName: string; quote: Quote; available: boolean };

export type NewBooking = { ownerId: number; idempotencyKey: string; request: BookingRequest };

export type CreateBookingResult =
  | { kind: "created"; booking: BookingRecord }
  /** The same submission arrived again: its booking, not a new one. */
  | { kind: "replayed"; booking: BookingRecord }
  /** The key was already used for a different request. */
  | { kind: "key_reused" }
  /** No such sitter, or they do not offer the service. */
  | { kind: "not_offered" }
  /** Away, or another booking holds one of the nights. */
  | { kind: "unavailable" }
  /** The server's total differs from the one the owner saw: nothing was recorded. */
  | { kind: "price_changed"; quote: Quote };

export type ChangeStatusResult =
  | { kind: "changed"; booking: BookingRecord }
  | { kind: "not_found" }
  /** The current status does not allow the change (e.g. already declined or expired). */
  | { kind: "not_allowed"; booking: BookingRecord };

export type BookingsRepository = {
  /** The price of a stay and whether the sitter is free, or null when they do not offer the service. */
  quote(target: BookingTarget, now: Date): Promise<StayQuote | null>;
  /** Records a booking request, unless it is a repeat, unavailable, or priced differently. */
  create(booking: NewBooking, now: Date): Promise<CreateBookingResult>;
  /** One of the owner's bookings; null for anyone else's, so other bookings' existence is not revealed. */
  findForOwner(ownerId: number, bookingId: number): Promise<BookingRecord | null>;
  /** The owner's most recent bookings, newest first. */
  listForOwner(ownerId: number): Promise<BookingRecord[]>;
  /** Moves one of the owner's bookings to `to`, if its current status allows it. */
  changeStatus(ownerId: number, bookingId: number, to: BookingStatus, now: Date): Promise<ChangeStatusResult>;
};

function selectOffer(executor: Executor, sitterId: number, service: Service) {
  return executor
    .select({ sitterName: sitters.name, priceEur: sitterServices.priceEur })
    .from(sitterServices)
    .innerJoin(sitters, eq(sitters.id, sitterServices.sitterId))
    .where(and(eq(sitterServices.sitterId, sitterId), eq(sitterServices.service, service)));
}

/** The sitter's name and price for the service, or null when they do not offer it. */
async function findOffer(executor: Executor, sitterId: number, service: Service) {
  const [offer] = await selectOffer(executor, sitterId, service);
  return offer ?? null;
}

/**
 * Like findOffer, and locks the sitter's row until the transaction ends, so
 * concurrent requests for one sitter take turns: the next one sees this one's
 * booking and answers "unavailable". Without it, conflicting inserts wait on
 * each other inside the exclusion constraint check and Postgres aborts some
 * with a deadlock (seen in the concurrency tests). The constraint still
 * guarantees capacity; the lock makes losing a race a clean answer.
 */
async function lockOffer(tx: Tx, sitterId: number, service: Service) {
  const [offer] = await selectOffer(tx, sitterId, service).for("update", { of: sitters });
  return offer ?? null;
}

function selectRecords(executor: Executor) {
  return executor
    .select({ booking: bookings, sitterName: sitters.name })
    .from(bookings)
    .innerJoin(sitters, eq(sitters.id, bookings.sitterId));
}

const toRecord = ({ booking, sitterName }: { booking: typeof bookings.$inferSelect; sitterName: string }): BookingRecord => ({
  ...booking,
  sitterName,
});

async function findByKey(executor: Executor, ownerId: number, idempotencyKey: string): Promise<BookingRecord | null> {
  const [row] = await selectRecords(executor).where(
    and(eq(bookings.ownerId, ownerId), eq(bookings.idempotencyKey, idempotencyKey)),
  );
  return row ? toRecord(row) : null;
}

/** The answer to a key seen before: the same booking, or a refusal if the request differs. */
function replay(earlier: BookingRecord, request: BookingRequest): CreateBookingResult {
  return isSameRequest(earlier, request) ? { kind: "replayed", booking: earlier } : { kind: "key_reused" };
}

/**
 * Marks unanswered requests past their expiry (within `scope`) as expired, so
 * they stop holding capacity in the exclusion constraint too.
 */
async function expireStaleRequests(tx: Tx, scope: SQL, now: Date): Promise<void> {
  await tx
    .update(bookings)
    .set({ status: "expired", updatedAt: now })
    .where(and(scope, eq(bookings.status, "requested"), lte(bookings.expiresAt, now)));
}

/** The checks and the insert, inside one transaction. */
async function requestStay(tx: Tx, { ownerId, idempotencyKey, request }: NewBooking, now: Date): Promise<CreateBookingResult> {
  const offer = await lockOffer(tx, request.sitterId, request.service);
  if (!offer) return { kind: "not_offered" };

  await expireStaleRequests(tx, eq(bookings.sitterId, request.sitterId), now);

  const blocked = await blockedSitterIds(tx, request.stay, now, [request.sitterId]);
  if (blocked.size > 0) return { kind: "unavailable" };

  // The recorded amount always comes from the server's own quote.
  const quote = quoteStay(offer.priceEur, request.stay);
  if (quote.totalCents !== request.expectedTotalCents) return { kind: "price_changed", quote };

  const [booking] = await tx
    .insert(bookings)
    .values({
      ownerId,
      sitterId: request.sitterId,
      service: request.service,
      period: request.stay,
      status: "requested",
      quote,
      totalCents: quote.totalCents,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
      expiresAt: requestExpiresAt(now),
    })
    .returning();
  if (!booking) throw new Error("Insert returned no row");
  return { kind: "created", booking: { ...booking, sitterName: offer.sitterName } };
}

/**
 * One attempt at recording the request. When two requests pass the checks at
 * the same moment, the database lets only one in: the other's constraint
 * violation becomes a result here.
 */
async function tryRequestStay(
  db: Db,
  booking: NewBooking,
  now: Date,
): Promise<CreateBookingResult | { kind: "duplicate_key" }> {
  try {
    return await db.transaction((tx) => requestStay(tx, booking, now));
  } catch (error) {
    if (isConstraintViolation(error, EXCLUSION_VIOLATION, NO_OVERLAP)) return { kind: "unavailable" };
    if (isConstraintViolation(error, UNIQUE_VIOLATION, ONE_BOOKING_PER_KEY)) return { kind: "duplicate_key" };
    throw error;
  }
}

export function createBookingsRepository(db: Db): BookingsRepository {
  return {
    quote: (target, now) =>
      databaseQuery(async () => {
        const offer = await findOffer(db, target.sitterId, target.service);
        if (!offer) return null;
        const blocked = await blockedSitterIds(db, target.stay, now, [target.sitterId]);
        return { sitterName: offer.sitterName, quote: quoteStay(offer.priceEur, target.stay), available: blocked.size === 0 };
      }),

    create: (booking, now) =>
      databaseQuery(async () => {
        const earlier = await findByKey(db, booking.ownerId, booking.idempotencyKey);
        if (earlier) return replay(earlier, booking.request);

        const result = await tryRequestStay(db, booking, now);
        if (result.kind !== "unavailable" && result.kind !== "duplicate_key") return result;
        // The same submission may have been sent twice at once (a double click,
        // a retry after a timeout). If the other copy took the dates, this is
        // a repeat: answer with its booking, not "unavailable".
        const winner = await findByKey(db, booking.ownerId, booking.idempotencyKey);
        if (winner) return replay(winner, booking.request);
        if (result.kind === "duplicate_key") throw new Error("Idempotency key taken, but no booking found for it");
        return result;
      }),

    findForOwner: (ownerId, bookingId) =>
      databaseQuery(async () => {
        const [row] = await selectRecords(db).where(and(eq(bookings.id, bookingId), eq(bookings.ownerId, ownerId)));
        return row ? toRecord(row) : null;
      }),

    listForOwner: (ownerId) =>
      databaseQuery(async () => {
        const rows = await selectRecords(db)
          .where(eq(bookings.ownerId, ownerId))
          .orderBy(desc(bookings.createdAt), desc(bookings.id))
          .limit(LIST_LIMIT);
        return rows.map(toRecord);
      }),

    changeStatus: (ownerId, bookingId, to, now) =>
      databaseQuery(() =>
        db.transaction(async (tx): Promise<ChangeStatusResult> => {
          await expireStaleRequests(tx, eq(bookings.id, bookingId), now);
          // Lock the row: a concurrent change waits, then sees this one's result.
          const [row] = await selectRecords(tx)
            .where(and(eq(bookings.id, bookingId), eq(bookings.ownerId, ownerId)))
            .for("update", { of: bookings });
          if (!row) return { kind: "not_found" };
          const current = toRecord(row);
          if (!canTransition(current.status, to)) return { kind: "not_allowed", booking: current };

          const [changed] = await tx
            .update(bookings)
            .set({ status: to, updatedAt: now })
            .where(eq(bookings.id, bookingId))
            .returning();
          if (!changed) throw new Error("Update returned no row");
          return { kind: "changed", booking: { ...changed, sitterName: current.sitterName } };
        }),
      ),
  };
}

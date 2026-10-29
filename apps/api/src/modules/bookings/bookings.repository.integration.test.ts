import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { BookingRequest, Stay } from "@sitter/domain/booking";
import { bookings } from "../../db/schema";
import {
  insertAwayPeriod,
  insertOwner,
  insertSitter,
  openTestDatabase,
  type TestDatabase,
} from "../../testing/integration-database";
import { createBookingsRepository, type BookingsRepository, type CreateBookingResult } from "./bookings.repository";

// The booking rules against a real Postgres: the exclusion constraint, the
// idempotency key, transactions and row locks are only real here.

const NOW = new Date("2026-06-01T12:00:00Z");
const STAY = { checkIn: "2026-06-10", checkOut: "2026-06-13" }; // 3 nights, after NOW
const hoursLater = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);

let database: TestDatabase;
let repository: BookingsRepository;

beforeAll(async () => {
  database = await openTestDatabase();
  repository = createBookingsRepository(database.db);
});
beforeEach(async () => {
  await database.reset();
});
afterAll(async () => {
  await database?.close();
});

/** 3 nights at €42 = 12 600 cents, the quote for STAY at the default price. */
const request = (sitterId: number, stay: Stay = STAY, expectedTotalCents = 12_600): BookingRequest => ({
  sitterId,
  service: "boarding",
  stay,
  expectedTotalCents,
});

async function book(ownerId: number, req: BookingRequest, key: string = crypto.randomUUID(), now = NOW) {
  return repository.create({ ownerId, idempotencyKey: key, request: req }, now);
}

const kinds = (results: CreateBookingResult[]) => results.map((result) => result.kind).sort();
const rowsFor = (sitterId: number) => database.db.select().from(bookings).where(eq(bookings.sitterId, sitterId));

describe("requesting a stay", () => {
  it("records the request with the server's quote, and the dates stop being free", async () => {
    const sitter = await insertSitter(database.db);
    const owner = await insertOwner(database.db);

    const result = await book(owner, request(sitter));

    expect(result.kind).toBe("created");
    const [row] = await rowsFor(sitter);
    expect(row).toMatchObject({ ownerId: owner, status: "requested", period: STAY, totalCents: 12_600 });
    expect(row?.quote.lines).toEqual([{ label: "3 nights × €42", quantity: 3, unitAmountCents: 4200, amountCents: 12_600 }]);
    expect(row?.expiresAt).toEqual(hoursLater(24));
    expect(await repository.quote({ sitterId: sitter, service: "boarding", stay: STAY }, NOW)).toMatchObject({
      available: false,
    });
  });

  it("refuses a total the server did not quote, recording nothing", async () => {
    const sitter = await insertSitter(database.db);
    const owner = await insertOwner(database.db);

    const result = await book(owner, request(sitter, STAY, 1));

    expect(result).toEqual({ kind: "price_changed", quote: expect.objectContaining({ totalCents: 12_600 }) });
    expect(await rowsFor(sitter)).toHaveLength(0);
  });

  it("allows back-to-back stays but not shared nights", async () => {
    const sitter = await insertSitter(database.db);
    const [first, second, third] = [await insertOwner(database.db), await insertOwner(database.db), await insertOwner(database.db)];
    await book(first, request(sitter));

    // Check-out day = next check-in day: no night shared.
    const backToBack = await book(second, request(sitter, { checkIn: "2026-06-13", checkOut: "2026-06-14" }, 4200));
    const overlapping = await book(third, request(sitter, { checkIn: "2026-06-12", checkOut: "2026-06-14" }, 8400));

    expect(backToBack.kind).toBe("created");
    expect(overlapping.kind).toBe("unavailable");
  });

  it("refuses a stay during the sitter's away period", async () => {
    const sitter = await insertSitter(database.db);
    await insertAwayPeriod(database.db, sitter, { checkIn: "2026-06-12", checkOut: "2026-06-20" });

    expect((await book(await insertOwner(database.db), request(sitter))).kind).toBe("unavailable");
  });

  it("answers 'not offered' for an unknown sitter", async () => {
    expect((await book(await insertOwner(database.db), request(999))).kind).toBe("not_offered");
  });
});

describe("duplicate submissions", () => {
  it("returns the first booking for a repeated key, and refuses the key for another request", async () => {
    const sitter = await insertSitter(database.db);
    const owner = await insertOwner(database.db);

    const first = await book(owner, request(sitter), "same-key-123");
    const repeat = await book(owner, request(sitter), "same-key-123");
    const other = await book(owner, request(sitter, { checkIn: "2026-06-20", checkOut: "2026-06-21" }, 4200), "same-key-123");

    expect(first.kind).toBe("created");
    expect(repeat).toEqual({ kind: "replayed", booking: first.kind === "created" ? first.booking : undefined });
    expect(other).toEqual({ kind: "key_reused" });
    expect(await rowsFor(sitter)).toHaveLength(1);
  });

  it("keeps keys per owner: another owner's identical key is a different request", async () => {
    const sitter = await insertSitter(database.db);
    await book(await insertOwner(database.db), request(sitter), "shared-key-1");
    const second = await book(await insertOwner(database.db), request(sitter, { checkIn: "2026-06-20", checkOut: "2026-06-21" }, 4200), "shared-key-1");
    expect(second.kind).toBe("created");
  });

  it("records one booking when the same submission arrives ten times at once", async () => {
    const sitter = await insertSitter(database.db);
    const owner = await insertOwner(database.db);

    const results = await Promise.all(Array.from({ length: 10 }, () => book(owner, request(sitter), "double-click-1")));

    const ids = new Set(results.map((result) => ("booking" in result ? result.booking.id : null)));
    expect(ids.size).toBe(1);
    expect(kinds(results)).toEqual(["created", ...Array(9).fill("replayed")]);
    expect(await rowsFor(sitter)).toHaveLength(1);
  });
});

describe("concurrent requests for the same nights", () => {
  it("lets exactly one of ten owners take the dates", async () => {
    const sitter = await insertSitter(database.db);
    const owners = await Promise.all(Array.from({ length: 10 }, () => insertOwner(database.db)));

    const results = await Promise.all(owners.map((owner) => book(owner, request(sitter))));

    expect(kinds(results)).toEqual(["created", ...Array(9).fill("unavailable")]);
    expect(await rowsFor(sitter)).toHaveLength(1);
  });

  it("lets ten owners book ten different sitters at once", async () => {
    const sitters = await Promise.all(Array.from({ length: 10 }, () => insertSitter(database.db)));
    const owners = await Promise.all(sitters.map(() => insertOwner(database.db)));

    const results = await Promise.all(sitters.map((sitter, index) => book(owners[index] as number, request(sitter))));

    expect(kinds(results)).toEqual(Array(10).fill("created"));
  });
});

describe("cancellation, answers and expiry release capacity consistently", () => {
  it("frees the nights when a request is cancelled or declined, not when it is confirmed", async () => {
    const sitter = await insertSitter(database.db);
    const [a, b, c] = [await insertOwner(database.db), await insertOwner(database.db), await insertOwner(database.db)];
    const first = await book(a, request(sitter));
    if (first.kind !== "created") throw new Error(first.kind);

    expect((await repository.changeStatus(a, first.booking.id, "confirmed", NOW)).kind).toBe("changed");
    expect((await book(b, request(sitter))).kind).toBe("unavailable");

    expect((await repository.changeStatus(a, first.booking.id, "cancelled", NOW)).kind).toBe("changed");
    const second = await book(b, request(sitter));
    if (second.kind !== "created") throw new Error(second.kind);

    expect((await repository.changeStatus(b, second.booking.id, "declined", NOW)).kind).toBe("changed");
    expect((await book(c, request(sitter))).kind).toBe("created");
  });

  it("refuses changes the status does not allow, and other owners' bookings", async () => {
    const sitter = await insertSitter(database.db);
    const [owner, stranger] = [await insertOwner(database.db), await insertOwner(database.db)];
    const created = await book(owner, request(sitter));
    if (created.kind !== "created") throw new Error(created.kind);
    const id = created.booking.id;

    expect((await repository.changeStatus(stranger, id, "cancelled", NOW)).kind).toBe("not_found");
    expect(await repository.findForOwner(stranger, id)).toBeNull();
    await repository.changeStatus(owner, id, "declined", NOW);
    const refused = await repository.changeStatus(owner, id, "confirmed", NOW);
    expect(refused).toMatchObject({ kind: "not_allowed", booking: { status: "declined" } });
  });

  it("applies only one of two concurrent answers", async () => {
    const sitter = await insertSitter(database.db);
    const owner = await insertOwner(database.db);
    const created = await book(owner, request(sitter));
    if (created.kind !== "created") throw new Error(created.kind);

    const results = await Promise.all([
      repository.changeStatus(owner, created.booking.id, "confirmed", NOW),
      repository.changeStatus(owner, created.booking.id, "declined", NOW),
    ]);

    expect(results.map((result) => result.kind).sort()).toEqual(["changed", "not_allowed"]);
  });

  it("stops an unanswered request from holding the dates after 24 hours, and marks it expired", async () => {
    const sitter = await insertSitter(database.db);
    const [first, second] = [await insertOwner(database.db), await insertOwner(database.db)];
    const stale = await book(first, request(sitter));
    if (stale.kind !== "created") throw new Error(stale.kind);
    const later = hoursLater(25);

    // Free again before any sweep, then taken by a new request whose transaction sweeps the old one.
    expect(await repository.quote({ sitterId: sitter, service: "boarding", stay: STAY }, later)).toMatchObject({ available: true });
    expect((await book(second, request(sitter), undefined, later)).kind).toBe("created");
    expect((await repository.findForOwner(first, stale.booking.id))?.status).toBe("expired");

    // An expired request can no longer be confirmed or cancelled.
    expect((await repository.changeStatus(first, stale.booking.id, "confirmed", later)).kind).toBe("not_allowed");
  });

  it("still holds the dates just before the expiry time", async () => {
    const sitter = await insertSitter(database.db);
    await book(await insertOwner(database.db), request(sitter));
    const justBefore = new Date(hoursLater(24).getTime() - 1000);
    expect((await book(await insertOwner(database.db), request(sitter), undefined, justBefore)).kind).toBe("unavailable");
  });
});

describe("reading an owner's bookings", () => {
  it("lists only the owner's own bookings, newest first", async () => {
    const sitter = await insertSitter(database.db);
    const [owner, other] = [await insertOwner(database.db), await insertOwner(database.db)];
    await book(owner, request(sitter, { checkIn: "2026-06-10", checkOut: "2026-06-11" }, 4200), undefined, NOW);
    await book(other, request(sitter, { checkIn: "2026-06-11", checkOut: "2026-06-12" }, 4200), undefined, NOW);
    await book(owner, request(sitter, { checkIn: "2026-06-12", checkOut: "2026-06-13" }, 4200), undefined, hoursLater(1));

    const listed = await repository.listForOwner(owner);
    expect(listed.map((booking) => booking.period.checkIn)).toEqual(["2026-06-12", "2026-06-10"]);
    expect(listed.every((booking) => booking.sitterName === "Integration Sitter (fake)")).toBe(true);
  });
});

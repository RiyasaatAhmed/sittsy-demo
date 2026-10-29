import { quoteStay } from "@sitter/domain/booking";
import { vi } from "vitest";
import type { BookingRecord } from "../modules/bookings/booking-record";
import type { BookingsRepository } from "../modules/bookings/bookings.repository";

/** A requested 3-night boarding stay with fake sitter 47 at €42 a night, made 2026-10-29 10:00 UTC. */
export function fakeBookingRecord(overrides: Partial<BookingRecord> = {}): BookingRecord {
  const period = { checkIn: "2026-11-02", checkOut: "2026-11-05" };
  const quote = quoteStay(42, period);
  return {
    id: 1,
    ownerId: 1,
    sitterId: 47,
    sitterName: "Fake Sitter 47",
    service: "boarding",
    period,
    status: "requested",
    quote,
    totalCents: quote.totalCents,
    idempotencyKey: "key-00000001",
    createdAt: new Date("2026-10-29T10:00:00Z"),
    updatedAt: new Date("2026-10-29T10:00:00Z"),
    expiresAt: new Date("2026-10-30T10:00:00Z"),
    ...overrides,
  };
}

/** A bookings repository whose every method is a spy with a happy-path default. */
export function fakeBookings() {
  return {
    quote: vi.fn<BookingsRepository["quote"]>(async (target) => ({
      sitterName: "Fake Sitter 47",
      quote: quoteStay(42, target.stay),
      available: true,
    })),
    create: vi.fn<BookingsRepository["create"]>(async () => ({ kind: "created", booking: fakeBookingRecord() })),
    findForOwner: vi.fn<BookingsRepository["findForOwner"]>(async () => fakeBookingRecord()),
    listForOwner: vi.fn<BookingsRepository["listForOwner"]>(async () => [fakeBookingRecord()]),
    changeStatus: vi.fn<BookingsRepository["changeStatus"]>(async (_ownerId, _bookingId, to) => ({
      kind: "changed",
      booking: fakeBookingRecord({ status: to }),
    })),
  };
}

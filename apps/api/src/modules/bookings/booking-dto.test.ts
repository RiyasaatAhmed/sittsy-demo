import { describe, expect, it } from "vitest";
import { fakeBookingRecord } from "../../testing/fake-bookings";
import { toBooking } from "./booking-dto";

describe("toBooking", () => {
  it("shows a pending request with its expiry, and nothing private", () => {
    const booking = toBooking(fakeBookingRecord(), new Date("2026-10-29T12:00:00Z"));
    expect(booking).toEqual({
      id: 1,
      sitter: { id: 47, name: "Fake Sitter 47" },
      service: "boarding",
      checkIn: "2026-11-02",
      checkOut: "2026-11-05",
      nights: 3,
      status: "requested",
      quote: fakeBookingRecord().quote,
      createdAt: "2026-10-29T10:00:00.000Z",
      updatedAt: "2026-10-29T10:00:00.000Z",
      expiresAt: "2026-10-30T10:00:00.000Z",
    });
    expect(booking).not.toHaveProperty("ownerId");
    expect(booking).not.toHaveProperty("idempotencyKey");
  });

  it("reads an unanswered request past its expiry as expired, without an expiry time", () => {
    const booking = toBooking(fakeBookingRecord(), new Date("2026-10-30T10:00:00Z"));
    expect(booking.status).toBe("expired");
    expect(booking.expiresAt).toBeNull();
  });

  it("drops the expiry once the sitter has answered", () => {
    expect(toBooking(fakeBookingRecord({ status: "confirmed" }), new Date("2026-10-29T12:00:00Z")).expiresAt).toBeNull();
  });
});

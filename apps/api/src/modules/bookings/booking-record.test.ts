import type { BookingRequest } from "@sitter/domain/booking";
import { describe, expect, it } from "vitest";
import { fakeBookingRecord } from "../../testing/fake-bookings";
import { isSameRequest } from "./booking-record";

const request: BookingRequest = {
  sitterId: 47,
  service: "boarding",
  stay: { checkIn: "2026-11-02", checkOut: "2026-11-05" },
  expectedTotalCents: 12600,
};

describe("isSameRequest", () => {
  it("matches the booking the request created", () => {
    expect(isSameRequest(fakeBookingRecord(), request)).toBe(true);
  });

  it.each([
    ["another sitter", { ...request, sitterId: 48 }],
    ["other dates", { ...request, stay: { checkIn: "2026-11-02", checkOut: "2026-11-06" } }],
    ["another total", { ...request, expectedTotalCents: 12000 }],
  ])("does not match a request for %s", (_label, other) => {
    expect(isSameRequest(fakeBookingRecord(), other)).toBe(false);
  });
});

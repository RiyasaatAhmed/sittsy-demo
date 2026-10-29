import request from "supertest";
import { describe, expect, it } from "vitest";
import { fakeBookingRecord } from "../../testing/fake-bookings";
import { testApp } from "../../testing/test-app";

const body = { sitterId: 47, service: "boarding", from: "2026-06-10", to: "2026-06-13", expectedTotalCents: 12600 };
const NOW = new Date("2026-06-01T12:00:00Z");

/** An app and a browser that already made booking 1 (so it has an owner cookie). */
async function withBooking() {
  const test = testApp();
  const browser = request.agent(test.app);
  await browser.post("/api/session");
  await browser.post("/api/bookings").set("Idempotency-Key", "first-request-key").send(body);
  return { ...test, browser };
}

describe("POST /api/bookings/:bookingId/cancel", () => {
  it("cancels the caller's booking", async () => {
    const { browser, bookings } = await withBooking();
    const response = await browser.post("/api/bookings/1/cancel");

    expect(response.status).toBe(200);
    expect(response.body.booking.status).toBe("cancelled");
    expect(bookings.changeStatus).toHaveBeenCalledWith(1, 1, "cancelled", NOW);
  });

  it("answers 409 with the booking's current state when its status does not allow it", async () => {
    const { browser, bookings } = await withBooking();
    bookings.changeStatus.mockResolvedValue({ kind: "not_allowed", booking: fakeBookingRecord({ status: "declined" }) });
    const response = await browser.post("/api/bookings/1/cancel");

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: "This booking is declined, so it cannot be changed that way.",
      code: "invalid_transition",
      booking: { id: 1, status: "declined" },
    });
  });

  it("answers 404 without an owner cookie or for a booking that is not the caller's", async () => {
    const { app, browser, bookings } = await withBooking();
    expect((await request(app).post("/api/bookings/1/cancel")).status).toBe(404);

    bookings.changeStatus.mockResolvedValue({ kind: "not_found" });
    expect((await browser.post("/api/bookings/2/cancel")).status).toBe(404);
  });
});

describe("POST /api/bookings/:bookingId/sitter-response (demo only)", () => {
  it.each([
    ["confirm", "confirmed"],
    ["decline", "declined"],
  ])("%s → %s", async (decision, status) => {
    const { browser, bookings } = await withBooking();
    const response = await browser.post("/api/bookings/1/sitter-response").send({ decision });

    expect(response.status).toBe(200);
    expect(response.body.booking.status).toBe(status);
    expect(bookings.changeStatus).toHaveBeenCalledWith(1, 1, status, NOW);
  });

  it("refuses any other decision", async () => {
    const { browser, bookings } = await withBooking();
    const response = await browser.post("/api/bookings/1/sitter-response").send({ decision: "maybe" });

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(["decision must be confirm or decline"]);
    expect(bookings.changeStatus).not.toHaveBeenCalled();
  });
});

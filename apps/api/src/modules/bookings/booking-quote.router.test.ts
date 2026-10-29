import request from "supertest";
import { describe, expect, it } from "vitest";
import { testApp } from "../../testing/test-app";

// testApp's clock is 2026-06-01 (Paris).
const QUOTE = "/api/sitters/47/quote?service=boarding&from=2026-06-10&to=2026-06-13";

describe("GET /api/sitters/:sitterId/quote", () => {
  it("returns the server's itemised quote and the sitter's availability", async () => {
    const { app, bookings } = testApp();
    const response = await request(app).get(QUOTE);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sitterId: 47,
      sitterName: "Fake Sitter 47",
      service: "boarding",
      checkIn: "2026-06-10",
      checkOut: "2026-06-13",
      quote: {
        currency: "EUR",
        nights: 3,
        lines: [{ label: "3 nights × €42", quantity: 3, unitAmountCents: 4200, amountCents: 12600 }],
        totalCents: 12600,
      },
      available: true,
    });
    expect(bookings.quote).toHaveBeenCalledWith(
      { sitterId: 47, service: "boarding", stay: { checkIn: "2026-06-10", checkOut: "2026-06-13" } },
      new Date("2026-06-01T12:00:00Z"),
    );
  });

  it("does not need an owner cookie and does not create one", async () => {
    const { app, owners } = testApp();
    const response = await request(app).get(QUOTE);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(owners.create).not.toHaveBeenCalled();
  });

  it.each([
    ["reversed dates", "/api/sitters/47/quote?service=boarding&from=2026-06-13&to=2026-06-10", "to must be after from (at least one night)"],
    ["a stay in the past", "/api/sitters/47/quote?service=boarding&from=2026-05-30&to=2026-06-02", "from cannot be in the past"],
    ["a service that cannot be booked", "/api/sitters/47/quote?service=dog_walking&from=2026-06-10&to=2026-06-13", "only boarding can be booked in this demo"],
    ["an invalid sitter id", "/api/sitters/abc/quote?service=boarding&from=2026-06-10&to=2026-06-13", "sitterId must be a positive whole number"],
  ])("refuses %s with a 400", async (_label, path, detail) => {
    const { app, bookings } = testApp();
    const response = await request(app).get(path);

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual([detail]);
    expect(bookings.quote).not.toHaveBeenCalled();
  });

  it("answers 404 for a sitter who does not offer the service", async () => {
    const { app, bookings } = testApp();
    bookings.quote.mockResolvedValue(null);
    const response = await request(app).get(QUOTE);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "No sitter 47 offering boarding" });
  });
});

import { quoteStay } from "@sitter/domain/booking";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { fakeBookingRecord } from "../../testing/fake-bookings";
import { testApp } from "../../testing/test-app";
import { OWNER_COOKIE } from "../owners/owner-session";

// testApp's clock is 2026-06-01, so these dates are in the future.
const body = { sitterId: 47, service: "boarding", from: "2026-06-10", to: "2026-06-13", expectedTotalCents: 12600 };
const KEY = "0d6c1f3e-6b1a-4f5e-9a39-3c8d2f7b9e10";

const postBooking = async (app: Parameters<typeof request>[0], key = KEY) => {
  const browser = request.agent(app);
  await browser.post("/api/session");
  return browser.post("/api/bookings").set("Idempotency-Key", key).send(body);
};

describe("POST /api/bookings", () => {
  it("never stores a booking without an established session, even on retries", async () => {
    const { app, bookings, owners } = testApp();
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request(app).post("/api/bookings").set("Idempotency-Key", KEY).send(body);
      expect(response.status).toBe(428);
      expect(response.body.code).toBe("session_required");
    }
    expect(bookings.create).not.toHaveBeenCalled();
    expect(owners.create).not.toHaveBeenCalled();
  });
  it("records a request for a new owner and gives them a private cookie", async () => {
    const { app, bookings } = testApp();
    const browser = request.agent(app);
    const session = await browser.post("/api/session");
    const response = await browser.post("/api/bookings").set("Idempotency-Key", KEY).send(body);

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe("/api/bookings/1");
    expect(response.headers["idempotent-replayed"]).toBeUndefined();
    expect(response.body.booking).toMatchObject({ id: 1, status: "requested", quote: { totalCents: 12600 } });
    expect(bookings.create).toHaveBeenCalledWith(
      {
        ownerId: 1,
        idempotencyKey: KEY,
        request: {
          sitterId: 47,
          service: "boarding",
          stay: { checkIn: "2026-06-10", checkOut: "2026-06-13" },
          expectedTotalCents: 12600,
        },
      },
      new Date("2026-06-01T12:00:00Z"),
    );

    const cookie = session.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(new RegExp(`^${OWNER_COOKIE}=[\\w-]{43};`));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/api");
    expect(cookie).not.toContain("Secure");
  });

  it("keeps the same owner across requests from one browser", async () => {
    const { app, owners, bookings } = testApp();
    const browser = request.agent(app);
    await browser.post("/api/session");
    await browser.post("/api/bookings").set("Idempotency-Key", KEY).send(body);
    const second = await browser.post("/api/bookings").set("Idempotency-Key", "another-key-123").send(body);

    expect(second.headers["set-cookie"]).toBeUndefined();
    expect(owners.create).toHaveBeenCalledTimes(1);
    expect(bookings.create.mock.calls.map(([booking]) => booking.ownerId)).toEqual([1, 1]);
  });

  it("answers a repeated submission with the first booking, flagged as a replay", async () => {
    const { app, bookings } = testApp();
    bookings.create.mockResolvedValue({ kind: "replayed", booking: fakeBookingRecord() });
    const response = await postBooking(app);

    expect(response.status).toBe(201);
    expect(response.headers["idempotent-replayed"]).toBe("true");
    expect(response.body.booking.id).toBe(1);
  });

  it("refuses a key reused for a different request (422)", async () => {
    const { app, bookings } = testApp();
    bookings.create.mockResolvedValue({ kind: "key_reused" });
    const response = await postBooking(app);

    expect(response.status).toBe(422);
    expect(response.body.error).toMatch(/Idempotency-Key was already used/);
  });

  it("explains a lost availability race with a recoverable 409", async () => {
    const { app, bookings } = testApp();
    bookings.create.mockResolvedValue({ kind: "unavailable" });
    const response = await postBooking(app);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "This sitter is no longer available for these dates. Choose other dates or another sitter.",
      code: "unavailable",
    });
  });

  it("returns the current quote when the price changed, recording nothing", async () => {
    const { app, bookings } = testApp();
    const quote = quoteStay(45, { checkIn: "2026-06-10", checkOut: "2026-06-13" });
    bookings.create.mockResolvedValue({ kind: "price_changed", quote });
    const response = await postBooking(app);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "price_changed", quote: { totalCents: 13500 } });
  });

  it("answers 404 for a sitter who does not offer the service", async () => {
    const { app, bookings } = testApp();
    bookings.create.mockResolvedValue({ kind: "not_offered" });
    const response = await postBooking(app);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("No sitter 47 offering boarding");
  });

  it("lists every problem with the key and the body, before creating anything", async () => {
    const { app, owners, bookings } = testApp();
    const response = await request(app)
      .post("/api/bookings")
      .send({ ...body, from: "2026-06-13", to: "2026-06-10", expectedTotalCents: "126" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Invalid request",
      details: [
        "the Idempotency-Key header is required (a new UUID per booking request)",
        "to must be after from (at least one night)",
        "expectedTotalCents must be a whole number of cents",
      ],
    });
    expect(owners.create).not.toHaveBeenCalled();
    expect(bookings.create).not.toHaveBeenCalled();
  });

  it.each(["short", "has spaces in it", "x".repeat(256)])("refuses the Idempotency-Key %j", async (key) => {
    const { app } = testApp();
    const response = await postBooking(app, key);
    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(["the Idempotency-Key header must be 8–255 letters, digits, - or _"]);
  });

  it("refuses a body that is not JSON", async () => {
    const { app, bookings } = testApp();
    const response = await request(app)
      .post("/api/bookings")
      .set("Idempotency-Key", KEY)
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "The request body is not valid JSON" });
    expect(bookings.create).not.toHaveBeenCalled();
  });

  it("refuses a form-encoded body (it is not read as JSON)", async () => {
    const { app } = testApp();
    const response = await request(app).post("/api/bookings").set("Idempotency-Key", KEY).type("form").send(body);
    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(["the body must be a JSON object"]);
  });
});

describe("GET /api/bookings", () => {
  it("lists nothing for a browser without bookings", async () => {
    const { app, bookings } = testApp();
    const response = await request(app).get("/api/bookings");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ bookings: [] });
    expect(bookings.listForOwner).not.toHaveBeenCalled();
  });

  it("lists the caller's own bookings", async () => {
    const { app, bookings } = testApp();
    const browser = request.agent(app);
    await browser.post("/api/session");
    await browser.post("/api/bookings").set("Idempotency-Key", KEY).send(body);
    const response = await browser.get("/api/bookings");

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(1);
    expect(bookings.listForOwner).toHaveBeenCalledWith(1);
  });

  it("ignores a cookie that is not one of its tokens", async () => {
    const { app, owners } = testApp();
    const response = await request(app).get("/api/bookings").set("Cookie", `${OWNER_COOKIE}=forged`);

    expect(response.body).toEqual({ bookings: [] });
    expect(owners.findIdByTokenHash).not.toHaveBeenCalled();
  });
});

describe("GET /api/bookings/:bookingId", () => {
  it("shows one of the caller's bookings: its status survives a reload", async () => {
    const { app, bookings } = testApp();
    const browser = request.agent(app);
    await browser.post("/api/session");
    await browser.post("/api/bookings").set("Idempotency-Key", KEY).send(body);
    const response = await browser.get("/api/bookings/1");

    expect(response.status).toBe(200);
    expect(response.body.booking).toMatchObject({ id: 1, status: "requested" });
    expect(bookings.findForOwner).toHaveBeenCalledWith(1, 1);
  });

  it("answers 404 without an owner cookie, for an unknown id, and for someone else's booking", async () => {
    const { app, bookings } = testApp();
    expect((await request(app).get("/api/bookings/1")).status).toBe(404);

    const browser = request.agent(app);
    await browser.post("/api/session");
    await browser.post("/api/bookings").set("Idempotency-Key", KEY).send(body);
    expect((await browser.get("/api/bookings/abc")).status).toBe(404);

    bookings.findForOwner.mockResolvedValue(null);
    const response = await browser.get("/api/bookings/2");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Booking not found" });
  });
});

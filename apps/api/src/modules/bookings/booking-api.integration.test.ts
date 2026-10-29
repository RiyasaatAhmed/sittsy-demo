import { pino } from "pino";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { insertAwayPeriod, insertSitter, openTestDatabase, type TestDatabase } from "../../testing/integration-database";
import { createOwnersRepository } from "../owners/owners.repository";
import { createSittersRepository } from "../sitters/sitters.repository";
import { createBookingsRepository } from "./bookings.repository";

// The whole journey through HTTP, with the real repositories on a real
// Postgres: search with dates → quote → request → reload → cancel.

const NOW = new Date("2026-06-01T12:00:00Z");
let database: TestDatabase;

beforeAll(async () => {
  database = await openTestDatabase();
});
beforeEach(async () => {
  await database.reset();
});
afterAll(async () => {
  await database?.close();
});

function realApp() {
  return createApp({
    config: { corsOrigins: [], trustProxy: false, rateLimitPerMinute: 1000, secureCookies: false },
    logger: pino({ level: "silent" }),
    sitters: createSittersRepository(database.db),
    owners: createOwnersRepository(database.db),
    bookings: createBookingsRepository(database.db),
    isShuttingDown: () => false,
    now: () => NOW,
  });
}

const SEARCH = "/api/sitters?lat=48.8566&lng=2.3522&service=boarding&from=2026-06-10&to=2026-06-13";
const ids = (body: { results: { id: number }[] }) => body.results.map((sitter) => sitter.id).sort((a, b) => a - b);
const stayBody = (sitterId: number, expectedTotalCents: number) => ({
  sitterId,
  service: "boarding",
  from: "2026-06-10",
  to: "2026-06-13",
  expectedTotalCents,
});

describe("booking journey over HTTP and Postgres", () => {
  it("replays the first booking after a lost response with the same established owner", async () => {
    const sitter = await insertSitter(database.db);
    const browser = request.agent(realApp());
    await browser.post("/api/session");
    const submit = () => browser.post("/api/bookings").set("Idempotency-Key", "lost-first-answer").send(stayBody(sitter, 12_600));
    const first = await submit();
    const retry = await submit();
    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(retry.body.booking.id).toBe(first.body.booking.id);
    expect((await browser.get("/api/bookings")).body.bookings).toHaveLength(1);
  });
  it("searches by dates, quotes, books, keeps the status across a reload, and frees the dates on cancel", async () => {
    const free = await insertSitter(database.db);
    const away = await insertSitter(database.db);
    const booked = await insertSitter(database.db, 50);
    await insertAwayPeriod(database.db, away, { checkIn: "2026-06-12", checkOut: "2026-06-15" });
    const browser = request.agent(realApp());
    await browser.post("/api/session");

    // Search with dates: the away sitter is left out.
    const search = await browser.get(SEARCH);
    expect(ids(search.body)).toEqual([free, booked]);
    expect(search.body.unavailableCount).toBe(1);

    // Quote, then request at that total.
    const quote = await browser.get(`/api/sitters/${booked}/quote?service=boarding&from=2026-06-10&to=2026-06-13`);
    expect(quote.body).toMatchObject({ available: true, quote: { totalCents: 15_000 } });
    const created = await browser.post("/api/bookings").set("Idempotency-Key", "journey-key-1").send(stayBody(booked, 15_000));
    expect(created.status).toBe(201);
    const bookingId: number = created.body.booking.id;

    // A reload: the cookie brings the same owner back, with the stored status.
    const reloaded = await browser.get(`/api/bookings/${bookingId}`);
    expect(reloaded.body.booking).toMatchObject({ status: "requested", quote: { totalCents: 15_000 } });
    expect(ids((await browser.get(SEARCH)).body)).toEqual([free]);

    // Another browser cannot see it.
    expect((await request(realApp()).get(`/api/bookings/${bookingId}`)).status).toBe(404);

    // Cancelling frees the dates.
    expect((await browser.post(`/api/bookings/${bookingId}/cancel`)).body.booking.status).toBe("cancelled");
    expect(ids((await browser.get(SEARCH)).body)).toEqual([free, booked]);
  });

  it("records the server's amount, never the client's", async () => {
    const sitter = await insertSitter(database.db);
    const browser = request.agent(realApp());
    await browser.post("/api/session");
    const response = await browser
      .post("/api/bookings")
      .set("Idempotency-Key", "tampered-total-1")
      .send(stayBody(sitter, 100));
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "price_changed", quote: { totalCents: 12_600 } });
  });

  it("rejects reversed dates before anything is stored", async () => {
    const sitter = await insertSitter(database.db);
    const app = realApp();
    const search = await request(app).get("/api/sitters?lat=48.8566&lng=2.3522&service=boarding&from=2026-06-13&to=2026-06-10");
    const booking = await request(app)
      .post("/api/bookings")
      .set("Idempotency-Key", "reversed-dates-1")
      .send({ ...stayBody(sitter, 12_600), from: "2026-06-13", to: "2026-06-10" });
    expect([search.status, booking.status]).toEqual([400, 400]);
  });

  it("answers a lost race with a recoverable 409", async () => {
    const sitter = await insertSitter(database.db);
    const app = realApp();

    const responses = await Promise.all(
      Array.from({ length: 5 }, async (_, index) => {
        const browser = request.agent(app);
        await browser.post("/api/session");
        return browser.post("/api/bookings").set("Idempotency-Key", `race-key-${index}`).send(stayBody(sitter, 12_600));
      }),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409, 409, 409]);
    expect(responses.find((response) => response.status === 409)?.body).toEqual({
      error: "This sitter is no longer available for these dates. Choose other dates or another sitter.",
      code: "unavailable",
    });
  });
});

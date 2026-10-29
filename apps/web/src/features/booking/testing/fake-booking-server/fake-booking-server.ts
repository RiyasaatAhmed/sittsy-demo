// An in-memory stand-in for the booking endpoints, with the same rules as the
// real API (idempotent requests, server-side quotes, status transitions), for
// UI tests. Answers undefined for any URL it does not handle.

import { canTransition, nightsIn, quoteStay, type BookingStatus } from "@sitter/domain/booking";
import type { Booking } from "@sitter/domain/contract";

type Options = {
  /** Nightly rate of every sitter, in euros. Can be changed during a test. */
  nightlyRateEur?: number;
  /** Sitters who are away or booked. */
  unavailable?: number[];
};

const json = (body: unknown, status = 200) => Response.json(body, { status });

export function fakeBookingServer({ nightlyRateEur = 42, unavailable = [] }: Options = {}) {
  const state = {
    nightlyRateEur,
    unavailable: new Set(unavailable),
    bookings: [] as Booking[],
    /** Every POST /api/bookings: its key and body. */
    posts: [] as { key: string | null; body: Record<string, unknown> }[],
    /** The next booking requests record the booking, then the answer is lost (network error). */
    loseResponses: 0,
    /** The next booking requests fail before reaching the server. */
    failRequests: 0,
  };
  const byKey = new Map<string, Booking>();

  function changeStatus(id: number, to: BookingStatus): Response {
    const booking = state.bookings.find((each) => each.id === id);
    if (!booking) return json({ error: "Booking not found" }, 404);
    if (!canTransition(booking.status, to)) {
      return json({ error: `This booking is ${booking.status}.`, code: "invalid_transition", booking }, 409);
    }
    Object.assign(booking, { status: to, expiresAt: null });
    return json({ booking });
  }

  function requestStay(key: string | null, body: Record<string, unknown>): Response {
    const earlier = key ? byKey.get(key) : undefined;
    if (earlier) return json({ booking: earlier }, 201);
    const sitterId = Number(body.sitterId);
    const stay = { checkIn: String(body.from), checkOut: String(body.to) };
    if (state.unavailable.has(sitterId)) {
      return json({ error: "This sitter is no longer available for these dates.", code: "unavailable" }, 409);
    }
    const quote = quoteStay(state.nightlyRateEur, stay);
    if (quote.totalCents !== body.expectedTotalCents) {
      return json({ error: "The price changed since your quote.", code: "price_changed", quote }, 409);
    }
    const booking: Booking = {
      id: state.bookings.length + 1,
      sitter: { id: sitterId, name: `Sitter ${sitterId} Fake` },
      service: "boarding",
      ...stay,
      nights: nightsIn(stay),
      status: "requested",
      quote,
      createdAt: "2026-10-29T10:00:00.000Z",
      updatedAt: "2026-10-29T10:00:00.000Z",
      expiresAt: "2026-10-30T10:00:00.000Z",
    };
    state.bookings.push(booking);
    if (key) byKey.set(key, booking);
    return json({ booking }, 201);
  }

  async function handle(url: string, init: RequestInit = {}): Promise<Response | undefined> {
    const { pathname, searchParams } = new URL(url, "http://localhost");
    if (pathname === "/api/session") return json({ ready: true });
    const quote = /^\/api\/sitters\/(\d+)\/quote$/.exec(pathname);
    if (quote) {
      const sitterId = Number(quote[1]);
      const stay = { checkIn: searchParams.get("from") ?? "", checkOut: searchParams.get("to") ?? "" };
      return json({
        sitterId,
        sitterName: `Sitter ${sitterId} Fake`,
        service: "boarding",
        ...stay,
        quote: quoteStay(state.nightlyRateEur, stay),
        available: !state.unavailable.has(sitterId),
      });
    }
    if (pathname === "/api/bookings" && init.method === "POST") {
      const key = new Headers(init.headers).get("Idempotency-Key");
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      state.posts.push({ key, body });
      if (state.failRequests > 0) {
        state.failRequests -= 1;
        throw new TypeError("Failed to fetch");
      }
      const response = requestStay(key, body);
      if (state.loseResponses > 0) {
        state.loseResponses -= 1;
        throw new TypeError("Failed to fetch");
      }
      return response;
    }
    if (pathname === "/api/bookings") return json({ bookings: [...state.bookings].reverse() });
    const action = /^\/api\/bookings\/(\d+)\/(cancel|sitter-response)$/.exec(pathname);
    if (action) {
      const id = Number(action[1]);
      if (action[2] === "cancel") return changeStatus(id, "cancelled");
      const { decision } = JSON.parse(String(init.body)) as { decision: string };
      return changeStatus(id, decision === "confirm" ? "confirmed" : "declined");
    }
    return undefined;
  }

  return { state, handle };
}

export type FakeBookingServer = ReturnType<typeof fakeBookingServer>;

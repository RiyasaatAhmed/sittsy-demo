import { afterEach, describe, expect, it, vi } from "vitest";
import { answerAsSitter, cancelBooking, fetchQuote, requestStay } from "./bookings-api";

const fetchMock = vi.fn<typeof fetch>(async () => Response.json({}));

afterEach(() => {
  fetchMock.mockClear();
  vi.unstubAllGlobals();
});

const stay = { checkIn: "2026-11-02", checkOut: "2026-11-05" };

describe("bookings api", () => {
  it("asks the server for the quote of a stay", async () => {
    vi.stubGlobal("fetch", fetchMock);
    await fetchQuote({ sitterId: 47, service: "boarding", stay });
    expect(fetchMock).toHaveBeenCalledWith("/api/sitters/47/quote?service=boarding&from=2026-11-02&to=2026-11-05", {
      signal: undefined,
    });
  });

  it("sends a booking request with its Idempotency-Key and the total the owner saw", async () => {
    vi.stubGlobal("fetch", fetchMock);
    await requestStay({ sitterId: 47, service: "boarding", stay, expectedTotalCents: 12600 }, "key-1234567890");
    expect(fetchMock).toHaveBeenCalledWith("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "key-1234567890" },
      body: JSON.stringify({ sitterId: 47, service: "boarding", from: "2026-11-02", to: "2026-11-05", expectedTotalCents: 12600 }),
    });
  });

  it("cancels, and plays the sitter's answer (demo)", async () => {
    vi.stubGlobal("fetch", fetchMock);
    await cancelBooking(3);
    await answerAsSitter(3, "declined");
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.body])).toEqual([
      ["/api/bookings/3/cancel", undefined],
      ["/api/bookings/3/sitter-response", '{"decision":"decline"}'],
    ]);
  });
});

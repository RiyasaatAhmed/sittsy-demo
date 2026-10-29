import express, { Router, type Response } from "express";
import { bookingToday, parseBookingRequest } from "@sitter/domain/booking";
import type { BookingConflictResponse, BookingResponse, BookingsResponse, ErrorResponse } from "@sitter/domain/contract";
import { sendInvalidRequest } from "../../shared/http/error-responses";
import { readIdempotencyKey } from "../../shared/http/idempotency-key";
import { parsePathId } from "../../shared/http/path-id";
import type { OwnerSession } from "../owners/owner-session";
import {
  sendBookingNotFound,
  sendKeyReused,
  sendNotOffered,
  sendPriceChanged,
  sendUnavailable,
} from "./booking-responses";
import { toBooking } from "./booking-dto";
import type { BookingsRepository } from "./bookings.repository";

type Deps = {
  bookings: Pick<BookingsRepository, "create" | "findForOwner" | "listForOwner">;
  session: OwnerSession;
  now: () => Date;
};

/** Booking requests are tiny JSON objects. */
const jsonBody = express.json({ limit: "10kb" });

/**
 * POST /api/bookings              request a stay (needs an Idempotency-Key header)
 * GET  /api/bookings              the caller's bookings, newest first
 * GET  /api/bookings/:bookingId   one of the caller's bookings
 */
export function bookingsRouter({ bookings, session, now }: Deps): Router {
  const router = Router();

  // Establish identity before a write: losing this response cannot lose a booking.
  router.post("/session", async (req, res) => {
    await session.ensure(req, res);
    res.set("Cache-Control", "no-store").json({ ready: true });
  });

  router.post(
    "/bookings",
    jsonBody,
    async (req, res: Response<BookingResponse | BookingConflictResponse | ErrorResponse>) => {
      const at = now();
      const key = readIdempotencyKey(req);
      const parsed = parseBookingRequest(req.body, bookingToday(at));
      if (!key.ok || !parsed.ok) {
        sendInvalidRequest(res, [...(key.ok ? [] : key.errors), ...(parsed.ok ? [] : parsed.errors)]);
        return;
      }

      const ownerId = await session.find(req);
      if (ownerId === null) {
        res.status(428).json({ error: "Start a demo session before submitting a booking request.", code: "session_required" });
        return;
      }
      const result = await bookings.create({ ownerId, idempotencyKey: key.value, request: parsed.value }, at);
      switch (result.kind) {
        case "created":
        case "replayed":
          // A replay answers exactly like the first time, flagged as such.
          if (result.kind === "replayed") res.set("Idempotent-Replayed", "true");
          res.status(201).location(`/api/bookings/${result.booking.id}`).json({ booking: toBooking(result.booking, at) });
          return;
        case "key_reused":
          sendKeyReused(res);
          return;
        case "not_offered":
          sendNotOffered(res, parsed.value);
          return;
        case "unavailable":
          sendUnavailable(res);
          return;
        case "price_changed":
          sendPriceChanged(res, result.quote);
          return;
      }
    },
  );

  router.get("/bookings", async (req, res: Response<BookingsResponse>) => {
    const at = now();
    const ownerId = await session.find(req);
    const records = ownerId === null ? [] : await bookings.listForOwner(ownerId);
    res.json({ bookings: records.map((record) => toBooking(record, at)) });
  });

  router.get("/bookings/:bookingId", async (req, res: Response<BookingResponse | ErrorResponse>) => {
    const at = now();
    const bookingId = parsePathId(req.params.bookingId);
    const ownerId = await session.find(req);
    const record = bookingId === null || ownerId === null ? null : await bookings.findForOwner(ownerId, bookingId);
    if (!record) {
      sendBookingNotFound(res);
      return;
    }
    res.json({ booking: toBooking(record, at) });
  });

  return router;
}

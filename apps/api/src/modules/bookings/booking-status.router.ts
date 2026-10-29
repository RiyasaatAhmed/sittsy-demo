import express, { Router, type Request, type Response } from "express";
import { parseSitterDecision, type BookingStatus } from "@sitter/domain/booking";
import type { BookingConflictResponse, BookingResponse, ErrorResponse } from "@sitter/domain/contract";
import { sendInvalidRequest } from "../../shared/http/error-responses";
import { parsePathId } from "../../shared/http/path-id";
import type { OwnerSession } from "../owners/owner-session";
import { sendBookingNotFound, sendInvalidTransition } from "./booking-responses";
import { toBooking } from "./booking-dto";
import type { BookingsRepository } from "./bookings.repository";

type Deps = {
  bookings: Pick<BookingsRepository, "changeStatus">;
  session: OwnerSession;
  now: () => Date;
};

type StatusResponse = Response<BookingResponse | BookingConflictResponse | ErrorResponse>;

/**
 * POST /api/bookings/:bookingId/cancel            the owner cancels (requested or confirmed)
 * POST /api/bookings/:bookingId/sitter-response   DEMO ONLY: { "decision": "confirm" | "decline" }
 *
 * The demo has no sitter accounts, so the owner can play the sitter's answer
 * to their own request. A real sitter would answer from their own,
 * authenticated account.
 */
export function bookingStatusRouter({ bookings, session, now }: Deps): Router {
  const router = Router();

  async function changeStatus(req: Request<{ bookingId: string }>, res: StatusResponse, to: BookingStatus): Promise<void> {
    const at = now();
    const bookingId = parsePathId(req.params.bookingId);
    const ownerId = await session.find(req);
    if (bookingId === null || ownerId === null) {
      sendBookingNotFound(res);
      return;
    }
    const result = await bookings.changeStatus(ownerId, bookingId, to, at);
    switch (result.kind) {
      case "changed":
        res.json({ booking: toBooking(result.booking, at) });
        return;
      case "not_found":
        sendBookingNotFound(res);
        return;
      case "not_allowed":
        sendInvalidTransition(res, toBooking(result.booking, at));
        return;
    }
  }

  router.post("/bookings/:bookingId/cancel", (req, res: StatusResponse) => changeStatus(req, res, "cancelled"));

  router.post("/bookings/:bookingId/sitter-response", express.json({ limit: "1kb" }), async (req, res: StatusResponse) => {
    const decision = parseSitterDecision(req.body);
    if (!decision.ok) {
      sendInvalidRequest(res, decision.errors);
      return;
    }
    await changeStatus(req, res, decision.value);
  });

  return router;
}

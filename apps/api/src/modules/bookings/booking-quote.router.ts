import { Router, type Response } from "express";
import { bookingToday, parseBookingTarget } from "@sitter/domain/booking";
import type { ErrorResponse, QuoteResponse } from "@sitter/domain/contract";
import { sendInvalidQuery } from "../../shared/http/error-responses";
import { sendNotOffered } from "./booking-responses";
import { searchParamsOf } from "../../shared/http/search-params-of";
import type { BookingsRepository } from "./bookings.repository";

type Deps = { bookings: Pick<BookingsRepository, "quote">; now: () => Date };

/**
 * GET /api/sitters/:sitterId/quote?service=boarding&from=2026-11-02&to=2026-11-05
 * The server's itemised price for the stay (`to` is the check-out day, not a
 * night), and whether the sitter is free for it. Needs no identity.
 */
export function bookingQuoteRouter({ bookings, now }: Deps): Router {
  const router = Router();
  router.get("/sitters/:sitterId/quote", async (req, res: Response<QuoteResponse | ErrorResponse>) => {
    const at = now();
    const params = searchParamsOf(req);
    const parsed = parseBookingTarget(
      { sitterId: req.params.sitterId, service: params.get("service"), from: params.get("from"), to: params.get("to") },
      bookingToday(at),
    );
    if (!parsed.ok) {
      sendInvalidQuery(res, parsed.errors);
      return;
    }
    const target = parsed.value;
    const priced = await bookings.quote(target, at);
    if (!priced) {
      sendNotOffered(res, target);
      return;
    }
    res.json({
      sitterId: target.sitterId,
      sitterName: priced.sitterName,
      service: target.service,
      checkIn: target.stay.checkIn,
      checkOut: target.stay.checkOut,
      quote: priced.quote,
      available: priced.available,
    });
  });
  return router;
}

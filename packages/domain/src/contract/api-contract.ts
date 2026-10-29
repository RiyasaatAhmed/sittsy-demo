// The JSON contract of the API: shapes returned by the route handlers and read
// by the UI. Types only, so both sides can import it without pulling in code.

import type { BookableService, BookingStatus, Quote, Stay } from "../booking";
import type { IsoDate } from "../calendar";
import type { Breakdown, Weights } from "../ranking";
import type { PriceSuggestion } from "../pricing";
import type { Service } from "../sitter";

export type SitterResult = {
  /** Position in the whole ranking (1 = best), not just within the page. */
  rank: number;
  id: number;
  name: string;
  lat: number;
  lng: number;
  priceEur: number | null;
  ratingAverage: number | null;
  ratingCount: number;
  medianResponseMinutes: number;
  bookingsLast30d: number;
  identityVerified: boolean;
  createdAt: string;
  /** Days since the sitter joined, at the time of the request. */
  ageDays: number;
  distanceKm: number;
  score: number;
  breakdown: Breakdown;
};

export type SittersResponse = {
  service: Service;
  lat: number;
  lng: number;
  weights: Weights;
  coldStartBoost: boolean;
  /** The dates searched, as a stay ([checkIn, checkOut)); null without dates. */
  stay: Stay | null;
  /** Eligible nearby sitters offering the service and free for the stay, across all pages. */
  totalCandidates: number;
  /** Eligible nearby sitters left out because they are away or booked on the dates (0 without dates). */
  unavailableCount: number;
  /** 1-based page returned in `results`. */
  page: number;
  /** Sitters per page (the `limit` parameter). */
  pageSize: number;
  /** At least 1. A `page` past the end returns empty `results`. */
  totalPages: number;
  results: SitterResult[];
};

export type PriceSuggestionResponse = {
  suggestion: PriceSuggestion | null;
};

export type ErrorResponse = { error: string; details?: string[]; code?: string };

/** GET /api/sitters/:sitterId/quote: the server's price for a stay, and whether it is free. */
export type QuoteResponse = {
  sitterId: number;
  sitterName: string;
  service: BookableService;
  checkIn: IsoDate;
  /** Exclusive: the day the pet goes home. */
  checkOut: IsoDate;
  quote: Quote;
  /** False when the sitter is away or already holds a booking on one of the nights. */
  available: boolean;
};

/** A booking request as its owner sees it. */
export type Booking = {
  id: number;
  sitter: { id: number; name: string };
  service: Service;
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  /** As of the response: an unanswered request past its expiry time reads "expired". */
  status: BookingStatus;
  /** The quote recorded when the request was made: later price changes do not touch it. */
  quote: Quote;
  createdAt: string;
  updatedAt: string;
  /** While the request awaits an answer: when it expires. Otherwise null. */
  expiresAt: string | null;
};

export type BookingResponse = { booking: Booking };
export type BookingsResponse = { bookings: Booking[] };

/**
 * 409 from the booking endpoints, with a `code` the UI can act on:
 * - `unavailable`: the dates were taken (or the sitter is away). Pick other dates or another sitter.
 * - `price_changed`: the server's total differs from `expectedTotalCents`; `quote` is the current one.
 * - `invalid_transition`: the booking's status does not allow that change; `booking` is its current state.
 */
export type BookingConflictResponse =
  | (ErrorResponse & { code: "unavailable" })
  | (ErrorResponse & { code: "price_changed"; quote: Quote })
  | (ErrorResponse & { code: "invalid_transition"; booking: Booking });
